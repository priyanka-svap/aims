const BrandRate = require('../models/BrandRate');

// GET /api/inventory?shop=rora&cat=whisky&search=mc&page=1&limit=50
exports.list = async (req, res) => {
  try {
    const { shop, cat, search, active, page = 1, limit = 100 } = req.query;
    const filter = {};
    if (shop && shop !== 'all') filter.shop = shop;
    if (cat && cat !== 'all') filter.cat = cat;
    if (active !== undefined) filter.active = active === 'true';
    if (search) filter.name = { $regex: search, $options: 'i' };

    const pageNum = Math.max(parseInt(page) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit) || 100, 1), 500);

    const [items, total] = await Promise.all([
      BrandRate.find(filter)
        .sort({ shop: 1, name: 1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean(),
      BrandRate.countDocuments(filter),
    ]);

    res.json({
      success: true,
      count: items.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      data: items,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch inventory', error: err.message });
  }
};

// GET /api/inventory/:id
exports.getOne = async (req, res) => {
  try {
    const item = await BrandRate.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Inventory item not found' });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch item', error: err.message });
  }
};

// POST /api/inventory
exports.create = async (req, res) => {
  try {
    const { name, shop, cat, bot, half, nips, stock, active } = req.body;
    if (!name || !shop) {
      return res.status(400).json({ success: false, message: 'name and shop are required' });
    }

    const exists = await BrandRate.findOne({ name: name.trim(), shop: shop.trim() });
    if (exists) {
      return res.status(409).json({ success: false, message: 'This brand already exists for this shop' });
    }

    // active defaults true (schema default) unless the caller explicitly creates it disabled
    // (e.g. a brand unticked in Shop Edit before it ever had its own BrandRate row) — in that
    // case stamp disabledAt too, so historical listings can tell "was active as of date X".
    const isActive = active === undefined ? true : !!active;

    const item = await BrandRate.create({
      name: name.trim(),
      shop: shop.trim(),
      cat: cat || 'whisky',
      bot: Number(bot) || 0,
      half: Number(half) || 0,
      nips: Number(nips) || 0,
      stock: {
        bot: Number(stock?.bot) || 0,
        half: Number(stock?.half) || 0,
        nips: Number(stock?.nips) || 0,
      },
      active: isActive,
      disabledAt: isActive ? null : new Date(),
    });

    res.status(201).json({ success: true, data: item });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'This brand already exists for this shop' });
    }
    res.status(500).json({ success: false, message: 'Failed to create inventory item', error: err.message });
  }
};

// PUT /api/inventory/:id  (full update - name/shop/cat/rates)
exports.update = async (req, res) => {
  try {
    const { name, shop, cat, bot, half, nips, active } = req.body;
    const item = await BrandRate.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Inventory item not found' });

    if (name !== undefined) item.name = name.trim();
    if (shop !== undefined) item.shop = shop.trim();
    if (cat !== undefined) item.cat = cat;
    if (bot !== undefined) item.bot = Number(bot) || 0;
    if (half !== undefined) item.half = Number(half) || 0;
    if (nips !== undefined) item.nips = Number(nips) || 0;
    if (active !== undefined) {
      const newActive = !!active;
      // Auto-stamp disabledAt only on an actual active→inactive transition (and clear it on
      // inactive→active) — this is what lets a historical listing later tell "was this brand
      // active as of date X" instead of only ever reflecting today's current flag.
      if (newActive !== item.active) {
        item.disabledAt = newActive ? null : new Date();
      }
      item.active = newActive;
    }

    await item.save();
    res.json({ success: true, data: item });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'This brand already exists for this shop' });
    }
    res.status(500).json({ success: false, message: 'Failed to update inventory item', error: err.message });
  }
};

// PUT /api/inventory/bulk  — upsert many BrandRate rows in ONE round-trip, keyed by {name, shop}.
// Body: { items: [ {name, shop, cat, bot, half, nips, active}, ... ] }
// Added because the Shop Edit "Save Changes" flow used to fire one HTTP request per brand
// (a shop with 50+ brands meant 50+ sequential/batched round-trips, each paying full HTTP +
// Mongo-connection overhead) — this collapses the whole save into a single MongoDB bulkWrite.
exports.bulkUpsert = async (req, res) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (!items.length) {
      return res.status(400).json({ success: false, message: 'items array required' });
    }
    if (items.length > 500) {
      return res.status(400).json({ success: false, message: 'Max 500 items per bulk request' });
    }

    const now = new Date();
    const ops = items
      .map((it) => {
        const name = (it.name || '').trim();
        const shop = (it.shop || '').trim();
        if (!name || !shop) return null;
        const set = { cat: it.cat || 'whisky' };
        if (it.bot !== undefined) set.bot = Number(it.bot) || 0;
        if (it.half !== undefined) set.half = Number(it.half) || 0;
        if (it.nips !== undefined) set.nips = Number(it.nips) || 0;
        if (it.active !== undefined) {
          // Bulk mode can't cheaply read each doc's previous active state first, so unlike the
          // single-item PUT this stamps disabledAt on every active:false item (not just actual
          // transitions) — a minor accuracy trade-off for the speed win.
          set.active = !!it.active;
          set.disabledAt = set.active ? null : now;
        }
        return {
          updateOne: {
            filter: { name, shop },
            update: { $set: set, $setOnInsert: { name, shop } },
            upsert: true,
          },
        };
      })
      .filter(Boolean);

    if (!ops.length) {
      return res.status(400).json({ success: false, message: 'No valid items (name/shop required)' });
    }

    const result = await BrandRate.bulkWrite(ops, { ordered: false });
    res.json({
      success: true,
      matched: result.matchedCount,
      modified: result.modifiedCount,
      upserted: result.upsertedCount,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Bulk upsert failed', error: err.message });
  }
};

// PATCH /api/inventory/:id/stock  (adjust stock quantities, e.g. after inward/outward)
exports.adjustStock = async (req, res) => {
  try {
    const { bot = 0, half = 0, nips = 0, mode = 'add' } = req.body; // mode: 'add' | 'subtract' | 'set'
    const item = await BrandRate.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Inventory item not found' });

    const apply = (cur, val) => {
      if (mode === 'set') return Number(val) || 0;
      if (mode === 'subtract') return Math.max(0, cur - (Number(val) || 0));
      return cur + (Number(val) || 0); // add
    };

    item.stock.bot = apply(item.stock.bot, bot);
    item.stock.half = apply(item.stock.half, half);
    item.stock.nips = apply(item.stock.nips, nips);

    await item.save();
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to adjust stock', error: err.message });
  }
};

// DELETE /api/inventory/:id
exports.remove = async (req, res) => {
  try {
    const item = await BrandRate.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Inventory item not found' });
    res.json({ success: true, message: 'Inventory item deleted', data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete inventory item', error: err.message });
  }
};

// GET /api/inventory/low-stock?threshold=10
exports.lowStock = async (req, res) => {
  try {
    const threshold = Number(req.query.threshold) || 10;
    const items = await BrandRate.find({
      active: true,
      $expr: {
        $lt: [{ $add: ['$stock.bot', '$stock.half', '$stock.nips'] }, threshold],
      },
    }).sort({ shop: 1, name: 1 }).lean();
    res.json({ success: true, count: items.length, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch low stock items', error: err.message });
  }
};
