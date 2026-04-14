import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import AppNav from '../components/AppNav';
import api from '../api/client';
import { getWatchlist, invalidate, invalidateAllNews, getNews } from '../api/apiCache';
import { invalidateInsightsCache } from '../api/insightsCache';

export default function Watchlist() {
  const [watchlist, setWatchlist] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const [news, setNews] = useState([]);
  const [newsOpen, setNewsOpen] = useState(false);
  const [newsLoading, setNewsLoading] = useState(false);
  const [expandedTickers, setExpandedTickers] = useState(new Set());
  const [newsSearch, setNewsSearch] = useState('');

  const location = useLocation();
  const highlightTicker = new URLSearchParams(location.search).get('ticker');
  const highlightRef = useRef(null);

  useEffect(() => {
    if (!loading && highlightRef.current) {
      setTimeout(() => highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
    }
  }, [loading]);

  async function refreshNews(items) {
    if (!items.length) { setNews([]); return; }
    setNewsLoading(true);
    try {
      const data = await getNews(items.map(w => w.ticker));
      setNews(data);
    } catch { /* silent */ } finally { setNewsLoading(false); }
  }

  async function handleRefreshNews() {
    invalidateAllNews();
    await refreshNews(watchlist);
  }

  function toggleExpanded(ticker) {
    setExpandedTickers(prev => {
      const next = new Set(prev);
      if (next.has(ticker)) next.delete(ticker); else next.add(ticker);
      return next;
    });
  }

  useEffect(() => {
    getWatchlist()
      .then(items => {
        setWatchlist(items);
        if (items.length > 0) {
          const tickers = items.map(w => w.ticker);
          setNewsLoading(true);
          getNews(tickers)
            .then(setNews)
            .catch(() => {})
            .finally(() => setNewsLoading(false));
        }
      })
      .catch(() => setError('Could not load watchlist.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    const ticker = input.trim().toUpperCase();
    if (!ticker) return;
    if (watchlist.some(w => w.ticker === ticker)) {
      setError(`${ticker} already on watchlist`);
      return;
    }
    setAdding(true);
    setError('');
    try {
      await api.post('/watchlist', { ticker });
      invalidate('watchlist');
      invalidateInsightsCache();
      const items = await getWatchlist();
      setWatchlist(items);
      setInput('');
      refreshNews(items);
    } catch {
      setError('Could not add ticker. Check it is a valid symbol.');
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(ticker) {
    try {
      await api.delete(`/watchlist/${ticker}`);
      invalidate('watchlist');
      invalidate('news_' + ticker);
      invalidateInsightsCache();
      setWatchlist(prev => prev.filter(w => w.ticker !== ticker));
      setNews(prev => prev.filter(n => n.ticker !== ticker));
    } catch {
      setError('Could not remove ticker.');
    }
  }

  return (
    <div className="page">
      <AppNav />
      <main>
        <div className="page-header">
          <h2>Watchlist</h2>
        </div>

        <section className="expenses-section">
          <form onSubmit={handleAdd} className="watchlist-add-form">
            <input
              type="text"
              placeholder="Add ticker (e.g. AAPL)"
              value={input}
              onChange={e => setInput(e.target.value.toUpperCase())}
              maxLength={10}
              className="watchlist-input"
            />
            <button type="submit" disabled={adding || !input.trim()} className="watchlist-add-btn">
              {adding ? 'Adding…' : '+ Add'}
            </button>
          </form>
          {error && <p className="error" style={{ marginTop: '0.5rem' }}>{error}</p>}
        </section>

        {loading && <p className="muted">Loading watchlist…</p>}

        {!loading && watchlist.length === 0 && (
          <div className="empty-state">
            <p>No tickers on your watchlist.</p>
            <p className="muted">Add a ticker above — the AI will monitor it for movers and sentiment.</p>
          </div>
        )}

        {!loading && watchlist.length > 0 && (
          <section className="expenses-section">
            <h3 className="dash-section-title">Watching {watchlist.length} ticker{watchlist.length !== 1 ? 's' : ''}</h3>
            <table className="tx-table">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th className="right">Price</th>
                  <th className="right">24h Change</th>
                  <th>Added</th>
                  <th className="right">Remove</th>
                </tr>
              </thead>
              <tbody>
                {[...watchlist].sort((a, b) => a.ticker.localeCompare(b.ticker)).map(item => {
                  const chg = item.changePercent;
                  const chgColor = chg == null ? '' : chg >= 0 ? '#4caf82' : '#e05c5c';
                  const chgLabel = chg == null ? '—' : `${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%`;
                  const isHighlighted = item.ticker === highlightTicker;
                  return (
                    <tr
                      key={item.ticker}
                      ref={isHighlighted ? highlightRef : null}
                      className={isHighlighted ? 'tx-highlight' : ''}
                    >
                      <td><span className="ticker">{item.ticker}</span></td>
                      <td className="right">{item.price != null ? `$${item.price.toFixed(2)}` : '—'}</td>
                      <td className="right" style={{ color: chgColor, fontWeight: chg != null ? 600 : 'normal' }}>{chgLabel}</td>
                      <td className="tx-date">{String(item.added_at).slice(0, 10)}</td>
                      <td className="right">
                        <button
                          className="watchlist-remove-btn"
                          onClick={() => handleRemove(item.ticker)}
                          title={`Remove ${item.ticker}`}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="muted" style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}>
              AI Insights flags watched tickers when they move ≥3% or show negative news sentiment.
            </p>
          </section>
        )}

        {!loading && watchlist.length > 0 && (
          <section className="expenses-section">
            <div className="news-header-row">
              <button
                className="news-toggle-btn"
                onClick={() => setNewsOpen(o => !o)}
                aria-expanded={newsOpen}
              >
                <span>Recent News</span>
                <span className="news-toggle-icon">{newsOpen ? '▲' : '▼'}</span>
              </button>
              {newsOpen && (
                <div className="news-controls">
                  <input
                    className="news-search-input"
                    type="text"
                    placeholder="Filter by ticker…"
                    value={newsSearch}
                    onChange={e => setNewsSearch(e.target.value.toUpperCase())}
                  />
                  <button
                    className="news-refresh-btn"
                    onClick={handleRefreshNews}
                    disabled={newsLoading}
                    title="Refresh news"
                  >
                    ↻
                  </button>
                </div>
              )}
            </div>

            {newsOpen && (
              <div className="news-feed" style={{ marginTop: '0.75rem' }}>
                {newsLoading && <p className="muted">Loading news…</p>}
                {!newsLoading && news.length === 0 && (
                  <p className="muted">No recent news found for watched tickers.</p>
                )}
                {!newsLoading && [...news]
                  .sort((a, b) => a.ticker.localeCompare(b.ticker))
                  .filter(({ ticker }) => !newsSearch || ticker.includes(newsSearch))
                  .map(({ ticker, articles, summary }) => {
                  if (!articles || articles.length === 0) return null;
                  const isExpanded = expandedTickers.has(ticker);
                  const visible = isExpanded ? articles : articles.slice(0, 3);
                  const extra = articles.length - 3;
                  return (
                    <div key={ticker} className="news-ticker-group">
                      <h4 className="news-ticker-label">{ticker}</h4>
                      {summary && (
                        <p className="news-summary">
                          <span className="news-summary-label">Agence Overview</span>{summary}
                        </p>
                      )}
                      <ul className="news-list">
                        {visible.map((a, i) => (
                          <li key={i} className="news-item">
                            <a href={a.url} target="_blank" rel="noopener noreferrer" className="news-headline">
                              {a.headline}
                            </a>
                            <span className="news-meta">
                              {a.source} · {a.datetime ? new Date(a.datetime * 1000).toLocaleDateString() : ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                      {extra > 0 && (
                        <button className="news-more-btn" onClick={() => toggleExpanded(ticker)}>
                          {isExpanded ? 'Show less' : `${extra} more article${extra > 1 ? 's' : ''}`}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
