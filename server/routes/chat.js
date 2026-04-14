'use strict';

const router = require('express').Router();
const Anthropic = require('@anthropic-ai/sdk');
const authMiddleware = require('../middleware/auth');
const queries = require('../db/queries');
const alpacaService = require('../services/alpaca');

const MAX_TOOL_ROUNDS = 5;

const TOOLS = [
  {
    name: 'get_transactions',
    description: 'Fetch the user\'s recent bank transactions from Plaid.',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max transactions to return (default 50)' },
      },
      required: [],
    },
  },
  {
    name: 'get_portfolio',
    description: 'Fetch the user\'s Alpaca paper-trading portfolio: account equity, cash, and open positions.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_goals',
    description: 'Fetch the user\'s savings goals (name, target, current balance, monthly contribution).',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_watchlist',
    description: 'Fetch the tickers on the user\'s watchlist.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_trades',
    description: 'Fetch the user\'s paper-trade history.',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max trades to return (default 20)' },
      },
      required: [],
    },
  },
];

async function executeTool(name, input, userId) {
  switch (name) {
    case 'get_transactions': {
      const txs = await queries.getTransactionsByUserId(userId).catch(() => []);
      const limit = input?.limit || 50;
      return txs.slice(0, limit).map(t => ({
        id: t.id,
        date: String(t.date).slice(0, 10),
        merchant: t.merchant_name || t.merchant || 'Unknown',
        category: t.category || 'OTHER',
        amount: parseFloat(t.amount),
      }));
    }
    case 'get_portfolio': {
      const [account, positions] = await Promise.all([
        alpacaService.getAccount().catch(() => ({ cash: '0', equity: '0' })),
        alpacaService.getPositions().catch(() => []),
      ]);
      return {
        equity: parseFloat(account.equity || 0),
        cash: parseFloat(account.cash || 0),
        positions: positions.map(p => ({
          symbol: p.symbol,
          qty: parseFloat(p.qty),
          current_price: parseFloat(p.current_price),
          market_value: parseFloat(p.market_value),
          unrealized_pl: parseFloat(p.unrealized_pl),
          unrealized_plpc: parseFloat(p.unrealized_plpc),
        })),
      };
    }
    case 'get_goals': {
      const goals = await queries.getGoalsByUserId(userId).catch(() => []);
      return goals.map(g => ({
        name: g.name,
        target: parseFloat(g.target),
        current: parseFloat(g.current),
        monthly_contribution: parseFloat(g.monthly_contribution || 0),
      }));
    }
    case 'get_watchlist': {
      const wl = await queries.getWatchlistByUserId(userId).catch(() => []);
      return wl.map(w => ({ ticker: w.ticker, added_at: String(w.added_at).slice(0, 10) }));
    }
    case 'get_trades': {
      const trades = await queries.getTradesByUserId(userId).catch(() => []);
      const limit = input?.limit || 20;
      return trades.slice(0, limit).map(t => ({
        date: String(t.created_at || t.date || '').slice(0, 10),
        action: t.action,
        ticker: t.ticker,
        quantity: t.quantity,
        price: parseFloat(t.price || 0),
      }));
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

async function runAgentLoop(anthropic, messages, userId) {
  const systemPrompt = `You are Agence, an AI financial copilot. Use the available tools to fetch the user's financial data and answer their questions accurately. Be concise and actionable.

FORMATTING: Displayed in a narrow chat popup (~440px). Keep tables to 2 columns max. For 3+ attributes, use a bulleted list instead of a table.`;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      tools: TOOLS,
      messages,
    });

    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find(b => b.type === 'text');
      return textBlock?.text ?? '';
    }

    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');

      // Add assistant message with tool_use blocks
      messages.push({ role: 'assistant', content: response.content });

      // Execute all tool calls in parallel
      const toolResults = await Promise.all(
        toolUseBlocks.map(async tc => {
          const result = await executeTool(tc.name, tc.input, userId);
          return {
            type: 'tool_result',
            tool_use_id: tc.id,
            content: JSON.stringify(result),
          };
        })
      );

      // Add tool results as user message
      messages.push({ role: 'user', content: toolResults });
      continue;
    }

    // Unexpected stop reason
    break;
  }

  return 'I was unable to complete the analysis. Please try again.';
}

// POST /api/v1/chat
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'message is required' });
    }

    const { userId } = req;

    const messages = [
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message.trim() },
    ];

    const anthropic = new Anthropic();
    const reply = await runAgentLoop(anthropic, messages, userId);
    return res.status(200).json({ reply });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
