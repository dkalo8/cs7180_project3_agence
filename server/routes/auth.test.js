'use strict';

process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = 'postgresql://localhost/agence_dev';

const request = require('supertest');
const app = require('../index');

// Mock queries and bcrypt — we're testing route logic, not the DB or hashing
jest.mock('../db/queries');
jest.mock('bcrypt');
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue([{ statusCode: 202 }]),
}));
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: jest.fn().mockResolvedValue({ id: 'mock-email-id' }) },
  })),
}));

const queries = require('../db/queries');
const bcrypt = require('bcrypt');

beforeEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------
// POST /api/v1/auth/register
// ---------------------------------------------------------------------------
describe('POST /api/v1/auth/register', () => {
  test('returns 201 and a token when email and password are provided', async () => {
    queries.getUserByEmail.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue('hashed-pw');
    queries.createUser.mockResolvedValue({ id: 'uuid-1', email: 'a@b.com' });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'a@b.com', password: 'secret123' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
  });

  test('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ password: 'secret123' });
    expect(res.status).toBe(400);
  });

  test('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
  });

  test('returns 409 when email is already registered', async () => {
    queries.getUserByEmail.mockResolvedValue({ id: 'uuid-1', email: 'a@b.com' });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'a@b.com', password: 'secret123' });

    expect(res.status).toBe(409);
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/login
// ---------------------------------------------------------------------------
describe('POST /api/v1/auth/login', () => {
  test('returns 200 and a token with valid credentials', async () => {
    queries.getUserByEmail.mockResolvedValue({ id: 'uuid-1', email: 'a@b.com', password_hash: 'hashed-pw' });
    bcrypt.compare.mockResolvedValue(true);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'a@b.com', password: 'secret123' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  test('returns 401 when user does not exist', async () => {
    queries.getUserByEmail.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nope@b.com', password: 'secret123' });

    expect(res.status).toBe(401);
  });

  test('returns 401 when password is wrong', async () => {
    queries.getUserByEmail.mockResolvedValue({ id: 'uuid-1', email: 'a@b.com', password_hash: 'hashed-pw' });
    bcrypt.compare.mockResolvedValue(false);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'a@b.com', password: 'wrong' });

    expect(res.status).toBe(401);
  });

  test('returns 400 when email or password is missing', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/auth/me
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// POST /api/v1/auth/google
// ---------------------------------------------------------------------------
jest.mock('google-auth-library', () => {
  const verifyIdToken = jest.fn();
  return { OAuth2Client: jest.fn(() => ({ verifyIdToken })) };
});

describe('POST /api/v1/auth/google', () => {
  let verifyIdToken;
  beforeEach(() => {
    const { OAuth2Client } = require('google-auth-library');
    verifyIdToken = new OAuth2Client().verifyIdToken;
    jest.clearAllMocks();
  });

  test('returns 400 when credential is missing', async () => {
    const res = await request(app).post('/api/v1/auth/google').send({});
    expect(res.status).toBe(400);
  });

  test('returns 401 when Google token is invalid', async () => {
    verifyIdToken.mockRejectedValue(new Error('Invalid token'));
    const res = await request(app).post('/api/v1/auth/google').send({ credential: 'bad-token' });
    expect(res.status).toBe(401);
  });

  test('returns 200 and JWT when existing user signs in with Google', async () => {
    verifyIdToken.mockResolvedValue({
      getPayload: () => ({ sub: 'g-123', email: 'user@gmail.com' }),
    });
    queries.getUserByGoogleId.mockResolvedValue({ id: 'uuid-1', email: 'user@gmail.com' });

    const res = await request(app).post('/api/v1/auth/google').send({ credential: 'valid-token' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  test('creates new user when no matching account exists', async () => {
    verifyIdToken.mockResolvedValue({
      getPayload: () => ({ sub: 'g-456', email: 'new@gmail.com' }),
    });
    queries.getUserByGoogleId.mockResolvedValue(null);
    queries.getUserByEmail.mockResolvedValue(null);
    queries.createUserWithGoogle.mockResolvedValue({ id: 'uuid-2', email: 'new@gmail.com' });

    const res = await request(app).post('/api/v1/auth/google').send({ credential: 'valid-token' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(queries.createUserWithGoogle).toHaveBeenCalledWith('new@gmail.com', 'g-456');
  });

  test('links google_id to existing email-password account on first Google sign-in', async () => {
    verifyIdToken.mockResolvedValue({
      getPayload: () => ({ sub: 'g-789', email: 'existing@gmail.com' }),
    });
    queries.getUserByGoogleId.mockResolvedValue(null);
    queries.getUserByEmail.mockResolvedValue({ id: 'uuid-3', email: 'existing@gmail.com' });
    queries.linkGoogleId.mockResolvedValue();

    const res = await request(app).post('/api/v1/auth/google').send({ credential: 'valid-token' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(queries.linkGoogleId).toHaveBeenCalledWith('uuid-3', 'g-789');
  });
});

describe('GET /api/v1/auth/me', () => {
  const jwt = require('jsonwebtoken');
  const validToken = jwt.sign({ userId: 'uuid-1' }, 'test-secret');

  test('returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  test('returns email and createdAt for authenticated user', async () => {
    queries.getUserById.mockResolvedValue({ id: 'uuid-1', email: 'a@b.com', created_at: '2026-04-01' });
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('a@b.com');
  });

  test('returns 404 when user not found', async () => {
    queries.getUserById.mockResolvedValue(null);
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/forgot-password
// ---------------------------------------------------------------------------
describe('POST /api/v1/auth/forgot-password', () => {
  test('returns 400 when email is missing', async () => {
    const res = await request(app).post('/api/v1/auth/forgot-password').send({});
    expect(res.status).toBe(400);
  });

  test('returns 200 even when email not found (no leak)', async () => {
    queries.getUserByEmail.mockResolvedValue(null);
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'unknown@test.com' });
    expect(res.status).toBe(200);
  });

  test('returns 200 and does not error when email exists', async () => {
    queries.getUserByEmail.mockResolvedValue({ id: 'uuid-1', email: 'user@test.com' });
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'user@test.com' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/reset-password
// ---------------------------------------------------------------------------
describe('POST /api/v1/auth/reset-password', () => {
  const jwt = require('jsonwebtoken');
  const RESET_SECRET = 'test-secret-reset'; // pragma: allowlist secret

  function makeResetToken(payload, expiresIn = '1h') {
    return jwt.sign(payload, RESET_SECRET, { expiresIn });
  }

  test('returns 400 when token is missing', async () => {
    const res = await request(app).post('/api/v1/auth/reset-password').send({ password: 'NewPass123!' }); // pragma: allowlist secret
    expect(res.status).toBe(400);
  });

  test('returns 400 when password is missing', async () => {
    const res = await request(app).post('/api/v1/auth/reset-password').send({ token: 'abc' });
    expect(res.status).toBe(400);
  });

  test('returns 401 with invalid token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: 'not-a-valid-jwt', password: 'NewPass123!' }); // pragma: allowlist secret
    expect(res.status).toBe(401);
  });

  test('returns 401 when token type is not password-reset', async () => {
    const wrongToken = makeResetToken({ userId: 'uuid-1', type: 'auth' });
    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: wrongToken, password: 'NewPass123!' }); // pragma: allowlist secret
    expect(res.status).toBe(401);
  });

  test('returns 401 with expired token', async () => {
    const expired = makeResetToken({ userId: 'uuid-1', type: 'password-reset' }, '0s');
    // wait a tick for the token to expire
    await new Promise(r => setTimeout(r, 50));
    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: expired, password: 'NewPass123!' }); // pragma: allowlist secret
    expect(res.status).toBe(401);
  });

  test('returns 200 and updates password with valid token', async () => {
    const token = makeResetToken({ userId: 'uuid-1', email: 'user@test.com', type: 'password-reset' });
    queries.getUserById.mockResolvedValue({ id: 'uuid-1', email: 'user@test.com' });
    bcrypt.hash.mockResolvedValue('hashed-new-pw');
    queries.updatePasswordHash = jest.fn().mockResolvedValue();
    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token, password: 'NewPass123!' }); // pragma: allowlist secret
    expect(res.status).toBe(200);
    expect(queries.updatePasswordHash).toHaveBeenCalledWith('uuid-1', 'hashed-new-pw');
  });
});
