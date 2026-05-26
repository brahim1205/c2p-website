import type { AuthUser } from '../auth/auth.store.js';
import { store } from './data-app-store.js';
import { computeBookingFinancials as computeBookingFinancialsWithContext } from './data-finance-helpers.js';
import { requireNumberOrFallback } from './data-normalizers.js';
import {
  assertSubscriptionRequiredForWrite as assertSubscriptionRequiredForWriteByPolicy,
  getUserActiveSubscription,
} from './data-subscription-policy.js';

export function getPlatformRuleNumber(ruleId: string, fallback: number) {
  const rule = (store.admin_platform_rules ?? []).find((entry) => String(entry.id) === ruleId);
  return requireNumberOrFallback(rule?.value, fallback);
}

export function getDefaultPlanForRole(role: string) {
  return (store.subscription_plans ?? []).find(
    (plan) => String(plan.role) === role && requireNumberOrFallback(plan.price_monthly, 0) === 0,
  ) ?? null;
}

export function assertSubscriptionRequiredForWrite(table: string, user: AuthUser) {
  return assertSubscriptionRequiredForWriteByPolicy(table, user, getDefaultPlanForRole);
}

export function computeBookingFinancials(price: number | null, providerUserId?: string | null) {
  return computeBookingFinancialsWithContext(price, providerUserId, {
    getUserActiveSubscription,
    getPlatformRuleNumber,
    requireNumberOrFallback,
  });
}
