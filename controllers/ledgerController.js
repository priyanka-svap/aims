const LedgerEntry = require('../models/LedgerEntry');

// GET /api/ledger/:store?direction=inward&from=&to=
exports.list = async (req, res) => {
  try {
    const { store } = req.params; // circle | nokha | warehouse
    const { direction, from, to, brand } = req.query;
    const filter = { store };
    if (direction) filter.direction = direction;
    if (brand) filter.brand = { $regex: brand, $options: 'i' };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }
    const rows = await LedgerEntry.find(filter).sort({ date: -1, createdAt: -1 }).lean();
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch ledger entries', error: err.message });
  }
};

// POST /api/ledger/:store
exports.create = async (req, res) => {
  try {
    const { store } = req.params;
    const { direction, date } = req.body;
    if (!direction || !['inward', 'outward', 'sales'].includes(direction)) {
      return res.status(400).json({ success: false, message: "direction must be 'inward', 'outward', or 'sales'" });
    }
    if (!date) return res.status(400).json({ success: false, message: 'date is required' });

    const entry = await LedgerEntry.create({ ...req.body, store });
    res.status(201).json({ success: true, data: entry });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create ledger entry', error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const entry = await LedgerEntry.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
    if (!entry) return res.status(404).json({ success: false, message: 'Ledger entry not found' });
    res.json({ success: true, data: entry });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update ledger entry', error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const entry = await LedgerEntry.findByIdAndDelete(req.params.id);
    if (!entry) return res.status(404).json({ success: false, message: 'Ledger entry not found' });
    res.json({ success: true, message: 'Ledger entry deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete ledger entry', error: err.message });
  }
};
