const AccHead = require('../models/AccHead');
const AccEntry = require('../models/AccEntry');

// ═══════ AccHead (chart-of-accounts) ═══════

// GET /api/acc-heads?shop=nokha
exports.listHeads = async (req, res) => {
  try {
    const { shop } = req.query;
    const filter = {};
    if (shop) filter.shop = shop;
    const heads = await AccHead.find(filter).sort({ group: 1, order: 1, name: 1 }).lean();
    res.json({ success: true, count: heads.length, data: heads });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch heads', error: err.message });
  }
};

// POST /api/acc-heads
exports.createHead = async (req, res) => {
  try {
    const { name, group, shop, openingBalance, order } = req.body;
    if (!name || !group || !shop) {
      return res.status(400).json({ success: false, message: 'name, group and shop are required' });
    }
    const head = await AccHead.create({
      name: name.trim(),
      group,
      shop,
      openingBalance: Number(openingBalance) || 0,
      order: Number(order) || 0,
    });
    res.status(201).json({ success: true, data: head });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'This head already exists for this shop' });
    }
    res.status(500).json({ success: false, message: 'Failed to create head', error: err.message });
  }
};

// PUT /api/acc-heads/:id
exports.updateHead = async (req, res) => {
  try {
    const { name, group, openingBalance, order, active } = req.body;
    const head = await AccHead.findById(req.params.id);
    if (!head) return res.status(404).json({ success: false, message: 'Head not found' });
    if (name !== undefined) head.name = name.trim();
    if (group !== undefined) head.group = group;
    if (openingBalance !== undefined) head.openingBalance = Number(openingBalance) || 0;
    if (order !== undefined) head.order = Number(order) || 0;
    if (active !== undefined) head.active = !!active;
    await head.save();
    res.json({ success: true, data: head });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'This head already exists for this shop' });
    }
    res.status(500).json({ success: false, message: 'Failed to update head', error: err.message });
  }
};

// DELETE /api/acc-heads/:id
exports.removeHead = async (req, res) => {
  try {
    const head = await AccHead.findByIdAndDelete(req.params.id);
    if (!head) return res.status(404).json({ success: false, message: 'Head not found' });
    // Entries posted against a deleted head would otherwise be orphaned and silently vanish
    // from every future report without explanation — delete them together so the numbers stay
    // internally consistent.
    await AccEntry.deleteMany({ head: head._id });
    res.json({ success: true, message: 'Head (and its entries) deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete head', error: err.message });
  }
};

// ═══════ AccEntry (transactions) ═══════

// GET /api/acc-entries?shop=nokha&from=2026-04-01&to=2026-04-30&head=<id>
exports.listEntries = async (req, res) => {
  try {
    const { shop, from, to, head } = req.query;
    const filter = {};
    if (shop) filter.shop = shop;
    if (head) filter.head = head;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }
    const entries = await AccEntry.find(filter).sort({ date: -1 }).populate('head', 'name group').lean();
    res.json({ success: true, count: entries.length, data: entries });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch entries', error: err.message });
  }
};

// POST /api/acc-entries
exports.createEntry = async (req, res) => {
  try {
    const { head: headId, date, amount, remark } = req.body;
    if (!headId || !date || amount === undefined) {
      return res.status(400).json({ success: false, message: 'head, date and amount are required' });
    }
    const head = await AccHead.findById(headId);
    if (!head) return res.status(404).json({ success: false, message: 'Head not found' });
    const entry = await AccEntry.create({
      head: head._id,
      shop: head.shop,
      group: head.group,
      date,
      amount: Number(amount) || 0,
      remark: remark || '',
      createdBy: req.user?._id,
    });
    res.status(201).json({ success: true, data: entry });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create entry', error: err.message });
  }
};

// PUT /api/acc-entries/:id
exports.updateEntry = async (req, res) => {
  try {
    const { date, amount, remark } = req.body;
    const entry = await AccEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });
    if (date !== undefined) entry.date = date;
    if (amount !== undefined) entry.amount = Number(amount) || 0;
    if (remark !== undefined) entry.remark = remark;
    await entry.save();
    res.json({ success: true, data: entry });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update entry', error: err.message });
  }
};

// DELETE /api/acc-entries/:id
exports.removeEntry = async (req, res) => {
  try {
    const entry = await AccEntry.findByIdAndDelete(req.params.id);
    if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });
    res.json({ success: true, message: 'Entry deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete entry', error: err.message });
  }
};
