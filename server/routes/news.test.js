'use strict';

process.env.JWT_SECRET = 'test-secret'; // pragma: allowlist secret
process.env.DATABASE_URL = 'postgresql://localhost/agence_dev'; // pragma: allowlist secret

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../index');
const finnhubService = require('../services/finnhub');

jest.mock('../services/finnhub');

const validToken = jwt.sign({ userId: 'uuid-1' }, 'test-secret');

const MOCK_ARTICLES = [
  {
    headline: 'AAPL hits all-time high',
    summary: 'Apple shares surged on strong earnings.',
    url: 'https://example.com/aapl-high',
    source: 'Reuters',
    datetime: 1714000000,
  },
];

beforeEach(() => jest.clearAllMocks());

describe('GET /api/v1/news', () => {
  test('returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/news?tickers=AAPL');
    expect(res.status).toBe(401);
  });

  test('returns 400 when tickers param missing', async () => {
    const res = await request(app)
      .get('/api/v1/news')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('returns news array for single ticker', async () => {
    finnhubService.getNewsArticles = jest.fn().mockResolvedValue(MOCK_ARTICLES);
    const res = await request(app)
      .get('/api/v1/news?tickers=AAPL')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.news).toHaveLength(1);
    expect(res.body.news[0].ticker).toBe('AAPL');
    expect(res.body.news[0].articles).toEqual(MOCK_ARTICLES);
    expect(finnhubService.getNewsArticles).toHaveBeenCalledWith('AAPL');
  });

  test('returns news for multiple tickers in parallel', async () => {
    finnhubService.getNewsArticles = jest.fn().mockResolvedValue(MOCK_ARTICLES);
    const res = await request(app)
      .get('/api/v1/news?tickers=AAPL,TSLA')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.news).toHaveLength(2);
    const tickers = res.body.news.map(n => n.ticker);
    expect(tickers).toContain('AAPL');
    expect(tickers).toContain('TSLA');
    expect(finnhubService.getNewsArticles).toHaveBeenCalledTimes(2);
  });

  test('handles finnhub error gracefully with empty articles', async () => {
    finnhubService.getNewsArticles = jest.fn().mockRejectedValue(new Error('Finnhub down'));
    const res = await request(app)
      .get('/api/v1/news?tickers=AAPL')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.news[0].articles).toEqual([]);
  });

  test('upcases tickers and strips whitespace', async () => {
    finnhubService.getNewsArticles = jest.fn().mockResolvedValue([]);
    const res = await request(app)
      .get('/api/v1/news?tickers=aapl, tsla')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(finnhubService.getNewsArticles).toHaveBeenCalledWith('AAPL');
    expect(finnhubService.getNewsArticles).toHaveBeenCalledWith('TSLA');
  });
});
