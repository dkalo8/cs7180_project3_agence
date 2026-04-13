'use strict';

const watchlistAgent = require('./watchlistAgent');

describe('watchlistAgent', () => {
  const makeUserData = (tickers) => ({
    watchlist: tickers.map(t => ({ ticker: t })),
  });

  const makeMarketData = (overrides = {}) => ({
    quotes: {
      AAPL: { price: 175.00, changePercent: 4.5 },
      TSLA: { price: 200.00, changePercent: -1.2 },
      NVDA: { price: 900.00, changePercent: -6.0 },
    },
    news: {
      TSLA: { headline: 'Tesla misses earnings', sentimentScore: 0.15 },
    },
    ...overrides,
  });

  test('returns empty array when watchlist is empty', () => {
    expect(watchlistAgent({ watchlist: [] }, makeMarketData())).toEqual([]);
  });

  test('returns empty array when userData has no watchlist', () => {
    expect(watchlistAgent({}, makeMarketData())).toEqual([]);
  });

  test('flags big mover (>= 3%) as watchlist_mover insight', () => {
    const result = watchlistAgent(makeUserData(['AAPL']), makeMarketData());
    const mover = result.find(i => i.type === 'watchlist_mover');
    expect(mover).toBeDefined();
    expect(mover.ticker).toBe('AAPL');
    expect(mover.message).toMatch(/AAPL/);
  });

  test('big mover >= 5% gets high severity', () => {
    const result = watchlistAgent(makeUserData(['NVDA']), makeMarketData());
    const mover = result.find(i => i.type === 'watchlist_mover' && i.ticker === 'NVDA');
    expect(mover).toBeDefined();
    expect(mover.severity).toBe('high');
  });

  test('small move (< 3%) emits no price insight', () => {
    const result = watchlistAgent(makeUserData(['TSLA']), makeMarketData());
    expect(result.some(i => i.type === 'watchlist_quote' && i.ticker === 'TSLA')).toBe(false);
    expect(result.some(i => i.type === 'watchlist_mover' && i.ticker === 'TSLA')).toBe(false);
  });

  test('positive sentiment (> 0.7) emits watchlist_sentiment info insight', () => {
    const data = makeMarketData({
      news: { AAPL: { headline: 'Apple beats earnings', sentimentScore: 0.85 } },
    });
    const result = watchlistAgent(makeUserData(['AAPL']), data);
    const sentiment = result.find(i => i.type === 'watchlist_sentiment' && i.ticker === 'AAPL');
    expect(sentiment).toBeDefined();
    expect(sentiment.severity).toBe('info');
  });

  test('negative sentiment ticker emits watchlist_sentiment insight', () => {
    const result = watchlistAgent(makeUserData(['TSLA']), makeMarketData());
    const sentiment = result.find(i => i.type === 'watchlist_sentiment' && i.ticker === 'TSLA');
    expect(sentiment).toBeDefined();
    expect(sentiment.message).toMatch(/TSLA/);
  });

  test('returns empty array when quotes are missing', () => {
    const result = watchlistAgent(makeUserData(['AAPL']), { quotes: {}, news: {} });
    expect(result).toEqual([]);
  });
});
