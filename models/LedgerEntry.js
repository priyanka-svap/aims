const mongoose = require('mongoose');

// Generic ledger entry used for Circle inward/outward/sales (CDB.circOutward etc.)
// and reused for Nokha / Warehouse inward-outward (NDB / WDB) via the `store` field.
const ledgerEntrySchema = new mongoose.Schema(
  {
    store: { type: String, required: true }, // 'circle'|'nokha'|'warehouse' or dynamic shop id
    direction: { type: String, enum: ['inward', 'outward', 'sales'], required: true },
    date: { type: String, required: true },
    brand: { type: String, trim: true, default: '' },
    place: { type: String, trim: true, default: '' },
    party: { type: String, trim: true, default: '' },
    product: { type: String, trim: true, default: '' },
    category: { type: String, trim: true, default: '' },
    bot: { type: Number, default: 0 },
    half: { type: Number, default: 0 },
    nips: { type: Number, default: 0 },
    pcs: { type: Number, default: 0 },
    rate: { type: Number, default: 0 },
    amt: { type: Number, default: 0 },
    source: { type: String, trim: true, default: '' },      // inward origin
    destination: { type: String, trim: true, default: '' }, // outward destination
    remark: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

ledgerEntrySchema.index({ store: 1, direction: 1, date: 1 });

module.exports = mongoose.model('LedgerEntry', ledgerEntrySchema);
