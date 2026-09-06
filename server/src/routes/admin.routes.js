const express = require('express');
const { getAllUsers, approveMandiAgent, rejectMandiAgent, getPlatformStats, toggleUserStatus } = require('../controllers/admin.controller');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
const restrictGuestWrites = require('../middleware/guestMiddleware');

router.use(protect);
router.use(authorize('admin'));
router.use(restrictGuestWrites);

router.get('/users', getAllUsers);
router.put('/users/:id/approve', approveMandiAgent);
router.put('/users/:id/reject', rejectMandiAgent);
router.get('/stats', getPlatformStats);
router.put('/users/:id/toggle', toggleUserStatus);

module.exports = router;
