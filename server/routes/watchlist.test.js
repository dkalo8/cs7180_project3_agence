'use strict';

process.env.JWT_SECRET = 'test-secret'; // pragma: allowlist secret
process.env.DATABASE_URL = 'postgresql://localhost/agence_dev'; // pragma: allowlist secret

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../index');

jest.mock('../db/queries');
jest.mock('../services/alpaca');
const queries = require('../db/queries');
const alpacaService = require('../services/alpaca');

const validToken = jwt.sign({ userId: 'uuid-1' }, 'test-secret');

const SNAPSHOTS = {
  AAPL: {
    dailyBar: { c: 175.5 },
    prevDailyBar: { c: 172.0 },
  },
  TSLA: {
    dailyBar: { c: 260.0 },
    prevDailyBar: { c: 265.0 },
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  alpacaService.getSnapshots.mockResolvedValue(SNAPSHOTS);
  queries.getHouseholdMemberIds.mockResolvedValue(['uuid-1']);
});

const WATCHLIST = [
  { id: 'w1', ticker: 'AAPL', added_at: '2026-04-01T00:00:00.000Z' },
  { id: 'w2', ticker: 'TSLA', added_at: '2026-04-02T00:00:00.000Z' },
];

describe('GET /api/v1/watchlist', () => {
  test('returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/watchlist');
    expect(res.status).toBe(401);
  });

  test('returns watchlist array', async () => {
    queries.getWatchlistByUserId.mockResolvedValue(WATCHLIST);
    const res = await request(app)
      .get('/api/v1/watchlist')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.watchlist).toHaveLength(2);
    expect(res.body.watchlist[0].ticker).toBe('AAPL');
  });

  test('enriches items with price and changePercent from snapshots', async () => {
    queries.getWatchlistByUserId.mockResolvedValue(WATCHLIST);
    const res = await request(app)
      .get('/api/v1/watchlist')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    const aapl = res.body.watchlist.find(w => w.ticker === 'AAPL');
    expect(aapl.price).toBeCloseTo(175.5);
    expect(aapl.changePercent).toBeCloseTo(2.03, 1); // (175.5 - 172) / 172 * 100
    const tsla = res.body.watchlist.find(w => w.ticker === 'TSLA');
    expect(tsla.changePercent).toBeLessThan(0); // price dropped
  });

  test('returns price null when snapshot unavailable', async () => {
    queries.getWatchlistByUserId.mockResolvedValue(WATCHLIST);
    alpacaService.getSnapshots.mockResolvedValue({}); // no data
    const res = await request(app)
      .get('/api/v1/watchlist')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.watchlist[0].price).toBeNull();
    expect(res.body.watchlist[0].changePercent).toBeNull();
  });

  test('still returns watchlist when snapshots call fails', async () => {
    queries.getWatchlistByUserId.mockResolvedValue(WATCHLIST);
    alpacaService.getSnapshots.mockRejectedValue(new Error('Alpaca down'));
    const res = await request(app)
      .get('/api/v1/watchlist')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.watchlist).toHaveLength(2);
    expect(res.body.watchlist[0].price).toBeNull();
  });
});

describe('POST /api/v1/watchlist', () => {
  test('returns 401 without token', async () => {
    const res = await request(app).post('/api/v1/watchlist').send({ ticker: 'AAPL' });
    expect(res.status).toBe(401);
  });

  test('returns 400 when ticker missing', async () => {
    const res = await request(app)
      .post('/api/v1/watchlist')
      .set('Authorization', `Bearer ${validToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  test('adds ticker and returns 201', async () => {
    queries.addToWatchlist.mockResolvedValue({ id: 'w3', ticker: 'NVDA', added_at: '2026-04-08T00:00:00.000Z' });
    const res = await request(app)
      .post('/api/v1/watchlist')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ ticker: 'nvda' });
    expect(res.status).toBe(201);
    expect(res.body.ticker).toBe('NVDA');
  });

  test('upcases ticker before insert', async () => {
    queries.addToWatchlist.mockResolvedValue({ id: 'w3', ticker: 'MSFT', added_at: '2026-04-08T00:00:00.000Z' });
    await request(app)
      .post('/api/v1/watchlist')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ ticker: 'msft' });
    expect(queries.addToWatchlist).toHaveBeenCalledWith('uuid-1', 'MSFT');
  });
});

describe('DELETE /api/v1/watchlist/:ticker', () => {
  test('returns 401 without token', async () => {
    const res = await request(app).delete('/api/v1/watchlist/AAPL');
    expect(res.status).toBe(401);
  });

  test('removes ticker and returns 200', async () => {
    queries.removeFromWatchlist.mockResolvedValue();
    const res = await request(app)
      .delete('/api/v1/watchlist/AAPL')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(queries.removeFromWatchlist).toHaveBeenCalledWith('uuid-1', 'AAPL');
  });
});
