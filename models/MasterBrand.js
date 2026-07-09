const mongoose = require('mongoose');

// Mirrors DB.masterBrands from the frontend (Brands page) — a global,
// shop-agnostic brand catalogue with MRP (government price) and selling rate.
// Distinct from BrandRate, which is per-shop.
const masterBrandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    cat: { type: String, enum: ['whisky', 'rum', 'beer', 'gin', 'vodka', 'desi', 'other'], default: 'other' },
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
