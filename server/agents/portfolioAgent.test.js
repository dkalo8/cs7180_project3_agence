'use strict';

const portfolioAgent = require('./portfolioAgent');

const mockMarketData = {
  tickers: ['AAPL', 'TSLA'],
  positions: {
    AAPL: { qty: 10, avgCost: 170, currentPrice: 180 },
    TSLA: { qty: 5, avgCost: 260, currentPrice: 250 },
  },
  quotes: {
    AAPL: { price: 180, change: 1.5 },
    TSLA: { price: 250, change: -2.0 },
  },
  news: { AAPL: [{ headline: 'Apple hits record', sentiment: 0.8 }] },
};

const emptyMarketData = { tickers: [], positions: {}, quotes: {}, news: {} };

// ---------------------------------------------------------------------------
// Cycle 1 — return shape
// ---------------------------------------------------------------------------
describe('portfolioAgent — cycle 1: return shape', () => {
  test('returns an array', () => {
    expect(Array.isArray(portfolioAgent(mockMarketData))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Cycle 2 — empty input
// ---------------------------------------------------------------------------
describe('portfolioAgent — cycle 2: empty input', () => {
  test('returns empty array when positions object is empty', () => {
    expect(portfolioAgent(emptyMarketData)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Cycle 3 — insight shape
// ---------------------------------------------------------------------------
describe('portfolioAgent — cycle 3: insight shape', () => {
  test('each insight has type, message, severity, and optional ticker', () => {
    // Force a concentration risk: AAPL is 100% of portfolio
    const data = {
      tickers: ['AAPL'],
      positions: { AAPL: { qty: 10, avgCost: 170, currentPrice: 180 } },
      quotes: { AAPL: { price: 180, change: 1.5 } },
      news: {},
    };
    const insights = portfolioAgent(data);
    expect(insights.length).toBeGreaterThan(0);
    insights.forEach(insight => {
      expect(insight).toHaveProperty('type');
      expect(insight).toHaveProperty('message');
      expect(insight).toHaveProperty('severity');
    });
  });
});

// ---------------------------------------------------------------------------
// Cycle 4 — core logic
// ---------------------------------------------------------------------------
describe('portfolioAgent — cycle 4: core logic', () => {
  test('flags concentration risk when a position exceeds 20% of portfolio value', () => {
    // AAPL: 10 * 180 = $1800 (90% of portfolio), TSLA: 2 * 250 = $500 (10%)
    const data = {
      tickers: ['AAPL', 'TSLA'],
      positions: {
        AAPL: { qty: 10, avgCost: 170, currentPrice: 180 },
        TSLA: { qty: 2, avgCost: 260, currentPrice: 250 },
      },
      quotes: {},
      news: {},
    };
    const insights = portfolioAgent(data);
    const flag = insights.find(i => i.type === 'concentration_risk' && i.ticker === 'AAPL');
    expect(flag).toBeDefined();
    expect(flag.severity).toBe('high');
  });

  test('flags unrealized loss greater than 10%', () => {
    // TSLA: avgCost 260, currentPrice 220 → -15.4% loss
    const data = {
      tickers: ['TSLA'],
      positions: { TSLA: { qty: 5, avgCost: 260, currentPrice: 220 } },
      quotes: {},
      news: {},
    };
    const insights = portfolioAgent(data);
    const flag = insights.find(i => i.type === 'unrealized_loss' && i.ticker === 'TSLA');
    expect(flag).toBeDefined();
    expect(flag.severity).toBe('high');
  });

  test('flags cash drag when cash exceeds 20% of total portfolio value', () => {
    // positions worth $500, cash $200 → cash is 28.6% of total ($700)
    const data = {
      tickers: ['AAPL'],
      positions: { AAPL: { qty: 2, avgCost: 200, currentPrice: 250 } },
      quotes: {},
      news: {},
      cash: 200,
    };
    const insights = portfolioAgent(data);
    const flag = insights.find(i => i.type === 'cash_drag');
    expect(flag).toBeDefined();
    expect(flag.severity).toBe('medium');
  });
});

// ---------------------------------------------------------------------------
// Cycle 5 — edge cases
// ---------------------------------------------------------------------------
describe('portfolioAgent — cycle 5: edge cases', () => {
  test('handles empty positions object', () => {
    expect(portfolioAgent(emptyMarketData)).toEqual([]);
  });

  test('does not flag a well-diversified portfolio with no losses', () => {
    // 6 positions, ~16.7% each (all under 20% threshold), all at gain
    const data = {
      tickers: ['A', 'B', 'C', 'D', 'E', 'F'],
      positions: {
        A: { qty: 1, avgCost: 100, currentPrice: 110 },
        B: { qty: 1, avgCost: 100, currentPrice: 108 },
        C: { qty: 1, avgCost: 100, currentPrice: 105 },
        D: { qty: 1, avgCost: 100, currentPrice: 107 },
        E: { qty: 1, avgCost: 100, currentPrice: 106 },
        F: { qty: 1, avgCost: 100, currentPrice: 109 },
      },
      quotes: {},
      news: {},
    };
    const insights = portfolioAgent(data);
    const flags = insights.filter(i =>
      i.type === 'concentration_risk' || i.type === 'unrealized_loss'
    );
    expect(flags).toHaveLength(0);
  });
});
