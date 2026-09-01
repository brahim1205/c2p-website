import { UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { AuthUser } from '../auth/auth.store.js';
import type { Row } from '../data/mock-store.js';
import {
  appendAppRows,
  collectRowsByIds,
  listAppRows,
  mergeRowsToPersist,
  patchAppRows,
  withId,
} from '../data/data-app-store.js';
import { prepareInsert } from '../data/data-runtime.js';

export function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function getWalletRow(userId: string) {
  return listAppRows('wallet_accounts').find((row) => String(row.user_id) === String(userId)) ?? null;
}

export function getLatestSubscription(userId: string) {
  return [...listAppRows('user_subscriptions')]
    .filter((row) => String(row.user_id) === String(userId))
    .sort((left, right) => (
      Date.parse(String(right.updated_at ?? right.created_at ?? ''))
      - Date.parse(String(left.updated_at ?? left.created_at ?? ''))
    ))
    .find((row) => String(row.status) !== 'cancelled') ?? null;
}

export function assertMonetizedRole(actor: AuthUser) {
  if (!new Set(['prestataire', 'formateur', 'porteur', 'partenaire']).has(actor.role)) {
    throw new UnauthorizedException('Ce role ne peut pas utiliser cette commande.');
  }
}

export function assertPrestataireRole(actor: AuthUser) {
  if (actor.role !== 'prestataire') {
    throw new UnauthorizedException('Seuls les prestataires peuvent acheter un billet SenPresta.');
  }
}

export function commandScopedId(prefix: string, actorId: string, requestId: string) {
  const hash = createHash('sha256')
    .update(`${prefix}:${actorId}:${requestId}`)
    .digest('hex')
    .slice(0, 24);
  return `${prefix}-${hash}`;
}

export function trimSubscriptionStatus(value: unknown) {
  const status = String(value ?? '').trim();
  return new Set(['trialing', 'active', 'past_due', 'expired', 'cancelled']).has(status) ? status : 'active';
}

export function trimPayoutMethod(value: unknown) {
  const method = String(value ?? '').trim();
  return method.length > 0 ? method : 'wallet';
}

export function createProviderVisibilityContext() {
  return {
    store: {
      providers: listAppRows('providers'),
      provider_visibility_passes: listAppRows('provider_visibility_passes'),
      provider_visibility_products: listAppRows('provider_visibility_products'),
      provider_visibility_orders: listAppRows('provider_visibility_orders'),
      subscription_plans: listAppRows('subscription_plans'),
    },
    findRow: (table: string, rowId: unknown) => listAppRows(table).find((row) => String(row.id) === String(rowId)),
    appendAppRows,
    patchAppRows,
    mergeRowsToPersist,
    collectRowsByIds,
  };
}

export function appendDirectPaymentTransaction(rowsToPersist: Record<string, Row[]>, input: {
  actorId: string;
  amount: number;
  currency?: string | null;
  method?: string | null;
  description: string;
  sourceId: string;
  operationKind: string;
  requestId: string;
}) {
  const financialOperationId = `finop_${input.operationKind}_${Date.now()}_${commandScopedId('direct', input.actorId, input.requestId)}`;
  const transaction = withId(prepareInsert('payment_transactions', {
    id: commandScopedId('TRX', input.actorId, input.requestId),
    user_id: input.actorId,
    type: 'payment',
    amount: input.amount,
    currency: input.currency ?? 'XAF',
    method: input.method ?? 'dexpay',
    status: 'completed',
    description: input.description,
    date: new Date().toISOString(),
    reference: commandScopedId('PAY', input.actorId, input.requestId),
    financial_operation_id: financialOperationId,
    metadata: {
      operation_kind: input.operationKind,
      source_id: input.sourceId,
      payment_method: input.method ?? 'dexpay',
      financial_operation_id: financialOperationId,
    },
  }));
  appendAppRows('payment_transactions', [transaction]);
  mergeRowsToPersist(rowsToPersist, 'payment_transactions', collectRowsByIds('payment_transactions', [String(transaction.id)]));
  return { transaction, financialOperationId };
}
