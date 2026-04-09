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

  test('returns 200 with reply from Claude', async () => {
    const mockCreate = jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'You have $1000 in cash.' }],
    });
    Anthropic.mockImplementation(() => ({
      messages: { create: mockCreate },
    }));

    const res = await request(app)
      .post('/api/v1/chat')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ message: 'What is my cash balance?' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('reply');
    expect(typeof res.body.reply).toBe('string');
  });

  test('passes conversation history to Claude', async () => {
    const mockCreate = jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Sure!' }],
    });
    Anthropic.mockImplementation(() => ({
      messages: { create: mockCreate },
    }));

    const history = [
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello! How can I help?' },
    ];

    await request(app)
      .post('/api/v1/chat')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ message: 'What is my cash balance?', history });

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const callArgs = mockCreate.mock.calls[0][0];
    // Should include history messages before the new user message
    const messages = callArgs.messages;
    expect(messages.some(m => m.role === 'user' && m.content === 'Hi')).toBe(true);
  });

  test('injects financial context into system prompt', async () => {
    queries.getAccountsByUserId.mockResolvedValue([
      { id: 'acc-1', plaid_name: 'Chase Checking', balance: 3500 },
    ]);
    queries.getGoalsByUserId.mockResolvedValue([
      { id: 'g1', name: 'Emergency Fund', target: 5000, current: 2000, monthly_contribution: 200 },
    ]);
    queries.getWatchlistByUserId.mockResolvedValue([
      { ticker: 'TSLA', added_at: '2026-04-01' },
    ]);
    queries.getTradesByUserId.mockResolvedValue([
      { ticker: 'AAPL', action: 'buy', quantity: 5, price: 195.0, created_at: '2026-04-01' },
    ]);
    alpacaService.getAccount.mockResolvedValue({ cash: '1200', equity: '8000' });

    const mockCreate = jest.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Response' }],
    });
    Anthropic.mockImplementation(() => ({
      messages: { create: mockCreate },
    }));

    await request(app)
      .post('/api/v1/chat')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ message: 'Give me a summary' });

    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.system).toContain('Emergency Fund');
    expect(callArgs.system).toContain('8000');
    expect(callArgs.system).toContain('TSLA');
    expect(callArgs.system).toContain('AAPL');
  });
});
