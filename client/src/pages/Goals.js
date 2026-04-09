import { useEffect, useState } from 'react';
import api from '../api/client';
import AppNav from '../components/AppNav';

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // New goal form state
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  function fetchGoals() {
    return api.get('/goals')
      .then(({ data }) => setGoals(data.goals || []))
      .catch(() => setError('Failed to load goals'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchGoals(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (!name.trim() || !target) {
      setFormError('Name and target amount are required');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/goals', {
        name: name.trim(),
        target: parseFloat(target),
        monthlyContribution: monthlyContribution ? parseFloat(monthlyContribution) : 0,
      });
      setName('');
      setTarget('');
      setMonthlyContribution('');
      setLoading(true);
      await fetchGoals();
    } catch {
      setFormError('Failed to create goal');
    } finally {
      setSubmitting(false);
    }
  }

  function paceLabel(goal) {
    if (!goal.monthly_contribution || goal.monthly_contribution === 0) return null;
    const remaining = goal.target - (goal.current || 0);
    if (remaining <= 0) return 'Complete';
    const months = Math.ceil(remaining / goal.monthly_contribution);
    return `~${months} month${months !== 1 ? 's' : ''} to go`;
  }

  return (
    <div className="page">
      <AppNav />
      <main>
        <h3 className="section-heading">Add a Goal</h3>
        <form onSubmit={handleSubmit} style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', maxWidth: 400 }}>
          <input
            placeholder="Goal name (e.g. Emergency Fund)"
            value={name}
            onChange={e => setName(e.target.value)}
          />
          <input
            type="number"
            placeholder="Target amount ($)"
            value={target}
            onChange={e => setTarget(e.target.value)}
            min="1"
          />
          <input
            type="number"
            placeholder="Monthly contribution (optional, $)"
            value={monthlyContribution}
            onChange={e => setMonthlyContribution(e.target.value)}
            min="0"
          />
          {formError && <p className="error">{formError}</p>}
          <button type="submit" disabled={submitting} className="btn-primary" style={{ padding: '0.6rem' }}>
            {submitting ? 'Saving…' : 'Add Goal'}
          </button>
        </form>

        {loading && <p>Loading goals…</p>}
        {error && <p className="error">{error}</p>}

        {!loading && !error && goals.length === 0 && (
          <p>No goals yet. Add one above to start tracking your savings.</p>
        )}

        {goals.length > 0 && (
          <ul className="insight-list">
            {goals.map(goal => {
              const current = goal.current || 0;
              const pct = Math.min(100, Math.round((current / goal.target) * 100));
              const pace = paceLabel(goal);
              return (
                <li key={goal.id} className="insight-card" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>{goal.name}</strong>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      ${current.toLocaleString()} / ${Number(goal.target).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ margin: '0.5rem 0', background: 'var(--navy-100)', borderRadius: 999, height: 7, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? 'var(--gain)' : 'var(--navy-600)', transition: 'width 0.3s' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>{pct}% complete</span>
                    {pace && <span>{pace}</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
