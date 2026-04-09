'use strict';

const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const alpacaService = require('../services/alpaca');
const queries = require('../db/queries');

// POST /api/v1/trades — submit a paper trade
router.post('/', authMiddleware, async (req, res, next) => {
  const { ticker, action, quantity } = req.body;

  if (!ticker || !action || !quantity) {
    return res.status(400).json({ error: 'ticker, action, and quantity are required' });
  }
  if (!['buy', 'sell'].includes(action)) {
    return res.status(400).json({ error: 'action must be buy or sell' });
  }

  try {
    const order = await alpacaService.placeOrder(ticker, action, quantity);
    const price = parseFloat(order.filled_avg_price) || 0;

    await queries.createTrade(req.userId, ticker, action, quantity, price, order.id);

    return res.status(201).json({ orderId: order.id });
  } catch (err) {
    // Extract Alpaca's error message rather than forwarding upstream status codes
    const alpacaMsg =
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.body?.message ||
      null;
    if (alpacaMsg) {
      const isAuth = /unauthorized|forbidden/i.test(alpacaMsg);
      const hint = isAuth
        ? ' — ensure ALPACA_KEY_ID and ALPACA_SECRET_KEY on Render are paper trading keys (from paper.alpaca.markets, not live keys)'
        : '';
      return res.status(422).json({ error: alpacaMsg + hint });
    }
    next(err);
  }
});

// GET /api/v1/trades — trade history
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const trades = await queries.getTradesByUserId(req.userId);
    return res.status(200).json({ trades });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
