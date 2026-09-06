const { validationResult } = require('express-validator');
const DailyPrice = require('../models/DailyPrice');

exports.addDailyPrice = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { commodity, variety, minPrice, maxPrice, modalPrice, mandiName, state, district } = req.body;

    const priceEntry = await DailyPrice.create({
      commodity,
      variety,
      arrivalDate: new Date(),
      minPrice,
      maxPrice,
      modalPrice,
      mandiName,
      state,
      district,
      source: 'mandiAgent',
      submittedBy: req.user._id  // Track who submitted
    });

    res.status(201).json({
      success: true,
      data: priceEntry
    });
  } catch (error) {
    next(error);
  }
};

exports.getMyPrices = async (req, res, next) => {
  try {
    // Only show prices submitted by THIS agent
    const prices = await DailyPrice.find({ 
      source: 'mandiAgent',
      submittedBy: req.user._id 
    }).sort({ createdAt: -1 }).limit(50);
    
    res.status(200).json({
      success: true,
      count: prices.length,
      data: prices
    });
  } catch (error) {
    next(error);
  }
};

exports.updatePrice = async (req, res, next) => {
  try {
    let priceEntry = await DailyPrice.findById(req.params.id);

    if (!priceEntry) {
      return res.status(404).json({ success: false, message: 'Price entry not found' });
    }

    if (priceEntry.source !== 'mandiAgent') {
      return res.status(403).json({ success: false, message: 'Cannot update prices from other sources' });
    }

    // Only the agent who submitted can update
    if (priceEntry.submittedBy && priceEntry.submittedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only update your own submissions' });
    }

    priceEntry = await DailyPrice.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: priceEntry
    });
  } catch (error) {
    next(error);
  }
};

exports.deletePrice = async (req, res, next) => {
  try {
    const priceEntry = await DailyPrice.findById(req.params.id);

    if (!priceEntry) {
      return res.status(404).json({ success: false, message: 'Price entry not found' });
    }

    if (priceEntry.source !== 'mandiAgent') {
      return res.status(403).json({ success: false, message: 'Cannot delete prices from other sources' });
    }

    // Only the agent who submitted can delete
    if (priceEntry.submittedBy && priceEntry.submittedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only delete your own submissions' });
    }

    await priceEntry.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};
