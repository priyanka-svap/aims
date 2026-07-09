const mongoose = require('mongoose');

// Mirrors DB.inward / DB.outward entries from the frontend.
const movementSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['inward', 'outward'], required: true },
    date: { type: String, required: true }, // kept as 'YYYY-MM-DD' string to match frontend
    shop: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    location: { type: String, trim: true, default: '' }, // source (inward) / destination (outward)
    bot: { type: Number, default: 0 },
    half: { type: Number, default: 0 },
    nips: { type: Number, default: 0 },
    amt: { type: Number, default: 0 },
    remark: { type: String, trim: true, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

movementSchema.index({ type: 1, date: 1, shop: 1 });

module.exports = mongoose.model('Movement', movementSchema);
