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
// GET /api/v1/goals
// ---------------------------------------------------------------------------
describe('GET /api/v1/goals', () => {
  test('returns 401 without a token', async () => {
    const res = await request(app).get('/api/v1/goals');
    expect(res.status).toBe(401);
  });

  test('returns 200 with goals array', async () => {
    queries.getGoalsByUserId.mockResolvedValue([
      { id: 'g1', name: 'Emergency Fund', target: 5000, current: 1200, monthly_contribution: 200 },
    ]);

    const res = await request(app)
      .get('/api/v1/goals')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('goals');
    expect(res.body.goals).toHaveLength(1);
    expect(res.body.goals[0]).toHaveProperty('name', 'Emergency Fund');
  });

  test('returns empty array when user has no goals', async () => {
    queries.getGoalsByUserId.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/v1/goals')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.goals).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/goals
// ---------------------------------------------------------------------------
describe('POST /api/v1/goals', () => {
  test('returns 401 without a token', async () => {
    const res = await request(app).post('/api/v1/goals');
    expect(res.status).toBe(401);
  });

  test('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/v1/goals')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ name: 'Vacation' }); // missing target

    expect(res.status).toBe(400);
  });

  test('returns 201 with created goal', async () => {
    queries.createGoal.mockResolvedValue({
      id: 'goal-uuid',
      name: 'Emergency Fund',
      target: 5000,
      current: 0,
      monthly_contribution: 300,
      goal_type: 'savings',
    });

    const res = await request(app)
      .post('/api/v1/goals')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ name: 'Emergency Fund', target: 5000, monthlyContribution: 300 });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('goal');
    expect(res.body.goal).toHaveProperty('name', 'Emergency Fund');
    expect(queries.createGoal).toHaveBeenCalledWith('uuid-1', 'Emergency Fund', 5000, 300, 'savings');
  });

  test('returns 201 with explicit goal_type', async () => {
    queries.createGoal.mockResolvedValue({
      id: 'goal-uuid-2',
      name: 'Tech Stocks',
      target: 10000,
      current: 0,
      monthly_contribution: 500,
      goal_type: 'growth',
    });

    const res = await request(app)
      .post('/api/v1/goals')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ name: 'Tech Stocks', target: 10000, monthlyContribution: 500, goalType: 'growth' });

    expect(res.status).toBe(201);
    expect(res.body.goal).toHaveProperty('goal_type', 'growth');
    expect(queries.createGoal).toHaveBeenCalledWith('uuid-1', 'Tech Stocks', 10000, 500, 'growth');
  });

  test('returns 400 for invalid goal_type', async () => {
    const res = await request(app)
      .post('/api/v1/goals')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ name: 'Mystery', target: 1000, goalType: 'invalid' });

    expect(res.status).toBe(400);
  });
});
