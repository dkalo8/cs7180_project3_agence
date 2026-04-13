'use strict';

const router = require('express').Router();
const Anthropic = require('@anthropic-ai/sdk');
const authMiddleware = require('../middleware/auth');
const finnhubService = require('../services/finnhub');

let _anthropic = null;
function getAnthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}

async function summarizeTicker(ticker, articles) {
  const client = getAnthropicClient();
  if (!client || articles.length === 0) return null;
  try {
    const content = articles
      .map((a, i) => {
        const body = a.summary && a.summary.length > 20 ? `\n   ${a.summary}` : '';
        return `${i + 1}. ${a.headline}${body}`;
      })
      .join('\n\n');
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: `You are a financial analyst. Based on these recent news articles for ${ticker}, write 1-2 sentences of analytical insight — what is driving the stock right now and what should an investor pay attention to. Be specific; do not simply restate the headlines.\n\nArticles:\n${content}\n\nRespond with ONLY the insight. No preamble.`,
      }],
    });
    return msg.content[0]?.text?.trim() || null;
  } catch {
    return null;
  }
}

// GET /api/v1/news?tickers=AAPL,TSLA
router.get('/', authMiddleware, async (req, res, next) => {
  const { tickers } = req.query;
  if (!tickers) return res.status(400).json({ error: 'tickers query param required' });

  const symbols = tickers
    .split(',')
    .map(t => t.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 10);

  try {
    const results = await Promise.all(
      symbols.map(async ticker => {
        const articles = await finnhubService.getNewsArticles(ticker).catch(() => []);
        const summary = await summarizeTicker(ticker, articles);
        return { ticker, articles, summary };
      })
    );
    return res.status(200).json({ news: results });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
