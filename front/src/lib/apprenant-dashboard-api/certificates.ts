import { apiRequest } from '../api';
import type { ApprenantCertificate } from './types';

export async function fetchApprenantCertificates(
  userId: string,
  options?: { limit?: number; status?: 'issued' | 'ready' | 'pending' },
) {
  void userId;
  const params = new URLSearchParams();
  if (options?.status) params.set('status', options.status);
  if (options?.limit) params.set('limit', String(options.limit));
  const query = params.toString();
  return apiRequest<ApprenantCertificate[]>(`/learning/apprenant/certificates${query ? `?${query}` : ''}`);
}
