import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export async function api(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || res.statusText);
  }

  return data;
}

export const getMarkets = (params = '') => api(`/markets${params ? `?${params}` : ''}`);
export const getMarket = (id) => api(`/markets/${id}`);
export const placeBet = (marketId, side, amount) =>
  api(`/markets/${marketId}/bet`, { method: 'POST', body: { side, amount } });
export const getWallet = () => api('/wallet');
export const claimDaily = () => api('/wallet/claim-daily', { method: 'POST' });
export const getProfile = () => api('/profile');
export const getLeaderboard = () => api('/leaderboard');
