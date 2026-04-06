'use strict';

/**
 * autopilotAgent — generates rule-based paper trade signals from portfolio
 * concentration and 24h price movements.
 *
 * Pure function: no side effects, no DB calls, no API calls.
 *
 * @param {Object} _userData   - { transactions, balances, goals } from Plaid (unused — reserved for future rules)
 * @param {Object} marketData  - { tickers, positions, quotes, news } from Alpaca
 * @returns {Array} signals - [{ type, action, ticker, quantity, reason }]
 */
function autopilotAgent(_userData, marketData) {
  const { positions = {}, quotes = {} } = marketData;
  const tickers = Object.keys(positions);

  if (tickers.length === 0) return [];

  const signals = [];

  // Compute total portfolio value
  let totalValue = 0;
  for (const ticker of tickers) {
    const { qty, currentPrice } = positions[ticker];
    totalValue += qty * currentPrice;
  }

  // Rebalance signal — position > 20% of portfolio, trim to 20%
  for (const ticker of tickers) {
    const { qty, currentPrice } = positions[ticker];
    const positionValue = qty * currentPrice;
    const pct = positionValue / totalValue;

    if (pct > 0.2) {
      // Target: bring down to 20% of current total
      const targetValue = totalValue * 0.2;
      const excessValue = positionValue - targetValue;
      const sharesToSell = Math.floor(excessValue / currentPrice);

      // Minimum position guard: never sell all shares (keep at least 1)
      if (sharesToSell > 0 && sharesToSell < qty) {
        signals.push({
          type: 'rebalance',
          action: 'sell',
          ticker,
          quantity: sharesToSell,
          reason: `${ticker} is ${Math.round(pct * 100)}% of portfolio (threshold: 20%) — trimming to rebalance`,
        });
      }
    }
  }

  // Buy-on-dip signal — 24h change < -5%
  for (const ticker of tickers) {
    const quote = quotes[ticker];
    if (quote && quote.change < -5) {
      signals.push({
        type: 'buy_dip',
        action: 'buy',
        ticker,
        quantity: 1,
        reason: `${ticker} dropped ${Math.abs(quote.change).toFixed(1)}% in 24h — opportunistic buy`,
      });
    }
  }

  return signals;
}

module.exports = autopilotAgent;
