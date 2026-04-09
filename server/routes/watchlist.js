'use strict';

const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const queries = require('../db/queries');
const alpacaService = require('../services/alpaca');

// GET /api/v1/watchlist
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const userIds = await queries.getHouseholdMemberIds(req.userId);
    const watchlist = await queries.getWatchlistByUserId(userIds);

    if (watchlist.length === 0) {
      return res.status(200).json({ watchlist });
    }

    const tickers = watchlist.map(w => w.ticker);
    const snapshots = await alpacaService.getSnapshots(tickers).catch(() => ({}));

    const enriched = watchlist.map(item => {
      const snap = snapshots[item.ticker];
      if (!snap) return { ...item, price: null, changePercent: null };
      const dailyBar = snap.dailyBar || snap.DailyBar || {};
      const prevBar = snap.prevDailyBar || snap.PrevDailyBar || {};
      const price = parseFloat(dailyBar.c ?? dailyBar.ClosePrice ?? 0) || null;
      const prevClose = parseFloat(prevBar.c ?? prevBar.ClosePrice ?? price);
      const changePercent = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : null;
      return { ...item, price, changePercent };
    });

    return res.status(200).json({ watchlist: enriched });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/watchlist
router.post('/', authMiddleware, async (req, res, next) => {
  const { ticker } = req.body;
  if (!ticker) return res.status(400).json({ error: 'ticker is required' });

  try {
    const item = await queries.addToWatchlist(req.userId, ticker.toUpperCase());
    return res.status(201).json(item ?? { ticker: ticker.toUpperCase() });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/watchlist/:ticker
router.delete('/:ticker', authMiddleware, async (req, res, next) => {
  try {
    await queries.removeFromWatchlist(req.userId, req.params.ticker.toUpperCase());
    return res.status(200).json({ removed: req.params.ticker.toUpperCase() });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
