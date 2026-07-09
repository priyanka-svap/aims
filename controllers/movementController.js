const Movement = require('../models/Movement');

// GET /api/movements?type=inward&shop=rora&from=2026-04-01&to=2026-04-18
exports.list = async (req, res) => {
  try {
    const { type, shop, brand, from, to, page = 1, limit = 200 } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (shop && shop !== 'all') filter.shop = shop;
    if (brand) filter.brand = { $regex: brand, $options: 'i' };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 200, 1), 1000);

    const [items, total] = await Promise.all([
      Movement.find(filter)
        .sort({ date: -1, createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      Movement.countDocuments(filter),
    ]);

    res.json({ success: true, count: items.length, total, page: pageNum, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch movements', error: err.message });
  }
};

// POST /api/movements  (create inward or outward entry)
exports.create = async (req, res) => {
  try {
    const { type, date, shop, brand, location, bot, half, nips, amt, remark } = req.body;
    if (!type || !['inward', 'outward'].includes(type)) {
      return res.status(400).json({ success: false, message: "type must be 'inward' or 'outward'" });
    }
    if (!date || !brand || !shop) {
      return res.status(400).json({ success: false, message: 'date, shop and brand are required' });
    }

    const entry = await Movement.create({
      type, date, shop, brand,
      location: location || '',
      bot: Number(bot) || 0,
      half: Number(half) || 0,
      nips: Number(nips) || 0,
      amt: Number(amt) || 0,
      remark: remark || '',
      createdBy: req.user?._id,
    });

    res.status(201).json({ success: true, data: entry });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create movement', error: err.message });
  }
};

// PUT /api/movements/:id
exports.update = async (req, res) => {
  try {
    const entry = await Movement.findById(req.params.id);
    if (!entry) return res.status(404).json({ success: false, message: 'Movement not found' });

    const fields = ['date', 'shop', 'brand', 'location', 'bot', 'half', 'nips', 'amt', 'remark'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) entry[f] = req.body[f];
    });

    await entry.save();
    res.json({ success: true, data: entry });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update movement', error: err.message });
  }
};

// DELETE /api/movements/:id
exports.remove = async (req, res) => {
  try {
    const entry = await Movement.findByIdAndDelete(req.params.id);
    if (!entry) return res.status(404).json({ success: false, message: 'Movement not found' });
    res.json({ success: true, message: 'Movement deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete movement', error: err.message });
  }
};
