'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRouter = require('./routes/auth');
const accountsRouter = require('./routes/accounts');
const portfolioRouter = require('./routes/portfolio');
const tradesRouter = require('./routes/trades');
const insightsRouter = require('./routes/insights');
const goalsRouter = require('./routes/goals');
const transactionsRouter = require('./routes/transactions');
const errorHandler = require('./middleware/errors');

const app = express();

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://agence-flame.vercel.app',
];

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (curl, Postman, server-to-server)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/accounts', accountsRouter);
app.use('/api/v1/portfolio', portfolioRouter);
app.use('/api/v1/trades', tradesRouter);
app.use('/api/v1/insights', insightsRouter);
app.use('/api/v1/goals', goalsRouter);
app.use('/api/v1/transactions', transactionsRouter);

// Centralized error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

/* istanbul ignore next */
if (require.main === module) {
  app.listen(PORT, () => console.log(`Agence server running on port ${PORT}`)); // eslint-disable-line no-console
}

module.exports = app;
