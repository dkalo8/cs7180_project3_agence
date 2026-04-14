'use strict';

// Mock all agents before requiring the orchestrator.
// Empty skeleton files need explicit jest.fn() factories so mockReturnValue works.
jest.mock('../agents/spendingAgent', () => jest.fn());
jest.mock('../agents/anomalyAgent', () => jest.fn());
jest.mock('../agents/goalsAgent', () => jest.fn());
jest.mock('../agents/portfolioAgent', () => jest.fn());
jest.mock('../agents/marketContextAgent', () => jest.fn());
jest.mock('../agents/autopilotAgent', () => jest.fn());
jest.mock('../agents/watchlistAgent', () => jest.fn());

const spendingAgent = require('../agents/spendingAgent');
const anomalyAgent = require('../agents/anomalyAgent');
const goalsAgent = require('../agents/goalsAgent');
const portfolioAgent = require('../agents/portfolioAgent');
const marketContextAgent = require('../agents/marketContextAgent');
const autopilotAgent = require('../agents/autopilotAgent');
const watchlistAgent = require('../agents/watchlistAgent');

const { runOrchestrator } = require('./index');

const mockUserData = {
  transactions: [{ id: 'tx1', amount: 50, category: 'Food' }],
  balances: [{ accountId: 'acc1', current: 1000 }],
  goals: [{ id: 'g1', name: 'Emergency Fund', target: 5000, current: 2000 }],
};

const mockMarketData = {
  tickers: ['AAPL', 'TSLA'],
  quotes: { AAPL: { price: 180, change: 1.5 }, TSLA: { price: 250, change: -2.0 } },
  news: { AAPL: [{ headline: 'Apple hits record', sentiment: 0.8 }] },
};

function mockAll() {
  spendingAgent.mockReturnValue([]);
  anomalyAgent.mockReturnValue([]);
  goalsAgent.mockReturnValue([]);
  portfolioAgent.mockReturnValue([]);
  marketContextAgent.mockReturnValue([]);
  autopilotAgent.mockReturnValue([]);
  watchlistAgent.mockReturnValue([]);
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Cycle 1 — runOrchestrator returns a Promise resolving to an object
// ---------------------------------------------------------------------------
describe('runOrchestrator — cycle 1: return shape', () => {
  test('resolves to an object with one key per agent', async () => {
    mockAll();

    const result = await runOrchestrator(mockUserData, mockMarketData);

    expect(result).toEqual(
      expect.objectContaining({
        spending: expect.any(Array),
        anomaly: expect.any(Array),
        goals: expect.any(Array),
        portfolio: expect.any(Array),
        market: expect.any(Array),
        autopilot: expect.any(Array),
        watchlist: expect.any(Array),
      })
    );
  });
});

// ---------------------------------------------------------------------------
// Cycle 2 — all 7 agents are called exactly once
// ---------------------------------------------------------------------------
describe('runOrchestrator — cycle 2: all agents called', () => {
  test('calls every agent exactly once', async () => {
    mockAll();

    await runOrchestrator(mockUserData, mockMarketData);

    expect(spendingAgent).toHaveBeenCalledTimes(1);
    expect(anomalyAgent).toHaveBeenCalledTimes(1);
    expect(goalsAgent).toHaveBeenCalledTimes(1);
    expect(portfolioAgent).toHaveBeenCalledTimes(1);
    expect(marketContextAgent).toHaveBeenCalledTimes(1);
    expect(autopilotAgent).toHaveBeenCalledTimes(1);
    expect(watchlistAgent).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Cycle 3 — correct data routed to each agent
// ---------------------------------------------------------------------------
describe('runOrchestrator — cycle 3: data routing', () => {
  test('passes userData to spending, anomaly, goals agents', async () => {
    mockAll();

    await runOrchestrator(mockUserData, mockMarketData);

    expect(spendingAgent).toHaveBeenCalledWith(mockUserData);
    expect(anomalyAgent).toHaveBeenCalledWith(mockUserData);
    expect(goalsAgent).toHaveBeenCalledWith(mockUserData);
  });

  test('passes marketData to portfolio and marketContext agents', async () => {
    mockAll();

    await runOrchestrator(mockUserData, mockMarketData);

    expect(portfolioAgent).toHaveBeenCalledWith(mockMarketData);
    expect(marketContextAgent).toHaveBeenCalledWith(mockMarketData);
  });

  test('passes both userData and marketData to autopilot and watchlist agents', async () => {
    mockAll();

    await runOrchestrator(mockUserData, mockMarketData);

    expect(autopilotAgent).toHaveBeenCalledWith(mockUserData, mockMarketData);
    expect(watchlistAgent).toHaveBeenCalledWith(mockUserData, mockMarketData);
  });
});

// ---------------------------------------------------------------------------
// Cycle 4 — non-critical agent failure does not crash the orchestrator
// ---------------------------------------------------------------------------
describe('runOrchestrator — cycle 4: agent failure resilience', () => {
  test('resolves with empty array for a failing non-critical agent', async () => {
    mockAll();
    spendingAgent.mockReturnValue([{ type: 'spending_spike', message: 'High food spend' }]);
    anomalyAgent.mockImplementation(() => { throw new Error('Plaid timeout'); });

    const result = await runOrchestrator(mockUserData, mockMarketData);

    // Spending insights still present
    expect(result.spending).toHaveLength(1);
    // Failing agent returns empty array, does not throw
    expect(result.anomaly).toEqual([]);
  });

  test('resolves even if multiple agents fail', async () => {
    mockAll();
    spendingAgent.mockImplementation(() => { throw new Error('error'); });
    anomalyAgent.mockImplementation(() => { throw new Error('error'); });
    goalsAgent.mockReturnValue([{ type: 'goal_on_track' }]);

    const result = await runOrchestrator(mockUserData, mockMarketData);

    expect(result.spending).toEqual([]);
    expect(result.anomaly).toEqual([]);
    expect(result.goals).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Cycle 5 — agent insights are surfaced in the result
// ---------------------------------------------------------------------------
describe('runOrchestrator — cycle 5: insight passthrough', () => {
  test('result contains insights returned by agents', async () => {
    const spendingInsight = { type: 'budget_flag', message: 'Over dining budget', severity: 'high' };
    const marketInsight = { ticker: 'AAPL', price: 180, sentiment: 0.8 };

    mockAll();
    spendingAgent.mockReturnValue([spendingInsight]);
    marketContextAgent.mockReturnValue([marketInsight]);

    const result = await runOrchestrator(mockUserData, mockMarketData);

    expect(result.spending).toContainEqual(expect.objectContaining(spendingInsight));
    expect(result.market).toContainEqual(expect.objectContaining(marketInsight));
  });
});
