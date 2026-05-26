import type { Row } from './mock-store.js';
import { randomUUID } from 'node:crypto';
import { store } from './data-app-store.js';

export function computeBookingFinancials(
  price: number | null,
  providerUserId: string | null | undefined,
  ctx: {
    getUserActiveSubscription: (userId: string) => Row | null;
    getPlatformRuleNumber: (ruleId: string, fallback: number) => number;
    requireNumberOrFallback: (value: unknown, fallback: number) => number;
  },
) {
  const subscriptionCommissionRate = providerUserId
    ? ctx.requireNumberOrFallback(ctx.getUserActiveSubscription(String(providerUserId))?.commission_rate, Number.NaN)
    : Number.NaN;
  const commissionRate = Math.max(
    0,
    Math.min(
      100,
      Number.isFinite(subscriptionCommissionRate)
        ? subscriptionCommissionRate
        : ctx.getPlatformRuleNumber('commission_rate', 15),
    ),
  );
  if (price === null) {
    return {
      commissionRate,
      platformFeeAmount: null,
      providerPayoutAmount: null,
    };
  }

  const sanitizedPrice = Math.max(0, Math.round(price));
  const platformFeeAmount = Math.round(sanitizedPrice * (commissionRate / 100));
  const providerPayoutAmount = Math.max(0, sanitizedPrice - platformFeeAmount);
  return {
    commissionRate,
    platformFeeAmount,
    providerPayoutAmount,
  };
}

export function createSyntheticId(prefix: string) {
  return `${prefix}-${Date.now()}-${randomUUID()}`;
}

export function createReference(prefix: string) {
  return `${prefix}-${Date.now()}`;
}

export function getWalletAccountRow(userId: string) {
  return (store.wallet_accounts ?? []).find((row) => String(row.user_id) === String(userId)) ?? null;
}

export function getPendingPayoutReservations(userId: string) {
  return (store.payout_requests ?? [])
    .filter((request) => (
      String(request.user_id) === String(userId)
      && new Set(['pending', 'approved']).has(String(request.status))
    ))
    .reduce((sum, request) => sum + Math.max(0, Number(request.amount ?? 0) || 0), 0);
}

export function findEscrowByBookingId(bookingId: unknown) {
  return (store.escrow_cases ?? []).find((escrow) => String(escrow.booking_id) === String(bookingId)) ?? null;
}
