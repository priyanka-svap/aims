const mongoose = require('mongoose');

// One row per (date, shop) — Warehouse, Nokha, Circle, and any custom "Add Shop" shop each save
// their own Daily Cash Summary independently. Field names match exactly what the frontend sends
// (AimsAPI.accounts payload) so nothing gets silently dropped by Mongoose's strict-schema mode.
const cashAccountSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // 'YYYY-MM-DD'
    shop: { type: String, required: true, trim: true, default: 'warehouse' },
    englishSales: { type: Number, default: 0 },
    beerSales: { type: Number, default: 0 },
    desiSales: { type: Number, default: 0 },
    commission: { type: Number, default: 0 },
    circleExp: { type: Number, default: 0 },
    dieselExp: { type: Number, default: 0 },
    otherExp: { type: Number, default: 0 }, // combined total of the 5 fields below — kept for backward compat with existing sum logic (Accounts/Reports/P&L)
    // Daily Cash Summary widget's individual expense buckets (Shop Expenses/Breakage/Wine
    // Expenses/Monthly/Other) used to have nowhere to live in this schema — Mongoose's strict
    // mode silently dropped them on every save, so only the combined `otherExp` total ever
    // persisted and the widget always showed these fields blank again after a reload, even
    // though the money itself wasn't lost from the total. Each one now has its own field.
    shopExp: { type: Number, default: 0 },
    breakage: { type: Number, default: 0 },
    wineExp: { type: Number, default: 0 },
    monthlyExp: { type: Number, default: 0 },
    otherAmt: { type: Number, default: 0 },
    phonePe: { type: Number, default: 0 },
    cashReceived: { type: Number, default: 0 },
    remark: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

// Unique per shop per day — NOT unique by date alone (that used to make every shop's daily
// summary collide into a single system-wide row for that date).
cashAccountSchema.index({ date: 1, shop: 1 }, { unique: true });

module.exports = mongoose.model('CashAccount', cashAccountSchema);
