const env = require('../config/env');
const Notification = require('../models/Notification');

exports.createAlert = async (req, res) => {
  try {
    const { commodity, state, targetPrice, alertType } = req.body;
    if (!commodity || !state || !targetPrice || !alertType) {
      return res.status(400).json({ success: false, message: 'commodity, state, targetPrice and alertType are required' });
    }
    const notification = await Notification.create({
      userId: req.user._id,
      type: 'priceAlert',
      commodity,
      state,
      alertType,
      targetPrice: parseFloat(targetPrice),
      title: `${commodity} Price Alert`,
      message: `Alert: ${commodity} in ${state} when price goes ${alertType} ₹${targetPrice}/qtl`
    });
    res.status(201).json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMyAlerts = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteAlert = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    res.status(200).json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.triggerSMSAlert = async ({ phoneNumber, message }) => {
  try {
    if (!env.FAST2SMS_API_KEY) {
      console.log('SMS Alert (mocked):', { phoneNumber, message });
      return;
    }

    const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'authorization': env.FAST2SMS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        route: 'q',
        message: message,
        numbers: phoneNumber,
        flash: 0
      })
    });

    const data = await response.json();
    console.log('SMS sent:', data);
  } catch (error) {
    console.error('Error sending SMS:', error);
  }
};
