const env = require('../config/env');

const predictPrice = async (req, res, next) => {
  try {
    const { commodity, state, days_ahead } = req.body;
    
    const response = await fetch(`${env.ML_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ commodity, state, days_ahead }),
    });

    if (!response.ok) {
      throw new Error('ML service responded with an error');
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    if (error.cause?.code === 'ECONNREFUSED' || error.message?.includes('fetch failed')) {
      return res.status(503).json({
        success: false,
        message: 'ML service is not available. Please ensure the Python service is running.'
      });
    }
    next(error);
  }
};

const chatWithAgent = async (req, res, next) => {
  try {
    const { message } = req.body;
    const userId = req.user._id;

    const response = await fetch(`${env.ML_SERVICE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, userId }),
    });

    if (!response.ok) {
      throw new Error('ML service responded with an error');
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    if (error.cause?.code === 'ECONNREFUSED' || error.message?.includes('fetch failed')) {
      return res.status(503).json({
        success: false,
        message: 'ML service is not available. Please ensure the Python service is running.'
      });
    }
    next(error);
  }
};

const getModelMetrics = async (req, res, next) => {
  try {
    const response = await fetch(`${env.ML_SERVICE_URL}/predict/model/metrics`);

    if (!response.ok) {
      throw new Error('ML service responded with an error');
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    if (error.cause?.code === 'ECONNREFUSED' || error.message?.includes('fetch failed')) {
      return res.status(503).json({
        success: false,
        message: 'ML service is not available. Please ensure the Python service is running.'
      });
    }
    next(error);
  }
};

module.exports = {
  predictPrice,
  chatWithAgent,
  getModelMetrics
};
