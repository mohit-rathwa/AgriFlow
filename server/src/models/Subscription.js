const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  plan: { type: String, enum: ['free', 'premium'], default: 'free' },
  stripeCustomerId: String,
  stripeSubscriptionId: String,
  status: { type: String, enum: ['active', 'cancelled', 'past_due'], default: 'active' },
  currentPeriodEnd: Date
}, { timestamps: true });

const Subscription = mongoose.model('Subscription', subscriptionSchema);
module.exports = Subscription;
