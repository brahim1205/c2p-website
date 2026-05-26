import type {
  CommissionLedgerEntry,
  EscrowCase,
  FinanceLedgerEntry,
  Invoice,
  PayoutAccount,
  PayoutRequest,
  SubscriptionPlan,
  UserSubscription,
  WalletTransaction,
} from '@prisma/client';
import { listAppRows } from '../data/data-app-store.js';
import type { Row } from '../data/mock-store.js';
import { resolvePaymentLifecycleStatus } from './payment-status.resolver.js';

export function readFinanceMetadata(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {} as Record<string, any>;
  }
  return value as Record<string, any>;
}

export function asFinanceDate(value: unknown) {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function sortFinanceRows(rows: Row[], key: string, direction: 'asc' | 'desc' = 'asc') {
  const multiplier = direction === 'asc' ? 1 : -1;
  return [...rows].sort((left, right) => {
    const leftValue = left[key];
    const rightValue = right[key];
    if (leftValue === rightValue) return 0;
    if (leftValue === undefined || leftValue === null) return 1;
    if (rightValue === undefined || rightValue === null) return -1;
    const leftDate = asFinanceDate(leftValue);
    const rightDate = asFinanceDate(rightValue);
    if (leftDate && rightDate) return (leftDate.getTime() - rightDate.getTime()) * multiplier;
    const leftNumber = Number(leftValue);
    const rightNumber = Number(rightValue);
    if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
      return (leftNumber - rightNumber) * multiplier;
    }
    return String(leftValue).localeCompare(String(rightValue)) * multiplier;
  });
}

export function normalizeFinanceLimit(limit: number, max: number) {
  if (!Number.isFinite(limit) || limit <= 0) {
    return 200;
  }
  return Math.min(Math.trunc(limit), max);
}

export function operationRequiresLedger(amount: number | null) {
  return typeof amount === 'number' && amount > 0;
}

export function mapTransaction(row: WalletTransaction) {
  const metadata = readFinanceMetadata(row.metadata);
  const lifecycleStatus = resolvePaymentLifecycleStatus({
    type: row.type,
    status: row.status,
    providerStatus: metadata.provider_status,
    settledToWallet: Boolean(metadata.settled_to_wallet),
  });
  return {
    ...metadata,
    id: row.id,
    user_id: row.userId ?? metadata.user_id ?? undefined,
    type: row.type,
    amount: row.amount,
    currency: row.currency,
    method: row.method ?? metadata.method ?? 'wallet',
    status: row.status,
    description: row.description ?? metadata.description ?? '',
    date: metadata.date ?? row.occurredAt.toISOString(),
    reference: row.reference ?? metadata.reference ?? row.id,
    lifecycle_status: lifecycleStatus,
    created_at: metadata.created_at ?? row.createdAt.toISOString(),
  };
}

export function mapLegacyTransaction(row: Row) {
  return {
    ...row,
    lifecycle_status: resolvePaymentLifecycleStatus({
      type: typeof row.type === 'string' ? row.type : null,
      status: typeof row.status === 'string' ? row.status : null,
      providerStatus: typeof row.provider_status === 'string' ? row.provider_status : null,
      settledToWallet: Boolean(row.settled_to_wallet),
    }),
  };
}

export function mapFinanceLedgerEntry(row: FinanceLedgerEntry) {
  return {
    id: row.id,
    financial_operation_id: row.financialOperationId,
    entry_type: row.entryType,
    account_type: row.accountType,
    account_id: row.accountId,
    user_id: row.userId,
    direction: row.direction,
    amount: row.amount,
    currency: row.currency,
    source_type: row.sourceType,
    source_id: row.sourceId,
    transaction_id: row.transactionId,
    metadata: readFinanceMetadata(row.metadata),
    created_at: row.createdAt.toISOString(),
  };
}

export function mapSubscriptionPlan(row: SubscriptionPlan) {
  const metadata = readFinanceMetadata(row.metadata);
  return {
    ...metadata,
    id: row.id,
    role: row.role,
    name: row.name,
    slug: row.slug,
    price_monthly: row.priceMonthly,
    currency: row.currency,
    commission_rate: row.commissionRate,
    priority_matching: metadata.priority_matching ?? row.priorityMatching,
    analytics_level: row.analyticsLevel ?? metadata.analytics_level ?? null,
    support_level: row.supportLevel ?? metadata.support_level ?? null,
    verified_badge: row.verifiedBadge,
    features: Array.isArray(metadata.features) ? metadata.features : [],
    active: row.active,
    created_at: metadata.created_at ?? row.createdAt.toISOString(),
    updated_at: metadata.updated_at ?? row.updatedAt.toISOString(),
  };
}

export function mapProviderVisibilityProduct(row: Row) {
  return {
    ...row,
    id: String(row.id),
    role: String(row.role ?? 'prestataire'),
    name: String(row.name ?? 'Billet SenPresta'),
    slug: String(row.slug ?? ''),
    tier: String(row.tier ?? 'standard'),
    price: Number(row.price ?? 0),
    currency: String(row.currency ?? 'XAF'),
    duration_days: Number(row.duration_days ?? 30),
    matching_priority: String(row.matching_priority ?? 'low'),
    alerts_enabled: Boolean(row.alerts_enabled),
    verification_eligible: Boolean(row.verification_eligible),
    description: row.description ? String(row.description) : null,
    features: Array.isArray(row.features) ? row.features.map((item) => String(item)) : [],
    active: Boolean(row.active ?? true),
  };
}

export function mapProviderVisibilityPass(row: Row) {
  const product = listAppRows('provider_visibility_products')
    .find((entry) => String(entry.id) === String(row.product_id ?? row.plan_id ?? ''));
  return {
    ...row,
    id: String(row.id),
    provider_id: row.provider_id ?? null,
    user_id: String(row.user_id ?? ''),
    product_id: row.product_id ? String(row.product_id) : null,
    product_name: row.product_name ? String(row.product_name) : product?.name ? String(product.name) : null,
    plan_id: row.plan_id ? String(row.plan_id) : null,
    plan_name: row.plan_name ? String(row.plan_name) : null,
    pass_tier: String(row.pass_tier ?? 'standard'),
    pass_label: String(row.pass_label ?? 'Billet standard'),
    code: String(row.code ?? ''),
    status: String(row.status ?? 'active'),
    issued_at: String(row.issued_at ?? ''),
    expires_at: row.expires_at ? String(row.expires_at) : null,
    alerts_enabled: Boolean(row.alerts_enabled),
    verification_eligible: Boolean(row.verification_eligible),
    matching_priority: String(row.matching_priority ?? 'low'),
    source_type: row.source_type ? String(row.source_type) : null,
    source_id: row.source_id ? String(row.source_id) : null,
  };
}

export function mapProviderVisibilityOrder(row: Row) {
  const product = listAppRows('provider_visibility_products')
    .find((entry) => String(entry.id) === String(row.product_id ?? ''));
  const pass = listAppRows('provider_visibility_passes')
    .find((entry) => String(entry.id) === String(row.pass_id ?? ''));
  return {
    ...row,
    id: String(row.id),
    provider_id: row.provider_id ?? null,
    user_id: String(row.user_id ?? ''),
    product_id: row.product_id ? String(row.product_id) : null,
    product_name: row.product_name ? String(row.product_name) : product?.name ? String(product.name) : null,
    amount: Number(row.amount ?? product?.price ?? 0),
    currency: String(row.currency ?? product?.currency ?? 'XAF'),
    status: String(row.status ?? 'completed'),
    purchased_at: String(row.purchased_at ?? row.created_at ?? ''),
    financial_operation_id: row.financial_operation_id ? String(row.financial_operation_id) : null,
    transaction_id: row.transaction_id ? String(row.transaction_id) : null,
    pass_id: row.pass_id ? String(row.pass_id) : pass?.id ? String(pass.id) : null,
    pass_tier: String(row.pass_tier ?? pass?.pass_tier ?? product?.tier ?? 'standard'),
    pass_label: row.pass_label ? String(row.pass_label) : pass?.pass_label ? String(pass.pass_label) : null,
    pass_code: row.pass_code ? String(row.pass_code) : pass?.code ? String(pass.code) : null,
    expires_at: row.expires_at ? String(row.expires_at) : pass?.expires_at ? String(pass.expires_at) : null,
  };
}

export function mapUserSubscription(row: UserSubscription, plan: Record<string, unknown> | null) {
  const metadata = readFinanceMetadata(row.metadata);
  const renewsAt = row.renewsAt ?? asFinanceDate(metadata.renews_at);
  const now = Date.now();
  const daysRemaining = renewsAt ? Math.ceil((renewsAt.getTime() - now) / (24 * 60 * 60 * 1000)) : null;
  return {
    ...metadata,
    id: row.id,
    user_id: row.userId,
    role: row.role,
    plan_id: row.planId,
    plan_name: row.planName,
    status: row.status,
    amount: row.amount,
    currency: row.currency,
    commission_rate: row.commissionRate,
    auto_renew: row.autoRenew,
    started_at: row.startedAt?.toISOString() ?? metadata.started_at ?? null,
    renews_at: renewsAt?.toISOString() ?? null,
    last_billed_at: row.lastBilledAt?.toISOString() ?? metadata.last_billed_at ?? null,
    days_remaining: daysRemaining,
    is_expiring_soon: daysRemaining !== null ? daysRemaining <= 7 : false,
    plan,
    created_at: metadata.created_at ?? row.createdAt.toISOString(),
    updated_at: metadata.updated_at ?? row.updatedAt.toISOString(),
  };
}

export function mapEscrow(row: EscrowCase) {
  const metadata = readFinanceMetadata(row.metadata);
  return {
    ...metadata,
    id: row.id,
    booking_id: row.bookingId ?? metadata.booking_id ?? null,
    client_id: row.clientId ?? metadata.client_id ?? null,
    provider_id: row.providerId ?? metadata.provider_id ?? null,
    provider_user_id: row.providerUserId ?? metadata.provider_user_id ?? null,
    requested_provider_id: row.requestedProviderId ?? metadata.requested_provider_id ?? null,
    service: row.service ?? metadata.service ?? null,
    amount_total: row.amountTotal,
    currency: row.currency,
    platform_fee_amount: row.platformFeeAmount,
    provider_amount: row.providerAmount,
    status: row.status,
    funded_at: row.fundedAt?.toISOString() ?? metadata.funded_at ?? null,
    released_at: row.releasedAt?.toISOString() ?? metadata.released_at ?? null,
    refunded_at: row.refundedAt?.toISOString() ?? metadata.refunded_at ?? null,
    note: row.note ?? metadata.note ?? null,
    payment_transaction_id: row.paymentTransactionId ?? metadata.payment_transaction_id ?? null,
    created_at: metadata.created_at ?? row.createdAt.toISOString(),
    updated_at: metadata.updated_at ?? row.updatedAt.toISOString(),
  };
}

export function mapCommission(row: CommissionLedgerEntry) {
  const metadata = readFinanceMetadata(row.metadata);
  return {
    ...metadata,
    id: row.id,
    source_type: row.sourceType ?? metadata.source_type ?? null,
    source_id: row.sourceId ?? metadata.source_id ?? null,
    user_id: row.userId ?? metadata.user_id ?? null,
    beneficiary_user_id: row.beneficiaryUserId ?? metadata.beneficiary_user_id ?? null,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    description: row.description ?? metadata.description ?? '',
    recognized_at: row.recognizedAt?.toISOString() ?? metadata.recognized_at ?? null,
    created_at: metadata.created_at ?? row.createdAt.toISOString(),
  };
}

export function mapPayoutAccount(row: PayoutAccount) {
  const metadata = readFinanceMetadata(row.metadata);
  return {
    ...metadata,
    id: row.id,
    user_id: row.userId,
    method: row.method,
    account_name: row.accountName ?? metadata.account_name ?? '',
    account_identifier: row.accountIdentifier ?? metadata.account_identifier ?? '',
    label: row.label ?? metadata.label ?? '',
    is_default: row.isDefault,
    created_at: metadata.created_at ?? row.createdAt.toISOString(),
    updated_at: metadata.updated_at ?? row.updatedAt.toISOString(),
  };
}

export function mapPayoutRequest(row: PayoutRequest) {
  const metadata = readFinanceMetadata(row.metadata);
  return {
    ...metadata,
    id: row.id,
    user_id: row.userId,
    amount: row.amount,
    currency: row.currency,
    method: row.method,
    account_id: row.accountId ?? metadata.account_id ?? null,
    status: row.status,
    note: row.note ?? metadata.note ?? null,
    requested_at: row.requestedAt?.toISOString() ?? metadata.requested_at ?? row.createdAt.toISOString(),
    processed_at: row.processedAt?.toISOString() ?? metadata.processed_at ?? null,
    created_at: metadata.created_at ?? row.createdAt.toISOString(),
    updated_at: metadata.updated_at ?? row.updatedAt.toISOString(),
  };
}

export function mapInvoice(row: Invoice) {
  const metadata = readFinanceMetadata(row.metadata);
  return {
    ...metadata,
    id: row.id,
    user_id: row.userId ?? metadata.user_id ?? null,
    number: row.number ?? metadata.number ?? row.id,
    type: row.type ?? metadata.type ?? 'prestation',
    description: row.description ?? metadata.description ?? '',
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    issueDate: row.issueDate?.toISOString() ?? metadata.issueDate ?? metadata.issue_date ?? row.createdAt.toISOString(),
    dueDate: row.dueDate?.toISOString() ?? metadata.dueDate ?? metadata.due_date ?? row.createdAt.toISOString(),
    paidDate: row.paidDate?.toISOString() ?? metadata.paidDate ?? metadata.paid_date ?? null,
    recipient: metadata.recipient ?? row.recipient ?? { name: '', email: '' },
    items: Array.isArray(metadata.items) ? metadata.items : (Array.isArray(row.items) ? row.items : []),
    created_at: metadata.created_at ?? row.createdAt.toISOString(),
    updated_at: metadata.updated_at ?? row.updatedAt.toISOString(),
  };
}
