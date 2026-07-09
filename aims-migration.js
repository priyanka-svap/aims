#!/usr/bin/env node
/**
 * AIMS Excel → MongoDB Migration Script
 * =========================================
 * Teen Excel files ka sara data MongoDB mein migrate karta hai:
 *
 *   1. Main_Shop_Sheet_.xlsx      → DaySheet (sheetType:'main')  + Movement (outward per destination)
 *   2. 01__rora_2026_Complete_all.xlsx → DaySheet (sheetType:'rora')
 *   3. 09__Circle_sheet_Big_PP_Done.xlsx → LedgerEntry (circle outward/sales) + CashAccount
 *
 * Usage:
 *   node aims-excel-migration.js \
 *     --rora   "01__rora_2026_Complete_all.xlsx" \
 *     --main   "Main_Shop_Sheet_.xlsx" \
 *     --circle "09__Circle_sheet_Big_PP_Done.xlsx" \
 *     --mongo  mongodb+srv://stockpanell_db_user:NrkBaXO5EVpkFp5F@cluster0.vzhakqi.mongodb.net/aims
 *
 *   Add --dry-run to preview counts without saving anything.
 *
 * Prerequisites:
 *   npm install mongoose xlsx
 */

const fs   = require('fs');
const path = require('path');

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function arg(name) { const i = args.indexOf(name); return i !== -1 ? args[i+1] : null; }

const FILE_RORA   = arg('--rora');
const FILE_MAIN   = arg('--main');
const FILE_CIRCLE = arg('--circle');
const MONGO_URI   = arg('--mongo') || process.env.MONGO_URI || 'mongodb+srv://stockpanell_db_user:NrkBaXO5EVpkFp5F@cluster0.vzhakqi.mongodb.net/aims';
const DRY_RUN     = args.includes('--dry-run');

if (!FILE_RORA && !FILE_MAIN && !FILE_CIRCLE) {
  console.log(`
Usage:
  node aims-migration.js \\
    --rora   "rora.xlsx" \\
    --main   "mainshop.xlsx" \\
    --circle "circle.xlsx" \\
    --mongo  mongodb+srv://stockpanell_db_user:NrkBaXO5EVpkFp5F@cluster0.vzhakqi.mongodb.net/aims \\
    [--dry-run]

  Sirf ek ya do file bhi de sakte ho — jo nahi di woh skip ho jaayegi.
`);
  process.exit(1);
}

// ── Excel reader (xlsx) ───────────────────────────────────────────────────────
let XLSX;
try { XLSX = require('xlsx'); }
catch(e) {
  console.error('xlsx package missing. Run: npm install xlsx');
  process.exit(1);
}

function readWorkbook(filePath) {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) { console.error(`File not found: ${abs}`); process.exit(1); }
  console.log(`Reading: ${abs}`);
  return XLSX.readFile(abs, { cellDates: true, dense: false });
}

// Cell value helper — returns raw value (number, string, Date, null)
function cellVal(ws, row, col) {
  const addr = XLSX.utils.encode_cell({ r: row, c: col });
  const cell = ws[addr];
  if (!cell) return null;
  if (cell.t === 'd') return cell.v; // Date
  if (cell.t === 'n') return cell.v; // Number
  if (cell.t === 's') return cell.v ? cell.v.trim() : null;
  if (cell.t === 'b') return cell.v;
  return null;
}

function num(v) { const n = Number(v); return isNaN(n) ? 0 : n; }

// ── Date helpers ──────────────────────────────────────────────────────────────
function toDateStr(v) {
  if (!v) return null;
  let d;
  if (v instanceof Date)           d = v;
  else if (typeof v === 'number')  d = XLSX.SSF.parse_date_code(v);
  else if (typeof v === 'string') {
    // Handles '2.06.2025', '2026-04-01', etc.
    const m = v.match(/(\d{1,2})[.\-\/](\d{1,2})[.\-\/](\d{2,4})/);
    if (m) {
      const day = m[1].padStart(2,'0'), mon = m[2].padStart(2,'0');
      let yr = m[3]; if (yr.length === 2) yr = '20'+yr;
      return `${yr}-${mon}-${day}`;
    }
    d = new Date(v);
  }
  if (!d || isNaN(d.getTime ? d.getTime() : NaN)) return null;
  if (d.getFullYear) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  // XLSX date object
  return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
}

// ── MongoDB models (inline) ───────────────────────────────────────────────────
async function setupDB() {
  const mongoose = require('mongoose');
  await mongoose.connect(MONGO_URI);
  console.log(`[MongoDB] Connected → ${MONGO_URI}\n`);

  const S = mongoose.Schema;
  function M(name, schema) {
    try { return mongoose.model(name); }
    catch { return mongoose.model(name, new S(schema, { timestamps: true })); }
  }

  const DaySheet    = M('DaySheet',    { sheetType:String, date:{type:String}, brands:S.Types.Mixed });
  const Movement    = M('Movement',    { type:String, date:String, shop:String, brand:String, location:String, bot:Number, half:Number, nips:Number, amt:{type:Number,default:0}, remark:{type:String,default:''} });
  const LedgerEntry = M('LedgerEntry', { store:String, direction:String, date:String, brand:String, party:String, pcs:{type:Number,default:0}, rate:{type:Number,default:0}, amt:{type:Number,default:0}, bot:{type:Number,default:0}, half:{type:Number,default:0}, nips:{type:Number,default:0}, source:{type:String,default:''}, destination:{type:String,default:''} });
  const CashAccount = M('CashAccount', { date:{type:String,unique:true}, eng:Number, beer:Number, desi:Number, total:Number, comm:Number, circExp:Number, diesel:Number, other:Number, net:Number, phone:Number, cash:Number, recv:{type:Number,default:0}, diff:{type:Number,default:0}, remark:{type:String,default:''} });

  try { await mongoose.connection.db.collection('daysheets').createIndex({ sheetType:1, date:1 }, { unique:true }); } catch{}

  return { mongoose, DaySheet, Movement, LedgerEntry, CashAccount };
}

async function upsertDaySheet(DaySheet, sheetType, date, brands, dryRun) {
  if (dryRun) return;
  await DaySheet.findOneAndUpdate(
    { sheetType, date },
    { $set: { brands } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. RORA FILE  —  sheetType:'rora'
// Structure per sheet (each sheet = one day):
//   Row 0 (idx): title    Row 1: Shop Name + Date(col 23)
//   Row 2: Brand Name | Opening(1,2,3) | Inward(4,5,6) | Outward(7,8,9) |
//          Total(10,11,12) | Closing(13,14,15) | Sales(16,17,18) |
//          Rate(19,20,21) | Amount(22,23,24) | Total(25)
//   Row 3: col sub-headers  Rows 4+: data
// ═══════════════════════════════════════════════════════════════════════════════
function parseRoraSheet(wb, sheetName) {
  const ws  = wb.Sheets[sheetName];
  if (!ws) return null;

  // Date: row 1, col 23 (X)
  let dateVal = cellVal(ws, 1, 23);
  // If not found, sheet number = day, base month April 2026
  if (!dateVal) {
    const day = parseInt(sheetName);
    if (!isNaN(day)) dateVal = new Date(2026, 3, day); // April=3
  }
  const date = toDateStr(dateVal);
  if (!date) return null;

  const brands = [];
  // Data starts row 4 (index 4)
  for (let r = 4; r < 300; r++) {
    const brandName = cellVal(ws, r, 0);
    if (!brandName || typeof brandName !== 'string') continue;
    const name = brandName.trim();
    if (!name || name.toLowerCase().startsWith('total') || name.toLowerCase().startsWith('grand')) break;

    const open  = [num(cellVal(ws,r,1)),  num(cellVal(ws,r,2)),  num(cellVal(ws,r,3))];
    const inw   = [num(cellVal(ws,r,4)),  num(cellVal(ws,r,5)),  num(cellVal(ws,r,6))];
    const out   = [num(cellVal(ws,r,7)),  num(cellVal(ws,r,8)),  num(cellVal(ws,r,9))];
    const close = [num(cellVal(ws,r,13)), num(cellVal(ws,r,14)), num(cellVal(ws,r,15))];
    const sales = [num(cellVal(ws,r,16)), num(cellVal(ws,r,17)), num(cellVal(ws,r,18))];
    const rate  = [num(cellVal(ws,r,19)), num(cellVal(ws,r,20)), num(cellVal(ws,r,21))];
    const amt   = num(cellVal(ws,r,25));

    brands.push({ name, open, inw, out, close, sales, rate, amt });
  }
  return { date, brands };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. MAIN SHOP FILE  —  sheetType:'main'
// Same row structure as Rora but with outward broken into destinations:
//   Col groups (0-based):
//   Opening(1-3) | Inward(4-6) |
//   Circle(7-9) | Bikasar(10-12) | Charkada Ganv(13-15) | Kanwlisar(16-18) |
//   Roda(19-21) | Charkda Godam(22-24) | Shop 04(25-27) | Pull Ke Pass(28-30) |
//   Shop 02(31-33) | Shop 03(34-36) | 11(37-39) | Other Outward(40-42) |
//   Total Out(43-45) | Closing(46-48) | Sales(49-51) | Rate(52-54) | Amt(55-57) | Total(58)
// ═══════════════════════════════════════════════════════════════════════════════
const MAIN_DESTINATIONS = [
  { name: 'Circle',        col: 7  },
  { name: 'Bikasar',       col: 10 },
  { name: 'Charkada Ganv', col: 13 },
  { name: 'Kanwlisar',     col: 16 },
  { name: 'Roda',          col: 19 },
  { name: 'Charkda Godam', col: 22 },
  { name: 'Shop 04',       col: 25 },
  { name: 'Pull Ke Pass',  col: 28 },
  { name: 'Shop 02',       col: 31 },
  { name: 'Shop 03',       col: 34 },
  { name: 'Destination 11',col: 37 },
  { name: 'Other Outward', col: 40 },
];

function parseMainSheet(wb, sheetName) {
  const ws = wb.Sheets[sheetName];
  if (!ws) return null;

  // Date: row 1, col 56 (BE)
  let dateVal = cellVal(ws, 1, 56);
  if (!dateVal) {
    const day = parseInt(sheetName);
    if (!isNaN(day)) dateVal = new Date(2026, 3, day);
  }
  const date = toDateStr(dateVal);
  if (!date) return null;

  const brands   = [];
  const movements = []; // outward per destination per brand

  for (let r = 4; r < 300; r++) {
    const brandName = cellVal(ws, r, 0);
    if (!brandName || typeof brandName !== 'string') continue;
    const name = brandName.trim();
    if (!name || name.toLowerCase().startsWith('total') || name.toLowerCase().startsWith('grand')) break;

    const open     = [num(cellVal(ws,r,1)),  num(cellVal(ws,r,2)),  num(cellVal(ws,r,3))];
    const inw      = [num(cellVal(ws,r,4)),  num(cellVal(ws,r,5)),  num(cellVal(ws,r,6))];
    const totalOut = [num(cellVal(ws,r,43)), num(cellVal(ws,r,44)), num(cellVal(ws,r,45))];
    const close    = [num(cellVal(ws,r,46)), num(cellVal(ws,r,47)), num(cellVal(ws,r,48))];
    const sales    = [num(cellVal(ws,r,49)), num(cellVal(ws,r,50)), num(cellVal(ws,r,51))];
    const rate     = [num(cellVal(ws,r,52)), num(cellVal(ws,r,53)), num(cellVal(ws,r,54))];
    const amt      = num(cellVal(ws,r,58));

    brands.push({ name, open, inw, out: totalOut, close, sales, rate, amt });

    // Per-destination outward movement entries
    for (const dest of MAIN_DESTINATIONS) {
      const bot  = num(cellVal(ws, r, dest.col));
      const half = num(cellVal(ws, r, dest.col + 1));
      const nips = num(cellVal(ws, r, dest.col + 2));
      if (bot || half || nips) {
        movements.push({
          type: 'outward', date, shop: 'main',
          brand: name, location: dest.name,
          bot, half, nips, amt: 0,
        });
      }
    }

    // Also inward if any
    const iBot  = num(cellVal(ws, r, 4));
    const iHalf = num(cellVal(ws, r, 5));
    const iNips = num(cellVal(ws, r, 6));
    if (iBot || iHalf || iNips) {
      movements.push({
        type: 'inward', date, shop: 'main',
        brand: name, location: 'Distillery',
        bot: iBot, half: iHalf, nips: iNips, amt: 0,
      });
    }
  }
  return { date, brands, movements };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. CIRCLE FILE  —  LedgerEntry per sale + CashAccount
// Row 2: Date (col A label), actual date in col B of that merged cell
// Row 2 (header): 'Date' at col A — actual date value merged across cols A-B
// Row 3: Party names (each party spans 3 cols: pcs, rate, amt)
// Row 4: 'Product Name' | Pcs | Rate | Amt | Pcs | Rate | Amt ...
// Rows 5+: product data
// cash sheet: Date | English | Beer | Desi | Total | Commission | CircleExp | Diesel | Other | Net | Phone | Cash
// ═══════════════════════════════════════════════════════════════════════════════
function parseCircleSheet(wb, sheetName, baseMonth) {
  const ws = wb.Sheets[sheetName];
  if (!ws) return null;

  // Get date: sheet name = day number, baseMonth = {year, month (1-based)}
  const dayNum = parseInt(sheetName);
  if (isNaN(dayNum)) return null;
  const date = `${baseMonth.year}-${String(baseMonth.month).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;

  // Row 3 (index 2): party names at every 3rd col starting from col 1
  const parties = [];
  for (let c = 1; c < 200; c += 3) {
    const v = cellVal(ws, 2, c);
    if (!v) continue;
    const name = String(v).trim();
    if (name === 'Total' || name === 'Grand Total') break;
    parties.push({ name, col: c });
  }
  if (parties.length === 0) return null;

  // Rows 5+ (index 4+): product rows
  const entries = [];
  for (let r = 4; r < 200; r++) {
    const productRaw = cellVal(ws, r, 0);
    if (!productRaw) continue;
    const product = String(productRaw).trim();
    if (!product || product.toLowerCase() === 'total') continue;

    for (const party of parties) {
      const pcs  = num(cellVal(ws, r, party.col));
      const rate = num(cellVal(ws, r, party.col + 1));
      const amt  = num(cellVal(ws, r, party.col + 2));
      if (pcs > 0) {
        entries.push({
          store: 'circle', direction: 'outward',
          date, brand: product, party: party.name,
          pcs, rate, amt,
          destination: party.name,
        });
      }
    }
  }
  return { date, entries };
}

function parseCashSheet(wb) {
  const ws = wb.Sheets['cash'];
  if (!ws) return [];

  const rows = [];
  // Data starts row 3 (index 2): Date | English | Beer | Desi | Total | Comm | CircExp | Diesel | Other | Net | Phone | Cash
  for (let r = 2; r < 200; r++) {
    const dateVal = cellVal(ws, r, 0);
    if (!dateVal) continue;
    const date = toDateStr(dateVal);
    if (!date) continue;

    const eng     = num(cellVal(ws, r, 1));
    const beer    = num(cellVal(ws, r, 2));
    const desi    = num(cellVal(ws, r, 3));
    const total   = num(cellVal(ws, r, 4));
    const comm    = num(cellVal(ws, r, 5));
    const circExp = num(cellVal(ws, r, 6));
    const diesel  = num(cellVal(ws, r, 7));
    const other   = num(cellVal(ws, r, 8));
    const net     = num(cellVal(ws, r, 9));
    const phone   = num(cellVal(ws, r, 10));
    const cash    = num(cellVal(ws, r, 11));

    if (!eng && !beer && !desi && !total) continue; // skip empty/total rows

    rows.push({ date, eng, beer, desi, total, comm, circExp, diesel, other, net, phone, cash, recv: cash, diff: 0 });
  }
  return rows;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════
async function main() {
  console.log('='.repeat(60));
  console.log('AIMS Excel → MongoDB Migration');
  console.log(DRY_RUN ? 'MODE: DRY RUN (kuch save nahi hoga)' : `MODE: LIVE → ${MONGO_URI}`);
  console.log('='.repeat(60) + '\n');

  // ── Parse all Excel files ──────────────────────────────────────────────────
  const roraSheets   = [];
  const mainSheets   = [];
  const mainMovements = [];
  const circleEntries = [];
  let   cashRows      = [];

  // NUMERIC sheet names only (skip Stock Sheet, Cash Sheet, Total Sheet, etc.)
  const numericSheets = (names) => names.filter(n => /^\d+$/.test(n.trim()));

  if (FILE_RORA) {
    const wb = readWorkbook(FILE_RORA);
    for (const sn of numericSheets(wb.SheetNames)) {
      const parsed = parseRoraSheet(wb, sn);
      if (parsed && parsed.brands.length > 0) roraSheets.push(parsed);
    }
    console.log(`Rora:     ${roraSheets.length} day sheets parsed`);
  }

  if (FILE_MAIN) {
    const wb = readWorkbook(FILE_MAIN);
    for (const sn of numericSheets(wb.SheetNames)) {
      const parsed = parseMainSheet(wb, sn);
      if (parsed && parsed.brands.length > 0) {
        mainSheets.push({ date: parsed.date, brands: parsed.brands });
        mainMovements.push(...parsed.movements);
      }
    }
    console.log(`Main:     ${mainSheets.length} day sheets, ${mainMovements.length} movement entries parsed`);
  }

  if (FILE_CIRCLE) {
    const wb = readWorkbook(FILE_CIRCLE);

    // Determine base month from cash sheet first row date
    let baseMonth = { year: 2026, month: 4 }; // default April 2026
    const cashSheet = wb.Sheets['cash'];
    if (cashSheet) {
      const firstDateVal = cellVal(cashSheet, 2, 0);
      const firstDate    = toDateStr(firstDateVal);
      if (firstDate) {
        const [y, m] = firstDate.split('-').map(Number);
        baseMonth = { year: y, month: m };
      }
    }

    for (const sn of numericSheets(wb.SheetNames)) {
      const parsed = parseCircleSheet(wb, sn, baseMonth);
      if (parsed && parsed.entries.length > 0) circleEntries.push(...parsed.entries);
    }
    cashRows = parseCashSheet(wb);
    console.log(`Circle:   ${circleEntries.length} sale entries, ${cashRows.length} cash account rows parsed`);
  }

  console.log();

  if (DRY_RUN) {
    console.log('DRY RUN Summary:');
    console.log(`  Rora DaySheets:      ${roraSheets.length}`);
    console.log(`  Main DaySheets:      ${mainSheets.length}`);
    console.log(`  Main Movements:      ${mainMovements.length}`);
    console.log(`  Circle LedgerEntry:  ${circleEntries.length}`);
    console.log(`  Cash Accounts:       ${cashRows.length}`);
    console.log('\nDry run complete. --dry-run hata ke dobara chalao actual migration ke liye.');
    return;
  }

  // ── Save to MongoDB ────────────────────────────────────────────────────────
  const { mongoose, DaySheet, Movement, LedgerEntry, CashAccount } = await setupDB();

  let saved = { roraSheets:0, mainSheets:0, movements:0, circleEntries:0, cashAccounts:0, errors:0 };

  // 1. Rora day sheets
  process.stdout.write('Saving Rora sheets... ');
  for (const s of roraSheets) {
    try {
      await DaySheet.findOneAndUpdate(
        { sheetType:'rora', date: s.date },
        { $set: { brands: s.brands } },
        { upsert:true, new:true, setDefaultsOnInsert:true }
      );
      saved.roraSheets++;
    } catch(e) { saved.errors++; console.error(`\n  Error rora ${s.date}:`, e.message); }
  }
  console.log(`${saved.roraSheets} saved`);

  // 2. Main day sheets
  process.stdout.write('Saving Main sheets... ');
  for (const s of mainSheets) {
    try {
      await DaySheet.findOneAndUpdate(
        { sheetType:'main', date: s.date },
        { $set: { brands: s.brands } },
        { upsert:true, new:true, setDefaultsOnInsert:true }
      );
      saved.mainSheets++;
    } catch(e) { saved.errors++; console.error(`\n  Error main ${s.date}:`, e.message); }
  }
  console.log(`${saved.mainSheets} saved`);

  // 3. Main movements (inward + per-destination outward)
  process.stdout.write('Saving Main movements... ');
  for (const m of mainMovements) {
    try {
      await Movement.create(m);
      saved.movements++;
    } catch(e) { saved.errors++; }
  }
  console.log(`${saved.movements} saved`);

  // 4. Circle ledger entries
  process.stdout.write('Saving Circle entries... ');
  for (const e of circleEntries) {
    try {
      await LedgerEntry.create(e);
      saved.circleEntries++;
    } catch(e2) { saved.errors++; }
  }
  console.log(`${saved.circleEntries} saved`);

  // 5. Cash accounts (upsert by date)
  process.stdout.write('Saving Cash accounts... ');
  for (const c of cashRows) {
    try {
      await CashAccount.findOneAndUpdate(
        { date: c.date },
        { $set: c },
        { upsert:true, new:true, setDefaultsOnInsert:true }
      );
      saved.cashAccounts++;
    } catch(e) { saved.errors++; console.error(`\n  Error cash ${c.date}:`, e.message); }
  }
  console.log(`${saved.cashAccounts} saved`);

  // ── Final summary ──────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(60));
  console.log('✅ Migration Complete');
  console.log('='.repeat(60));
  console.log(`  Rora DaySheets saved:     ${saved.roraSheets}`);
  console.log(`  Main DaySheets saved:     ${saved.mainSheets}`);
  console.log(`  Movement entries saved:   ${saved.movements}`);
  console.log(`  Circle entries saved:     ${saved.circleEntries}`);
  console.log(`  Cash accounts saved:      ${saved.cashAccounts}`);
  if (saved.errors > 0) console.log(`  Errors (skipped):         ${saved.errors}`);
  console.log('='.repeat(60));

  await mongoose.connection.close();
  console.log('[MongoDB] Connection closed');
}

main().catch(e => { console.error('\nMigration failed:', e.message); process.exit(1); });
