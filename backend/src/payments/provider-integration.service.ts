import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { ConfigService } from '../config/config.service.js';
import { AuditLogService } from '../database/audit-log.service.js';
import { PlatformPersistenceService } from '../database/platform-persistence.service.js';
import { PrismaService } from '../database/prisma.service.js';
import {
  appendAppRows,
  collectRowsByIds,
  ensureWalletAccount,
  listAppRows,
  mergeRowsToPersist,
  patchAppRows,
  syncAppStoreFromDatabase,
} from '../data/data.controller.js';
import type { Row } from '../data/mock-store.js';
import type { DexPayOrder } from './dexpay.service.js';
import type { DexPayReconcileDto, DexPayWebhookDto } from './dto/dexpay.dto.js';
import {
  mapLifecycleStatusToTransactionStatus,
  normalizePaymentIntentState,
  resolveMonotonicFinanceTransition,
  resolveProviderLifecycleState,
} from './finance-domain-guards.js';
import { ProviderRegistryService } from './provider-registry.service.js';

type SyncSource = 'user_sync' | 'webhook' | 'reconciliation' | 'operator_reprocess' | 'operator_force_sync';

@Injectable()
export class ProviderIntegrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly providerRegistry: ProviderRegistryService,
    private readonly platformPersistenceService: PlatformPersistenceService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private getDexPay() {
    return this.providerRegistry.getDexPay();
  }

  private assertDexPayConfigured(action: string) {
    if (!this.getDexPay().isConfigured()) {
      throw new ServiceUnavailableException(`Integration DexPay indisponible pour ${action}.`);
    }
  }

  async syncDexPayProviderArtifacts(input: {
    actorId: string;
    providerReference: string;
    transactionId: string;
    direction: string;
    amount: number;
    currency: string;
    status: string;
    asset?: string;
    chain?: string;
    quote?: unknown;
    order: unknown;
    settledToWallet?: boolean;
  }) {
    if (!this.prisma.isConnected) {
      return;
    }

    const now = new Date();
    const intentId = `pi-dexpay-${input.providerReference}`;
    const normalizedDirection = input.direction === 'offramp' ? 'wallet_withdraw' : 'wallet_topup';
    const metadata = this.toJson({
      asset: input.asset ?? null,
      chain: input.chain ?? null,
      direction: input.direction,
      quote: input.quote ?? null,
      order: input.order,
    });
    const rawPayload = this.toJson({ order: input.order, quote: input.quote ?? null });
    const [currentPaymentIntent, currentProviderTransaction] = await Promise.all([
      this.prisma.paymentIntent.findUnique({ where: { id: intentId } }),
      this.prisma.providerTransaction.findUnique({
        where: {
          provider_providerReference: {
            provider: 'dexpay',
            providerReference: input.providerReference,
          },
        },
      }),
    ]);
    const currentProviderMetadata = this.readRecord(currentProviderTransaction?.metadata) ?? {};
    const effectiveSettledToWallet = Boolean(currentProviderMetadata.settled_to_wallet) || Boolean(input.settledToWallet);
    const nextIntentState = normalizePaymentIntentState(input.status);
    const nextProviderLifecycle = resolveProviderLifecycleState({
      status: input.status,
      providerStatus: input.status,
      settledToWallet: effectiveSettledToWallet,
    });
    const intentResolution = resolveMonotonicFinanceTransition(
      'payment_intent',
      currentPaymentIntent?.status,
      nextIntentState,
    );
    const providerResolution = resolveMonotonicFinanceTransition(
      'provider_transaction',
      currentProviderTransaction
        ? resolveProviderLifecycleState({
          status: currentProviderTransaction.providerStatus,
          providerStatus: currentProviderTransaction.providerStatus,
          settledToWallet: Boolean(currentProviderMetadata.settled_to_wallet),
        })
        : '',
      nextProviderLifecycle,
    );
    const paymentIntentStatus = intentResolution.nextState;
    const providerTransactionStatus = providerResolution.nextState;
    const providerMetadata = this.toJson({
      asset: input.asset ?? null,
      chain: input.chain ?? null,
      settled_to_wallet: effectiveSettledToWallet,
      lifecycle_state: providerResolution.nextState,
      transition_decision: providerResolution.decision,
      attempted_lifecycle_state: nextProviderLifecycle,
    });
    const paymentIntentMetadata = this.toJson({
      asset: input.asset ?? null,
      chain: input.chain ?? null,
      direction: input.direction,
      quote: input.quote ?? null,
      order: input.order,
      lifecycle_state: intentResolution.nextState,
      transition_decision: intentResolution.decision,
      attempted_lifecycle_state: nextIntentState,
      settled_to_wallet: effectiveSettledToWallet,
    });

    await this.prisma.paymentIntent.upsert({
      where: { id: intentId },
      update: {
        actorId: input.actorId,
        userId: input.actorId,
        provider: 'dexpay',
        providerIntentRef: input.providerReference,
        contextType: normalizedDirection,
        contextId: input.transactionId,
        amount: input.amount,
        currency: input.currency,
        status: paymentIntentStatus,
        confirmedAt: paymentIntentStatus === 'confirmed' ? currentPaymentIntent?.confirmedAt ?? now : null,
        cancelledAt: ['failed', 'cancelled', 'expired'].includes(paymentIntentStatus) ? currentPaymentIntent?.cancelledAt ?? now : null,
        metadata: paymentIntentMetadata,
      },
      create: {
        id: intentId,
        actorId: input.actorId,
        userId: input.actorId,
        provider: 'dexpay',
        providerIntentRef: input.providerReference,
        contextType: normalizedDirection,
        contextId: input.transactionId,
        amount: input.amount,
        currency: input.currency,
        status: paymentIntentStatus,
        confirmedAt: paymentIntentStatus === 'confirmed' ? now : undefined,
        cancelledAt: ['failed', 'cancelled', 'expired'].includes(paymentIntentStatus) ? now : undefined,
        metadata: paymentIntentMetadata,
      },
    });

    await this.prisma.providerTransaction.upsert({
      where: {
        provider_providerReference: {
          provider: 'dexpay',
          providerReference: input.providerReference,
        },
      },
      update: {
        paymentIntentId: intentId,
        providerStatus: providerTransactionStatus,
        direction: input.direction,
        amount: input.amount,
        currency: input.currency,
        confirmedAt: ['confirmed', 'reconciled'].includes(providerResolution.nextState) ? currentProviderTransaction?.confirmedAt ?? now : null,
        failedAt: providerResolution.nextState === 'failed' ? currentProviderTransaction?.failedAt ?? now : null,
        rawPayload,
        metadata: providerMetadata,
      },
      create: {
        id: `ptx-dexpay-${input.providerReference}`,
        paymentIntentId: intentId,
        provider: 'dexpay',
        providerReference: input.providerReference,
        providerStatus: providerTransactionStatus,
        direction: input.direction,
        amount: input.amount,
        currency: input.currency,
        confirmedAt: ['confirmed', 'reconciled'].includes(providerResolution.nextState) ? now : undefined,
        failedAt: providerResolution.nextState === 'failed' ? now : undefined,
        rawPayload,
        metadata: providerMetadata,
      },
    });

    if (['confirmed', 'reconciled'].includes(providerResolution.nextState)) {
      await this.prisma.settlementRecord.upsert({
        where: {
          id: `sett-dexpay-${input.providerReference}`,
        },
        update: {
          provider: 'dexpay',
          providerSettlementRef: input.providerReference,
          status: 'settled',
          amount: input.amount,
          currency: input.currency,
          settledAt: now,
          metadata,
        },
        create: {
          id: `sett-dexpay-${input.providerReference}`,
          provider: 'dexpay',
          providerSettlementRef: input.providerReference,
          status: 'settled',
          amount: input.amount,
          currency: input.currency,
          settledAt: now,
          metadata,
        },
      });
    }
  }

  async recordDexPayCheckout(input: {
    actorId: string;
    direction: string;
    asset?: string;
    chain?: string;
    fiatAmount?: number;
    quote: DexPayOrder;
    order: DexPayOrder;
  }) {
    await syncAppStoreFromDatabase(this.prisma);
    const transaction = {
      id: `trx-dxp-${Date.now()}`,
      user_id: input.actorId,
      type: input.direction === 'onramp' ? 'deposit' : 'withdrawal',
      amount: Number(input.order.fiatAmount ?? input.quote.fiatAmount ?? input.fiatAmount ?? 0),
      currency: 'XAF',
      method: 'dexpay',
      status: this.mapStatus(input.order.status),
      description: input.direction === 'onramp'
        ? `DexPay on-ramp ${input.asset}/${input.chain}`
        : `DexPay off-ramp ${input.asset}/${input.chain}`,
      date: input.order.createdAt ?? new Date().toISOString(),
      reference: input.order.id,
      provider: 'dexpay',
      provider_quote_id: input.quote.id,
      provider_order_id: input.order.id,
      provider_status: input.order.status ?? 'PENDING',
      payment_account: input.order.paymentAccount ?? null,
      deposit_address: input.order.address ?? null,
      asset: input.asset,
      chain: input.chain,
      direction: input.direction,
      settled_to_wallet: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies Row;

    appendAppRows('payment_transactions', [transaction]);
    const rowsToPersist: Record<string, Row[]> = {};
    mergeRowsToPersist(rowsToPersist, 'payment_transactions', collectRowsByIds('payment_transactions', [String(transaction.id)]));
    await this.platformPersistenceService.persistRows(rowsToPersist, {
      actorId: input.actorId,
      reason: 'dexpay_checkout_create',
    });

    await this.syncDexPayProviderArtifacts({
      actorId: input.actorId,
      providerReference: input.order.id,
      transactionId: String(transaction.id),
      direction: input.direction,
      amount: Number(transaction.amount ?? 0),
      currency: 'XAF',
      status: this.mapStatus(input.order.status),
      asset: input.asset,
      chain: input.chain,
      quote: input.quote,
      order: input.order,
      settledToWallet: false,
    });

    return transaction;
  }

  async syncDexPayOrderForActor(input: {
    actorId: string;
    providerReference: string;
    transactionId?: string;
    source: SyncSource;
    requestId: string;
    order?: DexPayOrder;
    allowMissingTransaction?: boolean;
  }) {
    this.assertDexPayConfigured('la synchronisation provider');
    await syncAppStoreFromDatabase(this.prisma);
    const order = input.order ?? await this.getDexPay().getOrder(input.providerReference);
    const status = this.mapStatus(order.status);
    const matchingTransaction = listAppRows('payment_transactions').find((row) => (
      String(row.provider_order_id ?? row.reference) === input.providerReference
      && (!input.transactionId || String(row.id) === input.transactionId)
      && (input.source !== 'user_sync' || String(row.user_id) === input.actorId)
    ));

    if (!matchingTransaction && !input.allowMissingTransaction) {
      throw new UnauthorizedException('Transaction DexPay introuvable.');
    }

    let currentTransaction = matchingTransaction ?? null;
    const rowsToPersist: Record<string, Row[]> = {};
    let walletSettled = false;

    if (matchingTransaction) {
      const currentLifecycle = resolveProviderLifecycleState({
        type: this.readString(matchingTransaction.type),
        status: this.readString(matchingTransaction.status),
        providerStatus: this.readString(matchingTransaction.provider_status),
        settledToWallet: Boolean(matchingTransaction.settled_to_wallet),
      });
      const attemptedLifecycle = resolveProviderLifecycleState({
        type: this.readString(matchingTransaction.type),
        status,
        providerStatus: order.status ?? status,
        settledToWallet: Boolean(matchingTransaction.settled_to_wallet),
      });
      const lifecycleResolution = resolveMonotonicFinanceTransition(
        'transaction',
        currentLifecycle,
        attemptedLifecycle,
      );
      const nextStoredStatus = lifecycleResolution.changed
        ? mapLifecycleStatusToTransactionStatus(lifecycleResolution.nextState)
        : String(matchingTransaction.status ?? status);
      const touched = patchAppRows(
        'payment_transactions',
        (row) => String(row.id) === String(matchingTransaction.id),
        (row) => ({
          ...row,
          status: nextStoredStatus,
          provider_status: order.status ?? row.provider_status,
          payment_account: order.paymentAccount ?? row.payment_account ?? null,
          deposit_address: order.address ?? row.deposit_address ?? null,
          sync_transition_decision: lifecycleResolution.decision,
          updated_at: new Date().toISOString(),
        }),
      );
      mergeRowsToPersist(rowsToPersist, 'payment_transactions', collectRowsByIds('payment_transactions', touched.map((row) => String(row.id))));

      const updatedTransaction = listAppRows('payment_transactions').find((row) => String(row.id) === String(matchingTransaction.id))
        ?? matchingTransaction;

      if (
        lifecycleResolution.nextState === 'confirmed'
        && String(updatedTransaction.type) === 'deposit'
        && !Boolean(updatedTransaction.settled_to_wallet)
      ) {
        const wallet = ensureWalletAccount(String(updatedTransaction.user_id), rowsToPersist);
        const currentBalance = Number(wallet.balance ?? 0);
        patchAppRows('wallet_accounts', (row) => String(row.id) === String(wallet.id), {
          balance: currentBalance + Number(updatedTransaction.amount ?? 0),
          available_balance: Number(wallet.available_balance ?? currentBalance) + Number(updatedTransaction.amount ?? 0),
          updated_at: new Date().toISOString(),
        });
        mergeRowsToPersist(rowsToPersist, 'wallet_accounts', collectRowsByIds('wallet_accounts', [String(wallet.id)]));
        patchAppRows('payment_transactions', (row) => String(row.id) === String(updatedTransaction.id), {
          settled_to_wallet: true,
          settled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        mergeRowsToPersist(rowsToPersist, 'payment_transactions', collectRowsByIds('payment_transactions', [String(updatedTransaction.id)]));
        walletSettled = true;
      }

      currentTransaction = listAppRows('payment_transactions').find((row) => String(row.id) === String(matchingTransaction.id))
        ?? matchingTransaction;
    }

    if (Object.keys(rowsToPersist).length > 0) {
      await this.platformPersistenceService.persistRows(rowsToPersist, {
        actorId: input.actorId,
        reason: `dexpay_${input.source}_sync`,
      });
    }

    await this.syncDexPayProviderArtifacts({
      actorId: currentTransaction ? String(currentTransaction.user_id ?? input.actorId) : input.actorId,
      providerReference: order.id,
      transactionId: String(currentTransaction?.id ?? input.transactionId ?? `ext-${order.id}`),
      direction: String(currentTransaction?.direction ?? 'onramp'),
      amount: Number(currentTransaction?.amount ?? order.fiatAmount ?? 0),
      currency: String(currentTransaction?.currency ?? 'XAF'),
      status,
      asset: this.readString(currentTransaction?.asset) ?? undefined,
      chain: this.readString(currentTransaction?.chain) ?? undefined,
      order,
      settledToWallet: Boolean(currentTransaction?.settled_to_wallet ?? walletSettled),
    });

    await this.auditLogService.record({
      scope: 'payments',
      action: `dexpay_${input.source}_sync`,
      userId: input.actorId,
      targetType: 'provider_transaction',
      targetId: order.id,
      status: 'success',
      metadata: {
        source: input.source,
        provider: 'dexpay',
        providerReference: order.id,
        providerStatus: order.status ?? null,
        mappedStatus: status,
        transactionId: currentTransaction?.id ?? input.transactionId ?? null,
        walletSettled,
      },
    });

    return {
      order,
      transaction: currentTransaction,
      matched: Boolean(currentTransaction),
      walletSettled,
      status,
    };
  }

  async receiveDexPayWebhook(input: {
    payload: DexPayWebhookDto;
    rawBody?: Buffer;
    signature?: string | undefined;
    headers?: Record<string, string | string[] | undefined>;
    requestId: string;
    ip?: string | undefined;
    userAgent?: string | undefined;
  }) {
    const providerEventId = this.extractProviderEventId(input.payload);
    const providerReference = this.extractProviderReference(input.payload);
    const providerStatus = this.extractProviderStatus(input.payload);
    const idempotencyKey = `dexpay:webhook:${providerEventId ?? providerReference}:${providerStatus ?? 'unknown'}`;
    const existingReceipt = await this.prisma.webhookReceipt.findFirst({
      where: {
        provider: 'dexpay',
        OR: [
          providerEventId ? { providerEventId } : undefined,
          { idempotencyKey },
        ].filter(Boolean) as Prisma.WebhookReceiptWhereInput[],
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingReceipt?.status === 'processed') {
      return {
        accepted: true,
        duplicate: true,
        receiptId: existingReceipt.id,
      };
    }

    const receiptId = existingReceipt?.id ?? `whr-dexpay-${providerEventId ?? providerReference}-${Date.now()}`;
    await this.upsertWebhookReceipt(receiptId, {
      provider: 'dexpay',
      providerEventId,
      eventType: this.readString(input.payload.type ?? input.payload.eventType) ?? 'provider.webhook.received',
      status: 'received',
      idempotencyKey,
      correlationId: input.requestId,
      rawPayload: input.payload,
      metadata: {
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      },
    });

    const resolvedSignature = input.signature
      || this.readHeader(input.headers, this.config.dexPayWebhookSignatureHeader)
      || this.readHeader(input.headers, 'x-dexpay-signature');
    const verification = this.getDexPay().verifyWebhookSignature(input.rawBody, resolvedSignature);
    if (!verification.valid) {
      await this.upsertWebhookReceipt(receiptId, {
        provider: 'dexpay',
        providerEventId,
        eventType: this.readString(input.payload.type ?? input.payload.eventType) ?? 'provider.webhook.received',
        status: 'rejected',
        idempotencyKey,
        correlationId: input.requestId,
        rawPayload: input.payload,
        metadata: {
          verification: verification.reason,
          ip: input.ip ?? null,
          userAgent: input.userAgent ?? null,
        },
        error: verification.reason,
      });
      throw new UnauthorizedException('Signature webhook DexPay invalide.');
    }

    if (!providerReference) {
      await this.upsertWebhookReceipt(receiptId, {
        provider: 'dexpay',
        providerEventId,
        eventType: this.readString(input.payload.type ?? input.payload.eventType) ?? 'provider.webhook.received',
        status: 'failed',
        idempotencyKey,
        correlationId: input.requestId,
        rawPayload: input.payload,
        metadata: {
          verification: verification.reason,
        },
        error: 'provider_reference_missing',
      });
      throw new BadRequestException('Reference provider absente.');
    }

    try {
      const result = await this.syncDexPayOrderForActor({
        actorId: 'system:dexpay',
        providerReference,
        source: 'webhook',
        requestId: input.requestId,
        allowMissingTransaction: true,
      });

      await this.upsertWebhookReceipt(receiptId, {
        provider: 'dexpay',
        providerEventId,
        eventType: this.readString(input.payload.type ?? input.payload.eventType) ?? 'provider.webhook.received',
        status: 'processed',
        idempotencyKey,
        correlationId: input.requestId,
        rawPayload: input.payload,
        processedAt: new Date(),
        metadata: {
          verification: verification.reason,
          providerReference,
          matched: result.matched,
          walletSettled: result.walletSettled,
          transactionId: result.transaction?.id ?? null,
        },
      });

      return {
        accepted: true,
        duplicate: false,
        receiptId,
        providerReference,
        matched: result.matched,
      };
    } catch (error) {
      await this.upsertWebhookReceipt(receiptId, {
        provider: 'dexpay',
        providerEventId,
        eventType: this.readString(input.payload.type ?? input.payload.eventType) ?? 'provider.webhook.received',
        status: 'failed',
        idempotencyKey,
        correlationId: input.requestId,
        rawPayload: input.payload,
        processedAt: new Date(),
        metadata: {
          providerReference,
          verification: verification.reason,
        },
        error: error instanceof Error ? error.message : 'webhook_processing_failed',
      });
      throw error;
    }
  }

  async runDexPayReconciliation(actorId: string, payload: DexPayReconcileDto) {
    this.assertDexPayConfigured('la reconciliation live');
    const jobId = `rec-dexpay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const startedAt = new Date();
    await this.prisma.reconciliationJob.create({
      data: {
        id: jobId,
        provider: 'dexpay',
        scope: payload.providerReference ? 'single_reference' : (payload.onlyPending ? 'pending_only' : 'broad_scan'),
        status: 'running',
        startedAt,
        windowStart: new Date(startedAt.getTime() - 7 * 24 * 60 * 60 * 1000),
        windowEnd: startedAt,
        metadata: this.toJson({
          limit: payload.limit,
          onlyPending: payload.onlyPending,
          providerReference: payload.providerReference ?? null,
        }),
      },
    });

    try {
      if (payload.providerReference) {
        const result = await this.syncDexPayOrderForActor({
          actorId,
          providerReference: payload.providerReference,
          source: 'reconciliation',
          requestId: `${jobId}:${payload.providerReference}`,
          allowMissingTransaction: true,
        });

        const summary = {
          scanned: 1,
          updated: result.matched ? 1 : 0,
          unchanged: 0,
          unmatched: result.matched ? 0 : 1,
          failed: 0,
        };

        await this.prisma.reconciliationJob.update({
          where: { id: jobId },
          data: {
            status: 'completed',
            completedAt: new Date(),
            summary: this.toJson(summary),
          },
        });

        return {
          jobId,
          summary,
        };
      }

      const candidates = await this.prisma.providerTransaction.findMany({
            where: {
              provider: 'dexpay',
              ...(payload.onlyPending ? { providerStatus: { in: ['initiated', 'pending_provider', 'processing'] } } : {}),
            },
            orderBy: [{ updatedAt: 'asc' }],
            take: payload.limit,
          });

      const summary = {
        scanned: candidates.length,
        updated: 0,
        unchanged: 0,
        unmatched: 0,
        failed: 0,
      };

      for (const candidate of candidates) {
        try {
          const beforeStatus = String(candidate.providerStatus ?? '');
          const result = await this.syncDexPayOrderForActor({
            actorId,
            providerReference: candidate.providerReference,
            source: 'reconciliation',
            requestId: `${jobId}:${candidate.providerReference}`,
            allowMissingTransaction: true,
          });
          if (!result.matched) {
            summary.unmatched += 1;
          } else if (result.status !== beforeStatus) {
            summary.updated += 1;
          } else {
            summary.unchanged += 1;
          }
        } catch {
          summary.failed += 1;
        }
      }

      await this.prisma.reconciliationJob.update({
        where: { id: jobId },
        data: {
          status: summary.failed > 0 ? 'completed_with_errors' : 'completed',
          completedAt: new Date(),
          summary: this.toJson(summary),
        },
      });

      return {
        jobId,
        summary,
      };
    } catch (error) {
      await this.prisma.reconciliationJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          completedAt: new Date(),
          error: error instanceof Error ? error.message : 'reconciliation_failed',
        },
      });
      throw error;
    }
  }

  async reprocessDexPayWebhookReceipt(input: {
    actorId: string;
    receiptId: string;
    requestId: string;
    reason?: string | null;
  }) {
    const receipt = await this.prisma.webhookReceipt.findUnique({
      where: { id: input.receiptId },
    });
    if (!receipt || receipt.provider !== 'dexpay') {
      throw new NotFoundException('Webhook receipt DexPay introuvable.');
    }

    const rawPayload = this.readRecord(receipt.rawPayload) as DexPayWebhookDto | null;
    const providerReference = this.extractProviderReference(rawPayload ?? {})
      ?? this.readString(this.readRecord(receipt.metadata)?.providerReference);
    if (!providerReference) {
      throw new BadRequestException('Reference provider absente sur ce webhook receipt.');
    }

    try {
      const result = await this.syncDexPayOrderForActor({
        actorId: input.actorId,
        providerReference,
        source: 'operator_reprocess',
        requestId: input.requestId,
        allowMissingTransaction: true,
      });

      await this.upsertWebhookReceipt(receipt.id, {
        provider: 'dexpay',
        providerEventId: receipt.providerEventId,
        eventType: receipt.eventType,
        status: 'processed',
        idempotencyKey: receipt.idempotencyKey,
        correlationId: input.requestId,
        rawPayload: receipt.rawPayload,
        processedAt: new Date(),
        metadata: {
          ...(this.readRecord(receipt.metadata) ?? {}),
          operatorAction: 'reprocess',
          operatorReason: input.reason ?? 'manual_reprocess',
          operatorActorId: input.actorId,
          providerReference,
          matched: result.matched,
          walletSettled: result.walletSettled,
          transactionId: result.transaction?.id ?? null,
        },
      });

      await this.auditLogService.record({
        scope: 'payments',
        action: 'dexpay_webhook_reprocess',
        userId: input.actorId,
        targetType: 'webhook_receipt',
        targetId: receipt.id,
        status: 'success',
        correlationId: input.requestId,
        reason: input.reason ?? 'manual_reprocess',
        metadata: {
          provider: 'dexpay',
          providerReference,
          providerEventId: receipt.providerEventId,
        },
      });

      return {
        receiptId: receipt.id,
        providerReference,
        matched: result.matched,
        status: result.status,
      };
    } catch (error) {
      await this.upsertWebhookReceipt(receipt.id, {
        provider: 'dexpay',
        providerEventId: receipt.providerEventId,
        eventType: receipt.eventType,
        status: 'failed',
        idempotencyKey: receipt.idempotencyKey,
        correlationId: input.requestId,
        rawPayload: receipt.rawPayload,
        processedAt: new Date(),
        metadata: {
          ...(this.readRecord(receipt.metadata) ?? {}),
          operatorAction: 'reprocess',
          operatorReason: input.reason ?? 'manual_reprocess',
          operatorActorId: input.actorId,
          providerReference,
        },
        error: error instanceof Error ? error.message : 'reprocess_failed',
      });
      throw error;
    }
  }

  async forceSyncDexPayProviderTransaction(input: {
    actorId: string;
    providerReference: string;
    requestId: string;
    reason?: string | null;
  }) {
    const providerTransaction = await this.prisma.providerTransaction.findUnique({
      where: {
        provider_providerReference: {
          provider: 'dexpay',
          providerReference: input.providerReference,
        },
      },
    });
    if (!providerTransaction) {
      throw new NotFoundException('Transaction provider DexPay introuvable.');
    }

    const result = await this.syncDexPayOrderForActor({
      actorId: input.actorId,
      providerReference: input.providerReference,
      source: 'operator_force_sync',
      requestId: input.requestId,
      allowMissingTransaction: true,
    });

    await this.auditLogService.record({
      scope: 'payments',
      action: 'dexpay_provider_force_sync',
      userId: input.actorId,
      targetType: 'provider_transaction',
      targetId: providerTransaction.id,
      status: 'success',
      correlationId: input.requestId,
      reason: input.reason ?? 'manual_force_sync',
      metadata: {
        provider: 'dexpay',
        providerReference: input.providerReference,
        matched: result.matched,
        walletSettled: result.walletSettled,
        transactionId: result.transaction?.id ?? null,
      },
    });

    return {
      providerReference: input.providerReference,
      matched: result.matched,
      status: result.status,
      transactionId: result.transaction?.id ?? null,
    };
  }

  listWebhookReceipts(limit = 50, status?: string) {
    if (!this.prisma.isConnected) {
      return Promise.resolve([]);
    }
    return this.prisma.webhookReceipt.findMany({
      where: {
        provider: 'dexpay',
        ...(status ? { status } : {}),
      },
      orderBy: [{ receivedAt: 'desc' }, { createdAt: 'desc' }],
      take: Math.min(Math.max(limit, 1), 200),
    });
  }

  listReconciliationJobs(limit = 50) {
    if (!this.prisma.isConnected) {
      return Promise.resolve([]);
    }
    return this.prisma.reconciliationJob.findMany({
      where: { provider: 'dexpay' },
      orderBy: [{ createdAt: 'desc' }],
      take: Math.min(Math.max(limit, 1), 200),
    });
  }

  listProviderTransactions(limit = 50, status?: string) {
    if (!this.prisma.isConnected) {
      return Promise.resolve([]);
    }
    return this.prisma.providerTransaction.findMany({
      where: {
        provider: 'dexpay',
        ...(status ? { providerStatus: status } : {}),
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: Math.min(Math.max(limit, 1), 200),
    }).then((rows) => rows.map((row) => ({
      ...row,
      lifecycleStatus: resolveProviderLifecycleState({
        status: row.providerStatus,
        providerStatus: row.providerStatus,
        settledToWallet: Boolean(this.readRecord(row.metadata)?.settled_to_wallet),
      }),
    })));
  }

  listPaymentIntents(limit = 50, status?: string) {
    if (!this.prisma.isConnected) {
      return Promise.resolve([]);
    }
    return this.prisma.paymentIntent.findMany({
      where: {
        provider: 'dexpay',
        ...(status ? { status } : {}),
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: Math.min(Math.max(limit, 1), 200),
    });
  }

  private async upsertWebhookReceipt(
    receiptId: string,
    input: {
      provider: string;
      providerEventId?: string | null;
      eventType?: string | null;
      status: string;
      idempotencyKey?: string | null;
      correlationId?: string | null;
      rawPayload?: unknown;
      metadata?: Record<string, unknown>;
      processedAt?: Date;
      error?: string | null;
    },
  ) {
    const existing = await this.prisma.webhookReceipt.findFirst({
      where: {
        provider: input.provider,
        OR: [
          input.providerEventId ? { providerEventId: input.providerEventId } : undefined,
          input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined,
          { id: receiptId },
        ].filter(Boolean) as Prisma.WebhookReceiptWhereInput[],
      },
      orderBy: { createdAt: 'desc' },
    });
    const id = existing?.id ?? receiptId;

    await this.prisma.webhookReceipt.upsert({
      where: { id },
      update: {
        provider: input.provider,
        providerEventId: input.providerEventId ?? undefined,
        eventType: input.eventType ?? undefined,
        status: input.status,
        idempotencyKey: input.idempotencyKey ?? undefined,
        correlationId: input.correlationId ?? undefined,
        processedAt: input.processedAt ?? undefined,
        error: input.error ?? undefined,
        rawPayload: input.rawPayload ? this.toJson(input.rawPayload) : undefined,
        metadata: this.toJson(input.metadata ?? {}),
      },
      create: {
        id,
        provider: input.provider,
        providerEventId: input.providerEventId ?? undefined,
        eventType: input.eventType ?? undefined,
        status: input.status,
        idempotencyKey: input.idempotencyKey ?? undefined,
        correlationId: input.correlationId ?? undefined,
        processedAt: input.processedAt ?? undefined,
        error: input.error ?? undefined,
        rawPayload: this.toJson(input.rawPayload ?? {}),
        metadata: this.toJson(input.metadata ?? {}),
      },
    });
  }

  private extractProviderReference(payload: DexPayWebhookDto) {
    return this.readString(
      payload.orderId
      ?? payload.order_id
      ?? payload.reference
      ?? payload.id
      ?? this.readRecord(payload.data)?.id
      ?? this.readRecord(payload.order)?.id,
    );
  }

  private extractProviderEventId(payload: DexPayWebhookDto) {
    return this.readString(
      payload.eventId
      ?? payload.event_id
      ?? this.readRecord(payload.event)?.id
      ?? this.readRecord(payload.data)?.eventId,
    );
  }

  private extractProviderStatus(payload: DexPayWebhookDto) {
    return this.readString(
      payload.status
      ?? payload.orderStatus
      ?? payload.order_status
      ?? this.readRecord(payload.data)?.status
      ?? this.readRecord(payload.order)?.status,
    );
  }

  private mapStatus(status?: string) {
    const normalized = String(status ?? '').trim().toUpperCase();
    if (['COMPLETED', 'SUCCESS', 'SETTLED'].includes(normalized)) return 'completed';
    if (['FAILED', 'ERROR', 'REJECTED', 'EXPIRED'].includes(normalized)) return 'failed';
    if (['CANCELLED', 'CANCELED'].includes(normalized)) return 'cancelled';
    return 'pending';
  }

  private readRecord(value: unknown): Record<string, unknown> | null {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return null;
  }

  private readString(value: unknown) {
    if (value === null || value === undefined) return null;
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : null;
  }

  private readHeader(headers: Record<string, string | string[] | undefined> | undefined, name: string) {
    if (!headers) return undefined;
    const value = headers[name.toLowerCase()] ?? headers[name];
    if (Array.isArray(value)) return value[0];
    return value;
  }

  private toJson(value: unknown) {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
