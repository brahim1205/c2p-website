import type { WalletService } from '../database/wallet.service.js';
import type { OutboxEventInput } from '../outbox/outbox.types.js';
import {
  appendAppRows,
  clone,
  collectRowsByIds,
  findRow,
  mergeRowsToPersist,
  patchAppRows,
  store,
  withId,
} from './data-app-store.js';
import {
  applyBookingCreateSideEffects as applyBookingCreateSideEffectsByPolicy,
  applyBookingUpdateSideEffects as applyBookingUpdateSideEffectsByPolicy,
  applyEscrowUpdateSideEffects as applyEscrowUpdateSideEffectsByPolicy,
  applyPayoutRequestUpdateSideEffects as applyPayoutRequestUpdateSideEffectsByPolicy,
  applySubscriptionMutationSideEffects as applySubscriptionMutationSideEffectsByPolicy,
  createWalletMutationHooks as createWalletMutationHooksByPolicy,
  type FinanceSideEffectsContext,
} from './data-finance-side-effects.js';
import {
  createReference,
  createSyntheticId,
  findEscrowByBookingId,
  getWalletAccountRow,
} from './data-finance-helpers.js';
import {
  requireNumberOrFallback,
  trimText,
} from './data-normalizers.js';
import { prepareInsert } from './data-runtime.js';
import type { Row } from './mock-store.js';

export function ensureWalletAccount(userId: string, rowsToPersist: Record<string, Row[]>) {
  const existing = getWalletAccountRow(userId);
  if (existing) return existing;

  const created = withId(prepareInsert('wallet_accounts', {
    id: createSyntheticId('wallet'),
    user_id: userId,
    balance: 0,
    currency: 'XAF',
  }));
  appendAppRows('wallet_accounts', [created]);
  mergeRowsToPersist(rowsToPersist, 'wallet_accounts', collectRowsByIds('wallet_accounts', [String(created.id)]));
  return findRow('wallet_accounts', created.id) ?? created;
}

function createFinanceSideEffectsContext(): FinanceSideEffectsContext {
  return {
    store,
    clone,
    withId,
    prepareInsert,
    createSyntheticId,
    createReference,
    appendAppRows,
    patchAppRows,
    mergeRowsToPersist,
    collectRowsByIds,
    ensureWalletAccount,
    findRow,
    findEscrowByBookingId: (bookingId) => findEscrowByBookingId(bookingId) ?? undefined,
    requireNumberOrFallback,
    trimText,
  };
}

export function createWalletMutationHooks(rowsToPersist: Record<string, Row[]>) {
  return createWalletMutationHooksByPolicy(createFinanceSideEffectsContext(), rowsToPersist);
}

export async function applyBookingCreateSideEffects(
  bookings: Row[],
  rowsToPersist: Record<string, Row[]>,
  outboxEvents: OutboxEventInput[],
  walletService: WalletService,
  actorId?: string | null,
) {
  return applyBookingCreateSideEffectsByPolicy(
    bookings,
    rowsToPersist,
    outboxEvents,
    walletService,
    actorId,
    createFinanceSideEffectsContext(),
  );
}

export async function applyBookingUpdateSideEffects(
  previousRows: Row[],
  updatedRows: Row[],
  rowsToPersist: Record<string, Row[]>,
  outboxEvents: OutboxEventInput[],
  walletService: WalletService,
  actorId?: string | null,
) {
  return applyBookingUpdateSideEffectsByPolicy(
    previousRows,
    updatedRows,
    rowsToPersist,
    outboxEvents,
    walletService,
    actorId,
    createFinanceSideEffectsContext(),
  );
}

export async function applyEscrowUpdateSideEffects(
  previousRows: Row[],
  updatedRows: Row[],
  rowsToPersist: Record<string, Row[]>,
  outboxEvents: OutboxEventInput[],
  walletService: WalletService,
  actorId?: string | null,
) {
  return applyEscrowUpdateSideEffectsByPolicy(
    previousRows,
    updatedRows,
    rowsToPersist,
    outboxEvents,
    walletService,
    actorId,
    createFinanceSideEffectsContext(),
  );
}

export async function applyPayoutRequestUpdateSideEffects(
  previousRows: Row[],
  updatedRows: Row[],
  rowsToPersist: Record<string, Row[]>,
  outboxEvents: OutboxEventInput[],
  walletService: WalletService,
  actorId?: string | null,
) {
  return applyPayoutRequestUpdateSideEffectsByPolicy(
    previousRows,
    updatedRows,
    rowsToPersist,
    outboxEvents,
    walletService,
    actorId,
    createFinanceSideEffectsContext(),
  );
}

export async function applySubscriptionMutationSideEffects(
  previousRows: Row[],
  updatedRows: Row[],
  rowsToPersist: Record<string, Row[]>,
  outboxEvents: OutboxEventInput[],
  walletService: WalletService,
  actorId?: string | null,
) {
  return applySubscriptionMutationSideEffectsByPolicy(
    previousRows,
    updatedRows,
    rowsToPersist,
    outboxEvents,
    walletService,
    actorId,
    createFinanceSideEffectsContext(),
  );
}
