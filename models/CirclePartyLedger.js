const mongoose = require('mongoose');

// The new "dynamic Excel-style" Circle day-sheet: one document per (date, shop) — unlike the
// older CircleSheet (date-only, shared across all circle shops, pcs+rate only, day-level
// payment total), this is scoped to a SPECIFIC circle-type shop and tracks Full/Half/Nips per
// brand per party, plus PER-PARTY payment (cash/phonepe), not just one combined day total.
// `parties` stays Mixed because its shape is nested and dynamic:
//   { [partyId]: {
//       desi:    { [brandId]: { full, half, nips, pcs, rateFull, rateHalf, rateNips, amt } },
//       english: { ... }, beer: { ... },
//       cash: Number, phonepe: Number, totalAmt: Number, balance: Number,
//   } }
const circlePartyLedgerSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // 'YYYY-MM-DD'
    shop: { type: String, required: true, trim: true }, // circle-type shop id e.g. 'circle' or custom
    remark: { type: String, trim: true, default: '' },
    parties: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

circlePartyLedgerSchema.index({ date: 1, shop: 1 }, { unique: true });

module.exports = mongoose.model('CirclePartyLedger', circlePartyLedgerSchema);
