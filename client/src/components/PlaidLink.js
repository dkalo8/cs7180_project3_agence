import { useCallback, useEffect, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import api from '../api/client';

export default function PlaidLink({ onSuccess, label }) {
  const [linkToken, setLinkToken] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.post('/accounts/link-token')
      .then(({ data }) => setLinkToken(data.link_token))
      .catch(() => setError('Failed to initialize Plaid Link'));
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
