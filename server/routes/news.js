'use strict';

const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const finnhubService = require('../services/finnhub');

// GET /api/v1/news?tickers=AAPL,TSLA
router.get('/', authMiddleware, async (req, res, next) => {
  const { tickers } = req.query;
  if (!tickers) return res.status(400).json({ error: 'tickers query param required' });

  const symbols = tickers
    .split(',')
    .map(t => t.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 10);

  try {
    const results = await Promise.all(
      symbols.map(async ticker => ({
        ticker,
        articles: await finnhubService.getNewsArticles(ticker).catch(() => []),
      }))
    );
    return res.status(200).json({ news: results });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
