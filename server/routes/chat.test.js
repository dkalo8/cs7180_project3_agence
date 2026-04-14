'use strict';

process.env.JWT_SECRET = 'test-secret'; // pragma: allowlist secret
process.env.DATABASE_URL = 'postgresql://localhost/agence_dev'; // pragma: allowlist secret

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../index');

jest.mock('../db/queries');
jest.mock('../services/alpaca');
jest.mock('@anthropic-ai/sdk');

const queries = require('../db/queries');
const alpacaService = require('../services/alpaca');
const Anthropic = require('@anthropic-ai/sdk');

const validToken = jwt.sign({ userId: 'uuid-1' }, 'test-secret'); // pragma: allowlist secret

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeTextResponse(text) {
  return { stop_reason: 'end_turn', content: [{ type: 'text', text }] };
}

function makeToolUseResponse(toolCalls) {
  return {
    stop_reason: 'tool_use',
    content: toolCalls.map((tc, i) => ({
      type: 'tool_use',
      id: `tool_${i}`,
      name: tc.name,
      input: tc.input || {},
    })),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  queries.getTransactionsByUserId.mockResolvedValue([]);
  queries.getAccountsByUserId.mockResolvedValue([]);
  queries.getGoalsByUserId.mockResolvedValue([]);
  queries.getWatchlistByUserId.mockResolvedValue([]);
  queries.getTradesByUserId.mockResolvedValue([]);
  alpacaService.getAccount.mockResolvedValue({ cash: '1000', equity: '5000' });
  alpacaService.getPositions.mockResolvedValue([]);
});

// ── Auth / validation ────────────────────────────────────────────────────────

describe('POST /api/v1/chat', () => {
  test('returns 401 without token', async () => {
    const res = await request(app).post('/api/v1/chat').send({ message: 'hello' });
    expect(res.status).toBe(401);
  });

  test('returns 400 when message is missing', async () => {
    const res = await request(app)
      .post('/api/v1/chat')
      .set('Authorization', `Bearer ${validToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  test('returns 400 when message is empty string', async () => {
    const res = await request(app)
      .post('/api/v1/chat')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ message: '   ' });
    expect(res.status).toBe(400);
  });

  // ── Single-turn (no tools needed) ─────────────────────────────────────────

  test('returns 200 with reply when Claude answers without tool calls', async () => {
    const mockCreate = jest.fn().mockResolvedValue(
      makeTextResponse('You have $1000 in cash.')
    );
    Anthropic.mockImplementation(() => ({ messages: { create: mockCreate } }));

    const res = await request(app)
      .post('/api/v1/chat')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ message: 'What is my cash balance?' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('reply');
    expect(typeof res.body.reply).toBe('string');
  });

  test('passes conversation history to Claude', async () => {
    const mockCreate = jest.fn().mockResolvedValue(makeTextResponse('Sure!'));
    Anthropic.mockImplementation(() => ({ messages: { create: mockCreate } }));

    const history = [
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello! How can I help?' },
    ];

    await request(app)
      .post('/api/v1/chat')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ message: 'What is my cash balance?', history });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const messages = mockCreate.mock.calls[0][0].messages;
    expect(messages.some(m => m.role === 'user' && m.content === 'Hi')).toBe(true);
  });

  // ── Tool definitions ───────────────────────────────────────────────────────

  test('passes tool definitions to Claude on every call', async () => {
    const mockCreate = jest.fn().mockResolvedValue(makeTextResponse('Hello'));
    Anthropic.mockImplementation(() => ({ messages: { create: mockCreate } }));

    await request(app)
      .post('/api/v1/chat')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ message: 'Hi' });

    const callArgs = mockCreate.mock.calls[0][0];
    expect(Array.isArray(callArgs.tools)).toBe(true);
    const toolNames = callArgs.tools.map(t => t.name);
    expect(toolNames).toContain('get_transactions');
    expect(toolNames).toContain('get_portfolio');
    expect(toolNames).toContain('get_goals');
    expect(toolNames).toContain('get_watchlist');
    expect(toolNames).toContain('get_trades');
  });

  // ── Multi-turn tool loop ───────────────────────────────────────────────────

  test('executes tool call and sends result back to Claude in second turn', async () => {
    queries.getGoalsByUserId.mockResolvedValue([
      { name: 'Emergency Fund', target: '5000', current: '2000', monthly_contribution: '200' },
    ]);

    const mockCreate = jest.fn()
      .mockResolvedValueOnce(makeToolUseResponse([{ name: 'get_goals', input: {} }]))
      .mockResolvedValueOnce(makeTextResponse('Your Emergency Fund is at 40% progress.'));

    Anthropic.mockImplementation(() => ({ messages: { create: mockCreate } }));

    const res = await request(app)
      .post('/api/v1/chat')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ message: 'How are my savings goals?' });

    expect(res.status).toBe(200);
    expect(mockCreate).toHaveBeenCalledTimes(2);

    // Second call must include a tool_result message
    const secondMessages = mockCreate.mock.calls[1][0].messages;
    const hasToolResult = secondMessages.some(
      m => Array.isArray(m.content) && m.content.some(c => c.type === 'tool_result')
    );
    expect(hasToolResult).toBe(true);
  });

  test('tool result contains correct goal data from DB', async () => {
    queries.getGoalsByUserId.mockResolvedValue([
      { name: 'Emergency Fund', target: '5000', current: '2000', monthly_contribution: '200' },
    ]);

    let capturedToolResult = null;
    const mockCreate = jest.fn()
      .mockResolvedValueOnce(makeToolUseResponse([{ name: 'get_goals', input: {} }]))
      .mockImplementationOnce(args => {
        const userMsg = args.messages.find(m => m.role === 'user' && Array.isArray(m.content));
        if (userMsg) capturedToolResult = JSON.parse(userMsg.content[0].content);
        return Promise.resolve(makeTextResponse('Got it'));
      });

    Anthropic.mockImplementation(() => ({ messages: { create: mockCreate } }));

    await request(app)
      .post('/api/v1/chat')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ message: 'Show my goals' });

    expect(capturedToolResult).not.toBeNull();
    expect(capturedToolResult[0].name).toBe('Emergency Fund');
    expect(capturedToolResult[0].target).toBe(5000);
  });

  test('executes multiple tool calls in parallel within one turn', async () => {
    alpacaService.getPositions.mockResolvedValue([
      { symbol: 'AAPL', qty: '10', current_price: '175', market_value: '1750', unrealized_pl: '150', unrealized_plpc: '0.09375' },
    ]);
    queries.getGoalsByUserId.mockResolvedValue([
      { name: 'Roth IRA', target: '7000', current: '0', monthly_contribution: '100' },
    ]);

    const mockCreate = jest.fn()
      .mockResolvedValueOnce(makeToolUseResponse([
        { name: 'get_portfolio', input: {} },
        { name: 'get_goals', input: {} },
      ]))
      .mockResolvedValueOnce(makeTextResponse('Your portfolio and goals look good.'));

    Anthropic.mockImplementation(() => ({ messages: { create: mockCreate } }));

    const res = await request(app)
      .post('/api/v1/chat')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ message: 'Compare my portfolio vs my goals' });

    expect(res.status).toBe(200);
    // Second call should have 2 tool_result entries
    const secondMessages = mockCreate.mock.calls[1][0].messages;
    const toolResults = secondMessages.find(
      m => Array.isArray(m.content) && m.content.every(c => c.type === 'tool_result')
    );
    expect(toolResults.content).toHaveLength(2);
  });

  test('returns fallback message when max tool rounds exceeded', async () => {
    // Always returns tool_use — never terminates naturally
    const mockCreate = jest.fn().mockResolvedValue(
      makeToolUseResponse([{ name: 'get_portfolio', input: {} }])
    );
    Anthropic.mockImplementation(() => ({ messages: { create: mockCreate } }));

    const res = await request(app)
      .post('/api/v1/chat')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ message: 'Keep calling tools' });

    expect(res.status).toBe(200);
    expect(typeof res.body.reply).toBe('string');
    expect(mockCreate).toHaveBeenCalledTimes(5); // MAX_TOOL_ROUNDS
  });
});
