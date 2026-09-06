const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:        { type: String, enum: ['priceAlert', 'crashWarning', 'system'], default: 'priceAlert' },
  // Price alert specific fields
  commodity:   { type: String },
  state:       { type: String },
  alertType:   { type: String, enum: ['above', 'below'] },
  targetPrice: { type: Number },
  // Display fields
  title:       { type: String, required: true },
  message:     { type: String, required: true },
  isRead:      { type: Boolean, default: false },
  sentViaSms:  { type: Boolean, default: false }
}, { timestamps: true });

notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, type: 1 });

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
