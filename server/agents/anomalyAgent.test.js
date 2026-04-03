'use strict';

const anomalyAgent = require('./anomalyAgent');

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------
const mockUserData = {
  transactions: [
    { id: 'tx1', amount: 50, merchant: 'Whole Foods', category: 'Groceries', date: '2026-03-01' },
    { id: 'tx2', amount: 12, merchant: 'Starbucks', category: 'Coffee', date: '2026-03-02' },
  ],
  balances: [{ accountId: 'acc1', current: 1000, available: 950 }],
  goals: [],
};

const emptyUserData = { transactions: [], balances: [], goals: [] };

// ---------------------------------------------------------------------------
// Cycle 1 — returns an array
// ---------------------------------------------------------------------------
describe('anomalyAgent — cycle 1: return shape', () => {
  test('returns an array', () => {
    const result = anomalyAgent(mockUserData);
    expect(Array.isArray(result)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Cycle 2 — returns empty array for empty input
// ---------------------------------------------------------------------------
describe('anomalyAgent — cycle 2: empty input', () => {
  test('returns empty array when there are no transactions', () => {
    const result = anomalyAgent(emptyUserData);
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Cycle 3 — insight shape
// ---------------------------------------------------------------------------
describe('anomalyAgent — cycle 3: insight shape', () => {
  test.todo('each insight has type, message, severity, amount, merchant');
});

// ---------------------------------------------------------------------------
// Cycle 4 — core logic (placeholder — fill in during TDD)
// ---------------------------------------------------------------------------
describe('anomalyAgent — cycle 4: core logic', () => {
  test.todo('flags a single large transaction above threshold');
  test.todo('flags duplicate charges from the same merchant on the same day');
  test.todo('flags a new merchant category never seen before');
});

// ---------------------------------------------------------------------------
// Cycle 5 — edge cases
// ---------------------------------------------------------------------------
describe('anomalyAgent — cycle 5: edge cases', () => {
  test.todo('does not flag normal recurring transactions');
  test.todo('handles missing merchant or category fields gracefully');
});
