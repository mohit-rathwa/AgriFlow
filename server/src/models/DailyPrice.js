const mongoose = require('mongoose');

const dailyPriceSchema = new mongoose.Schema({
  commodity: { type: String, required: true, index: true },
  variety: String,
  arrivalDate: { type: Date, required: true },
  minPrice: Number,
  maxPrice: Number,
  modalPrice: { type: Number, required: true },
  state: { type: String, required: true },
  district: String,
  mandiName: { type: String, required: true },
  source: { type: String, enum: ['agmarknet', 'mandiAgent'], default: 'agmarknet' },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

dailyPriceSchema.index({ commodity: 1, arrivalDate: -1 });
dailyPriceSchema.index({ state: 1, district: 1 });
dailyPriceSchema.index({ mandiName: 1, arrivalDate: -1 });

const DailyPrice = mongoose.model('DailyPrice', dailyPriceSchema);
module.exports = DailyPrice;
