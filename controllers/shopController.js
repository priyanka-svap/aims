const Shop = require('../models/Shop');

exports.list = async (req, res) => {
  try {
    const shops = await Shop.find().sort({ name: 1 }).lean();
    res.json({ success: true, count: shops.length, data: shops });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch shops', error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { slug, name, type, location, manager } = req.body;
    if (!slug || !name) return res.status(400).json({ success: false, message: 'slug and name are required' });
    const shop = await Shop.create({ slug, name, type, location, manager });
    res.status(201).json({ success: true, data: shop });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ success: false, message: 'Shop slug already exists' });
    res.status(500).json({ success: false, message: 'Failed to create shop', error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found' });
    ['name', 'type', 'location', 'manager', 'active', 'brandOrder'].forEach((f) => {
      if (req.body[f] === undefined) return;
      if (f === 'brandOrder' && !Array.isArray(req.body[f])) return; // never overwrite with junk
      shop[f] = req.body[f];
    });
    await shop.save();
    res.json({ success: true, data: shop });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update shop', error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found' });
    if (shop.builtin) return res.status(400).json({ success: false, message: 'Cannot delete a built-in shop' });
    await shop.deleteOne();
    res.json({ success: true, message: 'Shop deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete shop', error: err.message });
  }
};
