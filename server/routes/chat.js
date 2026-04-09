'use strict';

const router = require('express').Router();
const Anthropic = require('@anthropic-ai/sdk');
const authMiddleware = require('../middleware/auth');
const queries = require('../db/queries');
const alpacaService = require('../services/alpaca');

// POST /api/v1/chat
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'message is required' });
    }

    const { userId } = req;

    // Load full financial context in parallel
    const [transactions, accounts, goals, watchlist, trades, rawPositions, account] = await Promise.all([
      queries.getTransactionsByUserId(userId).catch(() => []),
      queries.getAccountsByUserId(userId).catch(() => []),
      queries.getGoalsByUserId(userId).catch(() => []),
      queries.getWatchlistByUserId(userId).catch(() => []),
      queries.getTradesByUserId(userId).catch(() => []),
      alpacaService.getPositions().catch(() => []),
      alpacaService.getAccount().catch(() => ({ cash: '0', equity: '0' })),
    ]);

    // Build concise financial summary for system prompt
    const equity = parseFloat(account.equity || 0);
    const cash = parseFloat(account.cash || 0);
    const totalValue = equity + cash;

    const recentTx = transactions.slice(0, 20).map(t =>
      `  - ${String(t.date).slice(0, 10)} ${t.merchant_name || t.category || 'Unknown'}: $${Math.abs(t.amount).toFixed(2)}`
    ).join('\n');

    const goalsText = goals.map(g =>
      `  - ${g.name}: $${g.current}/$${g.target} (monthly: $${g.monthly_contribution || 0})`
    ).join('\n');

    const accountsText = accounts.map(a =>
      `  - ${a.plaid_name || a.name || 'Bank Account'}: $${a.balance || 0}`
    ).join('\n');

    const positionsText = rawPositions.map(p =>
      `  - ${p.symbol}: ${p.qty} shares @ $${parseFloat(p.current_price).toFixed(2)}`
    ).join('\n');

    const watchlistText = watchlist.map(w =>
      `  - ${w.ticker} (added ${String(w.added_at).slice(0, 10)})`
    ).join('\n');

    const tradesText = trades.slice(0, 20).map(t =>
      `  - ${String(t.created_at || t.date || '').slice(0, 10)} ${t.action?.toUpperCase()} ${t.quantity}x ${t.ticker} @ $${parseFloat(t.price || 0).toFixed(2)}`
    ).join('\n');

    const systemPrompt = `You are Agence, an AI financial copilot. You have full access to the user's real financial data across all sections of the app. Be concise, specific, and actionable.

PORTFOLIO SUMMARY:
- Total equity: $${equity.toFixed(2)}
- Cash: $${cash.toFixed(2)}
- Portfolio total: $${totalValue.toFixed(2)}

POSITIONS:
${positionsText || '  (no positions)'}

BANK ACCOUNTS:
${accountsText || '  (no linked accounts)'}

SAVINGS GOALS:
${goalsText || '  (no goals set)'}

WATCHLIST (tickers user is tracking):
${watchlistText || '  (no tickers watched)'}

RECENT TRADES (last 20):
${tradesText || '  (no trades yet)'}

RECENT TRANSACTIONS (last 20):
${recentTx || '  (no transactions)'}

You have complete visibility into the user's financial life: spending, investments, goals, watchlist, and trade history. Answer any question using this data. Never fabricate numbers not shown above.

FORMATTING: You are displayed in a narrow chat popup (~440px). Keep tables to 2 columns max. For 3+ attributes, use a bulleted list instead of a table. Never use tables wider than 2 columns.`;

    // Build messages array: history + new user message
    const messages = [
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message.trim() },
    ];

    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const reply = response.content.find(b => b.type === 'text')?.text ?? '';
    return res.status(200).json({ reply });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
