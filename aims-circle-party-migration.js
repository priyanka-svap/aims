#!/usr/bin/env node
/**
 * AIMS Circle Party Migration Script
 * ====================================
 * Circle sheet (Party Name row) mein jitne bhi party ke naam hain,
 * un sabko CircleParty master collection mein migrate karta hai.
 *
 * Usage:
 *   node aims-circle-party-migration.js
 *   node aims-circle-party-migration.js --mongo mongodb://localhost:27017/aims
 *   node aims-circle-party-migration.js --dry-run
 *
 * Prerequisites (aims-backend folder mein):
 *   npm install
 */

require('dotenv').config();
const mongoose = require('mongoose');
const CircleParty = require('./models/CircleParty');

const MONGO_URI = process.argv.find((a, i) => process.argv[i - 1] === '--mongo')
  || process.env.MONGO_URI
  || 'mongodb://127.0.0.1:27017/aims';

const DRY_RUN = process.argv.includes('--dry-run');

// ── Circle sheet ke "Party Name" row se nikale gaye sare unique party naam ──
// (Row 3 har day-sheet mein, har party 3 columns span karti hai: Pcs/Rate/Amt.
//  "Total" aur "Grand Total" summary columns hain, party naam nahi.)

const partyNames = [
  'Aape Singh',
  'Akhe Singh (Silwa)',
  'Babulal Ricco (Bikasar)',
  'Bajrang Bhadu',
  'Balveer Singh',
  'Bhanwar Singh (Nokha Goan)',
  'Bhanwar Singh (Raisar0',
  'Bikasar Fanta',
  'Chailu Singh Ji (Silwa)',
  'Chhagan Ji (Dashnu)',
  'Chhagan Singh',
  'Dalaram Ji Nayak (Dhawa)',
  'Dhannesingh Ji (Silwa)',
  'Durga Singh Ji (Silwa)',
  'Ganga Singh JI',
  'Ganga Singh ji Kanvlisar',
  'Jendra Singh Ji (Bandhra)',
  'Jetha Ram',
  'Jitendra Gattu',
  'Karni Singh',
  'Khetu Dan',
  'Lilka Kumbhara',
  'Madiya',
  'Mahendra Singh',
  'Manohar Singh Ji (Dhawa)',
  'Murli Singh',
  'Pintu Ricco (Bikasar)',
  'Pooran Singh',
  'Prahlad Ji (Raisar)',
  'Prahlad Singh Ji (Silwa)',
  'Prem Singh Kanvlisar',
  'Puran Singh Ji (Silwa)',
  'Purkharam Ji Ricco',
  'Ramesh Giri',
  'Ramesh Giri Hiyadesar Fanta',
  'Ramniwas Ji Baba Ram Dev Hotel Baypass',
  'Rampal Godara (Biramsar)',
  'Ramu Singh (Bandhda)',
  'Roda Gaon',
  'Sampt Ji (Raisar)',
  'Shyam Hotel',
  'Siya Hotel',
  'Sohan Singh Ji (Silwa)',
  'Sundar Lal',
  'Tiku Ram',
  'Vikram Singh',
];

// ── Main ────────────────────────────────────────────────────────────────────

async function migrate() {
  console.log('='.repeat(55));
  console.log('  AIMS Circle Party Migration Script');
  console.log(DRY_RUN ? '  MODE: DRY RUN (kuch save nahi hoga)' : `  MODE: LIVE → ${MONGO_URI}`);
  console.log('='.repeat(55) + '\n');

  console.log(`Parties: ${partyNames.length} records migrate honge\n`);

  if (!DRY_RUN) {
    await mongoose.connect(MONGO_URI);
    console.log(`[MongoDB] Connected → ${mongoose.connection.host}/${mongoose.connection.name}\n`);
  }

  const stats = { inserted: 0, skipped: 0, errors: 0 };

  for (const name of partyNames) {
    if (DRY_RUN) {
      console.log(`  [DRY] Upsert CircleParty: ${name}`);
      stats.inserted++;
      continue;
    }
    try {
      const existing = await CircleParty.findOne({ name });
      if (existing) {
        stats.skipped++;
      } else {
        await CircleParty.create({ name });
        stats.inserted++;
      }
    } catch (e) {
      if (e.code === 11000) { stats.skipped++; }
      else { console.error(`  Error: ${name}:`, e.message); stats.errors++; }
    }
  }

  console.log(`\n  ✓ Inserted: ${stats.inserted}  Skipped (already exist): ${stats.skipped}  Errors: ${stats.errors}\n`);

  console.log('='.repeat(55));
  if (DRY_RUN) {
    console.log('DRY RUN complete. Actual migrate karne ke liye --dry-run hatao.');
  } else {
    console.log('✅ Migration complete!');
    console.log(`   CircleParty in DB: ${await CircleParty.countDocuments()}`);
    await mongoose.connection.close();
    console.log('\n[MongoDB] Connection closed');
  }
  console.log('='.repeat(55));
}

migrate().catch(e => {
  console.error('\nMigration failed:', e.message);
  process.exit(1);
});
