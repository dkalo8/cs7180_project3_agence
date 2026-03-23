const marketContextAgent = require('./marketContextAgent');

describe('marketContextAgent', () => {
  describe('Cycle 1 — empty ticker list', () => {
    it('returns empty array when tickers is empty', () => {
      const result = marketContextAgent({ tickers: [] }, { quotes: {}, news: {} });
      expect(result).toEqual([]);
    });

    it('returns empty array when userData has no tickers key', () => {
      const result = marketContextAgent({}, { quotes: {}, news: {} });
      expect(result).toEqual([]);
    });

    it('returns empty array when userData is null', () => {
      const result = marketContextAgent(null, { quotes: {}, news: {} });
      expect(result).toEqual([]);
    });
  });

  describe('Cycle 2 — Alpaca failure', () => {
    it('returns empty array when marketData is null', () => {
      const result = marketContextAgent({ tickers: ['AAPL'] }, null);
      expect(result).toEqual([]);
    });

    it('returns empty array when quotes is null', () => {
      const result = marketContextAgent({ tickers: ['AAPL'] }, { quotes: null, news: {} });
      expect(result).toEqual([]);
    });

    it('returns empty array when quotes is missing entirely', () => {
      const result = marketContextAgent({ tickers: ['AAPL'] }, { news: {} });
      expect(result).toEqual([]);
    });

    it('does not throw when a specific ticker is missing from quotes', () => {
      expect(() => {
        marketContextAgent({ tickers: ['AAPL', 'TSLA'] }, { quotes: {}, news: {} });
      }).not.toThrow();
    });
  });

  describe('Cycle 3 — price + 24h change per ticker (Alpaca)', () => {
    const marketData = {
      quotes: {
        AAPL: { price: 185.50, changePercent: 1.25, name: 'Apple Inc.' },
        TSLA: { price: 250.00, changePercent: -1.96, name: 'Tesla Inc.' },
      },
      news: {},
    };

    it('returns a market_quote insight for each ticker', () => {
      const results = marketContextAgent({ tickers: ['AAPL', 'TSLA'] }, marketData);
      const quotes = results.filter((i) => i.type === 'market_quote');
      expect(quotes).toHaveLength(2);
    });

    it('market_quote insight includes ticker, price, and changePercent in message', () => {
      const results = marketContextAgent({ tickers: ['AAPL'] }, marketData);
      const insight = results.find((i) => i.type === 'market_quote' && i.ticker === 'AAPL');
      expect(insight).toBeDefined();
      expect(insight.message).toContain('AAPL');
      expect(insight.message).toContain('185.50');
      expect(insight.message).toContain('1.25');
    });

    it('market_quote insight has severity info for positive change', () => {
      const results = marketContextAgent({ tickers: ['AAPL'] }, marketData);
      const insight = results.find((i) => i.type === 'market_quote' && i.ticker === 'AAPL');
      expect(insight.severity).toBe('info');
    });

    it('market_quote insight has severity warning for negative change', () => {
      const results = marketContextAgent({ tickers: ['TSLA'] }, marketData);
      const insight = results.find((i) => i.type === 'market_quote' && i.ticker === 'TSLA');
      expect(insight.severity).toBe('warning');
    });

    it('skips tickers missing from quotes without crashing', () => {
      const results = marketContextAgent({ tickers: ['AAPL', 'MSFT'] }, marketData);
      const quotes = results.filter((i) => i.type === 'market_quote');
      expect(quotes).toHaveLength(1);
      expect(quotes[0].ticker).toBe('AAPL');
    });
  });

  describe('Cycle 4 — news sentiment per ticker (Finnhub)', () => {
    const marketData = {
      quotes: {
        AAPL: { price: 185.50, changePercent: 1.25, name: 'Apple Inc.' },
        TSLA: { price: 250.00, changePercent: -1.96, name: 'Tesla Inc.' },
      },
      news: {
        AAPL: { sentimentScore: 0.72, headline: 'Apple beats earnings expectations' },
        TSLA: { sentimentScore: 0.28, headline: 'Tesla misses delivery targets' },
      },
    };

    it('returns a market_sentiment insight for each ticker with news', () => {
      const results = marketContextAgent({ tickers: ['AAPL', 'TSLA'] }, marketData);
      const sentiments = results.filter((i) => i.type === 'market_sentiment');
      expect(sentiments).toHaveLength(2);
    });

    it('market_sentiment insight includes ticker and headline in message', () => {
      const results = marketContextAgent({ tickers: ['AAPL'] }, marketData);
      const insight = results.find((i) => i.type === 'market_sentiment' && i.ticker === 'AAPL');
      expect(insight).toBeDefined();
      expect(insight.message).toContain('AAPL');
      expect(insight.message).toContain('Apple beats earnings expectations');
    });

    it('market_sentiment severity is info for positive sentiment (score >= 0.5)', () => {
      const results = marketContextAgent({ tickers: ['AAPL'] }, marketData);
      const insight = results.find((i) => i.type === 'market_sentiment' && i.ticker === 'AAPL');
      expect(insight.severity).toBe('info');
    });

    it('market_sentiment severity is warning for negative sentiment (score < 0.5)', () => {
      const results = marketContextAgent({ tickers: ['TSLA'] }, marketData);
      const insight = results.find((i) => i.type === 'market_sentiment' && i.ticker === 'TSLA');
      expect(insight.severity).toBe('warning');
    });
  });
});
