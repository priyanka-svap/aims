const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true }, // e.g. 'rora','main','circle'
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['english', 'beer', 'desi', 'mixed'], default: 'mixed' },
    location: { type: String, trim: true, default: '' },
    manager: { type: String, trim: true, default: '' },
    active: { type: Boolean, default: true },
    builtin: { type: Boolean, default: false },
    // Custom drag-and-drop listing order for this shop's brands (array of brand names, in the
    // order the user dragged them into). Saved so the order is the same on every browser/device
    // instead of only the one it was dragged in on (it used to live only in localStorage).
    brandOrder: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Shop', shopSchema);
