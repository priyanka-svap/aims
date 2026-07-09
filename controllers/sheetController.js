const DaySheet = require('../models/DaySheet');

// GET /api/sheets/:sheetType?date=2026-04-01
exports.list = async (req, res) => {
  try {
    const { sheetType } = req.params;
    const { date } = req.query;
    const filter = { sheetType };
    if (date) filter.date = date;
    const sheets = await DaySheet.find(filter).sort({ date: -1 }).lean();
    res.json({ success: true, count: sheets.length, data: sheets });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch sheets', error: err.message });
  }
};

// POST /api/sheets/:sheetType  (upsert by date)
exports.upsert = async (req, res) => {
  try {
    const { sheetType } = req.params;
    const { date, brands } = req.body;
    if (!date) return res.status(400).json({ success: false, message: 'date is required' });

    const sheet = await DaySheet.findOneAndUpdate(
      { sheetType, date },
      { $set: { brands: brands || [] } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ success: true, data: sheet });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to save sheet', error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const sheet = await DaySheet.findByIdAndDelete(req.params.id);
    if (!sheet) return res.status(404).json({ success: false, message: 'Sheet not found' });
    res.json({ success: true, message: 'Sheet deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete sheet', error: err.message });
  }
};
