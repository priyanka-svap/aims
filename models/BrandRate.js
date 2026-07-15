const mongoose = require('mongoose');

// This is the core "Inventory Item" of AIMS: a brand, tied to a shop,
// with rates for bottle / half / nips and a category.
const brandRateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    shop: { type: String, required: true, trim: true }, // shop id e.g. 'rora' | 'main' | 'circle' or custom
    // Shop Edit / Brand Rate forms now only ever pick from english/beer/desi (see
    // aims_v20_db.html _catToBucket) — older finer-grained values stay valid so existing rows
    // don't fail validation on their next unrelated save.
    cat: {
      type: String,
      enum: ['english', 'whisky', 'rum', 'beer', 'gin', 'vodka', 'desi', 'other'],
      default: 'english',
    },
    bot: { type: Number, default: 0, min: 0 },   // bottle rate
    half: { type: Number, default: 0, min: 0 },  // half rate
    nips: { type: Number, default: 0, min: 0 },  // nips/pav rate
    // running stock snapshot for quick inventory views (optional convenience fields)
    stock: {
      bot: { type: Number, default: 0 },
      half: { type: Number, default: 0 },
      nips: { type: Number, default: 0 },
    },
    active: { type: Boolean, default: true },
    // When this brand was last switched to inactive for this shop — null while active.
    // Lets historical listings show "was this brand active as of date X" instead of only
    // ever reflecting today's current active/inactive flag (see inventoryController).
    disabledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

brandRateSchema.index({ name: 1, shop: 1 }, { unique: true });

module.exports = mongoose.model('BrandRate', brandRateSchema);
