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

  test('returns lastEquity from Alpaca account for day change calculation', async () => {
    alpacaService.getPositions.mockResolvedValue([]);
    alpacaService.getAccount.mockResolvedValue({
      cash: '1000.00',
      equity: '5000.00',
      last_equity: '4900.00',
    });

    const res = await request(app)
      .get('/api/v1/portfolio')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('lastEquity', 4900);
  });

  test('returns 200 with empty positions when Alpaca service throws', async () => {
    alpacaService.getPositions.mockRejectedValue(new Error('Alpaca API error'));
    alpacaService.getAccount.mockRejectedValue(new Error('Alpaca API error'));

    const res = await request(app)
      .get('/api/v1/portfolio')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.positions).toEqual([]);
    expect(res.body.cash).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/portfolio/history
// ---------------------------------------------------------------------------
describe('GET /api/v1/portfolio/history', () => {
  test('returns 401 without a token', async () => {
    const res = await request(app).get('/api/v1/portfolio/history');
    expect(res.status).toBe(401);
  });

  test('returns history array with correct shape', async () => {
    alpacaService.getPortfolioHistory.mockResolvedValue({
      timestamp: [1700000000, 1700086400],
      equity: [10000, 10150],
      profit_loss: [0, 150],
      profit_loss_pct: [0, 0.015],
      base_value: 10000,
    });

    const res = await request(app)
      .get('/api/v1/portfolio/history?period=1M')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.history).toHaveLength(2);
    expect(res.body.history[0]).toMatchObject({ equity: 10000, pl: 0, plPct: 0 });
    expect(res.body.baseValue).toBe(10000);
  });

  test('returns empty history when Alpaca throws', async () => {
    alpacaService.getPortfolioHistory.mockRejectedValue(new Error('Alpaca error'));

    const res = await request(app)
      .get('/api/v1/portfolio/history')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.history).toEqual([]);
    expect(res.body.baseValue).toBe(0);
  });

  test('defaults to 1M when period param is invalid', async () => {
    alpacaService.getPortfolioHistory.mockResolvedValue({
      timestamp: [1700000000],
      equity: [10000],
      profit_loss: [0],
      profit_loss_pct: [0],
      base_value: 10000,
    });

    await request(app)
      .get('/api/v1/portfolio/history?period=invalid')
      .set('Authorization', `Bearer ${validToken}`);

    expect(alpacaService.getPortfolioHistory).toHaveBeenCalledWith('1M');
  });
});
