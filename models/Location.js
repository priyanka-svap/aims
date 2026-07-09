const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    shop: { type: String, required: true, trim: true }, // shop slug
  },
  { timestamps: true }
);

module.exports = mongoose.model('Location', locationSchema);
