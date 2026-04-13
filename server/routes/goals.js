'use strict';

const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const queries = require('../db/queries');

// GET /api/v1/goals
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const userIds = await queries.getHouseholdMemberIds(req.userId);
    const goals = await queries.getGoalsByUserId(userIds);
    return res.status(200).json({ goals });
  } catch (err) {
    next(err);
  }
});

const VALID_GOAL_TYPES = new Set(['savings', 'growth', 'speculation']);

// POST /api/v1/goals
router.post('/', authMiddleware, async (req, res, next) => {
  const { name, target, monthlyContribution, goalType = 'savings' } = req.body;
  if (!name || !target) {
    return res.status(400).json({ error: 'name and target are required' });
  }
  if (!VALID_GOAL_TYPES.has(goalType)) {
    return res.status(400).json({ error: 'goalType must be savings, growth, or speculation' });
  }

  try {
    const goal = await queries.createGoal(req.userId, name, target, monthlyContribution ?? 0, goalType);
    return res.status(201).json({ goal });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
