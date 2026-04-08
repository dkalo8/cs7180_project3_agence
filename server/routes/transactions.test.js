'use strict';

process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = 'postgresql://localhost/agence_dev'; // pragma: allowlist secret

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../index');

jest.mock('../db/queries');
const queries = require('../db/queries');

const validToken = jwt.sign({ userId: 'uuid-1' }, 'test-secret');

beforeEach(() => jest.clearAllMocks());

// Raw transactions fixture
const TX = [
  { id: '1', account_id: 'a1', amount: 45.00,  merchant_name: 'Chipotle',   category: 'FOOD_AND_DRINK',    date: '2026-04-05' },
  { id: '2', account_id: 'a1', amount: 120.00, merchant_name: 'Uber',        category: 'TRAVEL',            date: '2026-04-03' },
  { id: '3', account_id: 'a1', amount: 30.00,  merchant_name: 'Starbucks',   category: 'FOOD_AND_DRINK',    date: '2026-04-01' },
  { id: '4', account_id: 'a1', amount: 200.00, merchant_name: 'Amazon',      category: 'SHOPPING',          date: '2026-03-20' },
  { id: '5', account_id: 'a1', amount: 60.00,  merchant_name: 'Trader Joes', category: 'FOOD_AND_DRINK',    date: '2026-03-15' },
];

// ---------------------------------------------------------------------------
// GET /api/v1/transactions
// ---------------------------------------------------------------------------
describe('GET /api/v1/transactions', () => {
  test('returns 401 without a token', async () => {
    const res = await request(app).get('/api/v1/transactions');
    expect(res.status).toBe(401);
  });

  test('returns transactions and category summary', async () => {
    queries.getTransactionsByUserId.mockResolvedValue(TX);

    const res = await request(app)
      .get('/api/v1/transactions')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('transactions');
    expect(res.body).toHaveProperty('categories');
    expect(res.body.transactions).toHaveLength(5);
  });

  test('category summary groups and sums correctly', async () => {
    queries.getTransactionsByUserId.mockResolvedValue(TX);

    const res = await request(app)
      .get('/api/v1/transactions')
      .set('Authorization', `Bearer ${validToken}`);

    const food = res.body.categories.find(c => c.name === 'FOOD_AND_DRINK');
    expect(food).toBeDefined();
    // April food: 45 + 30 = 75, March food: 60
    expect(food.currentTotal).toBeCloseTo(75);
    expect(food.prevTotal).toBeCloseTo(60);
  });

  test('returns empty arrays when no transactions', async () => {
    queries.getTransactionsByUserId.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/v1/transactions')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.transactions).toEqual([]);
    expect(res.body.categories).toEqual([]);
  });

  test('returns 200 with empty data when DB throws', async () => {
    queries.getTransactionsByUserId.mockRejectedValue(new Error('DB error'));

    const res = await request(app)
      .get('/api/v1/transactions')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.transactions).toEqual([]);
    expect(res.body.categories).toEqual([]);
  });
});
