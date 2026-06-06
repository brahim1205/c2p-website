import type { UserRole } from './roles';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export function buildSocialAuthUrl(provider: 'google' | 'facebook', options: { role?: UserRole | string | null; returnTo?: string } = {}) {
  const params = new URLSearchParams();
  if (options.role) params.set('role', String(options.role));
  params.set('returnTo', options.returnTo || '/dashboard');
  return `${API_BASE_URL}/auth/oauth/${provider}/start?${params.toString()}`;
}

export function startSocialAuth(provider: 'google' | 'facebook', options: { role?: UserRole | string | null; returnTo?: string } = {}) {
  window.location.assign(buildSocialAuthUrl(provider, options));
}
