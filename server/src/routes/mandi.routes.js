const express = require('express');
const { body } = require('express-validator');
const { addDailyPrice, getMyPrices, updatePrice, deletePrice } = require('../controllers/mandi.controller');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
const restrictGuestWrites = require('../middleware/guestMiddleware');

router.use(protect);
router.use(authorize('mandiAgent'));
router.use(restrictGuestWrites);

router.post('/prices', [
  body('commodity', 'Commodity is required').not().isEmpty(),
  body('modalPrice', 'Modal price is required and must be numeric').isNumeric(),
  body('mandiName', 'Mandi name is required').not().isEmpty(),
  body('state', 'State is required').not().isEmpty()
], addDailyPrice);

router.get('/my-prices', getMyPrices);
router.put('/prices/:id', updatePrice);
router.delete('/prices/:id', deletePrice);

module.exports = router;
