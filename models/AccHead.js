const mongoose = require('mongoose');

// A named "ledger head" (chart-of-accounts line) that P&L / Balance Sheet entries get posted
// against — e.g. "Bank Charges" under indirect-expense, or "Chenaram Ji Capital Ac" under
// capital. Mirrors how Tally groups every ledger under a fixed set of report sections:
//   P&L sections:           direct-expense, indirect-expense, indirect-income
//   Balance Sheet sections: capital, loan, current-liability, fixed-asset, current-asset
// P&L-group heads are period totals (summed from AccEntry rows within a date range).
// Balance-Sheet-group heads carry a running balance (openingBalance + every AccEntry up to a
// given date) since capital/loans/assets/liabilities persist across periods instead of
// resetting each month like an expense does.
const accHeadSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    group: {
      type: String,
      enum: [
        'direct-expense',
        'indirect-expense',
        'indirect-income',
        'capital',
        'loan',
        'current-liability',
        'fixed-asset',
        'current-asset',
      ],
      required: true,
    },
    shop: { type: String, required: true, trim: true }, // shop id/slug this head belongs to
    openingBalance: { type: Number, default: 0 }, // only meaningful for Balance Sheet groups
    order: { type: Number, default: 0 }, // display order within its group
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

accHeadSchema.index({ name: 1, shop: 1 }, { unique: true });

module.exports = mongoose.model('AccHead', accHeadSchema);
