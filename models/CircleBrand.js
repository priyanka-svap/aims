const mongoose = require('mongoose');

// Mirrors CDB.brands.english / .beer / .desi — Circle's own brand-rate list
// (separate from the main BrandRate inventory, since Circle sells in
// English/Beer/Desi groupings with its own short names + flat rates).
const circleBrandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    cat: { type: String, enum: ['english', 'beer', 'desi'], required: true },
    rate: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

circleBrandSchema.index({ name: 1, cat: 1 }, { unique: true });

module.exports = mongoose.model('CircleBrand', circleBrandSchema);
