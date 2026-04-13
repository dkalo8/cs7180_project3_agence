'use strict';

const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const queries = require('../db/queries');
const authMiddleware = require('../middleware/auth');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const SALT_ROUNDS = 10;

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// POST /api/v1/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const existing = await queries.getUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await queries.createUser(email, passwordHash);
    const token = signToken(user.id);

    return res.status(201).json({ token, userId: user.id });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await queries.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken(user.id);
    return res.status(200).json({ token, userId: user.id });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/google
router.post('/google', async (req, res, next) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'credential is required' });

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      return res.status(401).json({ error: 'Invalid Google token' });
    }

    const { sub: googleId, email } = payload;

    // 1. Existing Google-linked account
    let user = await queries.getUserByGoogleId(googleId);
    if (user) {
      return res.status(200).json({ token: signToken(user.id), userId: user.id });
    }

    // 2. Existing email/password account — link google_id
    user = await queries.getUserByEmail(email);
    if (user) {
      await queries.linkGoogleId(user.id, googleId);
      return res.status(200).json({ token: signToken(user.id), userId: user.id });
    }

    // 3. New user
    user = await queries.createUserWithGoogle(email, googleId);
    return res.status(200).json({ token: signToken(user.id), userId: user.id });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/auth/me
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await queries.getUserById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.status(200).json({ id: user.id, email: user.email, createdAt: user.created_at, hasGoogleAuth: user.has_google_auth });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
