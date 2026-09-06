const express = require('express');
const { getPlans, createCheckoutSession, handleWebhook, getUserSubscription } = require('../controllers/subscription.controller');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
const restrictGuestWrites = require('../middleware/guestMiddleware');

router.get('/plans', getPlans);
router.post('/checkout', protect, authorize('farmer'), restrictGuestWrites, createCheckoutSession);
router.post('/webhook', handleWebhook);
router.get('/me', protect, getUserSubscription);

module.exports = router;
