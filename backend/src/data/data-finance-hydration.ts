import { clone, findRow, store } from './data-app-store.js';
import { getPendingPayoutReservations } from './data-finance-helpers.js';
import {
  parseBoolean,
  requireNumberOrFallback,
  trimText,
} from './data-normalizers.js';
import type { Row } from './mock-store.js';

export function hydrateFinanceRow(table: string, hydrated: Row) {
  if (table === 'wallet_accounts') {
    const userId = String(hydrated.user_id ?? '');
    const escrowOutgoing = (store.escrow_cases ?? [])
      .filter((entry) => String(entry.client_id) === userId && new Set(['funded', 'assigned', 'in_progress', 'delivery_review']).has(String(entry.status)))
      .reduce((sum, entry) => sum + requireNumberOrFallback(entry.amount_total, 0), 0);
    const escrowIncoming = (store.escrow_cases ?? [])
      .filter((entry) => String(entry.provider_user_id) === userId && new Set(['assigned', 'in_progress', 'delivery_review']).has(String(entry.status)))
      .reduce((sum, entry) => sum + requireNumberOrFallback(entry.provider_amount, 0), 0);
    const pendingPayoutAmount = getPendingPayoutReservations(userId);
    const subscription = (store.user_subscriptions ?? []).find((entry) => String(entry.user_id) === userId && String(entry.status) === 'active');
    hydrated.currency = hydrated.currency ?? 'XAF';
    hydrated.held_balance = escrowOutgoing;
    hydrated.pending_release_balance = escrowIncoming;
    hydrated.pending_payout_amount = pendingPayoutAmount;
    hydrated.available_balance = Math.max(0, requireNumberOrFallback(hydrated.balance, 0) - pendingPayoutAmount);
    hydrated.subscription_status = subscription?.status ?? null;
    hydrated.subscription_plan_name = subscription?.plan_name ?? null;
    return hydrated;
  }

  if (table === 'subscription_plans') {
    hydrated.currency = hydrated.currency ?? 'XAF';
    hydrated.price_monthly = requireNumberOrFallback(hydrated.price_monthly, 0);
    hydrated.commission_rate = requireNumberOrFallback(hydrated.commission_rate, 0);
    hydrated.active = Boolean(hydrated.active ?? true);
    hydrated.features = Array.isArray(hydrated.features) ? hydrated.features : [];
    return hydrated;
  }

  if (table === 'user_subscriptions') {
    const plan = findRow('subscription_plans', hydrated.plan_id);
    const renewsAt = typeof hydrated.renews_at === 'string' ? Date.parse(hydrated.renews_at) : Number.NaN;
    hydrated.role = hydrated.role ?? plan?.role ?? null;
    hydrated.plan_name = hydrated.plan_name ?? plan?.name ?? null;
    hydrated.currency = hydrated.currency ?? plan?.currency ?? 'XAF';
    hydrated.amount = requireNumberOrFallback(hydrated.amount, requireNumberOrFallback(plan?.price_monthly, 0));
    hydrated.commission_rate = requireNumberOrFallback(hydrated.commission_rate, requireNumberOrFallback(plan?.commission_rate, 0));
    hydrated.status = hydrated.status ?? 'pending';
    hydrated.auto_renew = parseBoolean(hydrated.auto_renew, true);
    hydrated.plan = plan ? clone(plan) : null;
    hydrated.days_remaining = Number.isNaN(renewsAt) ? null : Math.max(0, Math.ceil((renewsAt - Date.now()) / 86_400_000));
    hydrated.is_expiring_soon = typeof hydrated.days_remaining === 'number' ? hydrated.days_remaining <= 7 : false;
    return hydrated;
  }

  if (table === 'provider_visibility_products') {
    hydrated.role = hydrated.role ?? 'prestataire';
    hydrated.tier = hydrated.tier ?? 'priority';
    hydrated.currency = hydrated.currency ?? 'XAF';
    hydrated.price = requireNumberOrFallback(hydrated.price, 0);
    hydrated.duration_days = requireNumberOrFallback(hydrated.duration_days, 30);
    hydrated.alerts_enabled = parseBoolean(hydrated.alerts_enabled, true);
    hydrated.verification_eligible = parseBoolean(hydrated.verification_eligible, false);
    hydrated.matching_priority = trimText(hydrated.matching_priority) ?? 'low';
    hydrated.features = Array.isArray(hydrated.features) ? hydrated.features : [];
    hydrated.active = parseBoolean(hydrated.active, true);
    return hydrated;
  }

  if (table === 'provider_visibility_passes') {
    const provider = findRow('providers', hydrated.provider_id);
    const plan = findRow('subscription_plans', hydrated.plan_id);
    const product = findRow('provider_visibility_products', hydrated.product_id ?? hydrated.plan_id);
    const expiresAt = typeof hydrated.expires_at === 'string' ? Date.parse(hydrated.expires_at) : Number.NaN;
    hydrated.provider_name = hydrated.provider_name ?? provider?.name ?? provider?.public_alias ?? null;
    hydrated.plan_name = hydrated.plan_name ?? plan?.name ?? product?.name ?? null;
    hydrated.product_name = hydrated.product_name ?? product?.name ?? null;
    hydrated.pass_label = hydrated.pass_label ?? 'Billet standard';
    hydrated.pass_tier = hydrated.pass_tier ?? 'standard';
    hydrated.status = hydrated.status ?? 'active';
    hydrated.alerts_enabled = parseBoolean(hydrated.alerts_enabled, false);
    hydrated.verification_eligible = parseBoolean(hydrated.verification_eligible, false);
    hydrated.matching_priority = trimText(hydrated.matching_priority) ?? 'low';
    hydrated.is_expired = Number.isNaN(expiresAt) ? false : expiresAt < Date.now();
    return hydrated;
  }

  if (table === 'provider_visibility_orders') {
    const product = findRow('provider_visibility_products', hydrated.product_id);
    const pass = findRow('provider_visibility_passes', hydrated.pass_id);
    hydrated.product_name = hydrated.product_name ?? product?.name ?? null;
    hydrated.currency = hydrated.currency ?? product?.currency ?? 'XAF';
    hydrated.amount = requireNumberOrFallback(hydrated.amount, requireNumberOrFallback(product?.price, 0));
    hydrated.status = hydrated.status ?? 'pending';
    hydrated.pass_tier = hydrated.pass_tier ?? product?.tier ?? pass?.pass_tier ?? 'standard';
    hydrated.pass_code = hydrated.pass_code ?? pass?.code ?? null;
    hydrated.pass_label = hydrated.pass_label ?? pass?.pass_label ?? null;
    hydrated.expires_at = hydrated.expires_at ?? pass?.expires_at ?? null;
    return hydrated;
  }

  return null;
}
