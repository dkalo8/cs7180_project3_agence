import api from './client';

const PREFIX = 'agence_';

/**
 * Fetch with sessionStorage cache.
 * @param {string} key        - cache key (no prefix needed)
 * @param {string} endpoint   - API path passed to api.get()
 * @param {number} ttlMs      - cache lifetime in ms
 * @param {Function} extract  - fn(data) => value to store (defaults to full data)
 */
export async function getCached(key, endpoint, ttlMs, extract = d => d) {
  const storageKey = PREFIX + key;
  try {
    const raw = sessionStorage.getItem(storageKey);
    if (raw) {
      const { value, ts } = JSON.parse(raw);
      if (Date.now() - ts < ttlMs) return value;
    }
  } catch {
    // corrupted — fall through
  }

  const { data } = await api.get(endpoint);
  const value = extract(data);
  try {
    sessionStorage.setItem(storageKey, JSON.stringify({ value, ts: Date.now() }));
  } catch {
    // storage full — no-op
  }
  return value;
}

export function invalidate(key) {
  sessionStorage.removeItem(PREFIX + key);
}

export function invalidateAll() {
  Object.keys(sessionStorage)
    .filter(k => k.startsWith(PREFIX))
    .forEach(k => sessionStorage.removeItem(k));
}

// Convenience wrappers with pre-set TTLs
const MIN = 60 * 1000;

export const getPortfolio   = () => getCached('portfolio',    '/portfolio',    2 * MIN, d => d);
export const getAccounts    = () => getCached('accounts',     '/accounts',     5 * MIN, d => d.accounts || []);
export const getGoals       = () => getCached('goals',        '/goals',        5 * MIN, d => d.goals || []);
export const getTransactions = () => getCached('transactions', '/transactions', 5 * MIN, d => d.transactions || []);
export const getWatchlist   = () => getCached('watchlist',    '/watchlist',    2 * MIN, d => d.watchlist || []);
export const getHousehold   = () => getCached('household',    '/household',    5 * MIN, d => d.household);
