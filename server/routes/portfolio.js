'use strict';

const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const alpacaService = require('../services/alpaca');

// GET /api/v1/portfolio — Alpaca paper trading positions + P&L
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const [rawPositions, account] = await Promise.all([
      alpacaService.getPositions(),
      alpacaService.getAccount(),
    ]);

    const positions = rawPositions.map(pos => ({
      ticker: pos.symbol,
      qty: parseFloat(pos.qty),
      avgCost: parseFloat(pos.avg_entry_price),
      currentPrice: parseFloat(pos.current_price),
      marketValue: parseFloat(pos.market_value),
      unrealizedPL: parseFloat(pos.unrealized_pl),
      unrealizedPLPct: parseFloat(pos.unrealized_plpc) * 100,
    }));

    return res.status(200).json({
      positions,
      cash: parseFloat(account.cash),
      equity: parseFloat(account.equity),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
