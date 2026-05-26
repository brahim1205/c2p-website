import type { Prisma } from '@prisma/client';
import type { Row } from '../data/mock-store.js';

function toJson(value: unknown) {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

function toNullableString(value: unknown) {
  if (value === null || value === undefined) {
    return undefined;
  }
  const normalized = String(value).trim();
  return normalized ? normalized : undefined;
}

function toDate(value: unknown) {
  if (!value) return undefined;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toAmount(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount) : 0;
}

function resolveCurrency(value: unknown) {
  return toNullableString(value) ?? 'XAF';
}

export function buildEscrowCreateInput(row: Row): Prisma.EscrowCaseCreateInput {
  return {
    id: String(row.id),
    bookingId: toNullableString(row.booking_id),
    clientId: toNullableString(row.client_id),
    providerId: toNullableString(row.provider_id),
    providerUserId: toNullableString(row.provider_user_id),
    requestedProviderId: toNullableString(row.requested_provider_id),
    service: toNullableString(row.service),
    amountTotal: toAmount(row.amount_total),
    currency: resolveCurrency(row.currency),
    platformFeeAmount: toAmount(row.platform_fee_amount),
    providerAmount: toAmount(row.provider_amount),
    status: toNullableString(row.status) ?? 'draft',
    fundedAt: toDate(row.funded_at),
    releasedAt: toDate(row.released_at),
    refundedAt: toDate(row.refunded_at),
    note: toNullableString(row.note),
    paymentTransactionId: toNullableString(row.payment_transaction_id),
    source: 'native',
    metadata: toJson({
      financial_operation_id: toNullableString(row.financial_operation_id) ?? null,
      app_row_snapshot: row,
    }),
    createdAt: toDate(row.created_at) ?? new Date(),
    updatedAt: toDate(row.updated_at) ?? new Date(),
  };
}

export function buildEscrowUpdateInput(row: Row): Prisma.EscrowCaseUpdateInput {
  return {
    bookingId: toNullableString(row.booking_id),
    clientId: toNullableString(row.client_id),
    providerId: toNullableString(row.provider_id),
    providerUserId: toNullableString(row.provider_user_id),
    requestedProviderId: toNullableString(row.requested_provider_id),
    service: toNullableString(row.service),
    amountTotal: toAmount(row.amount_total),
    currency: resolveCurrency(row.currency),
    platformFeeAmount: toAmount(row.platform_fee_amount),
    providerAmount: toAmount(row.provider_amount),
    status: toNullableString(row.status) ?? 'draft',
    fundedAt: toDate(row.funded_at),
    releasedAt: toDate(row.released_at),
    refundedAt: toDate(row.refunded_at),
    note: toNullableString(row.note),
    paymentTransactionId: toNullableString(row.payment_transaction_id),
    metadata: toJson({
      financial_operation_id: toNullableString(row.financial_operation_id) ?? null,
      app_row_snapshot: row,
    }),
    updatedAt: toDate(row.updated_at) ?? new Date(),
  };
}

export function buildUserSubscriptionCreateInput(row: Row): Prisma.UserSubscriptionCreateInput {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    role: toNullableString(row.role) ?? 'unknown',
    planId: toNullableString(row.plan_id) ?? 'unknown-plan',
    planName: toNullableString(row.plan_name) ?? 'Plan',
    status: toNullableString(row.status) ?? 'inactive',
    amount: toAmount(row.amount),
    currency: resolveCurrency(row.currency),
    commissionRate: Number(row.commission_rate ?? 0),
    autoRenew: Boolean(row.auto_renew ?? false),
    startedAt: toDate(row.started_at),
    renewsAt: toDate(row.renews_at),
    lastBilledAt: toDate(row.last_billed_at),
    endedAt: toDate(row.ended_at),
    source: 'native',
    metadata: toJson({
      financial_operation_id: toNullableString(row.financial_operation_id) ?? null,
      app_row_snapshot: row,
    }),
    createdAt: toDate(row.created_at) ?? new Date(),
    updatedAt: toDate(row.updated_at) ?? new Date(),
  };
}

export function buildUserSubscriptionUpdateInput(row: Row): Prisma.UserSubscriptionUpdateInput {
  return {
    role: toNullableString(row.role) ?? 'unknown',
    planId: toNullableString(row.plan_id) ?? 'unknown-plan',
    planName: toNullableString(row.plan_name) ?? 'Plan',
    status: toNullableString(row.status) ?? 'inactive',
    amount: toAmount(row.amount),
    currency: resolveCurrency(row.currency),
    commissionRate: Number(row.commission_rate ?? 0),
    autoRenew: Boolean(row.auto_renew ?? false),
    startedAt: toDate(row.started_at),
    renewsAt: toDate(row.renews_at),
    lastBilledAt: toDate(row.last_billed_at),
    endedAt: toDate(row.ended_at),
    metadata: toJson({
      financial_operation_id: toNullableString(row.financial_operation_id) ?? null,
      app_row_snapshot: row,
    }),
    updatedAt: toDate(row.updated_at) ?? new Date(),
  };
}
