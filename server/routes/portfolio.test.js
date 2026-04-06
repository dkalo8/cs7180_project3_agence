'use strict';

process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = 'postgresql://localhost/agence_dev';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../index');

// Mock the Alpaca service — we test route logic, not the Alpaca SDK
jest.mock('../services/alpaca');
const alpacaService = require('../services/alpaca');

const validToken = jwt.sign({ userId: 'uuid-1' }, 'test-secret');

beforeEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------
// GET /api/v1/portfolio
// ---------------------------------------------------------------------------
describe('GET /api/v1/portfolio', () => {
  test('returns 401 without a token', async () => {
    const res = await request(app).get('/api/v1/portfolio');
    expect(res.status).toBe(401);
  });

  test('returns 200 with positions and account summary', async () => {
    alpacaService.getPositions.mockResolvedValue([
      {
        symbol: 'AAPL',
        qty: '10',
        avg_entry_price: '160.00',
        current_price: '175.00',
        market_value: '1750.00',
        unrealized_pl: '150.00',
        unrealized_plpc: '0.09375',
      },
      {
        symbol: 'TSLA',
        qty: '5',
        avg_entry_price: '260.00',
        current_price: '195.00',
        market_value: '975.00',
        unrealized_pl: '-325.00',
        unrealized_plpc: '-0.25',
      },
    ]);
    alpacaService.getAccount.mockResolvedValue({
      cash: '1500.00',
      equity: '4225.00',
    });

    const res = await request(app)
      .get('/api/v1/portfolio')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('positions');
    expect(res.body).toHaveProperty('cash', 1500);
    expect(res.body).toHaveProperty('equity', 4225);
    expect(res.body.positions).toHaveLength(2);
  });

  test('positions have correct shape with calculated P&L fields', async () => {
    alpacaService.getPositions.mockResolvedValue([
      {
        symbol: 'AAPL',
        qty: '10',
        avg_entry_price: '160.00',
        current_price: '175.00',
        market_value: '1750.00',
        unrealized_pl: '150.00',
        unrealized_plpc: '0.09375',
      },
    ]);
    alpacaService.getAccount.mockResolvedValue({ cash: '500.00', equity: '2250.00' });

    const res = await request(app)
      .get('/api/v1/portfolio')
      .set('Authorization', `Bearer ${validToken}`);

    const pos = res.body.positions[0];
    expect(pos).toMatchObject({
      ticker: 'AAPL',
      qty: 10,
      avgCost: 160,
      currentPrice: 175,
      marketValue: 1750,
      unrealizedPL: 150,
    });
    expect(pos.unrealizedPLPct).toBeCloseTo(9.375, 1);
  });

  test('returns empty positions array when no positions held', async () => {
    alpacaService.getPositions.mockResolvedValue([]);
    alpacaService.getAccount.mockResolvedValue({ cash: '10000.00', equity: '10000.00' });

    const res = await request(app)
      .get('/api/v1/portfolio')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.positions).toEqual([]);
    expect(res.body.cash).toBe(10000);
  });

  test('returns 500 when Alpaca service throws', async () => {
    alpacaService.getPositions.mockRejectedValue(new Error('Alpaca API error'));
    alpacaService.getAccount.mockResolvedValue({ cash: '0', equity: '0' });

    const res = await request(app)
      .get('/api/v1/portfolio')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(500);
  });
});
