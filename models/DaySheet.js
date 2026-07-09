const mongoose = require('mongoose');

// One brand line inside a day-sheet (rora/main/nokha listing)
const sheetBrandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    open: { type: [Number], default: [0, 0, 0] },  // [bottle, half, nips]
    inw: { type: [Number], default: [0, 0, 0] },
    out: { type: [Number], default: [0, 0, 0] },
    close: { type: [Number], default: [0, 0, 0] },
    sales: { type: [Number], default: [0, 0, 0] },
    rate: { type: [Number], default: [0, 0, 0] },
    amt: { type: Number, default: 0 },
    isBeer: { type: Boolean, default: false },
  },
  { _id: false }
);

const daySheetSchema = new mongoose.Schema(
  {
    sheetType: { type: String, enum: ['rora', 'main', 'nokha'], required: true },
    date: { type: String, required: true }, // 'YYYY-MM-DD'
    brands: { type: [sheetBrandSchema], default: [] },
  },
  { timestamps: true }
);

daySheetSchema.index({ sheetType: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DaySheet', daySheetSchema);
