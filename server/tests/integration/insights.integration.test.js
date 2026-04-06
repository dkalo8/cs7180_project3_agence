'use strict';

/**
 * Insights integration tests
 *
 * Mocks: pg Pool (no real DB), orchestrator + judge (no LLM calls).
 * Tests the full request pipeline: JWT auth → middleware → queries.js →
 * orchestrator → judge → JSON response.
 */

process.env.JWT_SECRET = 'integration-test-secret';
process.env.DATABASE_URL = 'postgresql://localhost/agence_dev';

const mockQuery = jest.fn();
jest.mock('pg', () => ({ Pool: jest.fn(() => ({ query: mockQuery })) }));
jest.mock('../../orchestrator/index');
jest.mock('../../orchestrator/judge');

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../index');
const { runOrchestrator } = require('../../orchestrator/index');
const { runJudge } = require('../../orchestrator/judge');

const validToken = jwt.sign({ userId: 'user-uuid-1' }, 'integration-test-secret');

beforeEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------
// Full insights pipeline
// ---------------------------------------------------------------------------
describe('Insights integration: full pipeline', () => {
  test('returns ranked insights for an authenticated user', async () => {
    // queries.js will call pg for transactions, accounts, goals
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'tx1', amount: 120, merchant_name: 'Whole Foods', category: 'Groceries', date: '2026-03-01' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'acc-1', current: 3000 }] })
      .mockResolvedValueOnce({ rows: [{ id: 'g1', name: 'Emergency Fund', target: 5000, current: 2000 }] });

    runOrchestrator.mockResolvedValue({
      spending: [{ type: 'spending_spike', message: 'High dining spend', severity: 'medium' }],
      anomaly: [],
      goals: [],
      portfolio: [],
      market: [],
      autopilot: [],
    });

    runJudge.mockResolvedValue([
      { type: 'spending_spike', message: 'High dining spend', severity: 'medium', score: 0.85 },
    ]);

    const res = await request(app)
      .get('/api/v1/insights')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('insights');
    expect(res.body.insights).toHaveLength(1);
    expect(res.body.insights[0]).toMatchObject({ type: 'spending_spike', score: 0.85 });
  });

  test('assembles userData from DB and passes it to orchestrator', async () => {
    const transactions = [{ id: 'tx1', amount: 50 }];
    const goals = [{ id: 'g1', name: 'Vacation', target: 2000 }];

    mockQuery
      .mockResolvedValueOnce({ rows: transactions })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: goals });

    runOrchestrator.mockResolvedValue({ spending: [], anomaly: [], goals: [], portfolio: [], market: [], autopilot: [] });
    runJudge.mockResolvedValue([]);

    await request(app)
      .get('/api/v1/insights')
      .set('Authorization', `Bearer ${validToken}`);

    expect(runOrchestrator).toHaveBeenCalledTimes(1);
    const [userData] = runOrchestrator.mock.calls[0];
    expect(userData.transactions).toEqual(transactions);
    expect(userData.goals).toEqual(goals);
  });

  test('returns 200 with empty insights array when orchestrator returns nothing', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    runOrchestrator.mockResolvedValue({ spending: [], anomaly: [], goals: [], portfolio: [], market: [], autopilot: [] });
    runJudge.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/v1/insights')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.insights).toEqual([]);
  });

  test('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/v1/insights');
    expect(res.status).toBe(401);
    expect(runOrchestrator).not.toHaveBeenCalled();
  });
});
