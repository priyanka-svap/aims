const mongoose = require('mongoose');

// Mirrors CDB.parties — master list of Circle field-distribution agents.
const circlePartySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    short: { type: String, trim: true, default: '' },
    loc: { type: String, trim: true, default: '' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CircleParty', circlePartySchema);
