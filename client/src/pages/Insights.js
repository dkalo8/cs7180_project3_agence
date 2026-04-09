import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
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

export default function Insights() {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/insights')
      .then(({ data }) => setInsights(data.insights || []))
      .catch(err => setError(err.response?.data?.error || 'Failed to load insights'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <AppNav />
      <main>
        <div className="page-header"><h2>Insights</h2></div>
        {loading && <p>Analyzing your finances…</p>}
        {error && <p className="error">{error}</p>}
        {!loading && !error && insights.length === 0 && (
          <p>No insights yet. Connect your accounts to get started.</p>
        )}
        <ul className="insight-list">
          {insights.map((insight, i) => {
            const route = SOURCE_ROUTE[insight.source] || null;
            return (
              <li key={i} className="insight-card">
                <span className={`severity-badge severity-badge--${insight.severity || 'info'}`}>
                  {insight.severity || 'info'}
                </span>
                <div style={{ flex: 1 }}>
                  {route
                    ? <Link to={route} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                        <p style={{ margin: 0 }}>{insight.message}</p>
                        {insight.score !== undefined && <small>Score: {(insight.score * 100).toFixed(0)}</small>}
                        <small style={{ color: 'var(--navy-400)', marginTop: '0.2rem', display: 'block' }}>View →</small>
                      </Link>
                    : <>
                        <p style={{ margin: 0 }}>{insight.message}</p>
                        {insight.score !== undefined && <small>Score: {(insight.score * 100).toFixed(0)}</small>}
                      </>
                  }
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
