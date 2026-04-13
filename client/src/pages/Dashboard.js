import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PlaidLink from '../components/PlaidLink';
import AppNav from '../components/AppNav';
import PortfolioChart from '../components/PortfolioChart';
import api from '../api/client';
import { getCachedInsights } from '../api/insightsCache';
import { getPortfolio, getAccounts, getGoals, getHousehold, getTransactions, getWatchlist, getProfile, getTradeHistory } from '../api/apiCache';

function fmt(n, decimals = 2) {
  if (n == null || isNaN(n)) return '--';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtDollar(n) {
  if (n == null || isNaN(n)) return '--';
  const abs = Math.abs(n);
  return (n < 0 ? '-' : '') + '$' + abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function changeSign(n) {
  if (n == null || isNaN(n)) return '';
  return n >= 0 ? 'gain' : 'loss';
}

function severityFromScore(score) {
  if (score >= 8) return 'high';
  if (score >= 5) return 'medium';
  if (score >= 3) return 'info';
  return 'low';
}

const SEVERITY_COLORS = { high: '#dc2626', medium: '#d97706', info: '#3b82f6', low: '#64748b' };

export default function Dashboard() {
  const [portfolio, setPortfolio] = useState(null);
  const [history, setHistory] = useState([]);
  const [baseValue, setBaseValue] = useState(0);
  const [period, setPeriod] = useState('1M');
  const [bankConnected, setBankConnected] = useState(false);
  const [insights, setInsights] = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [topGoal, setTopGoal] = useState(null);
  const [household, setHousehold] = useState(null);
  const [activeView, setActiveView] = useState('personal');
  const [loading, setLoading] = useState(true);

  // Load portfolio + accounts in parallel on mount
  useEffect(() => {
    Promise.all([
      getPortfolio().catch(() => null),
      getAccounts().catch(() => null),
      getGoals().catch(() => null),
      getHousehold().catch(() => null),
      getProfile().catch(() => null),
    ]).then(([portfolioData, accounts, goals, household, profile]) => {
      if (portfolioData) setPortfolio(portfolioData);
      if (accounts?.length > 0) setBankConnected(true);
      const active = (goals || []).filter(g => parseFloat(g.current) < parseFloat(g.target));
      if (active.length > 0) setTopGoal(active[0]);
      if (household) setHousehold(household);
      if (profile?.activeView) setActiveView(profile.activeView);
      setLoading(false);
    });

    // Pre-warm caches for other tabs (fire-and-forget)
    getTransactions().catch(() => {});
    getWatchlist().catch(() => {});
    getProfile().catch(() => {});
    getTradeHistory().catch(() => {});

    // Insights fetched separately — cached in sessionStorage for 5 min
    getCachedInsights()
      .then(insights => setInsights(insights.slice(0, 3)))
      .catch(() => setInsights([]))
      .finally(() => setInsightsLoading(false));
  }, []);

  // Reload chart when period changes
  useEffect(() => {
    api.get(`/portfolio/history?period=${period}`)
      .then(({ data }) => {
        setHistory(data.history || []);
        setBaseValue(data.baseValue || 0);
      })
      .catch(() => { setHistory([]); setBaseValue(0); });
  }, [period]);

  // Derived metrics
  const equity = portfolio?.equity ?? null;
  const cash = portfolio?.cash ?? null;
  const positions = portfolio?.positions ?? [];

  const lastEquity = history.length > 0 ? history[history.length - 1].equity : null;
  const prevEquity = history.length > 1 ? history[history.length - 2].equity : null;
  const dayChange = lastEquity != null && prevEquity != null ? lastEquity - prevEquity : null;
  const dayChangePct = dayChange != null && prevEquity ? (dayChange / prevEquity) * 100 : null;
  const periodPL = lastEquity != null && baseValue ? lastEquity - baseValue : null;
  const periodPLPct = periodPL != null && baseValue ? (periodPL / baseValue) * 100 : null;

  if (loading) {
    return (
      <div className="dashboard">
        <AppNav />
        <main className="dashboard-loading">Loading your financial picture...</main>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <AppNav />
      <div className="dashboard-grid">

        {/* ── Left / Main ── */}
        <div className="dashboard-main">

          {/* Hero: total value + changes */}
          <section className="dash-hero">
            <div className="dash-hero-label">
              Investment Portfolio
              {household && activeView === 'household' && (
                <span style={{ marginLeft: '0.6rem', fontSize: '0.75rem', background: '#1e3a5f', color: '#93c5fd', borderRadius: 999, padding: '0.15rem 0.6rem', fontWeight: 600 }}>
                  Household: {household.name}
                </span>
              )}
            </div>
            <div className="dash-hero-value">
              {equity != null ? `$${fmt(equity)}` : '--'}
            </div>
            <div className="dash-hero-changes">
              {dayChange != null && (
                <span className={changeSign(dayChange)}>
                  {dayChange >= 0 ? '+' : ''}{fmtDollar(dayChange)} ({dayChange >= 0 ? '+' : ''}{fmt(dayChangePct)}%) today
                </span>
              )}
              {periodPL != null && (
                <span className={`dash-period-pl ${changeSign(periodPL)}`}>
                  &nbsp;&nbsp;{periodPL >= 0 ? '+' : ''}{fmtDollar(periodPL)} ({periodPL >= 0 ? '+' : ''}{fmt(periodPLPct)}%) {period}
                </span>
              )}
            </div>
          </section>

          {/* Chart */}
          <section className="dash-section">
            <PortfolioChart data={history} period={period} onPeriodChange={setPeriod} />
          </section>

          {/* Accounts */}
          <section className="dash-section">
            <h3 className="dash-section-title">Accounts</h3>
            <table className="dash-accounts-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Type</th>
                  <th className="right">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Alpaca Paper</td>
                  <td>Investment</td>
                  <td className="right">{equity != null ? `$${fmt(equity)}` : '--'}</td>
                </tr>
                <tr>
                  <td>Cash (Alpaca)</td>
                  <td>Cash &amp; Equivalents</td>
                  <td className="right">{cash != null ? `$${fmt(cash)}` : '--'}</td>
                </tr>
                {bankConnected && (
                  <tr>
                    <td>Bank Account</td>
                    <td>Checking / Savings</td>
                    <td className="right">
                      <Link to="/expenses" style={{ fontSize: '0.8rem', color: '#3b82f6' }}>View →</Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {!bankConnected && (
              <div className="dash-connect-bank">
                <p>Connect your bank to see spending insights and full financial picture.</p>
                <PlaidLink onSuccess={() => setBankConnected(true)} />
              </div>
            )}
          </section>

          {/* Top Holdings */}
          {positions.length > 0 && (
            <section className="dash-section">
              <h3 className="dash-section-title">
                Holdings
                <Link to="/portfolio" className="dash-section-link">View all →</Link>
              </h3>
              <table className="positions-table">
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th className="right">Price</th>
                    <th className="right">Mkt Value</th>
                    <th className="right">P&amp;L</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.slice(0, 5).map(pos => (
                    <tr key={pos.ticker}>
                      <td className="ticker">{pos.ticker}</td>
                      <td className="right">${fmt(pos.currentPrice)}</td>
                      <td className="right">${fmt(pos.marketValue)}</td>
                      <td className={`right ${changeSign(pos.unrealizedPL)}`}>
                        {pos.unrealizedPL >= 0 ? '+' : ''}{fmt(pos.unrealizedPLPct, 1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {positions.length === 0 && !loading && (
            <section className="dash-section dash-empty">
              <p>No positions yet. <Link to="/portfolio">Make your first paper trade →</Link></p>
            </section>
          )}
        </div>

        {/* ── Right Rail ── */}
        <aside className="dashboard-rail">
          <section className="dash-section">
            <h3 className="dash-section-title">
              AI Insights
              <Link to="/insights" className="dash-section-link">See all →</Link>
            </h3>
            {insightsLoading ? (
              <p className="dash-rail-loading">Analyzing your finances...</p>
            ) : insights.length === 0 ? (
              <p className="dash-rail-empty">No insights yet. <Link to="/insights">Run analysis →</Link></p>
            ) : (
              <ul className="dash-insight-list">
                {insights.map((ins, i) => {
                  const sev = severityFromScore(ins.score);
                  return (
                    <li key={i} className="dash-insight-item">
                      <span
                        className="dash-insight-dot"
                        style={{ background: SEVERITY_COLORS[sev] }}
                        title={sev}
                      />
                      <span className="dash-insight-msg">{ins.message}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          {/* Top Goal */}
          {topGoal && (
            <section className="dash-section" style={{ marginTop: '1rem' }}>
              <h3 className="dash-section-title">
                Top Goal
                <Link to="/goals" className="dash-section-link">All goals →</Link>
              </h3>
              {(() => {
                const current = parseFloat(topGoal.current) || 0;
                const target = parseFloat(topGoal.target) || 1;
                const pct = Math.min((current / target) * 100, 100);
                return (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                      <span style={{ fontWeight: 600 }}>{topGoal.name}</span>
                      <span style={{ color: '#64748b' }}>${fmt(current)} / ${fmt(target)}</span>
                    </div>
                    <div style={{ background: '#e2e8f0', borderRadius: 999, height: 8, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, background: '#3b82f6', height: '100%', borderRadius: 999, transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.3rem' }}>{pct.toFixed(0)}% complete</div>
                  </div>
                );
              })()}
            </section>
          )}

          {!topGoal && !loading && (
            <section className="dash-section" style={{ marginTop: '1rem' }}>
              <h3 className="dash-section-title">Savings Goals</h3>
              <p className="dash-rail-empty"><Link to="/goals">Create your first goal →</Link></p>
            </section>
          )}
        </aside>

      </div>
    </div>
  );
}
