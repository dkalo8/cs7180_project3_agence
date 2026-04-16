import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCachedInsights, invalidateInsightsCache } from '../api/insightsCache';
import AppNav from '../components/AppNav';

const SOURCE_ROUTE = {
  spending: '/expenses',
  anomaly: '/expenses',
  goals: '/goals',
  portfolio: '/portfolio',
  autopilot: '/portfolio',
  market: '/watchlist',
  watchlist: '/watchlist',
};

const FILTERS = [
  { key: 'priority', label: 'Priority' },
  { key: 'high',     label: 'High' },
  { key: 'medium',   label: 'Medium' },
  { key: 'info',     label: 'Info' },
];

function getSev(ins) { return ins.severity || 'info'; }

export default function Insights() {
  const navigate = useNavigate();
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('priority');

  const loadInsights = useCallback((force = false) => {
    setLoading(true);
    setError('');
    if (force) invalidateInsightsCache();
    getCachedInsights()
      .then(ins => setInsights(ins))
      .catch(err => setError(err.response?.data?.error || 'Failed to load insights'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadInsights(); }, [loadInsights]);

  return (
    <div className="page">
      <AppNav />
      <main>
        <div className="page-header">
          <h2>Insights</h2>
          <button
            className="period-btn"
            onClick={() => loadInsights(true)}
            disabled={loading}
            style={{ marginLeft: 'auto' }}
          >
            {loading ? 'Analyzing…' : '↻ Refresh'}
          </button>
        </div>
        {loading && <p>Analyzing your finances…</p>}
        {error && <p className="error">{error}</p>}
        {!loading && !error && insights.length === 0 && (
          <p>No insights yet. Connect your accounts to get started.</p>
        )}
        {!loading && !error && insights.length > 0 && (() => {
          const counts = {
            priority: insights.filter(ins => ['high','medium'].includes(getSev(ins))).length,
            high:     insights.filter(ins => getSev(ins) === 'high').length,
            medium:   insights.filter(ins => getSev(ins) === 'medium').length,
            info:     insights.filter(ins => getSev(ins) === 'info').length,
          };
          return (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  className={`period-btn${filter === f.key ? ' period-btn--active' : ''}`}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                  {counts[f.key] > 0 && (
                    <span style={{
                      marginLeft: '0.4rem',
                      background: filter === f.key ? 'rgba(255,255,255,0.25)' : 'var(--navy-200)',
                      color: filter === f.key ? '#fff' : 'var(--navy-600)',
                      borderRadius: 10,
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0 0.4rem',
                      lineHeight: '1.4',
                      display: 'inline-block',
                    }}>{counts[f.key]}</span>
                  )}
                </button>
              ))}
            </div>
          );
        })()}
        {!loading && !error && (() => {
          const visible = insights.filter(ins => {
            const s = getSev(ins);
            if (filter === 'priority') return s === 'high' || s === 'medium';
            return s === filter;
          });
          if (visible.length === 0 && insights.length > 0) {
            return <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No {filter} insights right now.</p>;
          }
          return (
            <ul className="insight-list">
              {visible.map((insight, i) => {
            const base = SOURCE_ROUTE[insight.source] || null;
            const route = base && insight.type === 'duplicate_charge' && insight.amount != null && insight.date
              ? `${base}?amount=${insight.amount}&date=${String(insight.date).slice(0, 10)}`
              : base && insight.type === 'repeated_charge' && insight.amount != null && insight.merchant
                ? `${base}?merchant=${encodeURIComponent(insight.merchant)}&amount=${insight.amount}`
              : base && insight.txId
                ? `${base}?txId=${insight.txId}`
                : base && insight.amount != null
                  ? `${base}?amount=${insight.amount}`
                  : base && insight.ticker
                    ? `${base}?ticker=${insight.ticker}`
                    : base;
            return (
              <li
                key={i}
                className="insight-card"
                onClick={route ? () => navigate(route) : undefined}
                style={route ? { cursor: 'pointer' } : undefined}
              >
                <span className={`severity-badge severity-badge--${insight.severity || 'info'}`}>
                  {insight.severity || 'info'}
                </span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0 }}>{insight.message}</p>
                  {insight.score !== undefined && <small>Score: {insight.score}</small>}
                  {route && <small style={{ color: 'var(--navy-400)', marginTop: '0.2rem', display: 'block' }}>View →</small>}
                </div>
              </li>
            );
              })}
            </ul>
          );
        })()}
      </main>
    </div>
  );
}
