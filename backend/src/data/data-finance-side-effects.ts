import { BadRequestException } from '@nestjs/common';
import { findUserById } from '../auth/auth.store.js';
import { WalletService } from '../database/wallet.service.js';
import { pushNotificationDispatchOutboxEvent } from '../notifications/notification-outbox.js';
import { createAppNotificationRow } from '../notifications/notification-payloads.js';
import { buildOutboxEvent } from '../outbox/outbox-contract.js';
import type { OutboxEventInput } from '../outbox/outbox.types.js';
import type { Row, Store } from './mock-store.js';

export interface FinanceSideEffectsContext {
  store: Store;
  clone: <T>(value: T) => T;
  withId: (row: Row) => Row;
  prepareInsert: (table: string, row: Row) => Row;
  createSyntheticId: (prefix: string) => string;
  createReference: (prefix: string) => string;
  appendAppRows: (table: string, rows: Row[]) => Row[];
  patchAppRows: (
    table: string,
    predicate: (row: Row) => boolean,
    patch: Row | ((row: Row) => Row),
  ) => Row[];
  mergeRowsToPersist: (target: Record<string, Row[]>, table: string, rows: Row[]) => void;
  collectRowsByIds: (table: string, ids: Array<string | number>) => Row[];
  ensureWalletAccount: (userId: string, rowsToPersist: Record<string, Row[]>) => Row;
  findRow: (table: string, id: unknown) => Row | undefined;
  findEscrowByBookingId: (bookingId: unknown) => Row | undefined;
  requireNumberOrFallback: (value: unknown, fallback: number) => number;
  trimText: (value: unknown) => string | null;
}

function appendFinanceNotificationRows(
  ctx: FinanceSideEffectsContext,
  outboxEvents: OutboxEventInput[],
  rows: Row[],
  eventType: string,
  aggregateId?: string | null,
  financialOperationId?: string | null,
  actorId?: string | null,
) {
  if (rows.length === 0) return;
  pushNotificationDispatchOutboxEvent(outboxEvents, {
    eventType,
    aggregateId: aggregateId ?? null,
    actorId: actorId ?? null,
    idempotencyKey: `${eventType}:${String(aggregateId ?? rows.map((row) => row.id).join(','))}:${String(financialOperationId ?? '')}`,
    financialOperationId,
    notifications: rows.map((row) => ctx.clone(row)) as ReturnType<typeof createAppNotificationRow>[],
    metadata: {
      source: 'finance-notification',
    },
  });
}

function buildNotificationRow(
  ctx: FinanceSideEffectsContext,
  userId: string,
  title: string,
  message: string,
  link: string,
  type = 'finance',
) {
  return ctx.withId(ctx.prepareInsert('notifications', createAppNotificationRow({
    id: ctx.createSyntheticId('notif'),
    userId,
    title,
    message,
    type,
    link,
  })));
}

function appendPaymentTransaction(
  ctx: FinanceSideEffectsContext,
  rowsToPersist: Record<string, Row[]>,
  payload: Row,
) {
  const existing = (
    (payload.id !== undefined ? ctx.findRow('payment_transactions', payload.id) : null)
    ?? ((payload.financial_operation_id
      ? (ctx.store.payment_transactions ?? []).find((row) => String(row.financial_operation_id ?? '') === String(payload.financial_operation_id))
      : null) ?? null)
  );

  if (existing) {
    ctx.patchAppRows('payment_transactions', (row) => String(row.id) === String(existing.id), {
      ...existing,
      ...payload,
      currency: payload.currency ?? existing.currency ?? 'XAF',
      status: payload.status ?? existing.status ?? 'completed',
      date: payload.date ?? existing.date ?? new Date().toISOString(),
      reference: payload.reference ?? existing.reference ?? ctx.createReference('REF'),
      updated_at: new Date().toISOString(),
    });
    ctx.mergeRowsToPersist(rowsToPersist, 'payment_transactions', ctx.collectRowsByIds('payment_transactions', [String(existing.id)]));
    return ctx.findRow('payment_transactions', existing.id) ?? existing;
  }

  const transaction = ctx.withId(ctx.prepareInsert('payment_transactions', {
    id: payload.id ?? ctx.createReference('TRX'),
    currency: 'XAF',
    status: 'completed',
    date: new Date().toISOString(),
    reference: ctx.createReference('REF'),
    ...payload,
  }));
  ctx.appendAppRows('payment_transactions', [transaction]);
  ctx.mergeRowsToPersist(rowsToPersist, 'payment_transactions', ctx.collectRowsByIds('payment_transactions', [String(transaction.id)]));
  return ctx.findRow('payment_transactions', transaction.id) ?? transaction;
}

function appendInvoice(
  ctx: FinanceSideEffectsContext,
  rowsToPersist: Record<string, Row[]>,
  payload: Row,
) {
  const existing = (
    (payload.id !== undefined ? ctx.findRow('invoices', payload.id) : null)
    ?? ((payload.financial_operation_id
      ? (ctx.store.invoices ?? []).find((row) => String(row.financial_operation_id ?? '') === String(payload.financial_operation_id))
      : null) ?? null)
  );

  if (existing) {
    ctx.patchAppRows('invoices', (row) => String(row.id) === String(existing.id), {
      ...existing,
      ...payload,
      number: payload.number ?? existing.number ?? ctx.createReference('FAC'),
      currency: payload.currency ?? existing.currency ?? 'XAF',
      issueDate: payload.issueDate ?? existing.issueDate ?? new Date().toISOString().slice(0, 10),
      dueDate: payload.dueDate ?? existing.dueDate ?? new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    });
    ctx.mergeRowsToPersist(rowsToPersist, 'invoices', ctx.collectRowsByIds('invoices', [String(existing.id)]));
    return ctx.findRow('invoices', existing.id) ?? existing;
  }

  const invoice = ctx.withId(ctx.prepareInsert('invoices', {
    id: payload.id ?? ctx.createReference('INV'),
    number: ctx.createReference('FAC'),
    currency: 'XAF',
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date().toISOString().slice(0, 10),
    paidDate: null,
    status: 'pending',
    items: [],
    ...payload,
  }));
  ctx.appendAppRows('invoices', [invoice]);
  ctx.mergeRowsToPersist(rowsToPersist, 'invoices', ctx.collectRowsByIds('invoices', [String(invoice.id)]));
  return ctx.findRow('invoices', invoice.id) ?? invoice;
}

function appendCommissionEntry(
  ctx: FinanceSideEffectsContext,
  rowsToPersist: Record<string, Row[]>,
  payload: Row,
) {
  const existing = (
    (payload.id !== undefined ? ctx.findRow('commission_ledger', payload.id) : null)
    ?? ((payload.financial_operation_id
      ? (ctx.store.commission_ledger ?? []).find((row) => String(row.financial_operation_id ?? '') === String(payload.financial_operation_id))
      : null) ?? null)
  );

  if (existing) {
    ctx.patchAppRows('commission_ledger', (row) => String(row.id) === String(existing.id), {
      ...existing,
      ...payload,
      currency: payload.currency ?? existing.currency ?? 'XAF',
      status: payload.status ?? existing.status ?? 'recognized',
      recognized_at: payload.recognized_at ?? existing.recognized_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    ctx.mergeRowsToPersist(rowsToPersist, 'commission_ledger', ctx.collectRowsByIds('commission_ledger', [String(existing.id)]));
    return ctx.findRow('commission_ledger', existing.id) ?? existing;
  }

  const entry = ctx.withId(ctx.prepareInsert('commission_ledger', {
    id: payload.id ?? ctx.createSyntheticId('com'),
    currency: 'XAF',
    status: 'recognized',
    recognized_at: new Date().toISOString(),
    beneficiary_user_id: 'usr-admin',
    ...payload,
  }));
  ctx.appendAppRows('commission_ledger', [entry]);
  ctx.mergeRowsToPersist(rowsToPersist, 'commission_ledger', ctx.collectRowsByIds('commission_ledger', [String(entry.id)]));
  return ctx.findRow('commission_ledger', entry.id) ?? entry;
}

export function createWalletMutationHooks(
  ctx: FinanceSideEffectsContext,
  rowsToPersist: Record<string, Row[]>,
) {
  return {
    syncWalletRow(wallet: Row) {
      ctx.mergeRowsToPersist(rowsToPersist, 'wallet_accounts', ctx.collectRowsByIds('wallet_accounts', [String(wallet.id)]));
    },
    appendPaymentTransaction(payload: Row) {
      return appendPaymentTransaction(ctx, rowsToPersist, payload);
    },
    appendCommissionEntry(payload: Row) {
      return appendCommissionEntry(ctx, rowsToPersist, payload);
    },
  };
}

async function applyBookingCreateSideEffectsInternal(
  bookings: Row[],
  rowsToPersist: Record<string, Row[]>,
  outboxEvents: OutboxEventInput[],
  walletService: WalletService,
  actorId: string | null | undefined,
  ctx: FinanceSideEffectsContext,
) {
  for (const booking of bookings) {
    const amountTotal = ctx.requireNumberOrFallback(booking.price, 0);
    const requestedProvider = ctx.findRow('providers', booking.requested_provider_id);
    let fundingStatus: string = amountTotal > 0 ? 'awaiting_funding' : 'awaiting_quote';
    let paymentTransactionId: string | null = null;
    let financialOperationId: string | null = null;
    const hooks = createWalletMutationHooks(ctx, rowsToPersist);

    if (amountTotal > 0 && String(booking.payment_method) === 'wallet') {
      const wallet = ctx.ensureWalletAccount(String(booking.client_id), rowsToPersist);
      const balance = ctx.requireNumberOrFallback(wallet.balance, 0);
      if (balance >= amountTotal) {
        const operation = await walletService.holdFunds({
          wallet,
          userId: String(booking.client_id),
          amount: amountTotal,
          serviceLabel: String(booking.service ?? 'mission'),
          method: String(booking.payment_method ?? 'wallet'),
          bookingId: String(booking.id),
          idempotencyKey: `escrow_hold:booking:${String(booking.id)}`,
          actorId: actorId ?? undefined,
          reason: 'booking_create_wallet_hold',
          hooks,
        });
        financialOperationId = operation.financialOperationId;
        paymentTransactionId = String(operation.transaction.id);
        fundingStatus = booking.provider_id ? 'assigned' : 'funded';
      }
    } else if (amountTotal > 0) {
      financialOperationId = walletService.nextFinancialOperationId('external_funding');
      const transaction = appendPaymentTransaction(ctx, rowsToPersist, {
        user_id: booking.client_id,
        type: 'payment',
        amount: amountTotal,
        method: booking.payment_method ?? 'card',
        status: 'pending',
        description: `Financement externe mission - ${String(booking.service ?? 'mission')}`,
        financial_operation_id: financialOperationId,
        metadata: {
          operation_kind: 'external_funding',
          financial_operation_id: financialOperationId,
        },
      });
      paymentTransactionId = String(transaction.id);
    }

    const escrowDraft = ctx.withId(ctx.prepareInsert('escrow_cases', {
      id: `escrow-${String(booking.id)}`,
      booking_id: booking.id,
      client_id: booking.client_id,
      provider_id: booking.provider_id ?? null,
      provider_user_id: requestedProvider?.user_id ?? null,
      requested_provider_id: booking.requested_provider_id ?? null,
      service: booking.service,
      amount_total: amountTotal,
      currency: 'XAF',
      platform_fee_amount: booking.platform_fee_amount ?? 0,
      provider_amount: booking.provider_payout_amount ?? 0,
      status: fundingStatus,
      funded_at: new Set(['funded', 'assigned']).has(fundingStatus) ? new Date().toISOString() : null,
      payment_transaction_id: paymentTransactionId,
      financial_operation_id: financialOperationId,
      note: 'Demande recue par C2P.',
    }));
    const escrow = await walletService.syncEscrowCase(escrowDraft, {
      actorId: actorId ?? undefined,
      reason: 'booking_create_escrow_sync',
    });
    ctx.appendAppRows('escrow_cases', [escrow]);
    ctx.mergeRowsToPersist(rowsToPersist, 'escrow_cases', ctx.collectRowsByIds('escrow_cases', [String(escrow.id)]));

    if (amountTotal > 0) {
      const client = findUserById(String(booking.client_id));
      appendInvoice(ctx, rowsToPersist, {
        user_id: booking.client_id,
        type: 'prestation',
        description: `Mission ${String(booking.service ?? '')}`,
        amount: amountTotal,
        currency: 'XAF',
        status: paymentTransactionId ? (fundingStatus === 'awaiting_funding' ? 'pending' : 'paid') : 'pending',
        paidDate: fundingStatus === 'awaiting_funding' ? null : new Date().toISOString().slice(0, 10),
        financial_operation_id: financialOperationId,
        recipient: client ? { name: `${client.firstName} ${client.lastName}`.trim(), email: client.email } : null,
        items: [{ description: `Demande ${String(booking.service ?? 'mission')}`, quantity: 1, unitPrice: amountTotal, total: amountTotal }],
      });
    }

    appendFinanceNotificationRows(ctx, outboxEvents, [
      buildNotificationRow(ctx, 'usr-admin', 'Nouvelle demande C2P', `Une mission "${String(booking.service ?? 'mission')}" attend assignation.`, '/admin/dashboard', 'booking'),
      buildNotificationRow(ctx, String(booking.client_id), 'Demande transmise à C2P', 'Votre besoin a ete enregistre et sera analyse par C2P.', '/dashboard/client/reservations', 'booking'),
    ], 'booking.requested', String(booking.id), financialOperationId, actorId ?? null);
  }
}

export async function applyBookingCreateSideEffects(
  bookings: Row[],
  rowsToPersist: Record<string, Row[]>,
  outboxEvents: OutboxEventInput[],
  walletService: WalletService,
  actorId: string | null | undefined,
  ctx: FinanceSideEffectsContext,
) {
  return applyBookingCreateSideEffectsInternal(bookings, rowsToPersist, outboxEvents, walletService, actorId, ctx);
}

export async function applyBookingUpdateSideEffects(
  previousRows: Row[],
  updatedRows: Row[],
  rowsToPersist: Record<string, Row[]>,
  outboxEvents: OutboxEventInput[],
  walletService: WalletService,
  actorId: string | null | undefined,
  ctx: FinanceSideEffectsContext,
) {
  const previousById = new Map(previousRows.map((row) => [String(row.id), row] as const));

  for (const booking of updatedRows) {
    const previous = previousById.get(String(booking.id));
    let escrow = ctx.findEscrowByBookingId(booking.id);
    if (!escrow) {
      await applyBookingCreateSideEffectsInternal([booking], rowsToPersist, outboxEvents, walletService, actorId, ctx);
      escrow = ctx.findEscrowByBookingId(booking.id);
      if (!escrow) continue;
    }

    const nextPatch: Row = {
      provider_id: booking.provider_id ?? null,
      requested_provider_id: booking.requested_provider_id ?? escrow.requested_provider_id ?? null,
      service: booking.service ?? escrow.service ?? null,
      amount_total: ctx.requireNumberOrFallback(booking.price, ctx.requireNumberOrFallback(escrow.amount_total, 0)),
      platform_fee_amount: ctx.requireNumberOrFallback(booking.platform_fee_amount, ctx.requireNumberOrFallback(escrow.platform_fee_amount, 0)),
      provider_amount: ctx.requireNumberOrFallback(booking.provider_payout_amount, ctx.requireNumberOrFallback(escrow.provider_amount, 0)),
      note: ctx.trimText(booking.c2p_note) ?? ctx.trimText(escrow.note),
    };

    const assignedProvider = ctx.findRow('providers', booking.provider_id);
    if (assignedProvider) {
      nextPatch.provider_user_id = assignedProvider.user_id ?? null;
    }

    if (String(booking.status) === 'confirmed') {
      nextPatch.status = String(escrow.status) === 'awaiting_funding' ? 'awaiting_funding' : 'assigned';
    } else if (String(booking.status) === 'in_progress') {
      nextPatch.status = 'in_progress';
    } else if (String(booking.status) === 'completed') {
      nextPatch.status = 'delivery_review';
    } else if (String(booking.status) === 'cancelled' || String(booking.status) === 'declined') {
      if (
        !new Set(['released', 'refunded']).has(String(escrow.status))
        && (Boolean(escrow.funded_at) || new Set(['funded', 'assigned', 'in_progress', 'delivery_review']).has(String(escrow.status)))
      ) {
        const wallet = ctx.ensureWalletAccount(String(booking.client_id), rowsToPersist);
        const operation = await walletService.refund({
          wallet,
          userId: String(booking.client_id),
          amount: ctx.requireNumberOrFallback(escrow.amount_total, 0),
          serviceLabel: String(booking.service ?? 'mission'),
          escrowId: String(escrow.id),
          idempotencyKey: `escrow_refund:${String(escrow.id)}`,
          actorId: actorId ?? undefined,
          reason: 'booking_cancel_refund',
          hooks: createWalletMutationHooks(ctx, rowsToPersist),
        });
        nextPatch.status = 'refunded';
        nextPatch.refunded_at = new Date().toISOString();
        nextPatch.refund_transaction_id = operation.transaction.id;
        nextPatch.financial_operation_id = operation.financialOperationId;
        appendFinanceNotificationRows(ctx, outboxEvents, [
          buildNotificationRow(ctx, String(booking.client_id), 'Mission rembousee', 'Le montant de votre mission a ete recredite dans votre wallet C2P.', '/dashboard/paiements', 'finance'),
        ], 'booking.refunded', String(booking.id), operation.financialOperationId, actorId ?? null);
      } else {
        nextPatch.status = 'cancelled';
      }
    }

    const nextEscrow = await walletService.syncEscrowCase({
      ...escrow,
      ...nextPatch,
      id: escrow.id,
      updated_at: new Date().toISOString(),
    }, {
      actorId: actorId ?? undefined,
      reason: 'booking_update_escrow_sync',
    });
    ctx.patchAppRows('escrow_cases', (row) => String(row.id) === String(escrow.id), nextEscrow);
    ctx.mergeRowsToPersist(rowsToPersist, 'escrow_cases', ctx.collectRowsByIds('escrow_cases', [String(escrow.id)]));

    if (previous && String(previous.provider_id ?? '') !== String(booking.provider_id ?? '') && booking.provider_id) {
      const providerUserId = ctx.trimText(assignedProvider?.user_id);
      appendFinanceNotificationRows(ctx, outboxEvents, [
        buildNotificationRow(ctx, String(booking.client_id), 'Prestataire assigne', 'C2P a attribue votre demande a un prestataire et supervise la mission.', '/dashboard/client/reservations', 'booking'),
        ...(providerUserId ? [buildNotificationRow(ctx, providerUserId, 'Mission attribuee par C2P', `Une mission "${String(booking.service ?? 'mission')}" vous a ete attribuee.`, '/dashboard/prestataire/demandes', 'booking')] : []),
      ], 'booking.assigned', String(booking.id), null, actorId ?? null);
    }
  }
}

export async function applyEscrowUpdateSideEffects(
  previousRows: Row[],
  updatedRows: Row[],
  rowsToPersist: Record<string, Row[]>,
  outboxEvents: OutboxEventInput[],
  walletService: WalletService,
  actorId: string | null | undefined,
  ctx: FinanceSideEffectsContext,
) {
  const previousById = new Map(previousRows.map((row) => [String(row.id), row] as const));

  for (const escrow of updatedRows) {
    const previous = previousById.get(String(escrow.id));
    if (!previous) continue;
    const nextStatus = String(escrow.status);
    const prevStatus = String(previous.status);

    if (nextStatus === 'released' && prevStatus !== 'released' && ctx.trimText(escrow.provider_user_id)) {
      const providerWallet = ctx.ensureWalletAccount(String(escrow.provider_user_id), rowsToPersist);
      const operation = await walletService.releaseEscrow({
        wallet: providerWallet,
        userId: String(escrow.provider_user_id),
        bookingId: ctx.trimText(escrow.booking_id),
        escrowId: String(escrow.id),
        serviceLabel: String(escrow.service ?? 'mission'),
        providerAmount: ctx.requireNumberOrFallback(escrow.provider_amount, 0),
        platformFeeAmount: ctx.requireNumberOrFallback(escrow.platform_fee_amount, 0),
        idempotencyKey: `escrow_release:${String(escrow.id)}`,
        actorId: actorId ?? undefined,
        reason: 'escrow_release',
        hooks: createWalletMutationHooks(ctx, rowsToPersist),
      });
      escrow.financial_operation_id = operation.financialOperationId;
      appendFinanceNotificationRows(ctx, outboxEvents, [
        buildNotificationRow(ctx, String(escrow.provider_user_id), 'Paiement libere', 'C2P a libere votre paiement dans le wallet interne.', '/dashboard/paiements', 'finance'),
        buildNotificationRow(ctx, String(escrow.client_id), 'Mission validee', 'C2P a valide la mission et a libere le paiement au prestataire.', '/dashboard/client/reservations', 'booking'),
      ], 'escrow.released', String(escrow.id), operation.financialOperationId, actorId ?? null);
    }

    if (nextStatus === 'refunded' && prevStatus !== 'refunded') {
      if (Boolean(previous.funded_at) || new Set(['funded', 'assigned', 'in_progress', 'delivery_review']).has(prevStatus)) {
        const clientWallet = ctx.ensureWalletAccount(String(escrow.client_id), rowsToPersist);
        const operation = await walletService.refund({
          wallet: clientWallet,
          userId: String(escrow.client_id),
          amount: ctx.requireNumberOrFallback(escrow.amount_total, 0),
          serviceLabel: String(escrow.service ?? 'mission'),
          escrowId: String(escrow.id),
          idempotencyKey: `escrow_refund:${String(escrow.id)}`,
          actorId: actorId ?? undefined,
          reason: 'escrow_refund',
          hooks: createWalletMutationHooks(ctx, rowsToPersist),
        });
        escrow.financial_operation_id = operation.financialOperationId;
      }
      appendFinanceNotificationRows(ctx, outboxEvents, [
        buildNotificationRow(ctx, String(escrow.client_id), 'Remboursement effectue', 'Le sequestre a ete rembourse dans votre wallet C2P.', '/dashboard/paiements', 'finance'),
      ], 'escrow.refunded', String(escrow.id), escrow.financial_operation_id ? String(escrow.financial_operation_id) : null, actorId ?? null);
    }
    const syncedEscrow = await walletService.syncEscrowCase({
      ...escrow,
      updated_at: new Date().toISOString(),
    }, {
      actorId: actorId ?? undefined,
      reason: 'escrow_update_sync',
    });
    ctx.patchAppRows('escrow_cases', (row) => String(row.id) === String(escrow.id), syncedEscrow);
    ctx.mergeRowsToPersist(rowsToPersist, 'escrow_cases', ctx.collectRowsByIds('escrow_cases', [String(escrow.id)]));
  }
}

export async function applyPayoutRequestUpdateSideEffects(
  previousRows: Row[],
  updatedRows: Row[],
  rowsToPersist: Record<string, Row[]>,
  outboxEvents: OutboxEventInput[],
  walletService: WalletService,
  actorId: string | null | undefined,
  ctx: FinanceSideEffectsContext,
) {
  const previousById = new Map(previousRows.map((row) => [String(row.id), row] as const));

  for (const request of updatedRows) {
    const previous = previousById.get(String(request.id));
    if (!previous) continue;
    if (String(request.status) !== 'paid' || String(previous.status) === 'paid') continue;

    const wallet = ctx.ensureWalletAccount(String(request.user_id), rowsToPersist);
    const balance = ctx.requireNumberOrFallback(wallet.balance, 0);
    const amount = ctx.requireNumberOrFallback(request.amount, 0);
    if (balance < amount) {
      throw new BadRequestException('Solde insuffisant pour solder cette demande de retrait.');
    }
    const operation = await walletService.completePayout({
      wallet,
      userId: String(request.user_id),
      amount,
      payoutLabel: String(request.account_label ?? request.method ?? 'wallet'),
      method: ctx.trimText(request.method),
      payoutRequestId: String(request.id),
      idempotencyKey: `payout_paid:${String(request.id)}`,
      actorId: actorId ?? undefined,
      reason: 'payout_paid',
      hooks: createWalletMutationHooks(ctx, rowsToPersist),
    });
    request.financial_operation_id = operation.financialOperationId;
    appendFinanceNotificationRows(ctx, outboxEvents, [
      buildNotificationRow(ctx, String(request.user_id), 'Retrait traite', 'Votre retrait a ete marque comme paye par C2P.', '/dashboard/paiements', 'finance'),
    ], 'payout.completed', String(request.id), operation.financialOperationId, actorId ?? null);
  }
}

export async function applySubscriptionMutationSideEffects(
  previousRows: Row[],
  updatedRows: Row[],
  rowsToPersist: Record<string, Row[]>,
  outboxEvents: OutboxEventInput[],
  walletService: WalletService,
  actorId: string | null | undefined,
  ctx: FinanceSideEffectsContext,
) {
  const previousById = new Map(previousRows.map((row) => [String(row.id), row] as const));

  for (const subscription of updatedRows) {
    const previous = previousById.get(String(subscription.id));
    const shouldCharge = !previous || String(previous.last_billed_at ?? '') !== String(subscription.last_billed_at ?? '');
    if (!shouldCharge || String(subscription.status) === 'cancelled' || String(subscription.status) === 'trialing') {
      const syncedPassiveSubscription = await walletService.syncUserSubscription({
        ...subscription,
        updated_at: new Date().toISOString(),
      }, {
        actorId: actorId ?? undefined,
        reason: 'subscription_sync',
      });
      ctx.patchAppRows('user_subscriptions', (row) => String(row.id) === String(subscription.id), syncedPassiveSubscription);
      ctx.mergeRowsToPersist(rowsToPersist, 'user_subscriptions', ctx.collectRowsByIds('user_subscriptions', [String(subscription.id)]));
      continue;
    }

    const wallet = ctx.ensureWalletAccount(String(subscription.user_id), rowsToPersist);
    const amount = ctx.requireNumberOrFallback(subscription.amount, 0);
    const balance = ctx.requireNumberOrFallback(wallet.balance, 0);
    if (balance < amount) {
      throw new BadRequestException('Solde insuffisant pour facturer cet abonnement.');
    }

    const user = findUserById(String(subscription.user_id));
    const operation = await walletService.chargeSubscription({
      wallet,
      userId: String(subscription.user_id),
      sourceId: String(subscription.id),
      amount,
      planName: String(subscription.plan_name ?? 'C2P'),
      role: ctx.trimText(subscription.role),
      planId: ctx.trimText(subscription.plan_id),
      commissionRate: ctx.requireNumberOrFallback(subscription.commission_rate, 0),
      autoRenew: Boolean(subscription.auto_renew),
      startedAt: ctx.trimText(subscription.started_at),
      renewsAt: ctx.trimText(subscription.renews_at),
      lastBilledAt: ctx.trimText(subscription.last_billed_at),
      idempotencyKey: `subscription_charge:${String(subscription.id)}:${String(subscription.last_billed_at ?? subscription.renews_at ?? subscription.updated_at ?? 'once')}`,
      actorId: actorId ?? undefined,
      reason: 'subscription_charge',
      hooks: createWalletMutationHooks(ctx, rowsToPersist),
    });
    appendInvoice(ctx, rowsToPersist, {
      user_id: subscription.user_id,
      type: 'abonnement',
      description: `Abonnement ${String(subscription.plan_name ?? 'C2P')}`,
      amount,
      currency: subscription.currency ?? 'XAF',
      status: 'paid',
      paidDate: new Date().toISOString().slice(0, 10),
      financial_operation_id: operation.financialOperationId,
      recipient: user ? { name: `${user.firstName} ${user.lastName}`.trim(), email: user.email } : null,
      items: [{ description: `Abonnement ${String(subscription.plan_name ?? 'C2P')}`, quantity: 1, unitPrice: amount, total: amount }],
    });
    subscription.financial_operation_id = operation.financialOperationId;
    const syncedSubscription = await walletService.syncUserSubscription({
      ...subscription,
      updated_at: new Date().toISOString(),
    }, {
      actorId: actorId ?? undefined,
      reason: 'subscription_sync_after_charge',
    });
    ctx.patchAppRows('user_subscriptions', (row) => String(row.id) === String(subscription.id), syncedSubscription);
    ctx.mergeRowsToPersist(rowsToPersist, 'user_subscriptions', ctx.collectRowsByIds('user_subscriptions', [String(subscription.id)]));
    appendFinanceNotificationRows(ctx, outboxEvents, [
      buildNotificationRow(ctx, String(subscription.user_id), 'Abonnement actif', `Votre plan ${String(subscription.plan_name ?? 'C2P')} est actif jusqu'au ${new Date(String(subscription.renews_at)).toLocaleDateString('fr-FR')}.`, '/dashboard/paiements', 'finance'),
    ], 'subscription.activated', String(subscription.id), operation.financialOperationId, actorId ?? null);
  }
}
