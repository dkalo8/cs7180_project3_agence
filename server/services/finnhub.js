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
 * Get the most recent news article for a ticker.
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

module.exports = { getLatestNews };
