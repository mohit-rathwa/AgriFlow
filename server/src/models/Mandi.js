const mongoose = require('mongoose');

const mandiSchema = new mongoose.Schema({
  name: { type: String, required: true },
  district: { type: String, required: true },
  state: { type: String, required: true },
  coordinates: {
    lat: Number,
    lng: Number
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

mandiSchema.index({ state: 1, district: 1 });

const Mandi = mongoose.model('Mandi', mandiSchema);
module.exports = Mandi;
