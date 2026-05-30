import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import {
  normalizePaymentIntentState,
  resolveMonotonicFinanceTransition,
  resolveProviderLifecycleState,
} from './finance-domain-guards.js';
import {
  providerJson,
  readProviderRecord,
} from './provider-integration.helpers.js';

export type DexPayProviderArtifactInput = {
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
};

@Injectable()
export class ProviderArtifactsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async syncDexPayProviderArtifacts(input: DexPayProviderArtifactInput) {
    if (!this.prisma.isConnected) {
      return;
    }

    const now = new Date();
    const intentId = `pi-dexpay-${input.providerReference}`;
    const normalizedDirection = input.direction === 'offramp' ? 'wallet_withdraw' : 'wallet_topup';
    const metadata = providerJson({
      asset: input.asset ?? null,
      chain: input.chain ?? null,
      direction: input.direction,
      quote: input.quote ?? null,
      order: input.order,
    });
    const rawPayload = providerJson({ order: input.order, quote: input.quote ?? null });
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
    const currentProviderMetadata = readProviderRecord(currentProviderTransaction?.metadata) ?? {};
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
    const providerMetadata = providerJson({
      asset: input.asset ?? null,
      chain: input.chain ?? null,
      settled_to_wallet: effectiveSettledToWallet,
      lifecycle_state: providerResolution.nextState,
      transition_decision: providerResolution.decision,
      attempted_lifecycle_state: nextProviderLifecycle,
    });
    const paymentIntentMetadata = providerJson({
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
}
