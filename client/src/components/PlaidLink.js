import { useCallback, useEffect, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import api from '../api/client';

export default function PlaidLink({ onSuccess, label }) {
  const [linkToken, setLinkToken] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.post('/accounts/link-token');
        if (!cancelled) setLinkToken(data.link_token);
      } catch {
        if (!cancelled) setError('Failed to initialize Plaid Link');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSuccess = useCallback(async (publicToken) => {
    setLoading(true);
    try {
      await api.post('/accounts/exchange', { public_token: publicToken });
      if (onSuccess) onSuccess();
    } catch {
      setError('Failed to connect account');
    } finally {
      setLoading(false);
    }
  }, [onSuccess]);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: handleSuccess,
  });

  if (error) return <p className="error">{error}</p>;

  return (
    <button
      onClick={() => open()}
      disabled={!ready || loading}
      className="plaid-link-btn"
    >
      {loading ? 'Connecting…' : (label || 'Connect Bank Account')}
    </button>
  );
}
