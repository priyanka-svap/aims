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

// Brand-order-only update — any authenticated user (not just admin) can call this. Dragging
// brand rows into a custom order is a routine daily-listing action any shop user does, not a
// shop-management action, so it shouldn't require the admin role that full shop edits need
// (exports.update below, still admin-only). Previously the frontend called the admin-only PUT
// for this too, so every drag-and-drop save from a non-admin account silently 403'd — the order
// looked reordered on screen but never actually reached the DB, so it reverted on refresh and
// never showed up on any other browser/device.
exports.updateBrandOrder = async (req, res) => {
  try {
    const { brandOrder } = req.body;
    if (!Array.isArray(brandOrder)) {
      return res.status(400).json({ success: false, message: 'brandOrder must be an array' });
    }
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found' });
    shop.brandOrder = brandOrder;
    await shop.save();
    res.json({ success: true, data: shop });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to save brand order', error: err.message });
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
