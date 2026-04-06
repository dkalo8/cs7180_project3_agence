'use strict';

const autopilotAgent = require('./autopilotAgent');

const mockUserData = {
  transactions: [
    { id: 'tx1', amount: 50, merchant: 'Whole Foods', category: 'Groceries', date: '2026-03-01' },
    { id: 'tx2', amount: 12, merchant: 'Starbucks', category: 'Coffee', date: '2026-03-02' },
  ],
  balances: [{ accountId: 'acc1', current: 1000, available: 950 }],
  goals: [{ id: 'g1', name: 'Emergency Fund', target: 5000, current: 2000, monthlyContribution: 200 }],
};

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
describe('autopilotAgent — cycle 1: return shape', () => {
  test('returns an array', () => {
    expect(Array.isArray(autopilotAgent(mockUserData, mockMarketData))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Cycle 2 — empty input
// ---------------------------------------------------------------------------
describe('autopilotAgent — cycle 2: empty input', () => {
  test('returns empty array when there are no tickers', () => {
    expect(autopilotAgent(mockUserData, emptyMarketData)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Cycle 3 — insight shape
// ---------------------------------------------------------------------------
describe('autopilotAgent — cycle 3: insight shape', () => {
  test('each signal has type, action, ticker, quantity, reason', () => {
    // AAPL: 10 * 180 = $1800 out of $2050 total = 87.8% — triggers rebalance
    const data = {
      tickers: ['AAPL', 'TSLA'],
      positions: {
        AAPL: { qty: 10, avgCost: 170, currentPrice: 180 },
        TSLA: { qty: 1, avgCost: 260, currentPrice: 250 },
      },
      quotes: {
        AAPL: { price: 180, change: 0 },
        TSLA: { price: 250, change: 0 },
      },
      news: {},
    };
    const signals = autopilotAgent(mockUserData, data);
    expect(signals.length).toBeGreaterThan(0);
    signals.forEach(signal => {
      expect(signal).toHaveProperty('type');
      expect(signal).toHaveProperty('action');
      expect(signal).toHaveProperty('ticker');
      expect(signal).toHaveProperty('quantity');
      expect(signal).toHaveProperty('reason');
    });
  });
});

// ---------------------------------------------------------------------------
// Cycle 4 — core logic
// ---------------------------------------------------------------------------
describe('autopilotAgent — cycle 4: core logic', () => {
  test('signals rebalance when a position exceeds 20% of portfolio', () => {
    // AAPL: 10 * 180 = $1800, TSLA: 1 * 250 = $250, total = $2050
    // AAPL = 87.8% — well above 20%
    const data = {
      tickers: ['AAPL', 'TSLA'],
      positions: {
        AAPL: { qty: 10, avgCost: 170, currentPrice: 180 },
        TSLA: { qty: 1, avgCost: 260, currentPrice: 250 },
      },
      quotes: {
        AAPL: { price: 180, change: 0 },
        TSLA: { price: 250, change: 0 },
      },
      news: {},
    };
    const signals = autopilotAgent(mockUserData, data);
    const signal = signals.find(s => s.type === 'rebalance' && s.ticker === 'AAPL');
    expect(signal).toBeDefined();
    expect(signal.action).toBe('sell');
    expect(signal.quantity).toBeGreaterThan(0);
  });

  test('signals buy when a ticker drops more than 5% in 24h', () => {
    // TSLA change: -6% triggers buy signal
    const data = {
      tickers: ['TSLA'],
      positions: { TSLA: { qty: 5, avgCost: 260, currentPrice: 245 } },
      quotes: { TSLA: { price: 245, change: -6.0 } },
      news: {},
    };
    const signals = autopilotAgent(mockUserData, data);
    const signal = signals.find(s => s.type === 'buy_dip' && s.ticker === 'TSLA');
    expect(signal).toBeDefined();
    expect(signal.action).toBe('buy');
    expect(signal.quantity).toBeGreaterThan(0);
  });

  test('does not signal trades when portfolio is within bounds', () => {
    // 6 equal-weight positions (~16.7% each), no large drops
    const data = {
      tickers: ['A', 'B', 'C', 'D', 'E', 'F'],
      positions: {
        A: { qty: 1, avgCost: 100, currentPrice: 100 },
        B: { qty: 1, avgCost: 100, currentPrice: 100 },
        C: { qty: 1, avgCost: 100, currentPrice: 100 },
        D: { qty: 1, avgCost: 100, currentPrice: 100 },
        E: { qty: 1, avgCost: 100, currentPrice: 100 },
        F: { qty: 1, avgCost: 100, currentPrice: 100 },
      },
      quotes: {
        A: { price: 100, change: 0 },
        B: { price: 100, change: 0 },
        C: { price: 100, change: 0 },
        D: { price: 100, change: 0 },
        E: { price: 100, change: 0 },
        F: { price: 100, change: 0 },
      },
      news: {},
    };
    const signals = autopilotAgent(mockUserData, data);
    expect(signals).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Cycle 5 — edge cases
// ---------------------------------------------------------------------------
describe('autopilotAgent — cycle 5: edge cases', () => {
  test('handles no tickers gracefully', () => {
    expect(autopilotAgent(mockUserData, emptyMarketData)).toEqual([]);
  });

  test('never signals a sell that would reduce qty to zero (minimum 1 share)', () => {
    // AAPL: only 1 share at 100% concentration — should NOT signal sell
    const data = {
      tickers: ['AAPL'],
      positions: { AAPL: { qty: 1, avgCost: 170, currentPrice: 180 } },
      quotes: { AAPL: { price: 180, change: 0 } },
      news: {},
    };
    const signals = autopilotAgent(mockUserData, data);
    const sellSignals = signals.filter(s => s.action === 'sell' && s.ticker === 'AAPL');
    sellSignals.forEach(s => {
      expect(s.quantity).toBeLessThan(1);
    });
    // More specifically: no sell signal that would leave 0 shares
    const badSells = signals.filter(s => s.action === 'sell' && s.ticker === 'AAPL' && s.quantity >= 1);
    expect(badSells).toHaveLength(0);
  });
});
