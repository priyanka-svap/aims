const CircleSheet = require('../models/CircleSheet');
const CircleOutward = require('../models/CircleOutward');
const CircleParty = require('../models/CircleParty');
const CircleBrand = require('../models/CircleBrand');
const CirclePartyLedger = require('../models/CirclePartyLedger');
const CircleInward = require('../models/CircleInward');

// ── Sheets ──
// GET /api/circle/sheets?date=2026-04-01
exports.listSheets = async (req, res) => {
  try {
    const { date } = req.query;
    const filter = {};
    if (date) filter.date = date;
    const rows = await CircleSheet.find(filter).sort({ date: -1 }).lean();
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch circle sheets', error: err.message });
  }
};

// POST /api/circle/sheets  (upsert by date — one sheet per date, matches circMergeDuplicateDateSheets logic)
exports.upsertSheet = async (req, res) => {
  try {
    const { date } = req.body;
    if (!date) return res.status(400).json({ success: false, message: 'date is required' });

    const row = await CircleSheet.findOneAndUpdate(
      { date },
      { $set: req.body },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to save circle sheet', error: err.message });
  }
};

exports.removeSheet = async (req, res) => {
  try {
    const row = await CircleSheet.findByIdAndDelete(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Circle sheet not found' });
    res.json({ success: true, message: 'Circle sheet deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete circle sheet', error: err.message });
  }
};

// ── Outward ──
// GET /api/circle/outward?date=&partyId=
exports.listOutward = async (req, res) => {
  try {
    const { date, partyId, from, to } = req.query;
    const filter = {};
    if (date) filter.date = date;
    if (partyId) filter.partyId = partyId;
    if (from || to) {
      filter.date = filter.date || {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }
    const rows = await CircleOutward.find(filter).sort({ date: -1, createdAt: -1 }).lean();
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch circle outward', error: err.message });
  }
};

exports.createOutward = async (req, res) => {
  try {
    const { date } = req.body;
    if (!date) return res.status(400).json({ success: false, message: 'date is required' });
    const row = await CircleOutward.create(req.body);
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create circle outward', error: err.message });
  }
};

exports.removeOutward = async (req, res) => {
  try {
    const row = await CircleOutward.findByIdAndDelete(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Circle outward entry not found' });
    res.json({ success: true, message: 'Circle outward entry deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete circle outward', error: err.message });
  }
};

// ── Party Ledger (new dynamic Excel-style day-sheet, scoped per circle shop) ──
// GET /api/circle/party-ledger?shop=circle&date=2026-07-03
exports.listPartyLedger = async (req, res) => {
  try {
    const { shop, date, from, to } = req.query;
    const filter = {};
    if (shop) filter.shop = shop;
    if (date) filter.date = date;
    if (from || to) {
      filter.date = filter.date || {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }
    const rows = await CirclePartyLedger.find(filter).sort({ date: -1 }).lean();
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch party ledger', error: err.message });
  }
};

// POST /api/circle/party-ledger  (upsert by date+shop — one sheet per shop per date)
exports.upsertPartyLedger = async (req, res) => {
  try {
    const { date, shop } = req.body;
    if (!date || !shop) return res.status(400).json({ success: false, message: 'date and shop are required' });

    const row = await CirclePartyLedger.findOneAndUpdate(
      { date, shop },
      { $set: req.body },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to save party ledger', error: err.message });
  }
};

exports.removePartyLedger = async (req, res) => {
  try {
    const row = await CirclePartyLedger.findByIdAndDelete(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Party ledger entry not found' });
    res.json({ success: true, message: 'Party ledger entry deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete party ledger', error: err.message });
  }
};

// ── Inward (stock arriving into a circle shop) ──
// GET /api/circle/inward?shop=circle&date=&from=&to=
exports.listInward = async (req, res) => {
  try {
    const { shop, date, from, to } = req.query;
    const filter = {};
    if (shop) filter.shop = shop;
    if (date) filter.date = date;
    if (from || to) {
      filter.date = filter.date || {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }
    const rows = await CircleInward.find(filter).sort({ date: -1, createdAt: -1 }).lean();
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch circle inward', error: err.message });
  }
};

exports.createInward = async (req, res) => {
  try {
    const { date, shop } = req.body;
    if (!date || !shop) return res.status(400).json({ success: false, message: 'date and shop are required' });
    const row = await CircleInward.create(req.body);
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create circle inward', error: err.message });
  }
};

exports.removeInward = async (req, res) => {
  try {
    const row = await CircleInward.findByIdAndDelete(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Circle inward entry not found' });
    res.json({ success: true, message: 'Circle inward entry deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete circle inward', error: err.message });
  }
};

// ── Parties ──
exports.listParties = async (req, res) => {
  try {
    const rows = await CircleParty.find().sort({ name: 1 }).lean();
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch circle parties', error: err.message });
  }
};

exports.createParty = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'name is required' });
    const row = await CircleParty.create(req.body);
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create circle party', error: err.message });
  }
};

exports.updateParty = async (req, res) => {
  try {
    const row = await CircleParty.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!row) return res.status(404).json({ success: false, message: 'Circle party not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update circle party', error: err.message });
  }
};

exports.removeParty = async (req, res) => {
  try {
    const row = await CircleParty.findByIdAndDelete(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Circle party not found' });
    res.json({ success: true, message: 'Circle party deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete circle party', error: err.message });
  }
};

// ── Brands (Circle's own english/beer/desi rate list) ──
exports.listBrands = async (req, res) => {
  try {
    const { cat } = req.query;
    const filter = {};
    if (cat) filter.cat = cat;
    const rows = await CircleBrand.find(filter).sort({ cat: 1, name: 1 }).lean();
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch circle brands', error: err.message });
  }
};

exports.createBrand = async (req, res) => {
  try {
    const { name, cat } = req.body;
    if (!name || !cat) return res.status(400).json({ success: false, message: 'name and cat are required' });
    const row = await CircleBrand.create(req.body);
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'This Circle brand already exists' });
    res.status(500).json({ success: false, message: 'Failed to create circle brand', error: err.message });
  }
};

exports.updateBrand = async (req, res) => {
  try {
    const row = await CircleBrand.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!row) return res.status(404).json({ success: false, message: 'Circle brand not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update circle brand', error: err.message });
  }
};

exports.removeBrand = async (req, res) => {
  try {
    const row = await CircleBrand.findByIdAndDelete(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Circle brand not found' });
    res.json({ success: true, message: 'Circle brand deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete circle brand', error: err.message });
  }
};
