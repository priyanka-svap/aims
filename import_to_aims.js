/**
 * AIMS import script — pushes handwritten daily-report data into the live AIMS backend.
 *
 * WHAT THIS DOES
 *   Reads aims_transcription.csv (one row per brand per day per shop, with
 *   inward/outward/sale quantities in bottle/half/nips) and, for every non-zero
 *   quantity, POSTs a ledger entry to https://aims-luqe.onrender.com/api/ledger/<shop>.
 *   It also makes sure a "Kharadiya" shop exists (creating it if not) before
 *   importing that shop's rows.
 *
 * BEFORE YOU RUN THIS
 *   1. Open AIMS_Transcription_Rora_Kharadiya.xlsx and check every YELLOW
 *      ("LOW CONFIDENCE") row against the original scanned page. Fix any wrong
 *      numbers directly in the Excel, then re-export each Detail sheet as CSV
 *      (File > Save a Copy > CSV), OR just edit aims_transcription.csv directly
 *      in a text editor / Excel - same column layout either way.
 *   2. Run once with DRY_RUN=1 first (see below) and read the printed summary
 *      carefully before doing the real import.
 *
 * HOW TO RUN (on your own computer, where the AIMS backend is reachable)
 *   1. Install Node.js 18+ if you don't have it: https://nodejs.org
 *   2. Put this file + aims_transcription.csv in the same folder.
 *   3. Open a terminal in that folder and run:
 *        DRY_RUN=1 node import_to_aims.js        (Mac/Linux - preview only, no writes)
 *        set DRY_RUN=1 && node import_to_aims.js  (Windows cmd - preview only)
 *      Check the output. When you're happy, run for real:
 *        node import_to_aims.js
 *   4. A log file import_log_<timestamp>.txt is written next to this script
 *      with every entry that succeeded/failed, so you can double check in AIMS
 *      afterwards (Warehouse / Kharadiya > Inward / Outward / Daily Sale tabs).
 *
 * SAFE TO RE-RUN?
 *   Each run creates NEW ledger entries - it does not check for existing ones.
 *   Running it twice will duplicate every entry. If a run fails partway,
 *   check the log file to see what already went in before re-running.
 */

const fs = require('fs');
const path = require('path');

// -- Configuration -----------------------------------------------------------
const API_BASE = process.env.AIMS_API_BASE|| 'http://localhost:5000/api';
const USERNAME = process.env.AIMS_USERNAME || 'admin';
const PASSWORD = process.env.AIMS_PASSWORD || 'admin123';
const CSV_PATH = process.env.CSV_PATH || path.join(__dirname, 'aims_transcription.csv');
const DRY_RUN = /^(1|true|yes)$/i.test(process.env.DRY_RUN || '');
const DELAY_MS = 150; // small gap between requests so we don't hammer the free-tier server

// Rora is the app's existing built-in Warehouse module - its ledger "store" id is
// literally 'warehouse' (see AimsAPI.ledger.create('warehouse', ...) throughout
// aims_v20_db.html). Kharadiya does not exist yet, so we create it and use its
// generated shop slug as the store id, same pattern the app uses for any new shop.
const SHOP_STORE_ID = {
  rora: 'warehouse',
  kharadiya: null, // filled in at runtime after we create/find the shop
};
const KHARADIYA_SHOP = {
  slug: 'kharadiya',
  name: 'Kharadiya',
  // Shop.type in the backend only accepts english/beer/desi/mixed (NOT warehouse/circle -
  // that's a separate frontend-only "Module Type" field). Kharadiya sells all 3 categories.
  type: 'mixed',
  location: 'Rani Gaon, Khardiya',
  manager: 'Govind Singh',
};

// -- Tiny CSV parser (handles quoted fields with commas, no external deps) --
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); field = ''; rows.push(row); row = []; }
    else if (c === '\r') { /* skip */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift();
  return rows.filter(r => r.length > 1).map(r => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

async function apiRequest(pathname, opts) {
  opts = opts || {};
  const method = opts.method || 'GET';
  const body = opts.body;
  const token = opts.token;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(API_BASE + pathname, { method, headers, body: body ? JSON.stringify(body) : undefined });
  let data; try { data = await res.json(); } catch (e) { data = null; }
  if (!res.ok) throw new Error((data && data.message) || ('HTTP ' + res.status + ' on ' + pathname));
  return data;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ensureKharadiyaShop(token) {
  if (DRY_RUN) {
    console.log('[DRY RUN] Would check for an existing "Kharadiya" shop and create it if missing:', KHARADIYA_SHOP);
    return KHARADIYA_SHOP.slug;
  }
  const list = await apiRequest('/shops', { token: token });
  const shops = list.data || list || [];
  const existing = shops.find((s) => s.slug === KHARADIYA_SHOP.slug);
  if (existing) {
    console.log('Kharadiya shop already exists (slug="' + existing.slug + '") - reusing it.');
    return existing.slug;
  }
  const created = await apiRequest('/shops', { method: 'POST', body: KHARADIYA_SHOP, token: token });
  console.log('Created Kharadiya shop:', created.data.slug);
  return created.data.slug;
}

function buildLedgerRows(csvRows) {
  // For each CSV row (one brand, one day, one shop), emit up to 3 ledger entries:
  // inward / outward / sales - only when that direction has a non-zero quantity.
  const entries = [];
  for (const r of csvRows) {
    const base = {
      shop: r.shop,
      date: r.date,
      brand: r.brand,
      category: r.cat,
      lowConfidence: /LOW CONFIDENCE/i.test(r.notes || ''),
    };
    const dirs = [
      ['inward', num(r.inward_bot), num(r.inward_half), num(r.inward_nips)],
      ['outward', num(r.outward_bot), num(r.outward_half), num(r.outward_nips)],
      ['sales', num(r.sale_bot), num(r.sale_half), num(r.sale_nips)],
    ];
    for (const d of dirs) {
      const direction = d[0], bot = d[1], half = d[2], nips = d[3];
      if (bot || half || nips) entries.push(Object.assign({}, base, { direction: direction, bot: bot, half: half, nips: nips }));
    }
  }
  return entries;
}

async function main() {
  console.log('AIMS import - ' + (DRY_RUN ? 'DRY RUN (no data will be written)' : 'LIVE RUN'));
  console.log('API:', API_BASE);
  console.log('CSV:', CSV_PATH);

  if (!fs.existsSync(CSV_PATH)) {
    console.error('CSV file not found:', CSV_PATH);
    process.exit(1);
  }
  const csvRows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'));
  const entries = buildLedgerRows(csvRows);
  console.log('Parsed ' + csvRows.length + ' brand/day rows -> ' + entries.length + ' ledger entries to create.');

  let token = null;
  if (!DRY_RUN) {
    const login = await apiRequest('/auth/login', { method: 'POST', body: { username: USERNAME, password: PASSWORD } });
    token = login.token;
    console.log('Logged in as', USERNAME);
  } else {
    console.log('[DRY RUN] Skipping login.');
  }

  SHOP_STORE_ID.kharadiya = await ensureKharadiyaShop(token);

  const log = [];
  let ok = 0, failed = 0, lowConfCount = 0;
  for (const e of entries) {
    const store = SHOP_STORE_ID[e.shop];
    if (!store) { console.error('Unknown shop, skipping:', e.shop); continue; }
    if (e.lowConfidence) lowConfCount++;
    const payload = {
      direction: e.direction,
      date: e.date,
      brand: e.brand,
      category: e.category,
      bot: e.bot,
      half: e.half,
      nips: e.nips,
      remark: e.lowConfidence ? 'Imported from handwritten report - LOW CONFIDENCE, please verify' : 'Imported from handwritten report',
    };
    const label = e.shop + ' | ' + e.date + ' | ' + e.direction + ' | ' + e.brand + ' (' + e.bot + '/' + e.half + '/' + e.nips + ')';
    if (DRY_RUN) {
      log.push('[DRY RUN] Would POST /ledger/' + store + ' :: ' + label);
      ok++;
      continue;
    }
    try {
      await apiRequest('/ledger/' + store, { method: 'POST', body: payload, token: token });
      log.push('OK   :: ' + label);
      ok++;
    } catch (err) {
      log.push('FAIL :: ' + label + ' :: ' + err.message);
      failed++;
    }
    await sleep(DELAY_MS);
  }

  const logPath = path.join(__dirname, 'import_log_' + Date.now() + '.txt');
  fs.writeFileSync(logPath, log.join('\n'), 'utf8');

  console.log('\n--- Summary ---');
  console.log('Succeeded:', ok);
  console.log('Failed:', failed);
  console.log('Low-confidence entries imported (double-check these in AIMS):', lowConfCount);
  console.log('Full log written to:', logPath);
  if (DRY_RUN) console.log('\nThis was a DRY RUN - nothing was written. Re-run without DRY_RUN=1 to actually import.');
}

main().catch((err) => { console.error('Fatal error:', err); process.exit(1); });
