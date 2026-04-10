import { useState, useEffect } from 'react';
import AppNav from '../components/AppNav';
import api from '../api/client';
import { getWatchlist } from '../api/apiCache';

export default function Watchlist() {
  const [watchlist, setWatchlist] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getWatchlist()
      .then(watchlist => setWatchlist(watchlist))
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
      const { data } = await api.post('/watchlist', { ticker });
      setWatchlist(prev => [data, ...prev]);
      setInput('');
    } catch {
      setError('Could not add ticker. Check it is a valid symbol.');
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(ticker) {
    try {
      await api.delete(`/watchlist/${ticker}`);
      setWatchlist(prev => prev.filter(w => w.ticker !== ticker));
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
                {watchlist.map(item => {
                  const chg = item.changePercent;
                  const chgColor = chg == null ? '' : chg >= 0 ? '#4caf82' : '#e05c5c';
                  const chgLabel = chg == null ? '—' : `${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%`;
                  return (
                    <tr key={item.ticker}>
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
      </main>
    </div>
  );
}
