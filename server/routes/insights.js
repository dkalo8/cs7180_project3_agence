'use strict';

const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const queries = require('../db/queries');
const { runOrchestrator } = require('../orchestrator/index');
const { runJudge } = require('../orchestrator/judge');

// GET /api/v1/insights
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { userId } = req;

    // Assemble userData from DB (Plaid data)
    const [transactions, accounts, goals] = await Promise.all([
      queries.getTransactionsByUserId(userId),
      queries.getAccountsByUserId(userId),
      queries.getGoalsByUserId(userId),
    ]);

    const userData = { transactions, accounts, goals };

    // marketData would come from Alpaca/Finnhub in production;
    // for now pass empty structure so agents degrade gracefully
    const marketData = { tickers: [], positions: {}, quotes: {}, news: {} };

    const agentOutputs = await runOrchestrator(userData, marketData);
    const insights = await runJudge(agentOutputs);

    return res.status(200).json({ insights });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
