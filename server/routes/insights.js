'use strict';

const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const queries = require('../db/queries');
const alpacaService = require('../services/alpaca');
const finnhubService = require('../services/finnhub');
const { runOrchestrator } = require('../orchestrator/index');
const { runJudge } = require('../orchestrator/judge');

// GET /api/v1/insights
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { userId } = req;

    // Assemble userData from DB (Plaid data) + marketData from Alpaca/Finnhub in parallel
    const [transactions, accounts, goals, rawPositions, account] = await Promise.all([
      queries.getTransactionsByUserId(userId),
      queries.getAccountsByUserId(userId),
      queries.getGoalsByUserId(userId),
      alpacaService.getPositions().catch(() => []),
      alpacaService.getAccount().catch(() => ({ cash: '0', equity: '0' })),
    ]);

    const userData = { transactions, accounts, goals };

    // Build positions map for agents
    const tickers = rawPositions.map(p => p.symbol);
    const positions = {};
    for (const p of rawPositions) {
      positions[p.symbol] = {
        qty: parseFloat(p.qty),
        avgCost: parseFloat(p.avg_entry_price),
        currentPrice: parseFloat(p.current_price),
      };
    }

    // Fetch quotes and news in parallel (both non-critical — degrade gracefully)
    const [snapshots, newsResults] = await Promise.all([
      tickers.length > 0 ? alpacaService.getSnapshots(tickers).catch(() => ({})) : Promise.resolve({}),
      Promise.all(tickers.map(t => finnhubService.getLatestNews(t).catch(() => null))),
    ]);

    // Build quotes map from Alpaca snapshots
    const quotes = {};
    for (const ticker of tickers) {
      const snap = snapshots[ticker];
      if (snap) {
        const dailyBar = snap.dailyBar || snap.DailyBar || {};
        const prevBar = snap.prevDailyBar || snap.PrevDailyBar || {};
        const price = parseFloat(dailyBar.c ?? dailyBar.ClosePrice ?? 0);
        const prevClose = parseFloat(prevBar.c ?? prevBar.ClosePrice ?? price);
        const changePercent = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
        quotes[ticker] = { price, changePercent };
      }
    }

    // Build news map (one article per ticker)
    const news = {};
    tickers.forEach((ticker, i) => {
      if (newsResults[i]) news[ticker] = newsResults[i];
    });

    const marketData = {
      tickers,
      positions,
      quotes,
      news,
      cash: parseFloat(account.cash),
    };

    const agentOutputs = await runOrchestrator(userData, marketData);
    const insights = await runJudge(agentOutputs);

    return res.status(200).json({ insights });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
