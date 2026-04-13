import { useEffect, useRef, useState } from 'react';
import api from '../api/client';
import { getGoals, invalidate } from '../api/apiCache';
import AppNav from '../components/AppNav';

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // New goal form state
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [goalType, setGoalType] = useState('savings');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Drag-and-drop state
  const dragIndex = useRef(null);
  const [dragOver, setDragOver] = useState(null);

  function fetchGoals() {
    return getGoals()
      .then(goals => setGoals(goals))
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
        goalType,
      });
      setName('');
      setTarget('');
      setMonthlyContribution('');
      setGoalType('savings');
      invalidate('goals');
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

  function handleDragStart(index) {
    dragIndex.current = index;
  }

  function handleDragEnter(index) {
    setDragOver(index);
  }

  function handleDragEnd() {
    const from = dragIndex.current;
    const to = dragOver;
    dragIndex.current = null;
    setDragOver(null);
    if (from === null || to === null || from === to) return;
    const reordered = [...goals];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    setGoals(reordered);
    api.patch('/goals/reorder', { order: reordered.map(g => g.id) }).catch(() => {});
  }

  return (
    <div className="page">
      <AppNav />
      <main>
        <div className="page-header"><h2>Goals</h2></div>
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
          <select value={goalType} onChange={e => setGoalType(e.target.value)}>
            <option value="savings">Savings</option>
            <option value="growth">Growth</option>
            <option value="speculation">Speculation</option>
          </select>
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
            {goals.map((goal, index) => {
              const current = goal.current || 0;
              const pct = Math.min(100, Math.round((current / goal.target) * 100));
              const pace = paceLabel(goal);
              return (
                <li
                  key={goal.id}
                  className={`insight-card goal-draggable${dragOver === index ? ' goal-drag-over' : ''}`}
                  style={{ flexDirection: 'column', alignItems: 'stretch' }}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragEnter={() => handleDragEnter(index)}
                  onDragOver={e => e.preventDefault()}
                  onDragEnd={handleDragEnd}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <strong>{goal.name}</strong>
                      {goal.goal_type && (
                        <span className={`goal-type-badge goal-type-${goal.goal_type}`}>
                          {goal.goal_type}
                        </span>
                      )}
                    </div>
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
