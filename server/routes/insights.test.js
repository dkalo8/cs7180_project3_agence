'use strict';

process.env.JWT_SECRET = 'test-secret'; // pragma: allowlist secret
process.env.DATABASE_URL = 'postgresql://localhost/agence_dev';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../index');

jest.mock('../db/queries');
jest.mock('../orchestrator/index');
jest.mock('../orchestrator/judge');
jest.mock('../services/alpaca');
jest.mock('../services/finnhub');

const queries = require('../db/queries');
const { runOrchestrator } = require('../orchestrator/index');
const { runJudge } = require('../orchestrator/judge');
const alpacaService = require('../services/alpaca');
const finnhubService = require('../services/finnhub');

const validToken = jwt.sign({ userId: 'uuid-1' }, 'test-secret'); // pragma: allowlist secret

beforeEach(() => {
  jest.clearAllMocks();
  // Default Alpaca mocks — no positions
  alpacaService.getPositions.mockResolvedValue([]);
  alpacaService.getAccount.mockResolvedValue({ cash: '1000', equity: '1000' });
  alpacaService.getSnapshots.mockResolvedValue({});
  finnhubService.getLatestNews.mockResolvedValue(null);
});

// ---------------------------------------------------------------------------
// GET /api/v1/insights
// ---------------------------------------------------------------------------
describe('GET /api/v1/insights', () => {
  test('returns 401 without a token', async () => {
    const res = await request(app).get('/api/v1/insights');
    expect(res.status).toBe(401);
  });

  test('returns 200 with ranked insights for authenticated user', async () => {
    queries.getTransactionsByUserId.mockResolvedValue([
      { id: 'tx1', amount: 50, merchant_name: 'Whole Foods', category: 'Groceries', date: '2026-03-01' },
    ]);
    queries.getAccountsByUserId.mockResolvedValue([{ id: 'acc-1' }]);
    queries.getGoalsByUserId.mockResolvedValue([
      { id: 'g1', name: 'Emergency Fund', target: 5000, current: 2000, monthly_contribution: 200 },
    ]);

    runOrchestrator.mockResolvedValue({ spending: [], anomaly: [], goals: [], portfolio: [], market: [], autopilot: [] });
    runJudge.mockResolvedValue([{ type: 'spending_spike', message: 'High spend', score: 0.9 }]);

    const res = await request(app)
      .get('/api/v1/insights')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('insights');
    expect(Array.isArray(res.body.insights)).toBe(true);
  });

  test('calls runOrchestrator with userData assembled from DB', async () => {
    queries.getTransactionsByUserId.mockResolvedValue([{ id: 'tx1', amount: 100 }]);
    queries.getAccountsByUserId.mockResolvedValue([]);
    queries.getGoalsByUserId.mockResolvedValue([]);
    runOrchestrator.mockResolvedValue({ spending: [], anomaly: [], goals: [], portfolio: [], market: [], autopilot: [] });
    runJudge.mockResolvedValue([]);

    await request(app)
      .get('/api/v1/insights')
      .set('Authorization', `Bearer ${validToken}`);

    expect(runOrchestrator).toHaveBeenCalledTimes(1);
    const [userData] = runOrchestrator.mock.calls[0];
    expect(userData).toHaveProperty('transactions');
    expect(userData).toHaveProperty('goals');
  });

  test('calls runJudge with orchestrator output', async () => {
    queries.getTransactionsByUserId.mockResolvedValue([]);
    queries.getAccountsByUserId.mockResolvedValue([]);
    queries.getGoalsByUserId.mockResolvedValue([]);
    const orchestratorOutput = { spending: [{ type: 'test' }], anomaly: [], goals: [], portfolio: [], market: [], autopilot: [] };
    runOrchestrator.mockResolvedValue(orchestratorOutput);
    runJudge.mockResolvedValue([]);

    await request(app)
      .get('/api/v1/insights')
      .set('Authorization', `Bearer ${validToken}`);

    expect(runJudge).toHaveBeenCalledWith(orchestratorOutput);
  });
});
