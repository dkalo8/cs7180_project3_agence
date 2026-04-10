import { useEffect, useState } from 'react';
import AppNav from '../components/AppNav';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { getAccounts, getHousehold, getProfile, invalidate } from '../api/apiCache';

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

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');
  const [inviteError, setInviteError] = useState('');

  function fetchAll() {
    return Promise.all([
      getProfile().then(data => setProfile(data)).catch(() => {}),
      getAccounts().then(accounts => setAccounts(accounts)).catch(() => {}),
      getHousehold().then(household => setHousehold(household)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }

  useEffect(() => { fetchAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
              </tbody>
            </table>
          </section>
        )}

        {/* Household */}
        <section className="expenses-section" style={{ marginBottom: '1.5rem' }}>
          <h3 className="dash-section-title">Household</h3>

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

        {/* Linked bank accounts */}
        <section className="expenses-section" style={{ marginBottom: '1.5rem' }}>
          <h3 className="dash-section-title">Linked Bank Accounts</h3>
          {!loading && accounts.length === 0 && (
            <p className="muted">No bank accounts connected. Use the dashboard to connect via Plaid.</p>
          )}
          {accounts.length > 0 && (
            <table className="tx-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th className="right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map(a => (
                  <tr key={a.id || a.plaid_account_id}>
                    <td>{a.plaid_name || a.name || 'Bank Account'}</td>
                    <td className="right">${parseFloat(a.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
