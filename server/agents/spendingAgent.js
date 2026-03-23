/**
 * spendingAgent — pure function
 * Analyzes transaction data and returns spending insights.
 *
 * @param {Object} userData   - { transactions: Array }
 * @param {Object} marketData - unused by this agent (consistent signature)
 * @returns {Array<{ type: string, message: string, severity: string }>}
 */
function spendingAgent(userData, marketData) {
  const transactions = userData?.transactions;
  if (!transactions || transactions.length === 0) return [];

  const insights = [];

  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prior = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const priorYM = `${prior.getFullYear()}-${String(prior.getMonth() + 1).padStart(2, '0')}`;

  const currentTxns = transactions.filter((t) => t.date.startsWith(currentYM));
  const priorTxns   = transactions.filter((t) => t.date.startsWith(priorYM));

  if (currentTxns.length === 0) return [];

  // Aggregate spend by category for current month
  const byCategory = currentTxns.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {});

  const totalSpend = Object.values(byCategory).reduce((sum, v) => sum + v, 0);

  // top_category insight
  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
  insights.push({
    type: 'top_category',
    message: `${topCategory[0]} is your top spend at $${topCategory[1].toFixed(2)}`,
    severity: 'info',
  });

  // category_spike insight — any category > 30% of total
  Object.entries(byCategory).forEach(([category, amount]) => {
    const pct = (amount / totalSpend) * 100;
    if (pct > 30) {
      insights.push({
        type: 'category_spike',
        message: `${category} is ${Math.round(pct)}% of total spend`,
        severity: 'warning',
      });
    }
  });

  // monthly_increase insight — current vs prior month total
  if (priorTxns.length > 0) {
    const priorTotal = priorTxns.reduce((sum, t) => sum + t.amount, 0);
    const changePct = ((totalSpend - priorTotal) / priorTotal) * 100;
    if (changePct > 20) {
      insights.push({
        type: 'monthly_increase',
        message: `Spending up ${Math.round(changePct)}% vs last month`,
        severity: 'warning',
      });
    }
  }

  return insights;
}

module.exports = spendingAgent;
