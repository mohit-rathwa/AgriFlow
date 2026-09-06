const DailyPrice = require('../models/DailyPrice');
const Mandi = require('../models/Mandi');

exports.getDashboardData = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        prices: [],
        alerts: [],
        chatHistory: []
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getPrices = async (req, res, next) => {
  try {
    const { commodity, state, district, days = 30 } = req.query;
    let query = {};

    if (commodity) query.commodity = commodity;
    if (state) query.state = state;
    if (district) query.district = district;

    // First, try filtering by recent dates (last N days from today)
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - parseInt(days));
    query.arrivalDate = { $gte: dateLimit };

    let prices = await DailyPrice.find(query)
      .sort({ arrivalDate: -1 })
      .limit(500);

    // If no recent data found, fetch the MOST RECENT data available
    // This handles historical datasets (e.g., data ending in 2023)
    if (prices.length === 0) {
      delete query.arrivalDate;

      // Find the latest date available for this commodity/state
      const latest = await DailyPrice.findOne(query).sort({ arrivalDate: -1 });

      if (latest) {
        const latestDate = new Date(latest.arrivalDate);
        const historicLimit = new Date(latestDate);
        historicLimit.setDate(historicLimit.getDate() - parseInt(days));
        query.arrivalDate = { $gte: historicLimit, $lte: latestDate };

        prices = await DailyPrice.find(query)
          .sort({ arrivalDate: -1 })
          .limit(500);
      }
    }

    res.status(200).json({
      success: true,
      count: prices.length,
      data: prices
    });
  } catch (error) {
    next(error);
  }
};

exports.searchMandis = async (req, res, next) => {
  try {
    const { state, district } = req.query;
    let query = {};
    if (state) query.state = state;
    if (district) query.district = district;

    const mandis = await Mandi.find(query);

    res.status(200).json({
      success: true,
      count: mandis.length,
      data: mandis
    });
  } catch (error) {
    next(error);
  }
};
