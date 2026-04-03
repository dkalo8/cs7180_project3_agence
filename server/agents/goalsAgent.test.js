'use strict';

const goalsAgent = require('./goalsAgent');

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------
const mockUserData = {
  transactions: [
    { id: 'tx1', amount: 50, merchant: 'Whole Foods', category: 'Groceries', date: '2026-03-01' },
    { id: 'tx2', amount: 12, merchant: 'Starbucks', category: 'Coffee', date: '2026-03-02' },
  ],
  balances: [{ accountId: 'acc1', current: 1000, available: 950 }],
  goals: [{ id: 'g1', name: 'Emergency Fund', target: 5000, current: 2000, monthlyContribution: 200 }],
};

const emptyUserData = { transactions: [], balances: [], goals: [] };

// ---------------------------------------------------------------------------
// Cycle 1 — returns an array
// ---------------------------------------------------------------------------
describe('goalsAgent — cycle 1: return shape', () => {
  test('returns an array', () => {
    const result = goalsAgent(mockUserData);
    expect(Array.isArray(result)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Cycle 2 — returns empty array for empty input
// ---------------------------------------------------------------------------
describe('goalsAgent — cycle 2: empty input', () => {
  test('returns empty array when goals list is empty', () => {
    const result = goalsAgent(emptyUserData);
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Cycle 3 — insight shape
// ---------------------------------------------------------------------------
describe('goalsAgent — cycle 3: insight shape', () => {
  test.todo('each insight has type, goalName, message, pace, projectedDate');
});

// ---------------------------------------------------------------------------
// Cycle 4 — core logic
// ---------------------------------------------------------------------------
describe('goalsAgent — cycle 4: core logic', () => {
  test.todo('flags a goal that is behind pace by more than 1 month');
  test.todo('marks a goal as on-track when pace meets target date');
  test.todo('flags a goal with zero contributions this month');
});

// ---------------------------------------------------------------------------
// Cycle 5 — edge cases
// ---------------------------------------------------------------------------
describe('goalsAgent — cycle 5: edge cases', () => {
  test.todo('handles goal with no target date');
  test.todo('returns empty array when goals list is empty');
});
