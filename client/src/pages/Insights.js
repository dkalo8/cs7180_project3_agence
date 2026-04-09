import { useEffect, useState } from 'react';
import api from '../api/client';
import AppNav from '../components/AppNav';

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
        {loading && <p>Analyzing your finances…</p>}
        {error && <p className="error">{error}</p>}
        {!loading && !error && insights.length === 0 && (
          <p>No insights yet. Connect your accounts to get started.</p>
        )}
        <ul className="insight-list">
          {insights.map((insight, i) => (
            <li key={i} className="insight-card">
              <span className={`severity-badge severity-badge--${insight.severity || 'info'}`}>
                {insight.severity || 'info'}
              </span>
              <p>{insight.message}</p>
              {insight.score !== undefined && (
                <small>Score: {(insight.score * 100).toFixed(0)}</small>
              )}
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
