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
  },
  { timestamps: true }
);

module.exports = mongoose.model('Shop', shopSchema);
