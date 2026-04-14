'use strict';

const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const alpacaService = require('../services/alpaca');

// GET /api/v1/portfolio/history — time-series equity data for chart
router.get('/history', authMiddleware, async (req, res, next) => {
  try {
    const validPeriods = ['1M', '3M', '6M', '1Y'];
    const period = validPeriods.includes(req.query.period) ? req.query.period : '1M';

    const raw = await alpacaService.getPortfolioHistory(period).catch(() => null);

    if (!raw || !raw.timestamp) {
      return res.status(200).json({ history: [], baseValue: 0 });
    }

    const history = raw.timestamp.map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      equity: raw.equity[i],
      pl: raw.profit_loss[i],
      plPct: raw.profit_loss_pct[i],
    }));

    return res.status(200).json({ history, baseValue: raw.base_value });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/portfolio — Alpaca paper trading positions + P&L
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const [rawPositions, account] = await Promise.all([
      alpacaService.getPositions().catch(() => []),
      alpacaService.getAccount().catch(() => ({ cash: '0', equity: '0' })),
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
      lastEquity: parseFloat(account.last_equity || account.equity),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
