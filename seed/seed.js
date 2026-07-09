// Seeds MongoDB with the static data that used to live inline in the HTML file
// (DB.shops, DB.locations, DB.brandRates, cashData) so the app works out of the box.
//
// Run with: npm run seed

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const Shop = require('../models/Shop');
const Location = require('../models/Location');
const BrandRate = require('../models/BrandRate');
const CashAccount = require('../models/CashAccount');
const User = require('../models/User');

const shops = [
  { slug: 'rora', name: 'Rora', type: 'english', location: 'Rora', manager: '', active: true, builtin: true },
  { slug: 'main', name: 'Main Shop', type: 'mixed', location: 'Nokha', manager: '', active: true, builtin: true },
  { slug: 'circle', name: 'Circle', type: 'desi', location: 'Circle', manager: '', active: true, builtin: true },
];

const locations = [
  { name: 'Bikasar Fanta', shop: 'circle' },
  { name: 'Shyam Hotel', shop: 'circle' },
  { name: 'Siya Hotel', shop: 'circle' },
  { name: 'Madiya', shop: 'circle' },
  { name: 'Raisar', shop: 'circle' },
  { name: 'Dashnu', shop: 'circle' },
  { name: 'Purkharam Ji', shop: 'circle' },
  { name: 'Khetu Dan', shop: 'circle' },
  { name: 'Bajrang Bhadu', shop: 'circle' },
  { name: 'Roda Gaon', shop: 'circle' },
  { name: 'Bikasar', shop: 'main' },
  { name: 'Charkada Ganv', shop: 'main' },
  { name: 'Charkada Godam', shop: 'main' },
  { name: 'Shop 04', shop: 'main' },
  { name: 'Shop 02', shop: 'main' },
  { name: 'Shop 03', shop: 'main' },
];

const brandRates = [
  { name: 'Mc Dowells', shop: 'rora', cat: 'whisky', bot: 620, half: 320, nips: 170 },
  { name: 'Green Lable', shop: 'rora', cat: 'whisky', bot: 500, half: 250, nips: 140 },
  { name: 'Royal Stage', shop: 'rora', cat: 'whisky', bot: 750, half: 380, nips: 190 },
  { name: 'Imperial Blue', shop: 'rora', cat: 'whisky', bot: 660, half: 340, nips: 180 },
  { name: 'Royal Challenge', shop: 'rora', cat: 'whisky', bot: 750, half: 380, nips: 190 },
  { name: 'All Season', shop: 'rora', cat: 'whisky', bot: 750, half: 380, nips: 190 },
  { name: 'Officer Choice', shop: 'rora', cat: 'whisky', bot: 500, half: 250, nips: 140 },
  { name: 'Blender Pride', shop: 'rora', cat: 'whisky', bot: 1050, half: 530, nips: 270 },
  { name: 'Signature Premium', shop: 'rora', cat: 'whisky', bot: 1100, half: 550, nips: 280 },
  { name: 'Signature Rare', shop: 'rora', cat: 'whisky', bot: 1000, half: 550, nips: 250 },
  { name: 'Teacher 50', shop: 'main', cat: 'whisky', bot: 1800, half: 0, nips: 0 },
  { name: 'Black Dog Black', shop: 'main', cat: 'whisky', bot: 2200, half: 0, nips: 200 },
  { name: '100 Piper', shop: 'main', cat: 'whisky', bot: 2400, half: 0, nips: 0 },
  { name: 'Blender Pride', shop: 'main', cat: 'whisky', bot: 1050, half: 530, nips: 270 },
  { name: 'Royal Stage', shop: 'main', cat: 'whisky', bot: 750, half: 380, nips: 190 },
  { name: 'Mc Dowells', shop: 'main', cat: 'whisky', bot: 620, half: 320, nips: 170 },
  { name: 'Kingfisher Beer', shop: 'main', cat: 'beer', bot: 120, half: 80, nips: 0 },
  { name: 'RS Pav', shop: 'circle', cat: 'desi', bot: 0, half: 0, nips: 190 },
  { name: 'No 01 Pav', shop: 'circle', cat: 'desi', bot: 0, half: 0, nips: 170 },
  { name: 'GL Pav', shop: 'circle', cat: 'desi', bot: 0, half: 0, nips: 140 },
  { name: 'As Pav', shop: 'circle', cat: 'desi', bot: 0, half: 0, nips: 190 },
  { name: 'Oc Pav', shop: 'circle', cat: 'desi', bot: 0, half: 0, nips: 140 },
];

const cashData = [
  { date: '2026-04-01', eng: 78350, beer: 106020, desi: 117540, total: 301910, comm: 0, circExp: 130, diesel: 4000, other: 0, net: 297780, phone: 39900, cash: 257880, recv: 257700, diff: -180, remark: 'Purkha Ram Ji Diffrance' },
  { date: '2026-04-02', eng: 114390, beer: 76800, desi: 71620, total: 262810, comm: 0, circExp: 110, diesel: 0, other: 0, net: 262700, phone: 66350, cash: 196350, recv: 196350, diff: 0, remark: '' },
  { date: '2026-04-03', eng: 89720, beer: 112920, desi: 105400, total: 308040, comm: 0, circExp: 230, diesel: 0, other: 15000, net: 292810, phone: 56400, cash: 236410, recv: 235700, diff: -710, remark: '15000 Himmat Singh Salary' },
  { date: '2026-04-04', eng: 71310, beer: 49680, desi: 53260, total: 174250, comm: 0, circExp: 150, diesel: 4000, other: 15000, net: 155100, phone: 61600, cash: 93500, recv: 93500, diff: 0, remark: '15000 rashan kharida' },
  { date: '2026-04-05', eng: 81400, beer: 105620, desi: 100650, total: 287670, comm: 0, circExp: 100, diesel: 0, other: 15000, net: 272570, phone: 72500, cash: 200070, recv: 200100, diff: 30, remark: 'Prahlad ji Total Diffrance' },
  { date: '2026-04-06', eng: 62495, beer: 56880, desi: 72410, total: 191785, comm: 0, circExp: 1040, diesel: 0, other: 0, net: 190745, phone: 53600, cash: 137145, recv: 137000, diff: -145, remark: '500 pappu peshi exp' },
  { date: '2026-04-07', eng: 51705, beer: 108780, desi: 116880, total: 277365, comm: 0, circExp: 140, diesel: 4000, other: 12000, net: 261225, phone: 29750, cash: 231475, recv: 231250, diff: -225, remark: 'Madiya MM Bottle Diffrance' },
  { date: '2026-04-08', eng: 72240, beer: 34560, desi: 62640, total: 169440, comm: 0, circExp: 140, diesel: 0, other: 18000, net: 151300, phone: 25700, cash: 125600, recv: 125600, diff: 0, remark: '18000 Surendra Singh Salary' },
  { date: '2026-04-09', eng: 65095, beer: 61440, desi: 128910, total: 255445, comm: 0, circExp: 150, diesel: 0, other: 0, net: 255295, phone: 106500, cash: 148795, recv: 148800, diff: 5, remark: 'Khetu Dan Total Diffrance' },
  { date: '2026-04-10', eng: 46035, beer: 42360, desi: 74880, total: 163275, comm: 0, circExp: 180, diesel: 4000, other: 0, net: 159095, phone: 37300, cash: 121795, recv: 121800, diff: 5, remark: 'Khetu dan Total Diffrance' },
  { date: '2026-04-11', eng: 79320, beer: 99420, desi: 95280, total: 274020, comm: 0, circExp: 120, diesel: 0, other: 0, net: 273900, phone: 45200, cash: 228700, recv: 229000, diff: 300, remark: 'Shyam Hotel & Madiya Total Diffrance' },
  { date: '2026-04-12', eng: 50680, beer: 65940, desi: 59520, total: 176140, comm: 0, circExp: 160, diesel: 0, other: 1000, net: 174980, phone: 36000, cash: 138980, recv: 138900, diff: -80, remark: 'Shyam Hotel Total Diffrance 1000 Fast tag' },
  { date: '2026-04-13', eng: 52615, beer: 90240, desi: 102880, total: 245735, comm: 2680, circExp: 120, diesel: 4000, other: 69660, net: 169275, phone: 64560, cash: 104715, recv: 105700, diff: 985, remark: 'Ganga Singh branch diff 69660 kaku puliya' },
  { date: '2026-04-14', eng: 54910, beer: 69600, desi: 71800, total: 196310, comm: 0, circExp: 110, diesel: 0, other: 0, net: 196200, phone: 58600, cash: 137600, recv: 137600, diff: 0, remark: '' },
  { date: '2026-04-15', eng: 64990, beer: 95280, desi: 122720, total: 282990, comm: 0, circExp: 130, diesel: 0, other: 0, net: 282860, phone: 109900, cash: 172960, recv: 165000, diff: -7960, remark: '40 Bajrang Bhadu Total Diffrance' },
  { date: '2026-04-16', eng: 69380, beer: 78480, desi: 67440, total: 215300, comm: 0, circExp: 100, diesel: 4000, other: 0, net: 211200, phone: 97700, cash: 113500, recv: 113500, diff: 0, remark: '' },
  { date: '2026-04-17', eng: 65645, beer: 106320, desi: 112350, total: 284315, comm: 0, circExp: 120, diesel: 0, other: 0, net: 284195, phone: 57850, cash: 226345, recv: 226350, diff: 5, remark: '5 Khetu Dan Diffrance' },
  { date: '2026-04-18', eng: 81700, beer: 126660, desi: 70560, total: 278920, comm: 0, circExp: 170, diesel: 0, other: 0, net: 278750, phone: 91150, cash: 187600, recv: 187550, diff: -50, remark: 'Madiya Total Diffrance' },
];

async function seed() {
  await connectDB();
  console.log('Seeding database...');

  // Shops (upsert by slug)
  for (const s of shops) {
    await Shop.findOneAndUpdate({ slug: s.slug }, s, { upsert: true, new: true });
  }
  console.log(`✓ Shops seeded (${shops.length})`);

  // Locations (skip if any already exist, to avoid duplicates on re-run)
  const locCount = await Location.countDocuments();
  if (locCount === 0) {
    await Location.insertMany(locations);
    console.log(`✓ Locations seeded (${locations.length})`);
  } else {
    console.log(`- Locations already present (${locCount}), skipped`);
  }

  // Brand rates (upsert by name+shop)
  for (const b of brandRates) {
    await BrandRate.findOneAndUpdate(
      { name: b.name, shop: b.shop },
      { $set: b },
      { upsert: true, new: true }
    );
  }
  console.log(`✓ Brand rates seeded (${brandRates.length})`);

  // Cash accounts (upsert by date)
  for (const c of cashData) {
    await CashAccount.findOneAndUpdate({ date: c.date }, { $set: c }, { upsert: true, new: true });
  }
  console.log(`✓ Cash accounts seeded (${cashData.length})`);

  // Admin user
  const adminUsername = (process.env.ADMIN_USERNAME || 'admin').toLowerCase();
  const adminExists = await User.findOne({ username: adminUsername });
  if (!adminExists) {
    await User.create({
      username: adminUsername,
      password: process.env.ADMIN_PASSWORD || 'admin123',
      name: process.env.ADMIN_NAME || 'Administrator',
      role: 'admin',
    });
    console.log(`✓ Admin user created -> username: ${adminUsername} / password: ${process.env.ADMIN_PASSWORD || 'admin123'}`);
  } else {
    console.log('- Admin user already exists, skipped');
  }

  console.log('Seeding complete.');
  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
