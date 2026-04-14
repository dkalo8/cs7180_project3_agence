import { useEffect, useState } from 'react';
import AppNav from '../components/AppNav';
import PlaidLink from '../components/PlaidLink';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { getAccounts, getHousehold, getProfile, invalidate } from '../api/apiCache';
import { invalidateInsightsCache } from '../api/insightsCache';

export default function Settings() {
  const { logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [household, setHousehold] = useState(null);
  const [loading, setLoading] = useState(true);

  // Create household form
  const [hhName, setHhName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Risk tolerance
  const [riskTolerance, setRiskTolerance] = useState('moderate');
  const [savingRisk, setSavingRisk] = useState(false);
  const [riskMsg, setRiskMsg] = useState('');

  // Active view: personal | household
  const [activeView, setActiveView] = useState('personal');
  const [savingView, setSavingView] = useState(false);
  const [viewMsg, setViewMsg] = useState('');

  // Active account
  const [activeAccountId, setActiveAccountId] = useState(null);
  const [savingAccount, setSavingAccount] = useState(false);
  const [accountMsg, setAccountMsg] = useState('');

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');
  const [inviteError, setInviteError] = useState('');

  function fetchAll() {
    return Promise.all([
      getProfile().then(data => {
        setProfile(data);
        if (data?.riskTolerance) setRiskTolerance(data.riskTolerance);
        setActiveAccountId(data?.activeAccountId || null);
        if (data?.activeView) setActiveView(data.activeView);
      }).catch(() => {}),
      getAccounts().then(accounts => setAccounts(accounts)).catch(() => {}),
      getHousehold().then(household => setHousehold(household)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }

  async function handleSaveRisk() {
    setSavingRisk(true);
    setRiskMsg('');
    try {
      await api.patch('/auth/me', { riskTolerance });
      invalidate('profile');
      setRiskMsg('Saved');
      setTimeout(() => setRiskMsg(''), 2500);
    } catch {
      setRiskMsg('Failed to save');
    } finally {
      setSavingRisk(false);
    }
  }

  async function handleSaveView(view) {
    setSavingView(true);
    setViewMsg('');
    try {
      await api.patch('/auth/me', { activeView: view });
      setActiveView(view);
      invalidate('profile');
      invalidateInsightsCache();
      setViewMsg('Saved');
      setTimeout(() => setViewMsg(''), 2500);
    } catch {
      setViewMsg('Failed to save');
    } finally {
      setSavingView(false);
    }
  }

  useEffect(() => { fetchAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSaveAccount(id) {
    setSavingAccount(true);
    setAccountMsg('');
    try {
      await api.patch('/auth/me', { activeAccountId: id });
      setActiveAccountId(id);
      invalidate('profile');
      invalidate('transactions');
      invalidateInsightsCache();
      setAccountMsg(id ? 'Active account set' : 'Cleared — showing all accounts');
      setTimeout(() => setAccountMsg(''), 3000);
    } catch {
      setAccountMsg('Failed to update');
    } finally {
      setSavingAccount(false);
    }
  }

  async function handleCreateHousehold(e) {
    e.preventDefault();
    setCreateError('');
    if (!hhName.trim()) { setCreateError('Name required'); return; }
    setCreating(true);
    try {
      await api.post('/household', { name: hhName.trim() });
      setHhName('');
      invalidate('household');
      const household = await getHousehold();
      setHousehold(household);
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Failed to create household');
    } finally {
      setCreating(false);
    }
  }

  async function handleInvite(e) {
    e.preventDefault();
    setInviteError('');
    setInviteMsg('');
    if (!inviteEmail.trim()) { setInviteError('Email required'); return; }
    setInviting(true);
    try {
      await api.post('/household/invite', { email: inviteEmail.trim() });
      setInviteMsg(`Invited ${inviteEmail.trim()}`);
      setInviteEmail('');
      // Refresh household to show new member
      invalidate('household');
      getHousehold().then(household => setHousehold(household)).catch(() => {});
    } catch (err) {
      setInviteError(err.response?.data?.error || 'Failed to invite');
    } finally {
      setInviting(false);
    }
  }

  async function handleRemoveMember(targetUserId) {
    try {
      await api.delete(`/household/member/${targetUserId}`);
      invalidate('household');
      getHousehold().then(household => setHousehold(household)).catch(() => {});
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove member');
    }
  }

  async function handleLeave() {
    try {
      await api.delete('/household/leave');
      invalidate('household');
      setHousehold(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to leave household');
    }
  }

  const isOwner = household?.members?.some(m => m.role === 'owner' && m.user_id === profile?.id);

  return (
    <div className="page">
      <AppNav />
      <main>
        <div className="page-header">
          <h2>Account</h2>
        </div>

        {loading && <p className="muted">Loading…</p>}

        {/* Profile */}
        {profile && (
          <section className="expenses-section" style={{ marginBottom: '1.5rem' }}>
            <h3 className="dash-section-title">Profile</h3>
            <table className="tx-table">
              <tbody>
                <tr>
                  <td style={{ color: 'var(--text-muted)', width: 120 }}>Email</td>
                  <td>{profile.email}</td>
                </tr>
                <tr>
                  <td style={{ color: 'var(--text-muted)' }}>Member since</td>
                  <td>{String(profile.createdAt).slice(0, 10)}</td>
                </tr>
                <tr>
                  <td style={{ color: 'var(--text-muted)' }}>Sign-in</td>
                  <td>{profile.hasGoogleAuth ? 'Google' : 'Email / password'}</td>
                </tr>
              </tbody>
            </table>
          </section>
        )}

        {/* Risk Profile */}
        <section className="expenses-section" style={{ marginBottom: '1.5rem' }}>
          <h3 className="dash-section-title">Investor Risk Profile</h3>
          <p className="muted" style={{ marginBottom: '0.75rem', fontSize: '0.85rem' }}>
            Controls how aggressively the AI autopilot rebalances and identifies buying opportunities.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            {['conservative', 'moderate', 'aggressive'].map(level => (
              <label
                key={level}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer',
                  padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)',
                  border: `1.5px solid ${riskTolerance === level ? 'var(--navy-600)' : 'var(--navy-200)'}`,
                  background: riskTolerance === level ? 'var(--navy-50)' : 'var(--bg-surface)',
                  fontWeight: riskTolerance === level ? 600 : 400,
                  fontSize: '0.9rem', textTransform: 'capitalize',
                  transition: 'all 0.15s',
                }}
              >
                <input
                  type="radio"
                  name="riskTolerance"
                  value={level}
                  checked={riskTolerance === level}
                  onChange={() => setRiskTolerance(level)}
                  style={{ display: 'none' }}
                />
                {level}
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={handleSaveRisk}
              disabled={savingRisk}
              style={{ padding: '0.5rem 1.2rem', background: 'var(--navy-800)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}
            >
              {savingRisk ? 'Saving…' : 'Save'}
            </button>
            {riskMsg && <span style={{ fontSize: '0.85rem', color: riskMsg === 'Saved' ? 'var(--gain)' : 'var(--loss)' }}>{riskMsg}</span>}
          </div>
        </section>

        {/* Household */}
        <section className="expenses-section" style={{ marginBottom: '1.5rem' }}>
          <h3 className="dash-section-title">Household</h3>

          {household && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>View:</span>
              {['personal', 'household'].map(v => (
                <button
                  key={v}
                  onClick={() => handleSaveView(v)}
                  disabled={savingView}
                  style={{
                    padding: '0.35rem 0.9rem',
                    borderRadius: 'var(--radius-sm)',
                    border: `1.5px solid ${activeView === v ? 'var(--navy-600)' : 'var(--navy-200)'}`,
                    background: activeView === v ? 'var(--navy-800)' : 'var(--bg-surface)',
                    color: activeView === v ? '#fff' : 'var(--text-main)',
                    fontWeight: activeView === v ? 600 : 400,
                    fontSize: '0.85rem',
                    textTransform: 'capitalize',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {v}
                </button>
              ))}
              {viewMsg && <span style={{ fontSize: '0.8rem', color: viewMsg === 'Saved' ? 'var(--gain)' : 'var(--loss)' }}>{viewMsg}</span>}
            </div>
          )}

          {!loading && !household && (
            <div>
              <p className="muted" style={{ marginBottom: '0.75rem' }}>
                No household yet. Create one to share your financial dashboard with a partner.
              </p>
              <form onSubmit={handleCreateHousehold} style={{ display: 'flex', gap: '0.5rem', maxWidth: 360 }}>
                <input
                  placeholder="Household name (e.g. The Smiths)"
                  value={hhName}
                  onChange={e => setHhName(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  type="submit"
                  disabled={creating}
                  style={{ padding: '0.5rem 1rem', background: 'var(--navy-800)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
                >
                  {creating ? 'Creating…' : 'Create'}
                </button>
              </form>
              {createError && <p className="error" style={{ marginTop: '0.4rem' }}>{createError}</p>}
            </div>
          )}

          {household && (
            <div>
              <p style={{ marginBottom: '0.75rem' }}>
                <strong>{household.name}</strong>
              </p>
              <table className="tx-table" style={{ marginBottom: '1rem' }}>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {(household.members || []).map(m => (
                    <tr key={m.user_id}>
                      <td>{m.email}</td>
                      <td style={{ color: m.role === 'owner' ? 'var(--navy-400)' : 'var(--text-muted)', textTransform: 'capitalize' }}>{m.role}</td>
                      <td>
                        {isOwner && m.user_id !== profile?.id && (
                          <button onClick={() => handleRemoveMember(m.user_id)} className="btn-danger">
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {isOwner && (
                <div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Invite a partner by email:</p>
                  <form onSubmit={handleInvite} style={{ display: 'flex', gap: '0.5rem', maxWidth: 360 }}>
                    <input
                      type="email"
                      placeholder="partner@example.com"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="submit"
                      disabled={inviting}
                      style={{ padding: '0.5rem 1rem', background: 'var(--navy-800)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
                    >
                      {inviting ? 'Inviting…' : 'Invite'}
                    </button>
                  </form>
                  {inviteMsg && <p style={{ color: 'var(--gain)', marginTop: '0.4rem', fontSize: '0.85rem' }}>{inviteMsg}</p>}
                  {inviteError && <p className="error" style={{ marginTop: '0.4rem' }}>{inviteError}</p>}
                </div>
              )}
              <button onClick={handleLeave} className="btn-leave">
                Leave household
              </button>
            </div>
          )}
        </section>

        {/* Linked bank accounts + active account selection */}
        <section className="expenses-section" style={{ marginBottom: '1.5rem' }}>
          <h3 className="dash-section-title">Linked Bank Accounts</h3>
          {!loading && accounts.length === 0 && (
            <p className="muted">No bank accounts connected. Use the dashboard to connect via Plaid.</p>
          )}
          {accounts.length > 0 && (
            <>
              <p className="muted" style={{ marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                Select an account to focus insights and transactions on that account only. Leave unselected to aggregate all.
              </p>
              <table className="tx-table" style={{ marginBottom: '0.75rem' }}>
                <thead>
                  <tr>
                    <th style={{ width: 32 }}></th>
                    <th>Account</th>
                    <th className="right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map(a => {
                    const id = a.id || a.plaid_account_id;
                    const isActive = activeAccountId === id;
                    return (
                      <tr
                        key={id}
                        style={{ cursor: 'pointer', background: isActive ? 'var(--navy-50)' : undefined }}
                        onClick={() => handleSaveAccount(isActive ? null : id)}
                      >
                        <td>
                          <span style={{
                            display: 'inline-block', width: 14, height: 14, borderRadius: '50%',
                            border: `2px solid ${isActive ? 'var(--navy-600)' : 'var(--navy-300)'}`,
                            background: isActive ? 'var(--navy-600)' : 'transparent',
                            verticalAlign: 'middle',
                          }} />
                        </td>
                        <td style={{ fontWeight: isActive ? 600 : 'normal' }}>{a.institution_name || a.plaid_name || 'Bank Account'}</td>
                        <td className="right">${parseFloat(a.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {activeAccountId && (
                <button
                  onClick={() => handleSaveAccount(null)}
                  disabled={savingAccount}
                  style={{ fontSize: '0.8rem', color: 'var(--navy-400)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                >
                  Clear selection (show all)
                </button>
              )}
              {accountMsg && <p style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: 'var(--gain)' }}>{accountMsg}</p>}
            </>
          )}
          <div style={{ marginTop: accounts.length > 0 ? '1rem' : 0 }}>
            <PlaidLink
              onSuccess={() => { invalidate('accounts'); invalidateInsightsCache(); getAccounts().then(setAccounts).catch(() => {}); }}
              label={accounts.length > 0 ? 'Connect another bank' : 'Connect a bank account'}
            />
          </div>
        </section>

        {/* Sign out */}
        <section className="expenses-section">
          <h3 className="dash-section-title">Session</h3>
          <button
            onClick={logout}
            style={{ padding: '0.6rem 1.4rem', background: 'var(--loss)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'var(--font-body)' }}
          >
            Sign out
          </button>
        </section>
      </main>
    </div>
  );
}
