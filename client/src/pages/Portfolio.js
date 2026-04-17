import { useEffect, useState } from 'react';
import api from '../api/client';
import TickerAutocomplete from '../components/TickerAutocomplete';
import { getPortfolio, getTradeHistory, invalidate } from '../api/apiCache';
import { invalidateInsightsCache } from '../api/insightsCache';
import AppNav from '../components/AppNav';

export default function Portfolio() {
  const [positions, setPositions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [trades, setTrades] = useState([]);
  const [tradesLoading, setTradesLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('positions');

  // Trade form state
  const [ticker, setTicker] = useState('');
  const [action, setAction] = useState('buy');
  const [quantity, setQuantity] = useState('');
  const [orderType, setOrderType] = useState('market');
  const [limitPrice, setLimitPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [tradeError, setTradeError] = useState('');
  const [tradeSuccess, setTradeSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(null);

  function fetchPortfolio() {
    return getPortfolio()
      .then(data => {
        setPositions(data.positions || []);
        setSummary({ cash: data.cash, equity: data.equity });
      })
      .catch(err => setError(err.response?.data?.error || 'Failed to load portfolio'))
      .finally(() => setLoading(false));
  }

  function fetchTrades() {
    return getTradeHistory()
      .then(trades => setTrades(trades))
      .catch(() => {})
      .finally(() => setTradesLoading(false));
  }

  useEffect(() => {
    fetchPortfolio();
    fetchTrades();
  }, []);

  async function handleTrade(e) {
    e.preventDefault();
    setTradeError('');
    setTradeSuccess('');
    if (!ticker.trim() || !quantity) {
      setTradeError('Ticker and quantity are required');
      return;
    }
    if ((orderType === 'limit' || orderType === 'stop_limit') && !limitPrice) {
      setTradeError('Limit price is required for this order type');
      return;
    }
    if ((orderType === 'stop' || orderType === 'stop_limit') && !stopPrice) {
      setTradeError('Stop price is required for this order type');
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        ticker: ticker.trim().toUpperCase(),
        action,
        quantity: parseInt(quantity, 10),
        orderType,
      };
      if (limitPrice) body.limitPrice = parseFloat(limitPrice);
      if (stopPrice) body.stopPrice = parseFloat(stopPrice);

      const { data } = await api.post('/trades', body);
      setTradeSuccess(
        data.queued
          ? 'Order queued — market closed, executes at next open.'
          : 'Order placed.'
      );
      setTicker('');
      setQuantity('');
      setLimitPrice('');
      setStopPrice('');
      invalidate('portfolio');
      invalidate('trades');
      invalidateInsightsCache();
      setLoading(true);
      await Promise.all([fetchPortfolio(), fetchTrades()]);
    } catch (err) {
      setTradeError(err.response?.data?.error || 'Trade failed');
    } finally {
      setSubmitting(false);
    }
  }

  const needsLimit = orderType === 'limit' || orderType === 'stop_limit';
  const needsStop = orderType === 'stop' || orderType === 'stop_limit';

  return (
    <div className="page">
      <AppNav />
      <main>
        <div className="page-header"><h2>Portfolio</h2></div>

        {loading && <p>Loading portfolio…</p>}
        {error && <p className="error">{error}</p>}

        {summary && (
          <div className="portfolio-summary">
            <div className="summary-card">
              <span className="summary-label">Equity</span>
              <span className="summary-value">${summary.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Cash</span>
              <span className="summary-value">${summary.cash.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', borderBottom: '2px solid #e2e8f0' }}>
          {['positions', 'history'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.5rem 1rem',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #0f172a' : '2px solid transparent',
                marginBottom: -2,
                fontWeight: activeTab === tab ? 700 : 400,
                color: activeTab === tab ? '#0f172a' : '#64748b',
                cursor: 'pointer',
                fontSize: '0.9rem',
                textTransform: 'capitalize',
              }}
            >
              {tab === 'positions' ? 'Positions' : 'Trade History'}
            </button>
          ))}
        </div>

        {/* Positions tab */}
        {activeTab === 'positions' && (
          <>
            {!loading && !error && positions.length === 0 && (
              <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>No open positions yet. Place a paper trade below to get started.</p>
            )}
            {positions.length > 0 && (
              <table className="positions-table" style={{ marginBottom: '2rem' }}>
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Qty</th>
                    <th>Avg Cost</th>
                    <th>Price</th>
                    <th>Market Value</th>
                    <th>Unrealized P&amp;L</th>
                    <th>Return</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map(pos => (
                    <tr key={pos.ticker}>
                      <td className="ticker">{pos.ticker}</td>
                      <td>
                        {pos.qty < 0 && <span style={{ color: '#e05c5c', fontWeight: 700, fontSize: '0.7rem', marginRight: 4, letterSpacing: '0.03em' }}>SHORT</span>}
                        {Math.abs(pos.qty)}
                      </td>
                      <td>${pos.avgCost.toFixed(2)}</td>
                      <td>${pos.currentPrice.toFixed(2)}</td>
                      <td>${pos.marketValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className={pos.unrealizedPL >= 0 ? 'gain' : 'loss'}>
                        {pos.unrealizedPL >= 0 ? '+' : ''}${pos.unrealizedPL.toFixed(2)}
                      </td>
                      <td className={pos.unrealizedPLPct >= 0 ? 'gain' : 'loss'}>
                        {pos.unrealizedPLPct >= 0 ? '+' : ''}{pos.unrealizedPLPct.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* Trade history tab */}
        {activeTab === 'history' && (
          <>
            {tradesLoading && <p>Loading trade history…</p>}
            {!tradesLoading && trades.length === 0 && (
              <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>No trades yet. Place your first paper trade below.</p>
            )}
            {trades.length > 0 && (
              <table className="positions-table" style={{ marginBottom: '2rem' }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Ticker</th>
                    <th>Action</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map(t => (
                    <tr key={t.id}>
                      <td className="tx-date">{String(t.created_at || t.date || '').slice(0, 10)}</td>
                      <td className="ticker">{t.ticker}</td>
                      <td className={t.action === 'buy' ? 'gain' : 'loss'} style={{ fontWeight: 600, textTransform: 'uppercase' }}>{t.action}</td>
                      <td>{t.quantity}</td>
                      <td>${parseFloat(t.price || 0).toFixed(2)}</td>
                      <td>${(parseFloat(t.price || 0) * t.quantity).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td style={{ fontSize: '0.8rem' }}>
                        {t.alpaca_order_id && (
                          <button
                            title={t.alpaca_order_id}
                            onClick={() => {
                              navigator.clipboard.writeText(t.alpaca_order_id);
                              setCopiedOrderId(t.id);
                              setTimeout(() => setCopiedOrderId(null), 1500);
                            }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedOrderId === t.id ? '#16a34a' : '#94a3b8', fontSize: '0.8rem', padding: 0 }}
                          >
                            {copiedOrderId === t.id ? '✓' : 'ⓘ'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* Trade form */}
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>Place a Paper Trade</h3>
        <form onSubmit={handleTrade} style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'flex-end', maxWidth: 600 }}>
          <TickerAutocomplete
            value={ticker}
            onChange={setTicker}
            placeholder="Ticker (e.g. AAPL)"
            style={{ flex: '1 1 120px' }}
            inputStyle={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.9rem' }}
          />
          <select
            value={action}
            onChange={e => setAction(e.target.value)}
            className="form-select"
          >
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
          <input
            type="number"
            placeholder="Qty"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            min="1"
            style={{ width: 80, padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.9rem' }}
          />
          <select
            value={orderType}
            onChange={e => setOrderType(e.target.value)}
            className="form-select"
          >
            <option value="market">Market</option>
            <option value="limit">Limit</option>
            <option value="stop">Stop</option>
            <option value="stop_limit">Stop Limit</option>
          </select>
          {needsLimit && (
            <input
              type="number"
              placeholder="Limit $"
              value={limitPrice}
              onChange={e => setLimitPrice(e.target.value)}
              min="0"
              step="0.01"
              style={{ width: 100, padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.9rem' }}
            />
          )}
          {needsStop && (
            <input
              type="number"
              placeholder="Stop $"
              value={stopPrice}
              onChange={e => setStopPrice(e.target.value)}
              min="0"
              step="0.01"
              style={{ width: 100, padding: '0.6rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.9rem' }}
            />
          )}
          <button type="submit" disabled={submitting} style={{ padding: '0.6rem 1.2rem', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
            {submitting ? 'Placing…' : 'Place Order'}
          </button>
        </form>
        {tradeError && <p className="error" style={{ marginTop: '0.5rem' }}>{tradeError}</p>}
        {tradeSuccess && <p style={{ color: '#16a34a', marginTop: '0.5rem', fontSize: '0.875rem' }}>{tradeSuccess}</p>}
      </main>
    </div>
  );
}
