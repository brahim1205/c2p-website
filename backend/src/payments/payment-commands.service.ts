import { BadRequestException, Injectable } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.store.js';
import { PrismaService } from '../database/prisma.service.js';
import { PlatformPersistenceService } from '../database/platform-persistence.service.js';
import { WalletService } from '../database/wallet.service.js';
import type { Row } from '../data/mock-store.js';
import { buildNotificationDispatchOutboxEvent } from '../notifications/notification-outbox.js';
import { createAppNotificationRow } from '../notifications/notification-payloads.js';
import {
  appendAppRows,
  collectRowsByIds,
  listAppRows,
  mergeRowsToPersist,
  patchAppRows,
  syncAppStoreFromDatabase,
  withId,
} from '../data/data-app-store.js';
import {
  applyEscrowUpdateSideEffects,
  applyPayoutRequestUpdateSideEffects,
  applySubscriptionMutationSideEffects,
  createWalletMutationHooks,
  ensureWalletAccount,
} from '../data/data-finance-runtime.js';
import { prepareInsert } from '../data/data-runtime.js';
import {
  sanitizePayoutAccountRecord,
  sanitizePayoutRequestRecord,
  sanitizeUserSubscriptionRecord,
} from '../data/data-finance-sanitizers.js';
import type {
  PayoutAccountCreateDto,
  PayoutRequestCreateDto,
  ProviderVisibilityPurchaseDto,
  SubscriptionActivateDto,
  WalletTopupDto,
  WalletWithdrawDto,
} from './dto/finance-commands.dto.js';
import {
  assertFinanceTransition,
  assertPositivePayoutInvariant,
  assertRefundAmountInvariant,
  mapLifecycleStatusToTransactionStatus,
  resolveProviderLifecycleState,
} from './finance-domain-guards.js';
import type { OutboxEventInput } from '../outbox/outbox.types.js';
import {
  issueProviderVisibilityPassForProduct,
  issueProviderVisibilityPass,
  syncProviderStateFromVisibilityProduct,
  syncProviderStateFromSubscription,
} from '../data/data-provider-visibility.js';
import {
  assertMonetizedRole,
  assertPrestataireRole,
  cloneValue,
  commandScopedId,
  createProviderVisibilityContext,
  getLatestSubscription,
  getWalletRow,
  trimPayoutMethod,
  trimSubscriptionStatus,
} from './payment-command-helpers.js';

@Injectable()
export class PaymentCommandsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly platformPersistenceService: PlatformPersistenceService,
    private readonly walletService: WalletService,
  ) {}

  async topupWallet(actor: AuthUser, payload: WalletTopupDto, requestId: string) {
    await syncAppStoreFromDatabase(this.prisma);
    const rowsToPersist: Record<string, Row[]> = {};
    const wallet = ensureWalletAccount(actor.id, rowsToPersist);
    const operation = await this.walletService.topupWallet({
      wallet,
      userId: actor.id,
      amount: payload.amount,
      method: payload.method ?? 'wallet',
      description: payload.description ?? 'Rechargement portefeuille C2P',
      idempotencyKey: `wallet_topup:${actor.id}:${requestId}`,
      actorId: actor.id,
      reason: 'wallet_topup_command',
      hooks: createWalletMutationHooks(rowsToPersist),
    });

    await this.platformPersistenceService.persistRows(rowsToPersist, {
      actorId: actor.id,
      reason: 'wallet_topup_command',
    });

    return {
      wallet: getWalletRow(actor.id),
      transaction: operation.transaction,
      financialOperationId: operation.financialOperationId,
    };
  }

  async withdrawWallet(actor: AuthUser, payload: WalletWithdrawDto, requestId: string) {
    await syncAppStoreFromDatabase(this.prisma);
    const rowsToPersist: Record<string, Row[]> = {};
    const wallet = ensureWalletAccount(actor.id, rowsToPersist);
    const operation = await this.walletService.withdrawWallet({
      wallet,
      userId: actor.id,
      amount: payload.amount,
      method: payload.method ?? 'wallet',
      description: payload.description ?? 'Retrait portefeuille C2P',
      idempotencyKey: `wallet_withdraw:${actor.id}:${requestId}`,
      actorId: actor.id,
      reason: 'wallet_withdraw_command',
      hooks: createWalletMutationHooks(rowsToPersist),
    });

    await this.platformPersistenceService.persistRows(rowsToPersist, {
      actorId: actor.id,
      reason: 'wallet_withdraw_command',
    });

    return {
      wallet: getWalletRow(actor.id),
      transaction: operation.transaction,
      financialOperationId: operation.financialOperationId,
    };
  }

  async createPayoutAccount(actor: AuthUser, payload: PayoutAccountCreateDto) {
    await syncAppStoreFromDatabase(this.prisma);
    const rowsToPersist: Record<string, Row[]> = {};
    const existingAccounts = listAppRows('payout_accounts').filter((row) => String(row.user_id) === String(actor.id));
    const shouldBeDefault = Boolean(payload.is_default) || existingAccounts.length === 0;

    if (shouldBeDefault) {
      const defaultIds = patchAppRows(
        'payout_accounts',
        (row) => String(row.user_id) === String(actor.id) && Boolean(row.is_default),
        { is_default: false },
      ).map((row) => String(row.id));
      mergeRowsToPersist(rowsToPersist, 'payout_accounts', collectRowsByIds('payout_accounts', defaultIds));
    }

    const sanitized = sanitizePayoutAccountRecord(withId(prepareInsert('payout_accounts', {
      user_id: actor.id,
      method: payload.method,
      account_name: payload.account_name,
      account_identifier: payload.account_identifier,
      label: payload.label,
      is_default: shouldBeDefault,
    })), actor);

    appendAppRows('payout_accounts', [sanitized]);
    mergeRowsToPersist(rowsToPersist, 'payout_accounts', collectRowsByIds('payout_accounts', [String(sanitized.id)]));

    await this.platformPersistenceService.persistRows(rowsToPersist, {
      actorId: actor.id,
      reason: 'payout_account_create_command',
    });

    return {
      account: listAppRows('payout_accounts').find((row) => String(row.id) === String(sanitized.id)) ?? sanitized,
    };
  }

  async setDefaultPayoutAccount(actor: AuthUser, accountId: string) {
    await syncAppStoreFromDatabase(this.prisma);
    const account = listAppRows('payout_accounts').find((row) => String(row.id) === String(accountId));
    if (!account || String(account.user_id) !== String(actor.id)) {
      throw new BadRequestException('Compte de retrait introuvable.');
    }

    const rowsToPersist: Record<string, Row[]> = {};
    const touched = new Set<string>();

    patchAppRows(
      'payout_accounts',
      (row) => String(row.user_id) === String(actor.id) && Boolean(row.is_default) && String(row.id) !== String(accountId),
      { is_default: false },
    ).forEach((row) => touched.add(String(row.id)));

    patchAppRows(
      'payout_accounts',
      (row) => String(row.id) === String(accountId),
      { is_default: true },
    ).forEach((row) => touched.add(String(row.id)));

    mergeRowsToPersist(rowsToPersist, 'payout_accounts', collectRowsByIds('payout_accounts', [...touched]));

    await this.platformPersistenceService.persistRows(rowsToPersist, {
      actorId: actor.id,
      reason: 'payout_account_default_command',
    });

    return {
      account: listAppRows('payout_accounts').find((row) => String(row.id) === String(accountId)) ?? account,
    };
  }

  async createPayoutRequest(actor: AuthUser, payload: PayoutRequestCreateDto, requestId: string) {
    assertMonetizedRole(actor);
    await syncAppStoreFromDatabase(this.prisma);
    const rowsToPersist: Record<string, Row[]> = {};
    const outboxEvents: OutboxEventInput[] = [];
    const requestScopedId = commandScopedId('payoutreq', actor.id, requestId);
    const existingRequest = listAppRows('payout_requests').find(
      (row) => String(row.id) === requestScopedId && String(row.user_id) === String(actor.id),
    );
    if (existingRequest) {
      return { request: existingRequest };
    }

    const sanitized = sanitizePayoutRequestRecord(withId(prepareInsert('payout_requests', {
      id: requestScopedId,
      user_id: actor.id,
      amount: payload.amount,
      account_id: payload.account_id,
      note: payload.note ?? '',
      status: 'pending',
      idempotency_key: `payout_request:${actor.id}:${requestId}`,
    })), actor);

    appendAppRows('payout_requests', [sanitized]);
    mergeRowsToPersist(rowsToPersist, 'payout_requests', collectRowsByIds('payout_requests', [String(sanitized.id)]));
    outboxEvents.push(buildNotificationDispatchOutboxEvent({
      eventType: 'payout.requested',
      aggregateId: String(sanitized.id),
      actorId: actor.id,
      idempotencyKey: `payout.requested:${String(sanitized.id)}`,
      notifications: [
        createAppNotificationRow({
          id: `notif-payout-${String(sanitized.id)}-user`,
          userId: actor.id,
          title: 'Demande de retrait reçue',
          message: 'C2P a bien enregistré votre demande de retrait.',
          type: 'finance',
          link: '/dashboard/paiements',
          metadata: {
            payout_request_id: sanitized.id,
          },
        }),
        createAppNotificationRow({
          id: `notif-payout-${String(sanitized.id)}-admin`,
          userId: 'usr-admin',
          title: 'Nouvelle demande de retrait',
          message: `${actor.firstName} ${actor.lastName}`.trim() + ' a demande un retrait.',
          type: 'finance',
          link: '/admin/payments',
          metadata: {
            payout_request_id: sanitized.id,
            requester_id: actor.id,
          },
        }),
      ],
      metadata: {
        payout_request_id: sanitized.id,
      },
    }));

    await this.platformPersistenceService.persistRows(rowsToPersist, {
      actorId: actor.id,
      reason: 'payout_request_create_command',
      outboxEvents,
    });

    return {
      request: listAppRows('payout_requests').find((row) => String(row.id) === String(sanitized.id)) ?? sanitized,
    };
  }

  private appendDirectPaymentTransaction(rowsToPersist: Record<string, Row[]>, input: {
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

  async activateSubscription(actor: AuthUser, payload: SubscriptionActivateDto, requestId: string) {
    assertMonetizedRole(actor);
    await syncAppStoreFromDatabase(this.prisma, { force: true });
    const rowsToPersist: Record<string, Row[]> = {};
    const outboxEvents: OutboxEventInput[] = [];
    const previous = getLatestSubscription(actor.id);

    const paymentMethod = payload.payment_method ?? 'wallet';
    const candidate = sanitizeUserSubscriptionRecord(withId(prepareInsert('user_subscriptions', {
      id: previous?.id,
      user_id: actor.id,
      plan_id: payload.plan_id,
      payment_method: paymentMethod,
      status: payload.trial ? 'trialing' : trimSubscriptionStatus(previous?.status),
      auto_renew: payload.trial ? false : (payload.auto_renew ?? true),
      renew_now: payload.renew_now ?? false,
      trial_days: payload.trial_days ?? 14,
    })), actor);

    if (previous) {
      patchAppRows(
        'user_subscriptions',
        (row) => String(row.id) === String(previous.id),
        candidate,
      );
    } else {
      appendAppRows('user_subscriptions', [candidate]);
    }

    mergeRowsToPersist(rowsToPersist, 'user_subscriptions', collectRowsByIds('user_subscriptions', [String(candidate.id)]));

    if (paymentMethod === 'wallet' || String(candidate.status) === 'trialing' || String(candidate.status) === 'cancelled') {
      await applySubscriptionMutationSideEffects(
        previous ? [cloneValue(previous)] : [],
        [cloneValue(candidate)],
        rowsToPersist,
        outboxEvents,
        this.walletService,
        actor.id,
      );
    } else {
      const operation = this.appendDirectPaymentTransaction(rowsToPersist, {
        actorId: actor.id,
        amount: Number(candidate.amount ?? 0),
        currency: String(candidate.currency ?? 'XAF'),
        method: paymentMethod,
        description: `Abonnement ${String(candidate.plan_name ?? 'C2P')}`,
        sourceId: String(candidate.id),
        operationKind: 'subscription_direct',
        requestId,
      });
      patchAppRows('user_subscriptions', (row) => String(row.id) === String(candidate.id), {
        financial_operation_id: operation.financialOperationId,
        payment_method: paymentMethod,
        updated_at: new Date().toISOString(),
      });
      mergeRowsToPersist(rowsToPersist, 'user_subscriptions', collectRowsByIds('user_subscriptions', [String(candidate.id)]));
    }

    const visibilityContext = createProviderVisibilityContext();
    syncProviderStateFromSubscription(candidate, rowsToPersist, visibilityContext);
    issueProviderVisibilityPass(previous, candidate, rowsToPersist, visibilityContext);

    await this.platformPersistenceService.persistRows(rowsToPersist, {
      actorId: actor.id,
      reason: 'subscription_activate_command',
      outboxEvents,
    });

    return {
      subscription: listAppRows('user_subscriptions').find((row) => String(row.id) === String(candidate.id)) ?? candidate,
    };
  }

  async purchaseProviderVisibility(actor: AuthUser, payload: ProviderVisibilityPurchaseDto, requestId: string) {
    assertPrestataireRole(actor);
    await syncAppStoreFromDatabase(this.prisma);

    const provider = listAppRows('providers').find((row) => String(row.user_id ?? '') === String(actor.id));
    if (!provider) {
      throw new BadRequestException('Profil prestataire introuvable.');
    }

    const subscription = getLatestSubscription(actor.id);
    if (!subscription || String(subscription.role ?? '') !== 'prestataire' || String(subscription.status ?? '') !== 'active') {
      throw new BadRequestException('Un abonnement SenPresta complet est requis avant d acheter un billet de visibilite.');
    }

    const product = listAppRows('provider_visibility_products').find(
      (row) =>
        String(row.id) === String(payload.product_id)
        && Boolean(row.active ?? true)
        && String(row.role ?? 'prestataire') === 'prestataire',
    );
    if (!product) {
      throw new BadRequestException('Billet SenPresta introuvable.');
    }

    const rowsToPersist: Record<string, Row[]> = {};
    const outboxEvents: OutboxEventInput[] = [];
    const paymentMethod = payload.payment_method ?? 'wallet';
    const wallet = paymentMethod === 'wallet' ? ensureWalletAccount(actor.id, rowsToPersist) : null;
    const purchasedAt = new Date().toISOString();
    const orderId = commandScopedId('visorder', actor.id, requestId);
    const existingOrder = listAppRows('provider_visibility_orders').find(
      (row) => String(row.id) === orderId && String(row.user_id) === String(actor.id),
    );
    if (existingOrder) {
      return {
        wallet: getWalletRow(actor.id),
        order: existingOrder,
        pass: listAppRows('provider_visibility_passes').find((row) => String(row.order_id ?? '') === orderId) ?? null,
        transaction: listAppRows('payment_transactions').find((row) => String(row.id) === String(existingOrder.transaction_id ?? '')) ?? null,
        financialOperationId: existingOrder.financial_operation_id ?? null,
      };
    }

    const charge = paymentMethod === 'wallet'
      ? await this.walletService.chargeProviderVisibility({
          wallet: wallet!,
          userId: actor.id,
          amount: Number(product.price ?? 0),
          productName: String(product.name ?? 'Billet SenPresta'),
          sourceId: orderId,
          productId: String(product.id),
          tier: String(product.tier ?? 'standard'),
          idempotencyKey: `provider_visibility:${actor.id}:${requestId}`,
          actorId: actor.id,
          reason: 'provider_visibility_purchase_command',
          hooks: createWalletMutationHooks(rowsToPersist),
        })
      : this.appendDirectPaymentTransaction(rowsToPersist, {
          actorId: actor.id,
          amount: Number(product.price ?? 0),
          currency: String(product.currency ?? 'XAF'),
          method: paymentMethod,
          description: `Billet SenPresta - ${String(product.name ?? 'Visibilite')}`,
          sourceId: orderId,
          operationKind: 'provider_visibility_direct',
          requestId,
        });

    const visibilityContext = createProviderVisibilityContext();
    syncProviderStateFromVisibilityProduct(actor.id, product, rowsToPersist, visibilityContext);

    const createdPass = issueProviderVisibilityPassForProduct({
      orderId,
      product,
      providerId: String(provider.id),
      userId: actor.id,
      purchasedAt,
    }, rowsToPersist, visibilityContext);
    if (!createdPass) {
      throw new BadRequestException('Impossible d emettre le billet SenPresta.');
    }

    const createdOrder = withId(prepareInsert('provider_visibility_orders', {
      id: orderId,
      provider_id: provider.id,
      user_id: actor.id,
      product_id: product.id,
      product_name: product.name,
      amount: Number(product.price ?? 0),
      currency: String(product.currency ?? 'XAF'),
      status: 'completed',
      purchased_at: purchasedAt,
      financial_operation_id: charge.financialOperationId,
      transaction_id: charge.transaction.id,
      pass_id: createdPass.id,
      pass_tier: createdPass.pass_tier,
      pass_label: createdPass.pass_label,
      pass_code: createdPass.code,
      payment_method: paymentMethod,
      expires_at: createdPass.expires_at,
      source_subscription_id: subscription.id,
    }));

    appendAppRows('provider_visibility_orders', [createdOrder]);
    mergeRowsToPersist(rowsToPersist, 'provider_visibility_orders', collectRowsByIds('provider_visibility_orders', [String(createdOrder.id)]));

    outboxEvents.push(buildNotificationDispatchOutboxEvent({
      eventType: 'communications.notification.dispatch',
      aggregateId: String(createdOrder.id),
      actorId: actor.id,
      financialOperationId: charge.financialOperationId,
      idempotencyKey: `communications.notification.dispatch:provider_visibility:${String(createdOrder.id)}`,
      notifications: [
        createAppNotificationRow({
          id: `notif-visibility-${String(createdOrder.id)}-user`,
          userId: actor.id,
          title: 'Billet SenPresta active',
          message: `${String(product.name ?? 'Votre billet SenPresta')} est actif. Code ${String(createdPass.code ?? '')}.`,
          type: 'finance',
          link: '/dashboard/paiements?view=wallet',
          metadata: {
            provider_visibility_order_id: createdOrder.id,
            provider_visibility_pass_id: createdPass.id,
            provider_visibility_product_id: product.id,
          },
        }),
        createAppNotificationRow({
          id: `notif-visibility-${String(createdOrder.id)}-admin`,
          userId: 'usr-admin',
          title: 'Nouveau billet SenPresta',
          message: `${actor.firstName} ${actor.lastName}`.trim() + ` a active ${String(product.name ?? 'un billet SenPresta')}.`,
          type: 'finance',
          link: '/admin/payments',
          metadata: {
            provider_visibility_order_id: createdOrder.id,
            provider_visibility_pass_id: createdPass.id,
            provider_visibility_product_id: product.id,
            provider_id: provider.id,
          },
        }),
      ],
      metadata: {
        provider_visibility_order_id: createdOrder.id,
        provider_visibility_pass_id: createdPass.id,
        provider_visibility_product_id: product.id,
      },
    }));

    await this.platformPersistenceService.persistRows(rowsToPersist, {
      actorId: actor.id,
      reason: 'provider_visibility_purchase_command',
      outboxEvents,
    });

    return {
      wallet: getWalletRow(actor.id),
      order: listAppRows('provider_visibility_orders').find((row) => String(row.id) === String(createdOrder.id)) ?? createdOrder,
      pass: listAppRows('provider_visibility_passes').find((row) => String(row.id) === String(createdPass.id)) ?? createdPass,
      transaction: charge.transaction,
      financialOperationId: charge.financialOperationId,
    };
  }

  async adminUpdateEscrowStatus(actor: AuthUser, escrowId: string, status: 'released' | 'refunded') {
    await syncAppStoreFromDatabase(this.prisma);
    const current = listAppRows('escrow_cases').find((row) => String(row.id) === String(escrowId));
    if (!current) {
      throw new BadRequestException('Séquestre introuvable.');
    }
    assertFinanceTransition('escrow', current.status, status);

    const previous = cloneValue(current);
    patchAppRows('escrow_cases', (row) => String(row.id) === String(escrowId), {
      status,
      updated_at: new Date().toISOString(),
    });
    const updated = listAppRows('escrow_cases').find((row) => String(row.id) === String(escrowId));
    if (!updated) {
      throw new BadRequestException('Séquestre introuvable.');
    }

    const rowsToPersist: Record<string, Row[]> = {
      escrow_cases: [cloneValue(updated)],
    };
    const outboxEvents: OutboxEventInput[] = [];
    await applyEscrowUpdateSideEffects([previous], [updated], rowsToPersist, outboxEvents, this.walletService, actor.id);
    await this.platformPersistenceService.persistRows(rowsToPersist, {
      actorId: actor.id,
      reason: `admin_escrow_${status}_command`,
      beforeRowsByTable: { escrow_cases: [previous] },
      afterRowsByTable: rowsToPersist,
      outboxEvents,
    });

    return {
      escrow: listAppRows('escrow_cases').find((row) => String(row.id) === String(escrowId)) ?? updated,
    };
  }

  async adminUpdatePayoutStatus(actor: AuthUser, requestId: string, status: 'approved' | 'paid' | 'rejected') {
    await syncAppStoreFromDatabase(this.prisma);
    const current = listAppRows('payout_requests').find((row) => String(row.id) === String(requestId));
    if (!current) {
      throw new BadRequestException('Demande de retrait introuvable.');
    }
    assertPositivePayoutInvariant({
      amount: Number(current.amount ?? 0),
      currentStatus: String(current.status ?? ''),
      targetStatus: status,
    });

    const previous = cloneValue(current);
    patchAppRows('payout_requests', (row) => String(row.id) === String(requestId), {
      status,
      updated_at: new Date().toISOString(),
    });
    const updated = listAppRows('payout_requests').find((row) => String(row.id) === String(requestId));
    if (!updated) {
      throw new BadRequestException('Demande de retrait introuvable.');
    }

    const rowsToPersist: Record<string, Row[]> = {
      payout_requests: [cloneValue(updated)],
    };
    const outboxEvents: OutboxEventInput[] = [];
    await applyPayoutRequestUpdateSideEffects([previous], [updated], rowsToPersist, outboxEvents, this.walletService, actor.id);
    await this.platformPersistenceService.persistRows(rowsToPersist, {
      actorId: actor.id,
      reason: `admin_payout_${status}_command`,
      beforeRowsByTable: { payout_requests: [previous] },
      afterRowsByTable: rowsToPersist,
      outboxEvents,
    });

    return {
      request: listAppRows('payout_requests').find((row) => String(row.id) === String(requestId)) ?? updated,
    };
  }

  async adminUpdateTransactionStatus(actor: AuthUser, transactionId: string, status: 'completed' | 'pending' | 'failed') {
    await syncAppStoreFromDatabase(this.prisma);
    const current = listAppRows('payment_transactions').find((row) => String(row.id) === String(transactionId));
    if (!current) {
      throw new BadRequestException('Transaction introuvable.');
    }
    const currentLifecycle = resolveProviderLifecycleState({
      type: String(current.type ?? ''),
      status: String(current.status ?? ''),
      providerStatus: String(current.provider_status ?? ''),
      settledToWallet: Boolean(current.settled_to_wallet),
    });
    const targetLifecycle = resolveProviderLifecycleState({
      type: String(current.type ?? ''),
      status,
      providerStatus: String(current.provider_status ?? ''),
      settledToWallet: Boolean(current.settled_to_wallet) && status === 'completed',
    });
    assertFinanceTransition('transaction', currentLifecycle, targetLifecycle);

    const previous = cloneValue(current);
    patchAppRows('payment_transactions', (row) => String(row.id) === String(transactionId), {
      status: mapLifecycleStatusToTransactionStatus(targetLifecycle),
      updated_at: new Date().toISOString(),
    });
    const updated = listAppRows('payment_transactions').find((row) => String(row.id) === String(transactionId));
    if (!updated) {
      throw new BadRequestException('Transaction introuvable.');
    }

    const rowsToPersist: Record<string, Row[]> = {
      payment_transactions: [cloneValue(updated)],
    };
    await this.platformPersistenceService.persistRows(rowsToPersist, {
      actorId: actor.id,
      reason: `admin_transaction_${status}_command`,
      beforeRowsByTable: { payment_transactions: [previous] },
      afterRowsByTable: rowsToPersist,
    });

    return {
      transaction: listAppRows('payment_transactions').find((row) => String(row.id) === String(transactionId)) ?? updated,
    };
  }

  async adminRefundTransaction(actor: AuthUser, transactionId: string, requestId: string) {
    await syncAppStoreFromDatabase(this.prisma);
    const refundIdempotencyKey = `admin_refund:${String(transactionId)}:${requestId}`;
    const original = listAppRows('payment_transactions').find((row) => String(row.id) === String(transactionId));
    if (!original) {
      throw new BadRequestException('Transaction introuvable.');
    }
    if (String(original.type) === 'refund') {
      throw new BadRequestException('Cette transaction est déjà un remboursement.');
    }
    const completedRefundOperation = this.prisma.isConnected
      ? await this.prisma.financialOperation.findUnique({ where: { idempotencyKey: refundIdempotencyKey } })
      : null;
    const existingRefund = listAppRows('payment_transactions').find((row) => (
      String(row.type) === 'refund'
      && String((row.metadata as Record<string, unknown> | undefined)?.refund_for_transaction_id ?? '') === String(transactionId)
    ));
    if (existingRefund) {
      const existingRefundFinancialOperationId = String(
        existingRefund.financial_operation_id
        ?? (existingRefund.metadata as Record<string, unknown> | undefined)?.financial_operation_id
        ?? '',
      );
      if (
        completedRefundOperation?.status === 'completed'
        && existingRefundFinancialOperationId === completedRefundOperation.id
      ) {
        return {
          wallet: getWalletRow(String(original.user_id)),
          transaction: existingRefund,
          financialOperationId: completedRefundOperation.id,
        };
      }
      throw new BadRequestException('Un remboursement existe déjà pour cette transaction.');
    }
    assertRefundAmountInvariant({
      requestedAmount: Number(original.amount ?? 0),
      settledAmount: Number(original.amount ?? 0),
      alreadyRefundedAmount: 0,
    });

    const rowsToPersist: Record<string, Row[]> = {};
    const outboxEvents: OutboxEventInput[] = [];
    const wallet = ensureWalletAccount(String(original.user_id), rowsToPersist);
    const operation = await this.walletService.topupWallet({
      wallet,
      userId: String(original.user_id),
      amount: Number(original.amount ?? 0),
      method: trimPayoutMethod(original.method),
      type: 'refund',
      description: `Remboursement de ${String(original.id)}`,
      metadata: {
        refund_for_transaction_id: String(original.id),
        original_transaction_type: String(original.type ?? ''),
      },
      idempotencyKey: refundIdempotencyKey,
      actorId: actor.id,
      reason: 'admin_refund_transaction',
      hooks: createWalletMutationHooks(rowsToPersist),
    });

    outboxEvents.push(buildNotificationDispatchOutboxEvent({
      eventType: 'payment.refunded',
      aggregateId: String(original.id),
      actorId: actor.id,
      idempotencyKey: `payment.refunded:${String(original.id)}`,
      financialOperationId: operation.financialOperationId,
      notifications: [
        createAppNotificationRow({
          id: `notif-refund-${String(original.id)}-${Date.now()}`,
          userId: String(original.user_id),
          title: 'Remboursement effectué',
          message: 'C2P a crédité votre wallet suite à un remboursement.',
          type: 'finance',
          link: '/dashboard/paiements',
          metadata: {
            transaction_id: original.id,
            refund_transaction_id: operation.transaction.id,
          },
        }),
      ],
      metadata: {
        transaction_id: original.id,
        refund_transaction_id: operation.transaction.id,
      },
    }));

    await this.platformPersistenceService.persistRows(rowsToPersist, {
      actorId: actor.id,
      reason: 'admin_refund_transaction_command',
      outboxEvents,
    });

    return {
      wallet: getWalletRow(String(original.user_id)),
      transaction: operation.transaction,
      financialOperationId: operation.financialOperationId,
    };
  }
}
