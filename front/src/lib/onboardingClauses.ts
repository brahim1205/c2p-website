import { apiRequest } from './api';
import type { AuthUser } from './roles';

export function hasAcceptedMonetizedClauses(user: Pick<AuthUser, 'onboardingClausesAcceptedAt'> | null | undefined) {
  return Boolean(user?.onboardingClausesAcceptedAt);
}

export function markMonetizedClausesAccepted() {
  return apiRequest<AuthUser>('/auth/onboarding/monetized-clauses/accept', {
    method: 'POST',
  });
}
