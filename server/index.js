'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRouter = require('./routes/auth');
const accountsRouter = require('./routes/accounts');
const portfolioRouter = require('./routes/portfolio');
const tradesRouter = require('./routes/trades');
const insightsRouter = require('./routes/insights');
const goalsRouter = require('./routes/goals');
const transactionsRouter = require('./routes/transactions');
const watchlistRouter = require('./routes/watchlist');
const chatRouter = require('./routes/chat');
const householdRouter = require('./routes/household');
const newsRouter = require('./routes/news');
const errorHandler = require('./middleware/errors');
const { runMigrations } = require('./db/migrate');

const app = express();

app.use(helmet());

// Rate limiters — skipped in test environment to avoid breaking unit/integration tests
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many attempts, please try again later' },
  skip: () => process.env.NODE_ENV === 'test',
});
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: { error: 'Too many requests, please slow down' },
  skip: () => process.env.NODE_ENV === 'test',
});

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
app.use('/api/v1/auth', authLimiter, authRouter);
app.use('/api/v1/accounts', accountsRouter);
app.use('/api/v1/portfolio', portfolioRouter);
app.use('/api/v1/trades', tradesRouter);
app.use('/api/v1/insights', apiLimiter, insightsRouter);
app.use('/api/v1/goals', goalsRouter);
app.use('/api/v1/transactions', transactionsRouter);
app.use('/api/v1/watchlist', watchlistRouter);
app.use('/api/v1/chat', apiLimiter, chatRouter);
app.use('/api/v1/household', householdRouter);
app.use('/api/v1/news', newsRouter);

// Centralized error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

/* istanbul ignore next */
if (require.main === module) {
  runMigrations()
    .catch(err => console.error('[migrate] failed:', err.message)) // eslint-disable-line no-console
    .finally(() => {
      app.listen(PORT, () => console.log(`Agence server running on port ${PORT}`)); // eslint-disable-line no-console
    });
}

module.exports = app;
