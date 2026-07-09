#!/usr/bin/env node
/**
 * AIMS Brand Migration Script
 * ============================
 * Yeh script aims_v18 HTML file ke _defaultBrandRates aur
 * nokhaSheet brands ko MongoDB mein migrate karta hai.
 *
 * Usage:
 *   node aims-brand-migration.js
 *   node aims-brand-migration.js --mongo mongodb://localhost:27017/aims
 *   node aims-brand-migration.js --dry-run
 *
 * Prerequisites (aims-backend folder mein):
 *   npm install
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.argv.find((a, i) => process.argv[i - 1] === '--mongo')
  || process.env.MONGO_URI
  || 'mongodb://127.0.0.1:27017/aims';

const DRY_RUN = process.argv.includes('--dry-run');

// ── Sare brands jo aims_v18 HTML mein hain ─────────────────────────────────

const defaultBrandRates = [
  // ── RORA SHOP ──
  { name: 'Mc Dowells',       shop: 'rora',   cat: 'whisky', bot: 620,  half: 320, nips: 170 },
  { name: 'Green Lable',      shop: 'rora',   cat: 'whisky', bot: 500,  half: 250, nips: 140 },
  { name: 'Royal Stage',      shop: 'rora',   cat: 'whisky', bot: 750,  half: 380, nips: 190 },
  { name: 'Imperial Blue',    shop: 'rora',   cat: 'whisky', bot: 660,  half: 340, nips: 180 },
  { name: 'Royal Challenge',  shop: 'rora',   cat: 'whisky', bot: 750,  half: 380, nips: 190 },
  { name: 'All Season',       shop: 'rora',   cat: 'whisky', bot: 750,  half: 380, nips: 190 },
  { name: 'Officer Choice',   shop: 'rora',   cat: 'whisky', bot: 500,  half: 250, nips: 140 },
  { name: 'Blender Pride',    shop: 'rora',   cat: 'whisky', bot: 1050, half: 530, nips: 270 },
  { name: 'Signature Premium',shop: 'rora',   cat: 'whisky', bot: 1100, half: 550, nips: 280 },
  { name: 'Signature Rare',   shop: 'rora',   cat: 'whisky', bot: 1000, half: 550, nips: 250 },

  // ── MAIN SHOP ──
  { name: 'Teacher 50',       shop: 'main',   cat: 'whisky', bot: 1800, half: 0,   nips: 0   },
  { name: 'Black Dog Black',  shop: 'main',   cat: 'whisky', bot: 2200, half: 0,   nips: 200 },
  { name: '100 Piper',        shop: 'main',   cat: 'whisky', bot: 2400, half: 0,   nips: 0   },
  { name: 'Blender Pride',    shop: 'main',   cat: 'whisky', bot: 1050, half: 530, nips: 270 },
  { name: 'Royal Stage',      shop: 'main',   cat: 'whisky', bot: 750,  half: 380, nips: 190 },
  { name: 'Mc Dowells',       shop: 'main',   cat: 'whisky', bot: 620,  half: 320, nips: 170 },
  { name: 'Kingfisher Beer',  shop: 'main',   cat: 'beer',   bot: 120,  half: 80,  nips: 0   },

  // ── CIRCLE SHOP ──
  { name: 'RS Pav',           shop: 'circle', cat: 'desi',   bot: 0,    half: 0,   nips: 190 },
  { name: 'No 01 Pav',        shop: 'circle', cat: 'desi',   bot: 0,    half: 0,   nips: 170 },
  { name: 'GL Pav',           shop: 'circle', cat: 'desi',   bot: 0,    half: 0,   nips: 140 },
  { name: 'As Pav',           shop: 'circle', cat: 'desi',   bot: 0,    half: 0,   nips: 190 },
  { name: 'Oc Pav',           shop: 'circle', cat: 'desi',   bot: 0,    half: 0,   nips: 140 },

  // ── NOKHA (nokhaSheet brands from HTML) ──
  { name: 'Imperial Blue',    shop: 'nokha',  cat: 'whisky', bot: 820,  half: 410, nips: 105 },
  { name: 'Royal Stage',      shop: 'nokha',  cat: 'whisky', bot: 710,  half: 355, nips: 90  },
  { name: 'Blender Pride',    shop: 'nokha',  cat: 'whisky', bot: 1050, half: 525, nips: 140 },
  { name: 'Mc Dowells',       shop: 'nokha',  cat: 'whisky', bot: 660,  half: 330, nips: 82  },
  { name: 'Green Lable',      shop: 'nokha',  cat: 'whisky', bot: 720,  half: 360, nips: 92  },
  { name: 'Officer Choice',   shop: 'nokha',  cat: 'whisky', bot: 600,  half: 300, nips: 78  },
  { name: 'Signature Prem',   shop: 'nokha',  cat: 'whisky', bot: 780,  half: 390, nips: 100 },
  { name: 'Royal Challenge',  shop: 'nokha',  cat: 'whisky', bot: 690,  half: 345, nips: 88  },
  { name: 'Kingfisher Beer',  shop: 'nokha',  cat: 'beer',   bot: 165,  half: 110, nips: 0   },
  { name: 'Carls Berg',       shop: 'nokha',  cat: 'beer',   bot: 185,  half: 125, nips: 0   },
  { name: 'MM Orange',        shop: 'nokha',  cat: 'other',  bot: 110,  half: 65,  nips: 24  },
  { name: 'Rock Ford',        shop: 'nokha',  cat: 'whisky', bot: 520,  half: 265, nips: 68  },

  // ── WAREHOUSE (same as rora + main combined) ──
  { name: 'Mc Dowells',       shop: 'warehouse', cat: 'whisky', bot: 620,  half: 320, nips: 170 },
  { name: 'Green Lable',      shop: 'warehouse', cat: 'whisky', bot: 500,  half: 250, nips: 140 },
  { name: 'Royal Stage',      shop: 'warehouse', cat: 'whisky', bot: 750,  half: 380, nips: 190 },
  { name: 'Imperial Blue',    shop: 'warehouse', cat: 'whisky', bot: 660,  half: 340, nips: 180 },
  { name: 'Royal Challenge',  shop: 'warehouse', cat: 'whisky', bot: 750,  half: 380, nips: 190 },
  { name: 'All Season',       shop: 'warehouse', cat: 'whisky', bot: 750,  half: 380, nips: 190 },
  { name: 'Officer Choice',   shop: 'warehouse', cat: 'whisky', bot: 500,  half: 250, nips: 140 },
  { name: 'Blender Pride',    shop: 'warehouse', cat: 'whisky', bot: 1050, half: 530, nips: 270 },
  { name: 'Signature Premium',shop: 'warehouse', cat: 'whisky', bot: 1100, half: 550, nips: 280 },
  { name: 'Signature Rare',   shop: 'warehouse', cat: 'whisky', bot: 1000, half: 550, nips: 250 },
  { name: 'Kingfisher Beer',  shop: 'warehouse', cat: 'beer',   bot: 120,  half: 80,  nips: 0   },
  { name: 'Teacher 50',       shop: 'warehouse', cat: 'whisky', bot: 1800, half: 0,   nips: 0   },
  { name: 'Black Dog Black',  shop: 'warehouse', cat: 'whisky', bot: 2200, half: 0,   nips: 200 },
  { name: '100 Piper',        shop: 'warehouse', cat: 'whisky', bot: 2400, half: 0,   nips: 0   },
];

// Master brand list (unique names, used in Brands tab) ─────────────────────
// FIXED: previously this hardcoded list had NO rate fields at all (rateBot/rateHalf/
// rateNips were always 0), so the "Brands" tab always showed "—" for rates even
// after migrating. Now we derive masterBrands from defaultBrandRates directly,
// picking the highest bot-rate seen for each brand name as its representative rate.
const masterBrandsMap = new Map();
for (const b of defaultBrandRates) {
  const existing = masterBrandsMap.get(b.name);
  if (!existing || b.bot > existing.rateBot) {
    masterBrandsMap.set(b.name, {
      name: b.name,
      cat: b.cat,
      rateBot: b.bot || 0,
      rateHalf: b.half || 0,
      rateNips: b.nips || 0,
      mrpBot: b.bot || 0,
      mrpHalf: b.half || 0,
      mrpNips: b.nips || 0,
    });
  }
}
const masterBrands = [...masterBrandsMap.values()];

// ── Mongoose Models ─────────────────────────────────────────────────────────

const BrandRateSchema = new mongoose.Schema({
  name:    { type: String, required: true, trim: true },
  shop:    { type: String, required: true, trim: true },
  cat:     { type: String, enum: ['whisky','rum','beer','gin','vodka','desi','other'], default: 'whisky' },
  bot:     { type: Number, default: 0 },
  half:    { type: Number, default: 0 },
  nips:    { type: Number, default: 0 },
  active:  { type: Boolean, default: true },
}, { timestamps: true });
BrandRateSchema.index({ name: 1, shop: 1 }, { unique: true });

const MasterBrandSchema = new mongoose.Schema({
  name:     { type: String, required: true, unique: true, trim: true },
  cat:      { type: String, default: 'whisky' },
  rateBot:  { type: Number, default: 0 },
  rateHalf: { type: Number, default: 0 },
  rateNips: { type: Number, default: 0 },
  mrpBot:   { type: Number, default: 0 },
  mrpHalf:  { type: Number, default: 0 },
  mrpNips:  { type: Number, default: 0 },
  active:   { type: Boolean, default: true },
}, { timestamps: true });

// ── Main ────────────────────────────────────────────────────────────────────

async function migrate() {
  console.log('='.repeat(55));
  console.log('  AIMS Brand Migration Script');
  console.log(DRY_RUN ? '  MODE: DRY RUN (kuch save nahi hoga)' : `  MODE: LIVE → ${MONGO_URI}`);
  console.log('='.repeat(55) + '\n');

  if (!DRY_RUN) {
    await mongoose.connect(MONGO_URI);
    console.log(`[MongoDB] Connected → ${mongoose.connection.host}/${mongoose.connection.name}\n`);
  }

  let BrandRate, MasterBrand;
  if (!DRY_RUN) {
    try { BrandRate = mongoose.model('BrandRate'); }
    catch { BrandRate = mongoose.model('BrandRate', BrandRateSchema); }
    try { MasterBrand = mongoose.model('MasterBrand'); }
    catch { MasterBrand = mongoose.model('MasterBrand', MasterBrandSchema); }
  }

  // ── 1. BrandRates (shop-wise rates) ───────────────────────────────────────
  console.log(`BrandRates: ${defaultBrandRates.length} records migrate honge`);
  const brStats = { inserted: 0, updated: 0, skipped: 0, errors: 0 };

  for (const b of defaultBrandRates) {
    if (DRY_RUN) {
      console.log(`  [DRY] Upsert BrandRate: ${b.name.padEnd(22)} shop=${b.shop.padEnd(10)} cat=${b.cat.padEnd(7)} bot=${b.bot} half=${b.half} nips=${b.nips}`);
      brStats.inserted++;
      continue;
    }
    try {
      const existing = await BrandRate.findOne({ name: b.name, shop: b.shop });
      if (existing) {
        // Sirf rate update karo agar 0 hai, user-set rates protect karo
        const updates = {};
        if (!existing.bot  && b.bot)  updates.bot  = b.bot;
        if (!existing.half && b.half) updates.half = b.half;
        if (!existing.nips && b.nips) updates.nips = b.nips;
        if (!existing.cat  && b.cat)  updates.cat  = b.cat;
        if (Object.keys(updates).length) {
          await BrandRate.updateOne({ _id: existing._id }, { $set: updates });
          brStats.updated++;
        } else {
          brStats.skipped++;
        }
      } else {
        await BrandRate.create(b);
        brStats.inserted++;
      }
    } catch (e) {
      if (e.code === 11000) { brStats.skipped++; }
      else { console.error(`  Error: ${b.name} (${b.shop}):`, e.message); brStats.errors++; }
    }
  }

  console.log(`  ✓ Inserted: ${brStats.inserted}  Updated: ${brStats.updated}  Skipped: ${brStats.skipped}  Errors: ${brStats.errors}\n`);

  // ── 2. MasterBrands (brand tab mein dikhne ke liye, with rates) ───────────
  console.log(`MasterBrands: ${masterBrands.length} records migrate honge`);
  const mbStats = { inserted: 0, updated: 0, skipped: 0, errors: 0 };

  for (const mb of masterBrands) {
    if (DRY_RUN) {
      console.log(`  [DRY] Upsert MasterBrand: ${mb.name.padEnd(22)} cat=${mb.cat.padEnd(7)} rateBot=${mb.rateBot} rateHalf=${mb.rateHalf} rateNips=${mb.rateNips}`);
      mbStats.inserted++;
      continue;
    }
    try {
      const existing = await MasterBrand.findOne({ name: mb.name });
      if (existing) {
        // Brand already there — only fill in rate fields if they're currently 0,
        // so we don't clobber rates the user has already edited from the Brands tab.
        const updates = {};
        if (!existing.rateBot && mb.rateBot) updates.rateBot = mb.rateBot;
        if (!existing.rateHalf && mb.rateHalf) updates.rateHalf = mb.rateHalf;
        if (!existing.rateNips && mb.rateNips) updates.rateNips = mb.rateNips;
        if (!existing.mrpBot && mb.mrpBot) updates.mrpBot = mb.mrpBot;
        if (!existing.mrpHalf && mb.mrpHalf) updates.mrpHalf = mb.mrpHalf;
        if (!existing.mrpNips && mb.mrpNips) updates.mrpNips = mb.mrpNips;
        if (!existing.cat && mb.cat) updates.cat = mb.cat;
        if (Object.keys(updates).length) {
          await MasterBrand.updateOne({ _id: existing._id }, { $set: updates });
          mbStats.updated++;
        } else {
          mbStats.skipped++;
        }
      } else {
        await MasterBrand.create(mb);
        mbStats.inserted++;
      }
    } catch (e) {
      if (e.code === 11000) { mbStats.skipped++; }
      else { console.error(`  Error: ${mb.name}:`, e.message); mbStats.errors++; }
    }
  }

  console.log(`  ✓ Inserted: ${mbStats.inserted}  Updated: ${mbStats.updated}  Skipped: ${mbStats.skipped}  Errors: ${mbStats.errors}\n`);

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('='.repeat(55));
  if (DRY_RUN) {
    console.log('DRY RUN complete. Actual migrate karne ke liye --dry-run hatao.');
  } else {
    console.log('✅ Migration complete!');
    console.log(`   BrandRates in DB: ${await BrandRate.countDocuments()}`);
    console.log(`   MasterBrands in DB: ${await MasterBrand.countDocuments()}`);

    // ── Per-shop count ──
    const shops = ['rora', 'main', 'circle', 'nokha', 'warehouse'];
    for (const s of shops) {
      const c = await BrandRate.countDocuments({ shop: s });
      console.log(`     ${s.padEnd(12)}: ${c} brands`);
    }

    await mongoose.connection.close();
    console.log('\n[MongoDB] Connection closed');
  }
  console.log('='.repeat(55));
}

migrate().catch(e => {
  console.error('\nMigration failed:', e.message);
  process.exit(1);
});
