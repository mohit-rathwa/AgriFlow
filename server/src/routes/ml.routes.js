const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  predictPrice,
  chatWithAgent,
  getModelMetrics
} = require('../controllers/ml.controller');

router.post('/predict', protect, authorize('farmer', 'admin'), predictPrice);
router.post('/chat', protect, authorize('farmer'), chatWithAgent);
router.get('/metrics', protect, getModelMetrics);

module.exports = router;
