const express = require('express');
const { getDashboardData, getPrices, searchMandis } = require('../controllers/farmer.controller');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
const restrictGuestWrites = require('../middleware/guestMiddleware');

router.use(protect);
router.use(authorize('farmer'));
router.use(restrictGuestWrites);

router.get('/dashboard', getDashboardData);
router.get('/prices', getPrices);
router.get('/mandis', searchMandis);

module.exports = router;
