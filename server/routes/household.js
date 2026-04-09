'use strict';

const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const queries = require('../db/queries');

// GET /api/v1/household — current user's household + members
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const household = await queries.getHouseholdByUserId(req.userId);
    return res.status(200).json({ household: household || null });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/household — create household, add creator as owner
router.post('/', authMiddleware, async (req, res, next) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  try {
    const existing = await queries.getHouseholdByUserId(req.userId);
    if (existing) {
      return res.status(409).json({ error: 'User already belongs to a household' });
    }
    const household = await queries.createHousehold(name.trim());
    await queries.addHouseholdMember(household.id, req.userId, 'owner');
    return res.status(201).json({ household });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/household/invite — invite user by email as member
router.post('/invite', authMiddleware, async (req, res, next) => {
  const { email } = req.body;
  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'email is required' });
  }
  try {
    const inviterHousehold = await queries.getHouseholdByUserId(req.userId);
    if (!inviterHousehold) {
      return res.status(404).json({ error: 'You are not in a household. Create one first.' });
    }
    const invitee = await queries.getUserByEmail(email.trim().toLowerCase());
    if (!invitee) {
      return res.status(404).json({ error: 'No user found with that email' });
    }
    const inviteeHousehold = await queries.getHouseholdByUserId(invitee.id);
    if (inviteeHousehold) {
      return res.status(409).json({ error: 'That user already belongs to a household' });
    }
    await queries.addHouseholdMember(inviterHousehold.id, invitee.id, 'member');
    return res.status(200).json({ message: `${email} added to household` });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/household/leave — leave current household
router.delete('/leave', authMiddleware, async (req, res, next) => {
  try {
    const household = await queries.getHouseholdByUserId(req.userId);
    if (!household) {
      return res.status(404).json({ error: 'You are not in a household' });
    }
    await queries.removeHouseholdMember(household.id, req.userId);
    return res.status(200).json({ message: 'Left household' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/household/member/:userId — owner removes a member
router.delete('/member/:targetUserId', authMiddleware, async (req, res, next) => {
  const { targetUserId } = req.params;
  if (targetUserId === req.userId) {
    return res.status(400).json({ error: 'Use DELETE /leave to remove yourself' });
  }
  try {
    const household = await queries.getHouseholdByUserId(req.userId);
    if (!household) {
      return res.status(404).json({ error: 'You are not in a household' });
    }
    const me = (household.members || []).find(m => m.user_id === req.userId);
    if (!me || me.role !== 'owner') {
      return res.status(403).json({ error: 'Only the owner can remove members' });
    }
    await queries.removeHouseholdMember(household.id, targetUserId);
    return res.status(200).json({ message: 'Member removed' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
