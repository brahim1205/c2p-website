import { apiRequest } from './api';
import type { PublicSubscriptionPlan } from './publicSubscriptions';

export async function fetchPublicSubscriptionPlans(role?: string) {
  const query = role ? `?role=${encodeURIComponent(role)}` : '';
  return apiRequest<PublicSubscriptionPlan[]>(`/public/subscription-plans${query}`, {}, { retryOnAuth: false });
}
