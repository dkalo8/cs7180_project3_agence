'use strict';

const LARGE_TRANSACTION_THRESHOLD = 500;

/**
 * anomalyAgent — detect unusual transactions in user's bank data
 *
 * Pure function: no side effects, no DB calls, no API calls.
 *
 * @param {Object} userData  - { transactions, balances, goals } from Plaid
 * @returns {Array} insights - [{ type, message, severity, amount, merchant }]
 */
function anomalyAgent(userData) {
  const { transactions = [] } = userData;
  if (transactions.length === 0) return [];

  const insights = [];

  // Flag large single transactions
  for (const tx of transactions) {
    if (tx.amount > LARGE_TRANSACTION_THRESHOLD) {
      const name = tx.merchant_name || tx.merchant || 'unknown merchant';
      insights.push({
        type: 'large_transaction',
        message: `Unusually large charge of $${tx.amount} at ${name}`,
        severity: 'high',
        amount: tx.amount,
        txId: tx.id,
        merchant: name,
      });
    }
  }

  // Flag duplicate charges: same amount + same date (merchant excluded — often null)
  const seen = new Map();
  for (const tx of transactions) {
    const name = tx.merchant_name || tx.merchant || 'unknown merchant';
    const key = `${tx.amount}|${tx.date}`;
    if (seen.has(key)) {
      const already = insights.some(
        i => i.type === 'duplicate_charge' && i.amount === tx.amount
      );
      if (!already) {
        insights.push({
          type: 'duplicate_charge',
          message: `Possible duplicate charge of $${tx.amount} at ${name}`,
          severity: 'medium',
          amount: tx.amount,
          txId: tx.id,
          merchant: name,
        });
      }
    } else {
      seen.set(key, tx);
    }
  }

  return insights;
}

module.exports = anomalyAgent;
