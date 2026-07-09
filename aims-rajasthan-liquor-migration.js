#!/usr/bin/env node
/**
 * AIMS Rajasthan Liquor Price List Migration
 * ============================================
 * Sarkari "Rajasthan Excise Liquor Price List 2026" PDF se nikale gaye
 * 513 brands (MRP ke saath) ko MasterBrand collection mein migrate karta hai.
 *
 * Source: rajasthan-new-liquor-rates-list-2026-770.pdf (44 pages, 1100 rows)
 * Data:   aims-rajasthan-liquor-brands.json (isi folder mein, pehle se nikala hua)
 *
 * Kya hota hai:
 *   - Beer/Whisky/Rum/Gin/Vodka/Country-Liquor/Wine sab brands MasterBrand
 *     mein upsert ho jaate hain, unke sarkari MRP (bot/half/nips) ke saath.
 *   - Selling Rate (rateBot/rateHalf/rateNips) bhi shuru mein MRP ke barabar
 *     hi set hota hai (jab tak aap khud shop-wise rate adjust na karein) —
 *     isse naye brands turant Daily Sheet / Party Sheet mein sale-amount
 *     calculate kar paayenge, rate khaali/0 nahi rahega.
 *   - Agar brand pehle se DB mein hai, sirf woh MRP/Rate fields update hote
 *     hain jo abhi 0 hain — aapke already edit kiye hue rates kabhi
 *     overwrite nahi honge.
 *   - Multi-bottle case-pack entries (jaise "6 Bottle case" ya "24 cans")
 *     PDF se hi skip kar diye gaye the (unka MRP pure case ka hota hai,
 *     single bottle ka nahi — isliye woh is JSON mein shaamil nahi hain).
 *
 * Usage:
 *   cd aims-backend
 *   npm install                                   (agar pehle nahi kiya)
 *   node aims-rajasthan-liquor-migration.js --dry-run     (pehle preview karein)
 *   node aims-rajasthan-liquor-migration.js               (asli migrate)
 *   node aims-rajasthan-liquor-migration.js --mongo <uri> (custom DB URI)
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const MONGO_URI = process.argv.find((a, i) => process.argv[i - 1] === '--mongo')
  || process.env.MONGO_URI
  || 'mongodb://127.0.0.1:27017/aims';

const DRY_RUN = process.argv.includes('--dry-run');

const DATA_FILE = path.join(__dirname, 'aims-rajasthan-liquor-brands.json');

async function migrate() {
  console.log('='.repeat(55));
  console.log('AIMS Rajasthan Liquor Price List Migration');
  console.log('='.repeat(55));
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (kuch save nahi hoga)' : 'LIVE (DB mein likha jayega)'}`);
  if (!DRY_RUN) console.log(`Mongo URI: ${MONGO_URI}`);
  console.log('');

  if (!fs.existsSync(DATA_FILE)) {
    console.error(`Data file nahi mili: ${DATA_FILE}`);
    process.exit(1);
  }
  const brands = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  console.log(`Source JSON: ${brands.length} brands\n`);

  let MasterBrand;
  if (!DRY_RUN) {
    await mongoose.connect(MONGO_URI);
    console.log('[MongoDB] Connected\n');

    const masterBrandSchema = new mongoose.Schema(
      {
        name: { type: String, required: true, trim: true },
        cat: { type: String, enum: ['whisky', 'rum', 'beer', 'gin', 'vodka', 'desi', 'other'], default: 'other' },
        mrpBot: { type: Number, default: 0 },
        mrpHalf: { type: Number, default: 0 },
        mrpNips: { type: Number, default: 0 },
        rateBot: { type: Number, default: 0 },
        rateHalf: { type: Number, default: 0 },
        rateNips: { type: Number, default: 0 },
      },
      { timestamps: true }
    );
    masterBrandSchema.index({ name: 1 }, { unique: true });

    try { MasterBrand = mongoose.model('MasterBrand'); }
    catch { MasterBrand = mongoose.model('MasterBrand', masterBrandSchema); }
  }

  const stats = { inserted: 0, updated: 0, skipped: 0, errors: 0 };

  for (const b of brands) {
    if (DRY_RUN) {
      console.log(`  [DRY] Upsert: ${b.name.padEnd(48)} cat=${b.cat.padEnd(7)} mrpBot=${b.mrpBot} mrpHalf=${b.mrpHalf} mrpNips=${b.mrpNips} rateBot=${b.rateBot} rateHalf=${b.rateHalf} rateNips=${b.rateNips}`);
      stats.inserted++;
      continue;
    }
    try {
      const existing = await MasterBrand.findOne({ name: b.name });
      if (existing) {
        // Brand pehle se hai — sirf MRP/Rate fields fill karo jo abhi 0 hain,
        // taaki user ke already-set rates/mrp kabhi overwrite na ho.
        const updates = {};
        if (!existing.mrpBot && b.mrpBot) updates.mrpBot = b.mrpBot;
        if (!existing.mrpHalf && b.mrpHalf) updates.mrpHalf = b.mrpHalf;
        if (!existing.mrpNips && b.mrpNips) updates.mrpNips = b.mrpNips;
        if (!existing.rateBot && b.rateBot) updates.rateBot = b.rateBot;
        if (!existing.rateHalf && b.rateHalf) updates.rateHalf = b.rateHalf;
        if (!existing.rateNips && b.rateNips) updates.rateNips = b.rateNips;
        if ((!existing.cat || existing.cat === 'other') && b.cat) updates.cat = b.cat;
        if (Object.keys(updates).length) {
          await MasterBrand.updateOne({ _id: existing._id }, { $set: updates });
          stats.updated++;
        } else {
          stats.skipped++;
        }
      } else {
        await MasterBrand.create(b);
        stats.inserted++;
      }
    } catch (e) {
      if (e.code === 11000) { stats.skipped++; }
      else { console.error(`  Error: ${b.name}:`, e.message); stats.errors++; }
    }
  }

  console.log('');
  console.log('='.repeat(55));
  if (DRY_RUN) {
    console.log(`DRY RUN complete. ${stats.inserted} brands migrate honge.`);
    console.log('Asli migrate karne ke liye --dry-run hatao.');
  } else {
    console.log('Migration complete!');
    console.log(`  Naye brands add hue:     ${stats.inserted}`);
    console.log(`  Existing brands update:  ${stats.updated}`);
    console.log(`  Skip (kuch nahi badla):  ${stats.skipped}`);
    console.log(`  Errors:                  ${stats.errors}`);
    console.log(`  MasterBrands total in DB: ${await MasterBrand.countDocuments()}`);
    await mongoose.connection.close();
    console.log('\n[MongoDB] Connection closed');
  }
  console.log('='.repeat(55));
}

migrate().catch(e => {
  console.error('\nMigration failed:', e.message);
  process.exit(1);
});
