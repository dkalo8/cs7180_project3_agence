'use strict';

// Mock Anthropic SDK before requiring judge
const mockCreate = jest.fn();
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  }));
});

const { runJudge } = require('./judge');

const mockAgentOutputs = {
  spending: [
    { type: 'budget_flag', message: 'Dining spend up 40% MoM', severity: 'high' },
  ],
  anomaly: [
    { type: 'unusual_charge', message: 'Unrecognized $89 charge from AMZN', severity: 'medium' },
  ],
  goals: [
    { type: 'goal_behind', message: 'Emergency fund 3 months behind pace', severity: 'high' },
  ],
  portfolio: [
    { type: 'concentration_risk', message: 'TSLA is 45% of portfolio', severity: 'high' },
  ],
  market: [
    { ticker: 'AAPL', price: 180, change: 1.5, sentiment: 0.7 },
  ],
  autopilot: [],
};

const mockRankedInsights = [
  {
    source: 'portfolio',
    message: 'TSLA is 45% of portfolio',
    actionability: 5,
    urgency: 4,
    crossDomainRelevance: 3,
    confidence: 5,
    score: 17,
  },
  {
    source: 'goals',
    message: 'Emergency fund 3 months behind pace',
    actionability: 4,
    urgency: 5,
    crossDomainRelevance: 4,
    confidence: 5,
    score: 18,
  },
];

function makeAnthropicResponse(insights) {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ insights }),
      },
    ],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Cycle 1 — runJudge returns a Promise resolving to an array
// ---------------------------------------------------------------------------
describe('runJudge — cycle 1: return shape', () => {
  test('resolves to an array', async () => {
    mockCreate.mockResolvedValue(makeAnthropicResponse(mockRankedInsights));

    const result = await runJudge(mockAgentOutputs);

    expect(Array.isArray(result)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Cycle 2 — calls Anthropic messages.create exactly once
// ---------------------------------------------------------------------------
describe('runJudge — cycle 2: Anthropic call', () => {
  test('calls anthropic.messages.create exactly once', async () => {
    mockCreate.mockResolvedValue(makeAnthropicResponse(mockRankedInsights));

    await runJudge(mockAgentOutputs);

    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  test('uses a claude model', async () => {
    mockCreate.mockResolvedValue(makeAnthropicResponse(mockRankedInsights));

    await runJudge(mockAgentOutputs);

    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.model).toMatch(/^claude-/);
  });
});

// ---------------------------------------------------------------------------
// Cycle 3 — sends structured JSON in prompt, not concatenated text
// ---------------------------------------------------------------------------
describe('runJudge — cycle 3: structured prompt', () => {
  test('includes agent outputs as JSON in the prompt', async () => {
    mockCreate.mockResolvedValue(makeAnthropicResponse(mockRankedInsights));

    await runJudge(mockAgentOutputs);

    const callArgs = mockCreate.mock.calls[0][0];
    const promptText = JSON.stringify(callArgs);

    // The prompt must include the actual insight content, not a string summary
    expect(promptText).toContain('budget_flag');
    expect(promptText).toContain('concentration_risk');
  });

  test('prompt references explicit scoring dimensions', async () => {
    mockCreate.mockResolvedValue(makeAnthropicResponse(mockRankedInsights));

    await runJudge(mockAgentOutputs);

    const callArgs = mockCreate.mock.calls[0][0];
    const promptText = JSON.stringify(callArgs);

    expect(promptText).toContain('actionability');
    expect(promptText).toContain('urgency');
    expect(promptText).toContain('crossDomainRelevance');
    expect(promptText).toContain('confidence');
  });
});

// ---------------------------------------------------------------------------
// Cycle 4 — parses and returns ranked insights from Anthropic response
// ---------------------------------------------------------------------------
describe('runJudge — cycle 4: response parsing', () => {
  test('returns the insights array from Anthropic response', async () => {
    mockCreate.mockResolvedValue(makeAnthropicResponse(mockRankedInsights));

    const result = await runJudge(mockAgentOutputs);

    // Judge fields are all present; metadata merge may add extra fields
    mockRankedInsights.forEach((ranked, i) => {
      expect(result[i]).toMatchObject(ranked);
    });
  });

  test('preserves original agent metadata fields (type, txId, etc.) after judge merge', async () => {
    mockCreate.mockResolvedValue(makeAnthropicResponse(mockRankedInsights));

    const result = await runJudge(mockAgentOutputs);

    // 'TSLA is 45% of portfolio' originated from portfolio agent with type: 'concentration_risk'
    const portfolioInsight = result.find(i => i.message === 'TSLA is 45% of portfolio');
    expect(portfolioInsight).toBeDefined();
    expect(portfolioInsight.type).toBe('concentration_risk');
  });

  test('each insight has a score field', async () => {
    mockCreate.mockResolvedValue(makeAnthropicResponse(mockRankedInsights));

    const result = await runJudge(mockAgentOutputs);

    result.forEach(insight => {
      expect(insight).toHaveProperty('score');
    });
  });
});

// ---------------------------------------------------------------------------
// Cycle 5 — Anthropic failure falls back to raw flattened insights
// ---------------------------------------------------------------------------
describe('runJudge — cycle 5: Anthropic failure fallback', () => {
  test('returns flattened agent outputs when Anthropic throws', async () => {
    mockCreate.mockRejectedValue(new Error('Anthropic API error'));

    const result = await runJudge(mockAgentOutputs);

    expect(Array.isArray(result)).toBe(true);
    // Fallback: flattened insights from all agents (spending + anomaly + goals + portfolio + market)
    expect(result.length).toBeGreaterThan(0);
  });

  test('fallback includes insights from all non-empty agents', async () => {
    mockCreate.mockRejectedValue(new Error('Anthropic API error'));

    const result = await runJudge(mockAgentOutputs);

    const messages = result.map(i => i.message || i.ticker);
    expect(messages).toContain('Dining spend up 40% MoM');
    expect(messages).toContain('TSLA is 45% of portfolio');
  });
});
