const express = require('express');
const { createAlert, getMyAlerts, deleteAlert } = require('../controllers/notification.controller');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .post(protect, authorize('farmer'), createAlert)
  .get(protect, getMyAlerts);

router.route('/:id')
  .delete(protect, deleteAlert);

module.exports = router;
