'use strict';

const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Resend } = require('resend');
const sgMail = require('@sendgrid/mail');
const { OAuth2Client } = require('google-auth-library');
const queries = require('../db/queries');
const authMiddleware = require('../middleware/auth');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const SALT_ROUNDS = 10;

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function resetSecret() {
  return (process.env.JWT_SECRET || '') + '-reset';
}

function signResetToken(userId, email) {
  return jwt.sign({ userId, email, type: 'password-reset' }, resetSecret(), { expiresIn: '1h' });
}

function verifyResetToken(token) {
  return jwt.verify(token, resetSecret());
}

async function sendResetEmail(email, token) {
  const clientUrl = process.env.CLIENT_URL || 'https://agence-flame.vercel.app';
  const resetUrl = `${clientUrl}/reset-password?token=${token}`;
  const html = `<p>Click <a href="${resetUrl}">here</a> to reset your Agence password. This link expires in 1 hour.</p><p>If you did not request this, you can ignore this email.</p>`;

  // SendGrid — HTTPS API, 100 emails/day free, works on Render free tier
  if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    const from = process.env.SENDGRID_FROM || 'noreply@agence.app';
    await sgMail.send({ from, to: email, subject: 'Reset your Agence password', html });
    return;
  }

  // Resend fallback — HTTPS API, 3K/month free with verified domain
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromAddr = process.env.RESEND_FROM || 'Agence <onboarding@resend.dev>';
    await resend.emails.send({ from: fromAddr, to: email, subject: 'Reset your Agence password', html });
    return;
  }

  // Dev fallback — log reset URL to console
  console.log(`[dev] Password reset link for ${email}: ${resetUrl}`); // eslint-disable-line no-console
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

// POST /api/v1/auth/forgot-password
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });

    const user = await queries.getUserByEmail(email);
    if (user) {
      const token = signResetToken(user.id, user.email);
      await sendResetEmail(user.email, token).catch(() => {}); // non-critical
    }
    // Always return 200 — don't reveal whether email exists
    return res.status(200).json({ message: 'If that email is registered, a reset link is on its way.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/reset-password
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'token and password are required' });

    let payload;
    try {
      payload = verifyResetToken(token);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired reset link' });
    }

    if (payload.type !== 'password-reset') {
      return res.status(401).json({ error: 'Invalid reset token' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await queries.updatePasswordHash(payload.userId, passwordHash);

    return res.status(200).json({ message: 'Password updated. You can now sign in.' });
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
