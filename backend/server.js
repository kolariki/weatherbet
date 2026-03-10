const express = require('express');
const cors = require('cors');
require('dotenv').config();
const authRoutes = require('./routes/auth.js');
const marketRoutes = require('./routes/markets.js');
const betRoutes = require('./routes/bets.js');
const walletRoutes = require('./routes/wallet.js');
const stripeRoutes = require('./routes/stripe.js');
const stripeWebhookRoutes = require('./routes/stripeWebhook.js');
const { startResolver } = require('./services/resolverService.js');

const app = express();
const PORT = process.env.PORT || 3001;

// Stripe webhook MUST be before express.json() — needs raw body
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhookRoutes);

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api', authRoutes);
app.use('/api/markets', marketRoutes);
app.use('/api/markets', betRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/stripe', stripeRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🎯 BetAll API running on port ${PORT}`);
  startResolver();
});
