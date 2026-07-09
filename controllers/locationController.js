const Location = require('../models/Location');

exports.list = async (req, res) => {
  try {
    const { shop } = req.query;
    const filter = {};
    if (shop) filter.shop = shop;
    const items = await Location.find(filter).sort({ name: 1 }).lean();
    res.json({ success: true, count: items.length, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch locations', error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, shop } = req.body;
    if (!name || !shop) return res.status(400).json({ success: false, message: 'name and shop are required' });
    const item = await Location.create({ name, shop });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create location', error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const item = await Location.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Location not found' });
    res.json({ success: true, message: 'Location deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete location', error: err.message });
  }
};
