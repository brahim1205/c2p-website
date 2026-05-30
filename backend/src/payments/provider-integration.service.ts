import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '../config/config.service.js';
import { AuditLogService } from '../database/audit-log.service.js';
import { PlatformPersistenceService } from '../database/platform-persistence.service.js';
import { PrismaService } from '../database/prisma.service.js';
import {
  appendAppRows,
  collectRowsByIds,
  listAppRows,
  mergeRowsToPersist,
  patchAppRows,
  syncAppStoreFromDatabase,
} from '../data/data-app-store.js';
import {
  ensureWalletAccount,
} from '../data/data-finance-runtime.js';
import type { Row } from '../data/mock-store.js';
import type { DexPayOrder } from './dexpay.service.js';
import type { DexPayReconcileDto, DexPayWebhookDto } from './dto/dexpay.dto.js';
import {
  mapLifecycleStatusToTransactionStatus,
  resolveMonotonicFinanceTransition,
  resolveProviderLifecycleState,
} from './finance-domain-guards.js';
import { ProviderArtifactsService } from './provider-artifacts.service.js';
import { ProviderRegistryService } from './provider-registry.service.js';
import {
  createProviderWebhookFingerprint,
  createProviderWebhookReceiptId,
} from './provider-webhook-fingerprint.js';
import { upsertProviderWebhookReceipt } from './provider-webhook-receipt.persistence.js';
import { flagProviderWebhookReplayMismatch } from './provider-webhook-replay-guard.js';
import {
  buildDexPayCheckoutTransaction,
  extractDexPayProviderEventId,
  extractDexPayProviderReference,
  extractDexPayProviderStatus,
  mapDexPayStatus,
  providerJson,
  readProviderHeader,
  readProviderRecord,
  readProviderString,
} from './provider-integration.helpers.js';

type SyncSource = 'user_sync' | 'webhook' | 'reconciliation' | 'operator_reprocess' | 'operator_force_sync';

@Injectable()
export class ProviderIntegrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly providerRegistry: ProviderRegistryService,
    private readonly platformPersistenceService: PlatformPersistenceService,
    private readonly auditLogService: AuditLogService,
    private readonly providerArtifactsService: ProviderArtifactsService,
  ) {}

  private getDexPay() {
    return this.providerRegistry.getDexPay();
  }

  private assertDexPayConfigured(action: string) {
    if (!this.getDexPay().isConfigured()) {
      throw new ServiceUnavailableException(`Integration DexPay indisponible pour ${action}.`);
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
    const transaction = buildDexPayCheckoutTransaction(input);

    appendAppRows('payment_transactions', [transaction]);
    const rowsToPersist: Record<string, Row[]> = {};
    mergeRowsToPersist(rowsToPersist, 'payment_transactions', collectRowsByIds('payment_transactions', [String(transaction.id)]));
    await this.platformPersistenceService.persistRows(rowsToPersist, {
      actorId: input.actorId,
      reason: 'dexpay_checkout_create',
    });

    await this.providerArtifactsService.syncDexPayProviderArtifacts({
      actorId: input.actorId,
      providerReference: input.order.id,
      transactionId: String(transaction.id),
      direction: input.direction,
      amount: Number(transaction.amount ?? 0),
      currency: 'XAF',
      status: mapDexPayStatus(input.order.status),
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
    const status = mapDexPayStatus(order.status);
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
        type: readProviderString(matchingTransaction.type),
        status: readProviderString(matchingTransaction.status),
        providerStatus: readProviderString(matchingTransaction.provider_status),
        settledToWallet: Boolean(matchingTransaction.settled_to_wallet),
      });
      const attemptedLifecycle = resolveProviderLifecycleState({
        type: readProviderString(matchingTransaction.type),
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

    await this.providerArtifactsService.syncDexPayProviderArtifacts({
      actorId: currentTransaction ? String(currentTransaction.user_id ?? input.actorId) : input.actorId,
      providerReference: order.id,
      transactionId: String(currentTransaction?.id ?? input.transactionId ?? `ext-${order.id}`),
      direction: String(currentTransaction?.direction ?? 'onramp'),
      amount: Number(currentTransaction?.amount ?? order.fiatAmount ?? 0),
      currency: String(currentTransaction?.currency ?? 'XAF'),
      status,
      asset: readProviderString(currentTransaction?.asset) ?? undefined,
      chain: readProviderString(currentTransaction?.chain) ?? undefined,
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
    const providerEventId = extractDexPayProviderEventId(input.payload);
    const providerReference = extractDexPayProviderReference(input.payload);
    const providerStatus = extractDexPayProviderStatus(input.payload);
    const eventType = readProviderString(input.payload.type ?? input.payload.eventType) ?? 'provider.webhook.received';
    const idempotencyKey = `dexpay:webhook:${providerEventId ?? providerReference}:${providerStatus ?? 'unknown'}`;
    const payloadFingerprint = createProviderWebhookFingerprint({
      provider: 'dexpay',
      providerEventId,
      providerReference,
      providerStatus,
      eventType,
      payload: input.payload,
    });
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
      const existingFingerprint = readProviderString(readProviderRecord(existingReceipt.metadata)?.payloadFingerprint);
      if (existingFingerprint && existingFingerprint !== payloadFingerprint) {
        await flagProviderWebhookReplayMismatch(this.prisma, this.auditLogService, existingReceipt.id, {
          requestId: input.requestId,
          providerEventId,
          providerReference,
          providerStatus,
          receivedFingerprint: payloadFingerprint,
          storedFingerprint: existingFingerprint,
          ip: input.ip ?? null,
          userAgent: input.userAgent ?? null,
        });
        throw new ConflictException('Webhook DexPay deja traite avec un payload different.');
      }

      return {
        accepted: true,
        duplicate: true,
        receiptId: existingReceipt.id,
      };
    }

    const receiptId = existingReceipt?.id ?? createProviderWebhookReceiptId('dexpay', idempotencyKey);
    await upsertProviderWebhookReceipt(this.prisma, receiptId, {
      provider: 'dexpay',
      providerEventId,
      eventType,
      status: 'received',
      idempotencyKey,
      correlationId: input.requestId,
      rawPayload: input.payload,
      metadata: {
        payloadFingerprint,
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      },
    });

    const resolvedSignature = input.signature
      || readProviderHeader(input.headers, this.config.dexPayWebhookSignatureHeader)
      || readProviderHeader(input.headers, 'x-dexpay-signature');
    const verification = this.getDexPay().verifyWebhookSignature(input.rawBody, resolvedSignature);
    if (!verification.valid) {
      await upsertProviderWebhookReceipt(this.prisma, receiptId, {
        provider: 'dexpay',
        providerEventId,
        eventType,
        status: 'rejected',
        idempotencyKey,
        correlationId: input.requestId,
        rawPayload: input.payload,
        metadata: {
          payloadFingerprint,
          verification: verification.reason,
          ip: input.ip ?? null,
          userAgent: input.userAgent ?? null,
        },
        error: verification.reason,
      });
      throw new UnauthorizedException('Signature webhook DexPay invalide.');
    }

    if (!providerReference) {
      await upsertProviderWebhookReceipt(this.prisma, receiptId, {
        provider: 'dexpay',
        providerEventId,
        eventType,
        status: 'failed',
        idempotencyKey,
        correlationId: input.requestId,
        rawPayload: input.payload,
        metadata: {
          payloadFingerprint,
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

      await upsertProviderWebhookReceipt(this.prisma, receiptId, {
        provider: 'dexpay',
        providerEventId,
        eventType,
        status: 'processed',
        idempotencyKey,
        correlationId: input.requestId,
        rawPayload: input.payload,
        processedAt: new Date(),
        metadata: {
          payloadFingerprint,
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
      await upsertProviderWebhookReceipt(this.prisma, receiptId, {
        provider: 'dexpay',
        providerEventId,
        eventType,
        status: 'failed',
        idempotencyKey,
        correlationId: input.requestId,
        rawPayload: input.payload,
        processedAt: new Date(),
        metadata: {
          payloadFingerprint,
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
    const jobId = `rec-dexpay-${Date.now()}-${randomUUID()}`;
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
        metadata: providerJson({
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
            summary: providerJson(summary),
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
          summary: providerJson(summary),
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

    const rawPayload = readProviderRecord(receipt.rawPayload) as DexPayWebhookDto | null;
    const providerReference = extractDexPayProviderReference(rawPayload ?? {})
      ?? readProviderString(readProviderRecord(receipt.metadata)?.providerReference);
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

      await upsertProviderWebhookReceipt(this.prisma, receipt.id, {
        provider: 'dexpay',
        providerEventId: receipt.providerEventId,
        eventType: receipt.eventType,
        status: 'processed',
        idempotencyKey: receipt.idempotencyKey,
        correlationId: input.requestId,
        rawPayload: receipt.rawPayload,
        processedAt: new Date(),
        metadata: {
          ...(readProviderRecord(receipt.metadata) ?? {}),
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
      await upsertProviderWebhookReceipt(this.prisma, receipt.id, {
        provider: 'dexpay',
        providerEventId: receipt.providerEventId,
        eventType: receipt.eventType,
        status: 'failed',
        idempotencyKey: receipt.idempotencyKey,
        correlationId: input.requestId,
        rawPayload: receipt.rawPayload,
        processedAt: new Date(),
        metadata: {
          ...(readProviderRecord(receipt.metadata) ?? {}),
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

}
