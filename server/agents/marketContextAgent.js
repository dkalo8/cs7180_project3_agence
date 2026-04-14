/**
 * marketContextAgent — pure function
 * Analyzes market data per ticker and returns price + sentiment insights.
 * Quotes sourced from Alpaca; news/sentiment sourced from Finnhub (non-critical).
 *
 * @param {Object} marketData - { tickers: string[], quotes: Object, news: Object }
 * @returns {Array<{ type: string, ticker: string, message: string, severity: string }>}
 */
function marketContextAgent(marketData) {
  const tickers = marketData?.tickers;
  if (!tickers || tickers.length === 0) return [];

  const quotes = marketData?.quotes;
  if (!quotes) return [];

  const news = marketData?.news || {};

  return tickers.flatMap((ticker) => {
    const insights = [];

    const quote = quotes[ticker];
    if (quote) {
      const direction = quote.changePercent >= 0 ? 'up' : 'down';
      const absPct = Math.abs(quote.changePercent).toFixed(2);
      insights.push({
        type: 'market_quote',
        ticker,
        message: `${ticker} is $${quote.price.toFixed(2)}, ${direction} ${absPct}% today`,
        severity: quote.changePercent >= 0 ? 'info' : 'warning',
      });
    }

    const article = news[ticker];
    if (article) {
      insights.push({
        type: 'market_sentiment',
        ticker,
        message: `${ticker} news: ${article.headline}`,
        severity: article.sentimentScore >= 0.5 ? 'info' : 'warning',
      });
    }

    return insights;
  });
}

module.exports = marketContextAgent;
