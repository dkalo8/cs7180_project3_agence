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
          date: tx.date,
          txId: tx.id,
          merchant: name,
        });
      }
    } else {
      seen.set(key, tx);
    }
  }

  // Flag repeated identical charges: same known merchant + same amount on different dates
  const merchantAmountGroups = new Map();
  for (const tx of transactions) {
    const name = tx.merchant_name || tx.merchant;
    if (!name) continue; // skip unknown-merchant txs — too noisy
    const key = `${name}|${tx.amount}`;
    if (!merchantAmountGroups.has(key)) merchantAmountGroups.set(key, []);
    merchantAmountGroups.get(key).push(tx);
  }

  for (const [key, txs] of merchantAmountGroups) {
    if (txs.length < 2) continue;
    const dates = new Set(txs.map(tx => String(tx.date).slice(0, 10)));
    if (dates.size < 2) continue; // all same date — already caught by duplicate check
    const parts = key.split('|');
    const name = parts[0];
    const amount = parts[1];
    insights.push({
      type: 'repeated_charge',
      message: `${txs.length} identical $${amount} charges from ${name} — possible recurring billing`,
      severity: 'medium',
      amount: parseFloat(amount),
      txId: txs[0].id,
      merchant: name,
    });
  }

  return insights;
}

module.exports = anomalyAgent;
