'use strict';

const spendingAgent = require('../agents/spendingAgent');
const anomalyAgent = require('../agents/anomalyAgent');
const goalsAgent = require('../agents/goalsAgent');
const portfolioAgent = require('../agents/portfolioAgent');
const marketContextAgent = require('../agents/marketContextAgent');
const autopilotAgent = require('../agents/autopilotAgent');
const watchlistAgent = require('../agents/watchlistAgent');

/**
 * Runs all agents in parallel and returns their outputs keyed by agent name.
 * Non-critical agent failures are isolated — a single agent throwing does not
 * crash the orchestrator; that agent returns an empty array instead.
 *
 * @param {Object} userData   - { transactions, balances, goals } from Plaid
 * @param {Object} marketData - { tickers, quotes, news } from Alpaca + Finnhub
 * @returns {Promise<Object>} - { spending, anomaly, goals, portfolio, market, autopilot }
 */
async function runOrchestrator(userData, marketData) {
  const safeRun = async (fn, ...args) => {
    try {
      return fn(...args) ?? [];
    } catch {
      return [];
    }
  };

  const [spending, anomaly, goals, portfolio, market, autopilot, watchlist] = await Promise.all([
    safeRun(spendingAgent, userData),
    safeRun(anomalyAgent, userData),
    safeRun(goalsAgent, userData),
    safeRun(portfolioAgent, marketData),
    safeRun(marketContextAgent, marketData),
    safeRun(autopilotAgent, userData, marketData),
    safeRun(watchlistAgent, userData, marketData),
  ]);

  const tag = (arr, src) => arr.map(i => ({ ...i, source: src }));
  return {
    spending:  tag(spending,  'spending'),
    anomaly:   tag(anomaly,   'anomaly'),
    goals:     tag(goals,     'goals'),
    portfolio: tag(portfolio, 'portfolio'),
    market:    tag(market,    'market'),
    autopilot: tag(autopilot, 'autopilot'),
    watchlist: tag(watchlist, 'watchlist'),
  };
}

module.exports = { runOrchestrator };
