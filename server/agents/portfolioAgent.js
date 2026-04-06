'use strict';

/**
 * portfolioAgent — analyzes portfolio positions for concentration risk,
 * unrealized P&L flags, and cash drag.
 *
 * Pure function: no side effects, no DB calls, no API calls.
 *
 * @param {Object} marketData  - { tickers, positions, quotes, news, cash? } from Alpaca
 * @returns {Array} insights - [{ type, message, severity, ticker? }]
 */
function portfolioAgent(marketData) {
  const { positions = {}, cash = 0 } = marketData;
  const tickers = Object.keys(positions);

  if (tickers.length === 0) return [];

  const insights = [];

  // Compute current market value per position
  const positionValues = {};
  let equityTotal = 0;
  for (const ticker of tickers) {
    const { qty, currentPrice } = positions[ticker];
    const value = qty * currentPrice;
    positionValues[ticker] = value;
    equityTotal += value;
  }

  const totalValue = equityTotal + cash;

  // Concentration risk — any position > 20% of total portfolio
  for (const ticker of tickers) {
    const pct = positionValues[ticker] / totalValue;
    if (pct > 0.2) {
      insights.push({
        type: 'concentration_risk',
        ticker,
        severity: 'high',
        message: `${ticker} represents ${Math.round(pct * 100)}% of portfolio — consider rebalancing`,
      });
    }
  }

  // Unrealized loss > 10%
  for (const ticker of tickers) {
    const { qty, avgCost, currentPrice } = positions[ticker];
    if (avgCost > 0) {
      const lossPercent = (currentPrice - avgCost) / avgCost;
      if (lossPercent < -0.1) {
        insights.push({
          type: 'unrealized_loss',
          ticker,
          severity: 'high',
          message: `${ticker} is down ${Math.abs(Math.round(lossPercent * 100))}% from average cost ($${avgCost} → $${currentPrice}) on ${qty} shares`,
        });
      }
    }
  }

  // Cash drag — cash > 20% of total portfolio
  if (totalValue > 0 && cash / totalValue > 0.2) {
    insights.push({
      type: 'cash_drag',
      severity: 'medium',
      message: `${Math.round((cash / totalValue) * 100)}% of portfolio is sitting in cash — consider deploying`,
    });
  }

  return insights;
}

module.exports = portfolioAgent;
