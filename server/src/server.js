require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const env = require('./config/env');

// Route files
const authRoutes = require('./routes/auth.routes');
const farmerRoutes = require('./routes/farmer.routes');
const mandiRoutes = require('./routes/mandi.routes');
const adminRoutes = require('./routes/admin.routes');
const mlRoutes = require('./routes/ml.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const notificationRoutes = require('./routes/notification.routes');
// Connect to database
connectDB();

const app = express();

// Raw body parser for Stripe webhook MUST be before express.json
app.use('/api/subscription/webhook', express.raw({ type: 'application/json' }));

// Body parser
app.use(express.json({ limit: '10mb' }));

// Enable CORS
app.use(cors({
  origin: env.FRONTEND_URL
}));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/farmer', farmerRoutes);
app.use('/api/mandi', mandiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ml', mlRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/notifications', notificationRoutes);
// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Error handler middleware
app.use(errorHandler);

const PORT = env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
