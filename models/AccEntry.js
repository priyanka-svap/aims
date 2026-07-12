const mongoose = require('mongoose');

// A single dated transaction posted against an AccHead. For P&L-group heads the amount is the
// period's expense/income (positive). For Balance-Sheet-group heads the amount is SIGNED — a
// capital withdrawal or a liability being paid down is a negative entry, an additional deposit
// or new loan is positive — since these accumulate into a running balance over time instead of
// being summed fresh each period.
const accEntrySchema = new mongoose.Schema(
  {
    head: { type: mongoose.Schema.Types.ObjectId, ref: 'AccHead', required: true },
    shop: { type: String, required: true, trim: true }, // denormalized from head.shop for fast date-range queries
    group: { type: String, required: true, trim: true }, // denormalized from head.group at time of entry
    date: { type: String, required: true }, // 'YYYY-MM-DD'
    amount: { type: Number, required: true },
    remark: { type: String, trim: true, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

accEntrySchema.index({ shop: 1, head: 1, date: 1 });

module.exports = mongoose.model('AccEntry', accEntrySchema);
