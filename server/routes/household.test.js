'use strict';

process.env.JWT_SECRET = 'test-secret'; // pragma: allowlist secret
process.env.DATABASE_URL = 'postgresql://localhost/agence_dev';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../index');

jest.mock('../db/queries');
const queries = require('../db/queries');

const validToken = jwt.sign({ userId: 'uuid-1' }, 'test-secret');

beforeEach(() => {
  jest.clearAllMocks();
  queries.getHouseholdMemberIds.mockResolvedValue(['uuid-1']);
});

// ---------------------------------------------------------------------------
// POST /api/v1/household — create
// ---------------------------------------------------------------------------
describe('POST /api/v1/household', () => {
  test('returns 401 without token', async () => {
    const res = await request(app).post('/api/v1/household');
    expect(res.status).toBe(401);
  });

  test('returns 400 when name missing', async () => {
    const res = await request(app)
      .post('/api/v1/household')
      .set('Authorization', `Bearer ${validToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  test('returns 409 when user already in household', async () => {
    queries.getHouseholdByUserId.mockResolvedValue({ id: 'hh-1', name: 'Existing' });
    const res = await request(app)
      .post('/api/v1/household')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ name: 'Our Home' });
    expect(res.status).toBe(409);
  });

  test('returns 201 with household on success', async () => {
    queries.getHouseholdByUserId.mockResolvedValue(null);
    queries.createHousehold.mockResolvedValue({ id: 'hh-new', name: 'Our Home', created_at: '2026-04-09' });
    queries.addHouseholdMember.mockResolvedValue({});

    const res = await request(app)
      .post('/api/v1/household')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ name: 'Our Home' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('household');
    expect(res.body.household.name).toBe('Our Home');
    expect(queries.addHouseholdMember).toHaveBeenCalledWith('hh-new', 'uuid-1', 'owner');
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/household/invite
// ---------------------------------------------------------------------------
describe('POST /api/v1/household/invite', () => {
  test('returns 401 without token', async () => {
    const res = await request(app).post('/api/v1/household/invite');
    expect(res.status).toBe(401);
  });

  test('returns 400 when email missing', async () => {
    const res = await request(app)
      .post('/api/v1/household/invite')
      .set('Authorization', `Bearer ${validToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  test('returns 404 when inviter has no household', async () => {
    queries.getHouseholdByUserId.mockResolvedValue(null);
    const res = await request(app)
      .post('/api/v1/household/invite')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ email: 'partner@example.com' });
    expect(res.status).toBe(404);
  });

  test('returns 404 when invitee email not found', async () => {
    queries.getHouseholdByUserId.mockResolvedValue({ id: 'hh-1', name: 'Our Home' });
    queries.getUserByEmail.mockResolvedValue(null);
    const res = await request(app)
      .post('/api/v1/household/invite')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ email: 'nobody@example.com' });
    expect(res.status).toBe(404);
  });

  test('returns 409 when invitee already in a household', async () => {
    queries.getHouseholdByUserId
      .mockResolvedValueOnce({ id: 'hh-1', name: 'Our Home' }) // inviter
      .mockResolvedValueOnce({ id: 'hh-2', name: 'Other' });   // invitee
    queries.getUserByEmail.mockResolvedValue({ id: 'uuid-2', email: 'partner@example.com' });
    const res = await request(app)
      .post('/api/v1/household/invite')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ email: 'partner@example.com' });
    expect(res.status).toBe(409);
  });

  test('returns 200 and adds member on success', async () => {
    queries.getHouseholdByUserId
      .mockResolvedValueOnce({ id: 'hh-1', name: 'Our Home' }) // inviter
      .mockResolvedValueOnce(null);                             // invitee not yet in household
    queries.getUserByEmail.mockResolvedValue({ id: 'uuid-2', email: 'partner@example.com' });
    queries.addHouseholdMember.mockResolvedValue({});

    const res = await request(app)
      .post('/api/v1/household/invite')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ email: 'partner@example.com' });

    expect(res.status).toBe(200);
    expect(queries.addHouseholdMember).toHaveBeenCalledWith('hh-1', 'uuid-2', 'member');
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/household
// ---------------------------------------------------------------------------
describe('GET /api/v1/household', () => {
  test('returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/household');
    expect(res.status).toBe(401);
  });

  test('returns null household when user not in one', async () => {
    queries.getHouseholdByUserId.mockResolvedValue(null);
    const res = await request(app)
      .get('/api/v1/household')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ household: null });
  });

  test('returns household with members', async () => {
    queries.getHouseholdByUserId.mockResolvedValue({
      id: 'hh-1',
      name: 'Our Home',
      created_at: '2026-04-09',
      members: [
        { user_id: 'uuid-1', email: 'me@example.com', role: 'owner' },
        { user_id: 'uuid-2', email: 'partner@example.com', role: 'member' },
      ],
    });
    const res = await request(app)
      .get('/api/v1/household')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.household).toHaveProperty('name', 'Our Home');
    expect(res.body.household.members).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/household/leave
// ---------------------------------------------------------------------------
describe('DELETE /api/v1/household/leave', () => {
  test('returns 401 without token', async () => {
    const res = await request(app).delete('/api/v1/household/leave');
    expect(res.status).toBe(401);
  });

  test('returns 404 when user not in household', async () => {
    queries.getHouseholdByUserId.mockResolvedValue(null);
    const res = await request(app)
      .delete('/api/v1/household/leave')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(404);
  });

  test('returns 200 and removes member on success', async () => {
    queries.getHouseholdByUserId.mockResolvedValue({ id: 'hh-1', name: 'Our Home', members: [] });
    queries.removeHouseholdMember.mockResolvedValue();
    const res = await request(app)
      .delete('/api/v1/household/leave')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(queries.removeHouseholdMember).toHaveBeenCalledWith('hh-1', 'uuid-1');
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/household/member/:userId
// ---------------------------------------------------------------------------
describe('DELETE /api/v1/household/member/:userId', () => {
  test('returns 401 without token', async () => {
    const res = await request(app).delete('/api/v1/household/member/uuid-2');
    expect(res.status).toBe(401);
  });

  test('returns 400 when trying to remove self', async () => {
    const res = await request(app)
      .delete('/api/v1/household/member/uuid-1')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(400);
  });

  test('returns 404 when user not in household', async () => {
    queries.getHouseholdByUserId.mockResolvedValue(null);
    const res = await request(app)
      .delete('/api/v1/household/member/uuid-2')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(404);
  });

  test('returns 403 when caller is not owner', async () => {
    queries.getHouseholdByUserId.mockResolvedValue({
      id: 'hh-1',
      name: 'Our Home',
      members: [{ user_id: 'uuid-1', role: 'member' }],
    });
    const res = await request(app)
      .delete('/api/v1/household/member/uuid-2')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(403);
  });

  test('returns 200 and removes member when owner', async () => {
    queries.getHouseholdByUserId.mockResolvedValue({
      id: 'hh-1',
      name: 'Our Home',
      members: [{ user_id: 'uuid-1', role: 'owner' }],
    });
    queries.removeHouseholdMember.mockResolvedValue();
    const res = await request(app)
      .delete('/api/v1/household/member/uuid-2')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(queries.removeHouseholdMember).toHaveBeenCalledWith('hh-1', 'uuid-2');
  });
});
