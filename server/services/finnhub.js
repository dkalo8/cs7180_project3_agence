'use strict';

const finnhub = require('finnhub');

let _client = null;

function getClient() {
  if (!_client) {
    const apiClient = finnhub.ApiClient.instance;
    apiClient.authentications['api_key'].apiKey = process.env.FINNHUB_API_KEY;
    _client = new finnhub.DefaultApi();
  }
  return _client;
}

/**
 * Get the most recent news article for a ticker (used by marketContextAgent).
 * Returns null if no news or the API key is absent.
 */
function getLatestNews(symbol) {
  return new Promise((resolve) => {
    const today = new Date();
    const from = new Date(today - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const to = today.toISOString().slice(0, 10);

    getClient().companyNews(symbol, from, to, (err, data) => {
      if (err || !data || data.length === 0) {
        resolve(null);
        return;
      }
      const article = data[0];
      resolve({
        headline: article.headline,
        sentimentScore: article.sentiment ?? 0.5,
      });
    });
  });
}

/**
 * Get recent news articles for a ticker (used by /api/v1/news route).
 * Returns up to `limit` articles with full fields.
 */
function getNewsArticles(symbol, limit = 5) {
  return new Promise((resolve) => {
    const today = new Date();
    const from = new Date(today - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const to = today.toISOString().slice(0, 10);

    getClient().companyNews(symbol, from, to, (err, data) => {
      if (err || !data || data.length === 0) {
        resolve([]);
        return;
      }
      resolve(data.slice(0, limit).map(a => ({
        headline: a.headline,
        summary: a.summary || '',
        url: a.url,
        source: a.source,
        datetime: a.datetime,
      })));
    });
  });
}

module.exports = { getLatestNews, getNewsArticles };
