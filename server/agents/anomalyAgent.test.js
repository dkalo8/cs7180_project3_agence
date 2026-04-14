'use strict';

const anomalyAgent = require('./anomalyAgent');

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------
const normalTransactions = [
  { id: 'tx1', amount: 50, merchant: 'Whole Foods', category: 'Groceries', date: '2026-03-01' },
  { id: 'tx2', amount: 12, merchant: 'Starbucks', category: 'Coffee', date: '2026-03-02' },
];

const emptyUserData = { transactions: [], balances: [], goals: [] };
const normalUserData = { transactions: normalTransactions, balances: [], goals: [] };

// ---------------------------------------------------------------------------
// Cycle 1 — returns an array
// ---------------------------------------------------------------------------
describe('anomalyAgent — cycle 1: return shape', () => {
  test('returns an array', () => {
    const result = anomalyAgent(normalUserData);
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
  test('each insight has type, message, severity, amount, merchant', () => {
    const userData = {
      transactions: [
        { id: 'tx1', amount: 750, merchant: 'Best Buy', category: 'Electronics', date: '2026-03-01' },
      ],
      balances: [],
      goals: [],
    };
    const result = anomalyAgent(userData);
    expect(result.length).toBeGreaterThan(0);
    result.forEach(insight => {
      expect(insight).toHaveProperty('type');
      expect(insight).toHaveProperty('message');
      expect(insight).toHaveProperty('severity');
      expect(insight).toHaveProperty('amount');
      expect(insight).toHaveProperty('merchant');
    });
  });
});

// ---------------------------------------------------------------------------
// Cycle 4 — core logic
// ---------------------------------------------------------------------------
describe('anomalyAgent — cycle 4: core logic', () => {
  test('flags a single large transaction above $500 threshold', () => {
    const userData = {
      transactions: [
        { id: 'tx1', amount: 750, merchant: 'Best Buy', category: 'Electronics', date: '2026-03-01' },
      ],
      balances: [],
      goals: [],
    };
    const result = anomalyAgent(userData);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('large_transaction');
    expect(result[0].severity).toBe('high');
    expect(result[0].amount).toBe(750);
    expect(result[0].merchant).toBe('Best Buy');
  });

  test('flags duplicate charges from the same merchant on the same day', () => {
    const userData = {
      transactions: [
        { id: 'tx1', amount: 15, merchant: 'Netflix', category: 'Subscriptions', date: '2026-03-01' },
        { id: 'tx2', amount: 15, merchant: 'Netflix', category: 'Subscriptions', date: '2026-03-01' },
      ],
      balances: [],
      goals: [],
    };
    const result = anomalyAgent(userData);
    const duplicates = result.filter(i => i.type === 'duplicate_charge');
    expect(duplicates.length).toBeGreaterThan(0);
    expect(duplicates[0].merchant).toBe('Netflix');
    expect(duplicates[0].severity).toBe('medium');
  });

  test('duplicate_charge insight includes date field matching the transaction date', () => {
    const userData = {
      transactions: [
        { id: 'tx1', amount: 25, merchant: 'Spotify', category: 'Subscriptions', date: '2026-03-15' },
        { id: 'tx2', amount: 25, merchant: 'Spotify', category: 'Subscriptions', date: '2026-03-15' },
      ],
      balances: [],
      goals: [],
    };
    const result = anomalyAgent(userData);
    const dup = result.find(i => i.type === 'duplicate_charge');
    expect(dup).toBeDefined();
    expect(dup.date).toBe('2026-03-15');
  });

  test('duplicate_charge amount is always positive for negative Plaid transactions', () => {
    const userData = {
      transactions: [
        { id: 'tx1', amount: -15, merchant_name: 'Netflix', category: 'Subscriptions', date: '2026-03-01' },
        { id: 'tx2', amount: -15, merchant_name: 'Netflix', category: 'Subscriptions', date: '2026-03-01' },
      ],
      balances: [],
      goals: [],
    };
    const result = anomalyAgent(userData);
    const dup = result.find(i => i.type === 'duplicate_charge');
    expect(dup).toBeDefined();
    expect(dup.amount).toBe(15);
    expect(dup.message).not.toContain('-');
  });

  test('repeated_charge amount is always positive for negative Plaid transactions', () => {
    const userData = {
      transactions: [
        { id: 'tx1', amount: -500, merchant_name: 'United Airlines', category: 'Travel', date: '2026-03-13' },
        { id: 'tx2', amount: -500, merchant_name: 'United Airlines', category: 'Travel', date: '2026-02-13' },
      ],
      balances: [],
      goals: [],
    };
    const result = anomalyAgent(userData);
    const rep = result.find(i => i.type === 'repeated_charge');
    expect(rep).toBeDefined();
    expect(rep.amount).toBe(500);
    expect(rep.message).not.toContain('$-');
  });

  test('repeated_charge insight includes merchant and amount fields for multi-row routing', () => {
    const userData = {
      transactions: [
        { id: 'tx1', amount: 6.33, merchant_name: 'Uber', category: 'Transport', date: '2026-03-28' },
        { id: 'tx2', amount: 6.33, merchant_name: 'Uber', category: 'Transport', date: '2026-02-26' },
        { id: 'tx3', amount: 6.33, merchant_name: 'Uber', category: 'Transport', date: '2026-01-15' },
      ],
      balances: [],
      goals: [],
    };
    const result = anomalyAgent(userData);
    const repeated = result.find(i => i.type === 'repeated_charge');
    expect(repeated).toBeDefined();
    expect(repeated.merchant).toBe('Uber');
    expect(repeated.amount).toBe(6.33);
    expect(typeof repeated.merchant).toBe('string');
    expect(typeof repeated.amount).toBe('number');
  });

  test('does not flag a duplicate when same merchant appears on different days', () => {
    const userData = {
      transactions: [
        { id: 'tx1', amount: 15, merchant: 'Netflix', category: 'Subscriptions', date: '2026-03-01' },
        { id: 'tx2', amount: 15, merchant: 'Netflix', category: 'Subscriptions', date: '2026-04-01' },
      ],
      balances: [],
      goals: [],
    };
    const result = anomalyAgent(userData);
    const duplicates = result.filter(i => i.type === 'duplicate_charge');
    expect(duplicates).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Cycle 5 — edge cases
// ---------------------------------------------------------------------------
describe('anomalyAgent — cycle 5: edge cases', () => {
  test('does not flag normal low-value transactions', () => {
    const result = anomalyAgent(normalUserData);
    expect(result).toHaveLength(0);
  });

  test('handles transactions with missing merchant or category gracefully', () => {
    const userData = {
      transactions: [
        { id: 'tx1', amount: 750, date: '2026-03-01' },
      ],
      balances: [],
      goals: [],
    };
    expect(() => anomalyAgent(userData)).not.toThrow();
    const result = anomalyAgent(userData);
    expect(Array.isArray(result)).toBe(true);
  });
});
