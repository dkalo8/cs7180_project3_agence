'use strict';

/**
 * watchlistAgent — pure function
 * Analyzes user's watched tickers: flags big movers and negative sentiment.
 *
 * @param {Object} userData   - { watchlist: [{ ticker }] }
 * @param {Object} marketData - { quotes: Object, news: Object }
 * @returns {Array<{ type, ticker, message, severity }>}
 */
function watchlistAgent(userData, marketData) {
  const watchlist = userData?.watchlist;
  if (!watchlist || watchlist.length === 0) return [];

  const quotes = marketData?.quotes || {};
  const news = marketData?.news || {};

  return watchlist.flatMap(({ ticker }) => {
    const insights = [];
    const quote = quotes[ticker];

    if (!quote) return [];

    const absPct = Math.abs(quote.changePercent);
    const sign = quote.changePercent >= 0 ? '+' : '';

    if (absPct >= 3) {
      insights.push({
        type: 'watchlist_mover',
        ticker,
        message: `${ticker} (watchlist) moved ${sign}${quote.changePercent.toFixed(2)}% today — $${quote.price.toFixed(2)}`,
        severity: absPct >= 5 ? 'high' : 'medium',
      });
    }

    const article = news[ticker];
    if (article && article.sentimentScore < 0.3) {
      insights.push({
        type: 'watchlist_sentiment',
        ticker,
        message: `Negative sentiment for ${ticker} (watchlist): ${article.headline}`,
        severity: 'medium',
      });
    } else if (article && article.sentimentScore > 0.7) {
      insights.push({
        type: 'watchlist_sentiment',
        ticker,
        message: `Positive sentiment for ${ticker} (watchlist): ${article.headline}`,
        severity: 'info',
      });
    }

    return insights;
  });
}

module.exports = watchlistAgent;
