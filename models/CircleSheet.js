const mongoose = require('mongoose');

// Mirrors CDB.sheets entries from the frontend (frontend/aims_v15...html).
// `parties` is kept as a Mixed object because its shape is nested and
// dynamic: { [partyId]: { english:{[brandId]:{pcs,rate,amt}}, beer:{...}, desi:{...}, paid:Number } }
const circleSheetSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // 'YYYY-MM-DD'
    place: { type: String, trim: true, default: '' },
    circExp: { type: Number, default: 0 },
    dieselExp: { type: Number, default: 0 },
    phonepay: { type: Number, default: 0 },
    cash: { type: Number, default: 0 },
    netRecv: { type: Number, default: 0 },
    remark: { type: String, trim: true, default: '' },
    parties: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

circleSheetSchema.index({ date: 1 });

module.exports = mongoose.model('CircleSheet', circleSheetSchema);
