const mongoose = require('mongoose');

// Mirrors CDB.circOutward entries from the frontend.
const circleOutwardSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // 'YYYY-MM-DD'
    shop: { type: String, trim: true, default: '' },
    partyId: { type: String, trim: true, default: '' },
    partyName: { type: String, trim: true, default: '' },
    brandId: { type: String, trim: true, default: '' },
    brandName: { type: String, trim: true, default: '' },
    bot: { type: Number, default: 0 },
    half: { type: Number, default: 0 },
    pav: { type: Number, default: 0 },
    totalQty: { type: Number, default: 0 },
    rate: { type: Number, default: 0 },
    amt: { type: Number, default: 0 },
    remark: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

circleOutwardSchema.index({ date: 1 });

module.exports = mongoose.model('CircleOutward', circleOutwardSchema);
