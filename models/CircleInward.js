const mongoose = require('mongoose');

// Circle Inward — stock arriving INTO a circle-type shop (from a distributor/warehouse),
// scoped per shop like CircleOutward. One record per brand per inward entry (not date-keyed
// upsert like CirclePartyLedger — each delivery is its own row, mirroring how CircleOutward
// records each dispatch separately).
const circleInwardSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // 'YYYY-MM-DD'
    shop: { type: String, required: true, trim: true },
    brandId: { type: String, trim: true, default: '' },
    brandName: { type: String, trim: true, default: '' },
    cat: { type: String, trim: true, default: '' }, // english | beer | desi
    bot: { type: Number, default: 0 },
    half: { type: Number, default: 0 },
    pav: { type: Number, default: 0 },
    totalQty: { type: Number, default: 0 },
    source: { type: String, trim: true, default: '' }, // distributor / warehouse name
    rateBot: { type: Number, default: 0 },
    rateHalf: { type: Number, default: 0 },
    ratePav: { type: Number, default: 0 },
    rate: { type: Number, default: 0 }, // legacy/back-compat alias, mirrors rateBot
    amt: { type: Number, default: 0 },
    remark: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

circleInwardSchema.index({ date: 1, shop: 1 });

module.exports = mongoose.model('CircleInward', circleInwardSchema);
