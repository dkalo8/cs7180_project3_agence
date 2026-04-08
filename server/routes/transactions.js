'use strict';

const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const queries = require('../db/queries');

// Build category summary: current month vs previous month totals
function buildCategorySummary(transactions) {
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const prevMonth = thisMonth === 0 ? 11 : thisMonth - 1;
  const prevYear = thisMonth === 0 ? thisYear - 1 : thisYear;

  const current = {};
  const prev = {};

  for (const tx of transactions) {
    const d = new Date(tx.date + 'T00:00:00');
    const cat = tx.category || 'OTHER';
    const amount = parseFloat(tx.amount);

    if (d.getFullYear() === thisYear && d.getMonth() === thisMonth) {
      current[cat] = (current[cat] || 0) + amount;
    } else if (d.getFullYear() === prevYear && d.getMonth() === prevMonth) {
      prev[cat] = (prev[cat] || 0) + amount;
    }
  }

  const allCats = new Set([...Object.keys(current), ...Object.keys(prev)]);
  return Array.from(allCats)
    .map(name => ({
      name,
      currentTotal: parseFloat((current[name] || 0).toFixed(2)),
      prevTotal: parseFloat((prev[name] || 0).toFixed(2)),
      momDelta: parseFloat(((current[name] || 0) - (prev[name] || 0)).toFixed(2)),
    }))
    .sort((a, b) => b.currentTotal - a.currentTotal);
}

// GET /api/v1/transactions
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const transactions = await queries.getTransactionsByUserId(req.userId).catch(() => []);
    const categories = buildCategorySummary(transactions);
    return res.status(200).json({ transactions, categories });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
