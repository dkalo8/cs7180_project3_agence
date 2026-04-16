const toYearMonth = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const sumBy = (txns) => txns.reduce((sum, t) => sum + t.amount, 0);

const groupByCategory = (txns) =>
  txns.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {});

/**
 * spendingAgent — pure function
 * Analyzes transaction data and returns spending insights.
 *
 * @param {Object} userData   - { transactions: Array }
 * @param {Object} marketData - unused by this agent (consistent signature)
 * @returns {Array<{ type: string, message: string, severity: string }>}
 */
function spendingAgent(userData, _marketData) {
  const transactions = userData?.transactions;
  if (!transactions || transactions.length === 0) return [];

  const now = new Date();
  const currentYM = toYearMonth(now);
  const priorYM   = toYearMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const currentTxns = transactions.filter((t) => t.date.startsWith(currentYM));
  const priorTxns   = transactions.filter((t) => t.date.startsWith(priorYM));

  if (currentTxns.length === 0) return [];

  const byCategory = groupByCategory(currentTxns);
  const totalSpend = sumBy(currentTxns);
  const insights   = [];

  // top_category — highest-spend category this month
  const [topName, topAmount] = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
  insights.push({
    type: 'top_category',
    message: `${topName} is your top spend at $${topAmount.toFixed(2)}`,
    severity: 'info',
  });

  // category_spike — any category exceeding 30% of total
  Object.entries(byCategory).forEach(([category, amount]) => {
    const pct = (amount / totalSpend) * 100;
    if (pct > 30) {
      insights.push({
        type: 'category_spike',
        message: `${category} is ${Math.round(pct)}% of total spend`,
        severity: 'medium',
      });
    }
  });

  // monthly_increase — current month spend up >20% vs prior month
  if (priorTxns.length > 0) {
    const priorTotal = sumBy(priorTxns);
    const changePct  = ((totalSpend - priorTotal) / priorTotal) * 100;
    if (changePct > 20) {
      insights.push({
        type: 'monthly_increase',
        message: `Spending up ${Math.round(changePct)}% vs last month`,
        severity: 'medium',
      });
    }
  }

  return insights;
}

module.exports = spendingAgent;
