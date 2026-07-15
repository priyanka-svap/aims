const mongoose = require('mongoose');

// Mirrors DB.masterBrands from the frontend (Brands page) — a global,
// shop-agnostic brand catalogue with MRP (government price) and selling rate.
// Distinct from BrandRate, which is per-shop.
const masterBrandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    // Brand Add/Edit forms now only ever pick from english/beer/desi (see aims_v20_db.html
    // _catToBucket) — the older finer-grained values stay valid here so existing brands already
    // saved with them don't fail validation on their next unrelated save.
    cat: { type: String, enum: ['english', 'whisky', 'rum', 'beer', 'gin', 'vodka', 'desi', 'other'], default: 'english' },
    mrpBot: { type: Number, default: 0 },
    mrpHalf: { type: Number, default: 0 },
    mrpNips: { type: Number, default: 0 },
    rateBot: { type: Number, default: 0 },
    rateHalf: { type: Number, default: 0 },
    rateNips: { type: Number, default: 0 },
  },
  { timestamps: true }
);

masterBrandSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model('MasterBrand', masterBrandSchema);
