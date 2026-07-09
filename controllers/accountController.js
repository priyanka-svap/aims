const CashAccount = require('../models/CashAccount');

// GET /api/accounts?from=2026-04-01&to=2026-04-18
exports.list = async (req, res) => {
  try {
    const { from, to, shop } = req.query;
    const filter = {};
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }
    if (shop) filter.shop = shop;
    const rows = await CashAccount.find(filter).sort({ date: 1 }).lean();
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch accounts', error: err.message });
  }
};

// POST /api/accounts  (upsert by date + shop — one row per shop per day)
exports.upsert = async (req, res) => {
  try {
    const { date } = req.body;
    if (!date) return res.status(400).json({ success: false, message: 'date is required' });
    const shop = req.body.shop || 'warehouse';

    const row = await CashAccount.findOneAndUpdate(
      { date, shop },
      { $set: { ...req.body, shop } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to save account row', error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const row = await CashAccount.findByIdAndDelete(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Account row not found' });
    res.json({ success: true, message: 'Account row deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete account row', error: err.message });
  }
};
