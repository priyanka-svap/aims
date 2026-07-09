const Shop = require('../models/Shop');
const Location = require('../models/Location');
const BrandRate = require('../models/BrandRate');
const Movement = require('../models/Movement');
const CashAccount = require('../models/CashAccount');
const LedgerEntry = require('../models/LedgerEntry');
const CircleSheet = require('../models/CircleSheet');
const CircleOutward = require('../models/CircleOutward');
const CircleParty = require('../models/CircleParty');
const CircleBrand = require('../models/CircleBrand');
const MasterBrand = require('../models/MasterBrand');

// GET /api/bootstrap
// Returns everything the AIMS frontend needs to rebuild DB / NDB / WDB / CDB / cashData
// in one round-trip, right after login. Used instead of localStorage on page load.
//
// This is the single most expensive endpoint in the app — it runs on every login/page load and
// its 16 queries grow with the shop's entire history (every sale/inward/outward ever recorded),
// so it's the main reason the API "feels slow" as data piles up. `.lean()` on every read here
// skips Mongoose's document-wrapping (change tracking, getters/setters, virtuals) since this
// data is only ever serialized straight to JSON and never modified in place — same result,
// meaningfully less CPU/memory per request and faster JSON serialization, zero behavior change.
exports.getAll = async (req, res) => {
  try {
    const [
      shops,
      locations,
      brandRates,
      masterBrands,
      movementsInward,
      movementsOutward,
      cashAccounts,
      nokhaInward,
      nokhaOutward,
      warehouseInward,
      warehouseOutward,
      warehouseSales,
      circleSheets,
      circleOutward,
      circleParties,
      circleBrands,
    ] = await Promise.all([
      Shop.find().sort({ name: 1 }).lean(),
      Location.find().sort({ name: 1 }).lean(),
      BrandRate.find().sort({ shop: 1, name: 1 }).lean(),
      MasterBrand.find().sort({ name: 1 }).lean(),
      Movement.find({ type: 'inward' }).sort({ date: -1 }).lean(),
      Movement.find({ type: 'outward' }).sort({ date: -1 }).lean(),
      CashAccount.find().sort({ date: 1 }).lean(),
      LedgerEntry.find({ store: 'nokha', direction: 'inward' }).sort({ date: -1 }).lean(),
      LedgerEntry.find({ store: 'nokha', direction: 'outward' }).sort({ date: -1 }).lean(),
      LedgerEntry.find({ store: 'warehouse', direction: 'inward' }).sort({ date: -1 }).lean(),
      LedgerEntry.find({ store: 'warehouse', direction: 'outward' }).sort({ date: -1 }).lean(),
      LedgerEntry.find({ store: 'warehouse', direction: 'sales' }).sort({ date: -1 }).lean(),
      CircleSheet.find().sort({ date: -1 }).lean(),
      CircleOutward.find().sort({ date: -1 }).lean(),
      CircleParty.find().sort({ name: 1 }).lean(),
      CircleBrand.find().sort({ cat: 1, name: 1 }).lean(),
    ]);

    res.json({
      success: true,
      data: {
        shops,
        locations,
        brandRates,
        masterBrands,
        inward: movementsInward,
        outward: movementsOutward,
        cashAccounts,
        nokha: { inward: nokhaInward, outward: nokhaOutward },
        warehouse: { inward: warehouseInward, outward: warehouseOutward, sales: warehouseSales },
        circle: {
          sheets: circleSheets,
          outward: circleOutward,
          parties: circleParties,
          brands: circleBrands,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load bootstrap data', error: err.message });
  }
};
