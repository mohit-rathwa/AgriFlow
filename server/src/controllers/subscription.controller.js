const env = require('../config/env');
const User = require('../models/User');

let stripe;
if (env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(env.STRIPE_SECRET_KEY);
}

exports.getPlans = (req, res) => {
  res.status(200).json([
    { "id": "free", "name": "Kisan Free", "price": 0, "currency": "INR", "interval": "month", "features": ["Basic price trends", "7-day history", "3 commodities"] },
    { "id": "pro", "name": "Kisan Pro", "price": 299, "currency": "INR", "interval": "month", "features": ["All price trends", "6-month history", "All commodities", "AI Advisor (10 queries/month)", "SMS alerts"] },
    { "id": "premium", "name": "Kisan Premium", "price": 799, "currency": "INR", "interval": "month", "features": ["Everything in Pro", "Unlimited AI queries", "Price predictions", "Priority support", "Export data"] }
  ]);
};

exports.createCheckoutSession = async (req, res) => {
  try {
    const { plan } = req.body;
    
    if (!env.STRIPE_SECRET_KEY || !stripe) {
      return res.status(200).json({ success: false, message: 'Payment not configured yet. Add STRIPE_SECRET_KEY to .env' });
    }

    let priceId;
    if (plan === 'pro') priceId = env.STRIPE_PRICE_PRO;
    else if (plan === 'premium') priceId = env.STRIPE_PRICE_PREMIUM;
    else return res.status(400).json({ success: false, message: 'Invalid plan selected' });

    if (!priceId) {
      return res.status(200).json({ success: false, message: `Stripe price ID for ${plan} not configured.` });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${env.FRONTEND_URL}/dashboard?payment=success`,
      cancel_url: `${env.FRONTEND_URL}/dashboard?payment=cancelled`,
      customer_email: req.user.email,
      metadata: { userId: req.user._id.toString(), plan },
    });

    res.status(200).json({ success: true, url: session.url });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.handleWebhook = async (req, res) => {
  if (!env.STRIPE_WEBHOOK_SECRET || !stripe) {
    return res.status(200).send('Webhook not configured');
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook Error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata.userId;
      const plan = session.metadata.plan || 'premium';

      const planExpiry = new Date();
      planExpiry.setMonth(planExpiry.getMonth() + 1);

      await User.findByIdAndUpdate(userId, {
        'subscription.plan': plan,
        'subscription.expiresAt': planExpiry,
        'subscription.stripeCustomerId': session.customer
      });
    } else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const customerId = subscription.customer;
      if (customerId) {
        await User.findOneAndUpdate({ 'subscription.stripeCustomerId': customerId }, {
          'subscription.plan': 'free',
          'subscription.expiresAt': null
        });
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error handling webhook event:', error);
    res.status(500).send('Internal Server Error');
  }
};

exports.getUserSubscription = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const plan = user.subscription?.plan || 'free';
    const expiresAt = user.subscription?.expiresAt;
    const isActive = expiresAt ? new Date(expiresAt) > Date.now() : plan === 'free';

    res.status(200).json({ 
      success: true,
      plan,
      planExpiry: expiresAt,
      isActive
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
