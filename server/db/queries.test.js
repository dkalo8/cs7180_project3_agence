'use strict';

// Mock pg before requiring queries
const mockQuery = jest.fn();
jest.mock('pg', () => ({
  Pool: jest.fn(() => ({ query: mockQuery })),
}));

const queries = require('./queries');

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
describe('createUser', () => {
  test('inserts a user and returns the row', async () => {
    const fakeUser = { id: 'uuid-1', email: 'a@b.com', created_at: new Date() };
    mockQuery.mockResolvedValueOnce({ rows: [fakeUser] });

    const result = await queries.createUser('a@b.com', 'hashedpw');

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO users/i);
    expect(params).toContain('a@b.com');
    expect(params).toContain('hashedpw');
    expect(result).toEqual(fakeUser);
  });
});

describe('getUserByEmail', () => {
  test('selects a user by email and returns the row', async () => {
    const fakeUser = { id: 'uuid-1', email: 'a@b.com' };
    mockQuery.mockResolvedValueOnce({ rows: [fakeUser] });

    const result = await queries.getUserByEmail('a@b.com');

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/SELECT.*FROM users/i);
    expect(params).toContain('a@b.com');
    expect(result).toEqual(fakeUser);
  });

  test('returns null when user not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const result = await queries.getUserByEmail('missing@b.com');
    expect(result).toBeNull();
  });
});

describe('getUserById', () => {
  test('selects a user by id and returns the row', async () => {
    const fakeUser = { id: 'uuid-1', email: 'a@b.com' };
    mockQuery.mockResolvedValueOnce({ rows: [fakeUser] });

    const result = await queries.getUserById('uuid-1');

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/SELECT[\s\S]*FROM users/i);
    expect(params).toContain('uuid-1');
    expect(result).toEqual(fakeUser);
  });

  test('returns null when user not found', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    expect(await queries.getUserById('bad-id')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------
describe('createAccount', () => {
  test('inserts an account and returns the row', async () => {
    const fakeAccount = { id: 'acc-1', user_id: 'uuid-1' };
    mockQuery.mockResolvedValueOnce({ rows: [fakeAccount] });

    const result = await queries.createAccount('uuid-1', 'access-token', 'item-id', 'Chase');

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO accounts/i);
    expect(params).toContain('uuid-1');
    expect(params).toContain('access-token');
    expect(result).toEqual(fakeAccount);
  });
});

describe('getAccountsByUserId', () => {
  test('returns all accounts for a user', async () => {
    const fakeAccounts = [{ id: 'acc-1' }, { id: 'acc-2' }];
    mockQuery.mockResolvedValueOnce({ rows: fakeAccounts });

    const result = await queries.getAccountsByUserId('uuid-1');

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/SELECT[\s\S]*FROM accounts/i);
    expect(params).toContain('uuid-1');
    expect(result).toEqual(fakeAccounts);
  });
});

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------
describe('createGoal', () => {
  test('inserts a goal and returns the row', async () => {
    const fakeGoal = { id: 'goal-1', name: 'Emergency Fund' };
    mockQuery.mockResolvedValueOnce({ rows: [fakeGoal] });

    const result = await queries.createGoal('uuid-1', 'Emergency Fund', 5000, 200);

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO goals/i);
    expect(params).toContain('Emergency Fund');
    expect(params).toContain(5000);
    expect(result).toEqual(fakeGoal);
  });
});

describe('getGoalsByUserId', () => {
  test('returns all goals for a user', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'goal-1' }] });
    const result = await queries.getGoalsByUserId('uuid-1');
    expect(result).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Trades
// ---------------------------------------------------------------------------
describe('createTrade', () => {
  test('inserts a trade and returns the row', async () => {
    const fakeTrade = { id: 'trade-1', ticker: 'AAPL', action: 'buy' };
    mockQuery.mockResolvedValueOnce({ rows: [fakeTrade] });

    const result = await queries.createTrade('uuid-1', 'AAPL', 'buy', 5, 180.00, 'alpaca-order-id');

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO trades/i);
    expect(params).toContain('AAPL');
    expect(params).toContain('buy');
    expect(result).toEqual(fakeTrade);
  });
});

describe('getTradesByUserId', () => {
  test('returns all trades for a user', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'trade-1' }] });
    const result = await queries.getTradesByUserId('uuid-1');
    expect(result).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------
describe('getTransactionsByUserId', () => {
  test('returns all transactions for a user ordered by date desc', async () => {
    const fakeTxs = [{ id: 'tx-1', date: '2026-04-01' }];
    mockQuery.mockResolvedValueOnce({ rows: fakeTxs });

    const result = await queries.getTransactionsByUserId(['uuid-1']);

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/SELECT.*FROM transactions/i);
    expect(sql).toMatch(/ORDER BY/i);
    expect(params[0]).toContain('uuid-1');
    expect(result).toEqual(fakeTxs);
  });
});
