'use strict';

import api from './client';

const CACHE_KEY = 'agence_insights';
const TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getCachedInsights() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (raw) {
      const { insights, ts } = JSON.parse(raw);
      if (Date.now() - ts < TTL_MS) return insights;
    }
  } catch {
    // corrupted cache — fall through to fetch
  }

  const { data } = await api.get('/insights');
  const insights = data.insights || [];
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ insights, ts: Date.now() }));
  } catch {
    // sessionStorage full or unavailable — no-op
  }
  return insights;
}

export function invalidateInsightsCache() {
  sessionStorage.removeItem(CACHE_KEY);
}
