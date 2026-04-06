'use strict';

/**
 * Auth integration tests
 *
 * Unlike unit tests (which mock queries.js entirely), these tests mock only
 * the pg Pool so that queries.js runs for real. bcrypt and JWT also run for
 * real, exercising the full register → hash → store → sign → verify pipeline.
 */

process.env.JWT_SECRET = 'integration-test-secret';
process.env.DATABASE_URL = 'postgresql://localhost/agence_dev';

const mockQuery = jest.fn();
jest.mock('pg', () => ({ Pool: jest.fn(() => ({ query: mockQuery })) }));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../index');

beforeEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------
// Register → Login round-trip
// ---------------------------------------------------------------------------
describe('Auth integration: register → login round-trip', () => {
  test('register returns 201 and a verifiable JWT', async () => {
    // getUserByEmail returns null (no existing user)
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      // createUser returns the new user row
      .mockResolvedValueOnce({ rows: [{ id: 'user-uuid-1', email: 'alice@test.com', created_at: new Date() }] });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'alice@test.com', password: 'StrongPass1!' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('userId', 'user-uuid-1');

    // Token must be verifiable with the same secret
    const payload = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(payload).toHaveProperty('userId', 'user-uuid-1');
  });

  test('login returns 200 and a valid JWT when credentials match', async () => {
    const bcrypt = require('bcrypt');
    const passwordHash = await bcrypt.hash('StrongPass1!', 10);

    // getUserByEmail returns the stored user with real bcrypt hash
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'user-uuid-1', email: 'alice@test.com', password_hash: passwordHash }],
    });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'alice@test.com', password: 'StrongPass1!' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');

    const payload = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(payload).toHaveProperty('userId', 'user-uuid-1');
  });

  test('login returns 401 when password does not match stored hash', async () => {
    const bcrypt = require('bcrypt');
    const passwordHash = await bcrypt.hash('CorrectPass!', 10);

    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'user-uuid-1', email: 'alice@test.com', password_hash: passwordHash }],
    });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'alice@test.com', password: 'WrongPass!' });

    expect(res.status).toBe(401);
  });

  test('register returns 409 when email is already taken', async () => {
    // getUserByEmail returns an existing user
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'user-uuid-1', email: 'alice@test.com' }],
    });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'alice@test.com', password: 'StrongPass1!' });

    expect(res.status).toBe(409);
  });
});

// ---------------------------------------------------------------------------
// Auth middleware integration
// ---------------------------------------------------------------------------
describe('Auth integration: middleware rejects bad tokens', () => {
  test('protected route returns 401 with no Authorization header', async () => {
    const res = await request(app).get('/api/v1/insights');
    expect(res.status).toBe(401);
  });

  test('protected route returns 401 with a tampered token', async () => {
    const res = await request(app)
      .get('/api/v1/insights')
      .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiJ9.tampered.signature');
    expect(res.status).toBe(401);
  });

  test('protected route returns 401 with token signed by wrong secret', async () => {
    const badToken = jwt.sign({ userId: 'user-uuid-1' }, 'wrong-secret');
    const res = await request(app)
      .get('/api/v1/insights')
      .set('Authorization', `Bearer ${badToken}`);
    expect(res.status).toBe(401);
  });
});
