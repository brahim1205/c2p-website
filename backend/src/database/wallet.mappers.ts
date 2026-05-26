import type { CommissionLedgerEntry, Wallet, WalletTransaction } from '@prisma/client';
import type { Row } from '../data/mock-store.js';

type EscrowRecord = {
  id: string;
  bookingId: string | null;
  clientId: string | null;
  providerId: string | null;
  providerUserId: string | null;
  requestedProviderId: string | null;
  service: string | null;
  amountTotal: number;
  currency: string;
  platformFeeAmount: number;
  providerAmount: number;
  status: string;
  fundedAt: Date | null;
  releasedAt: Date | null;
  refundedAt: Date | null;
  note: string | null;
  paymentTransactionId: string | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
};

type UserSubscriptionRecord = {
  id: string;
  userId: string;
  role: string;
  planId: string;
  planName: string;
  status: string;
  amount: number;
  currency: string;
  commissionRate: number;
  autoRenew: boolean;
  startedAt: Date | null;
  renewsAt: Date | null;
  lastBilledAt: Date | null;
  endedAt: Date | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function toRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {} as Record<string, unknown>;
  }
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
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

function toIsoString(value: unknown) {
  return toDate(value)?.toISOString();
}

function toAmount(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount) : 0;
}

function resolveCurrency(value: unknown) {
  return toNullableString(value) ?? 'XAF';
}

export function mapWalletRow(wallet: Wallet): Row {
  const metadata = toRecord(wallet.metadata);
  return {
    ...(metadata.app_row_snapshot && typeof metadata.app_row_snapshot === 'object' ? clone(metadata.app_row_snapshot as Record<string, unknown>) : {}),
    id: wallet.id,
    user_id: wallet.userId,
    balance: wallet.balance,
    currency: wallet.currency,
    available_balance: wallet.availableBalance,
    held_balance: wallet.heldBalance,
    pending_release_balance: wallet.pendingReleaseBalance,
    pending_payout_amount: wallet.pendingPayoutAmount,
    updated_at: wallet.updatedAt.toISOString(),
    created_at: wallet.createdAt.toISOString(),
    metadata: metadata.app_row_snapshot && typeof metadata.app_row_snapshot === 'object'
      ? {
          ...(toRecord(metadata.app_row_snapshot)),
          financial_source: wallet.source,
        }
      : {
          financial_source: wallet.source,
        },
  };
}

export function mapWalletRowFromProjection(wallet: Row): Row {
  return {
    ...wallet,
    id: wallet.id,
    user_id: wallet.user_id,
    balance: toAmount(wallet.balance),
    currency: resolveCurrency(wallet.currency),
    available_balance: toAmount(wallet.available_balance ?? wallet.balance),
    held_balance: toAmount(wallet.held_balance),
    pending_release_balance: toAmount(wallet.pending_release_balance),
    pending_payout_amount: toAmount(wallet.pending_payout_amount),
    updated_at: toIsoString(wallet.updated_at) ?? new Date().toISOString(),
    created_at: toIsoString(wallet.created_at) ?? new Date().toISOString(),
  };
}

export function mapWalletTransactionRow(transaction: WalletTransaction, financialOperationId?: string): Row {
  const metadata = toRecord(transaction.metadata);
  return {
    ...(metadata.app_row_snapshot && typeof metadata.app_row_snapshot === 'object' ? clone(metadata.app_row_snapshot as Record<string, unknown>) : {}),
    id: transaction.id,
    user_id: transaction.userId,
    type: transaction.type,
    amount: transaction.amount,
    currency: transaction.currency,
    method: transaction.method,
    status: transaction.status,
    description: transaction.description,
    reference: transaction.reference,
    date: transaction.occurredAt.toISOString(),
    created_at: transaction.createdAt.toISOString(),
    financial_operation_id: financialOperationId ?? toNullableString(metadata.financial_operation_id),
    metadata: {
      ...metadata,
      financial_operation_id: financialOperationId ?? toNullableString(metadata.financial_operation_id),
    },
  };
}

export function mapCommissionRow(entry: CommissionLedgerEntry, financialOperationId?: string): Row {
  const metadata = toRecord(entry.metadata);
  return {
    ...(metadata.app_row_snapshot && typeof metadata.app_row_snapshot === 'object' ? clone(metadata.app_row_snapshot as Record<string, unknown>) : {}),
    id: entry.id,
    source_type: entry.sourceType,
    source_id: entry.sourceId,
    user_id: entry.userId,
    beneficiary_user_id: entry.beneficiaryUserId,
    amount: entry.amount,
    currency: entry.currency,
    status: entry.status,
    description: entry.description,
    recognized_at: entry.recognizedAt?.toISOString() ?? new Date().toISOString(),
    created_at: entry.createdAt.toISOString(),
    financial_operation_id: financialOperationId ?? toNullableString(metadata.financial_operation_id),
    metadata: {
      ...metadata,
      financial_operation_id: financialOperationId ?? toNullableString(metadata.financial_operation_id),
    },
  };
}

export function mapEscrowRow(escrow: EscrowRecord): Row {
  const metadata = toRecord(escrow.metadata);
  return {
    ...(metadata.app_row_snapshot && typeof metadata.app_row_snapshot === 'object' ? clone(metadata.app_row_snapshot as Record<string, unknown>) : {}),
    id: escrow.id,
    booking_id: escrow.bookingId,
    client_id: escrow.clientId,
    provider_id: escrow.providerId,
    provider_user_id: escrow.providerUserId,
    requested_provider_id: escrow.requestedProviderId,
    service: escrow.service,
    amount_total: escrow.amountTotal,
    currency: escrow.currency,
    platform_fee_amount: escrow.platformFeeAmount,
    provider_amount: escrow.providerAmount,
    status: escrow.status,
    funded_at: escrow.fundedAt?.toISOString() ?? null,
    released_at: escrow.releasedAt?.toISOString() ?? null,
    refunded_at: escrow.refundedAt?.toISOString() ?? null,
    note: escrow.note,
    payment_transaction_id: escrow.paymentTransactionId,
    financial_operation_id: toNullableString(metadata.financial_operation_id),
    created_at: escrow.createdAt.toISOString(),
    updated_at: escrow.updatedAt.toISOString(),
  };
}

export function mapUserSubscriptionRow(subscription: UserSubscriptionRecord): Row {
  const metadata = toRecord(subscription.metadata);
  return {
    ...(metadata.app_row_snapshot && typeof metadata.app_row_snapshot === 'object' ? clone(metadata.app_row_snapshot as Record<string, unknown>) : {}),
    id: subscription.id,
    user_id: subscription.userId,
    role: subscription.role,
    plan_id: subscription.planId,
    plan_name: subscription.planName,
    status: subscription.status,
    amount: subscription.amount,
    currency: subscription.currency,
    commission_rate: subscription.commissionRate,
    auto_renew: subscription.autoRenew,
    started_at: subscription.startedAt?.toISOString() ?? null,
    renews_at: subscription.renewsAt?.toISOString() ?? null,
    last_billed_at: subscription.lastBilledAt?.toISOString() ?? null,
    ended_at: subscription.endedAt?.toISOString() ?? null,
    financial_operation_id: toNullableString(metadata.financial_operation_id),
    created_at: subscription.createdAt.toISOString(),
    updated_at: subscription.updatedAt.toISOString(),
  };
}
