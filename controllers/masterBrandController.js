const MasterBrand = require('../models/MasterBrand');

// GET /api/brands?search=&cat=
exports.list = async (req, res) => {
  try {
    const { search, cat } = req.query;
    const filter = {};
    if (search) filter.name = { $regex: search, $options: 'i' };
    if (cat) filter.cat = cat;
    const rows = await MasterBrand.find(filter).sort({ name: 1 }).lean();
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch brands', error: err.message });
  }
};

// GET /api/brands/:id
exports.getOne = async (req, res) => {
  try {
    const row = await MasterBrand.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Brand not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch brand', error: err.message });
  }
};

// POST /api/brands
exports.create = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'name is required' });
    const row = await MasterBrand.create(req.body);
    res.status(201).json({ success: true, data: row });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'This brand already exists' });
    res.status(500).json({ success: false, message: 'Failed to create brand', error: err.message });
  }
};

// PUT /api/brands/:id
exports.update = async (req, res) => {
  try {
    const row = await MasterBrand.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!row) return res.status(404).json({ success: false, message: 'Brand not found' });
    res.json({ success: true, data: row });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'This brand already exists' });
    res.status(500).json({ success: false, message: 'Failed to update brand', error: err.message });
  }
};

// DELETE /api/brands/:id
exports.remove = async (req, res) => {
  try {
    const row = await MasterBrand.findByIdAndDelete(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Brand not found' });
    res.json({ success: true, message: 'Brand deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete brand', error: err.message });
  }
};
