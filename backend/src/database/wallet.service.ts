import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import type { FinancialOperation, Prisma, Wallet } from '@prisma/client';
import { PrismaService } from './prisma.service.js';
import { AuditLogService } from './audit-log.service.js';
import type { Row } from '../data/mock-store.js';
import type {
  ChargeProviderVisibilityInput,
  ChargeSubscriptionInput,
  CompletePayoutInput,
  HoldFundsInput,
  PrismaFirstResult,
  PrismaOperationPayload,
  RefundInput,
  ReleaseEscrowInput,
  WalletMutationHooks,
  WalletOperationResult,
  WalletTopupInput,
  WalletWithdrawInput,
} from './wallet.types.js';
import {
  chargeProviderVisibilityProjection,
  chargeSubscriptionProjection,
  completePayoutProjection,
  creditProjection,
  debitProjection,
  holdFundsProjection,
  nextFinancialOperationId,
  refundProjection,
  releaseEscrowProjection,
} from './wallet.projections.js';
import {
  buildEscrowCreateInput,
  buildEscrowUpdateInput,
  buildUserSubscriptionCreateInput,
  buildUserSubscriptionUpdateInput,
} from './wallet.prisma-builders.js';
import {
  mapCommissionRow,
  mapEscrowRow,
  mapUserSubscriptionRow,
  mapWalletRow,
  mapWalletRowFromProjection,
  mapWalletTransactionRow,
} from './wallet.mappers.js';
import {
  assertPositiveWalletAmount,
  resolveWalletCurrency,
  resolveWalletLedgerDirection,
  walletAmount,
  walletJson,
  walletNullableInt,
  walletNullableString,
  walletOperationReference,
  walletOperationScopedId,
  walletRecord,
} from './wallet.helpers.js';
import {
  markEscrowRefunded,
  markEscrowReleased,
  markPayoutPaid,
  upsertSubscriptionChargeState,
} from './wallet.state-transitions.js';

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  nextFinancialOperationId(kind = 'op') {
    return nextFinancialOperationId(kind);
  }

  async topupWallet(params: WalletTopupInput): Promise<WalletOperationResult> {
    if (!this.prisma.isConnected) {
      const credit = creditProjection({
        wallet: params.wallet,
        userId: params.userId,
        amount: params.amount,
        type: params.type ?? 'deposit',
        method: params.method ?? 'wallet',
        description: params.description ?? 'Rechargement portefeuille C2P',
        metadata: params.metadata ?? undefined,
        hooks: params.hooks,
      });

      return {
        financialOperationId: credit.financialOperationId,
        transaction: credit.transaction,
      };
    }

    const result = await this.runPrismaFirstOperation({
      kind: 'wallet_topup',
      idempotencyKey: params.idempotencyKey,
      actorId: params.actorId ?? params.userId,
      subjectUserId: params.userId,
      resourceType: 'wallet',
      resourceId: String(params.wallet.id),
      amount: params.amount,
      currency: resolveWalletCurrency(params.wallet.currency),
      walletRow: params.wallet,
      hooks: params.hooks,
      execute: async (tx, operationId) => {
        const wallet = await this.ensurePrismaWallet(tx, params.wallet, params.userId);
        const beforeWallet = mapWalletRow(wallet);
        assertPositiveWalletAmount(params.amount);

        const updatedWallet = await this.updateWalletWithLock(tx, wallet, {
          balance: wallet.balance + params.amount,
          availableBalance: wallet.availableBalance + params.amount,
        });

        const transaction = await tx.walletTransaction.create({
          data: {
            id: walletOperationScopedId('txn', operationId),
            userId: params.userId,
            type: params.type ?? 'deposit',
            amount: params.amount,
            currency: wallet.currency,
            method: params.method ?? 'wallet',
            status: 'completed',
            description: params.description ?? 'Rechargement portefeuille C2P',
            reference: walletOperationReference('TOP', operationId),
            occurredAt: new Date(),
            source: 'native',
            metadata: walletJson({
              operation_kind: params.type ?? 'wallet_topup',
              financial_operation_id: operationId,
              ...(params.metadata ?? {}),
            }),
          },
        });

        return {
          wallet: mapWalletRow(updatedWallet),
          transaction: mapWalletTransactionRow(transaction, operationId),
          audit: {
            entityType: 'wallet',
            entityId: wallet.id,
            before: beforeWallet,
            after: mapWalletRow(updatedWallet),
            reason: params.reason ?? 'wallet_topup',
          },
        };
      },
    });

    return this.projectWalletOperation(params.wallet, params.hooks, result);
  }

  async withdrawWallet(params: WalletWithdrawInput): Promise<WalletOperationResult> {
    if (!this.prisma.isConnected) {
      const debit = debitProjection({
        wallet: params.wallet,
        userId: params.userId,
        amount: params.amount,
        type: params.type ?? 'withdrawal',
        method: params.method ?? 'wallet',
        description: params.description ?? 'Retrait portefeuille C2P',
        metadata: params.metadata ?? undefined,
        hooks: params.hooks,
      });

      return {
        financialOperationId: debit.financialOperationId,
        transaction: debit.transaction,
      };
    }

    const result = await this.runPrismaFirstOperation({
      kind: 'wallet_withdraw',
      idempotencyKey: params.idempotencyKey,
      actorId: params.actorId ?? params.userId,
      subjectUserId: params.userId,
      resourceType: 'wallet',
      resourceId: String(params.wallet.id),
      amount: params.amount,
      currency: resolveWalletCurrency(params.wallet.currency),
      walletRow: params.wallet,
      hooks: params.hooks,
      execute: async (tx, operationId) => {
        const wallet = await this.ensurePrismaWallet(tx, params.wallet, params.userId);
        const beforeWallet = mapWalletRow(wallet);
        assertPositiveWalletAmount(params.amount);
        if (wallet.balance < params.amount || wallet.availableBalance < params.amount) {
          throw new BadRequestException('Solde insuffisant.');
        }

        const updatedWallet = await this.updateWalletWithLock(tx, wallet, {
          balance: wallet.balance - params.amount,
          availableBalance: Math.max(0, wallet.availableBalance - params.amount),
        });

        const transaction = await tx.walletTransaction.create({
          data: {
            id: walletOperationScopedId('txn', operationId),
            userId: params.userId,
            type: params.type ?? 'withdrawal',
            amount: params.amount,
            currency: wallet.currency,
            method: params.method ?? 'wallet',
            status: 'completed',
            description: params.description ?? 'Retrait portefeuille C2P',
            reference: walletOperationReference('WDL', operationId),
            occurredAt: new Date(),
            source: 'native',
            metadata: walletJson({
              operation_kind: params.type ?? 'wallet_withdraw',
              financial_operation_id: operationId,
              ...(params.metadata ?? {}),
            }),
          },
        });

        return {
          wallet: mapWalletRow(updatedWallet),
          transaction: mapWalletTransactionRow(transaction, operationId),
          audit: {
            entityType: 'wallet',
            entityId: wallet.id,
            before: beforeWallet,
            after: mapWalletRow(updatedWallet),
            reason: params.reason ?? 'wallet_withdraw',
          },
        };
      },
    });

    return this.projectWalletOperation(params.wallet, params.hooks, result);
  }

  async holdFunds(params: HoldFundsInput): Promise<WalletOperationResult> {
    if (!this.prisma.isConnected) {
      return holdFundsProjection(params);
    }

    const result = await this.runPrismaFirstOperation({
      kind: 'escrow_hold',
      idempotencyKey: params.idempotencyKey,
      actorId: params.actorId ?? params.userId,
      subjectUserId: params.userId,
      resourceType: 'booking',
      resourceId: params.bookingId ?? null,
      amount: params.amount,
      currency: resolveWalletCurrency(params.wallet.currency),
      walletRow: params.wallet,
      hooks: params.hooks,
      execute: async (tx, operationId) => {
        const wallet = await this.ensurePrismaWallet(tx, params.wallet, params.userId);
        const beforeWallet = mapWalletRow(wallet);
        assertPositiveWalletAmount(params.amount);
        if (wallet.balance < params.amount || wallet.availableBalance < params.amount) {
          throw new BadRequestException('Solde insuffisant.');
        }

        const updatedWallet = await this.updateWalletWithLock(tx, wallet, {
          balance: wallet.balance - params.amount,
          availableBalance: Math.max(0, wallet.availableBalance - params.amount),
        });

        const transaction = await tx.walletTransaction.create({
          data: {
            id: walletOperationScopedId('txn', operationId),
            userId: params.userId,
            type: 'payment',
            amount: params.amount,
            currency: wallet.currency,
            method: params.method ?? 'wallet',
            status: 'completed',
            description: `Sequestre C2P - ${params.serviceLabel}`,
            reference: walletOperationReference('ESC', operationId),
            occurredAt: new Date(),
            source: 'native',
            metadata: walletJson({
              operation_kind: 'escrow_hold',
              financial_operation_id: operationId,
              booking_id: params.bookingId ?? null,
            }),
          },
        });

        return {
          wallet: mapWalletRow(updatedWallet),
          transaction: mapWalletTransactionRow(transaction, operationId),
          audit: {
            entityType: 'wallet',
            entityId: wallet.id,
            before: beforeWallet,
            after: mapWalletRow(updatedWallet),
            reason: params.reason ?? 'escrow_hold',
          },
        };
      },
    });

    return this.projectWalletOperation(params.wallet, params.hooks, result);
  }

  async releaseEscrow(params: ReleaseEscrowInput): Promise<WalletOperationResult> {
    if (!this.prisma.isConnected) {
      return releaseEscrowProjection(params);
    }

    const result = await this.runPrismaFirstOperation({
      kind: 'escrow_release',
      idempotencyKey: params.idempotencyKey,
      actorId: params.actorId ?? params.userId,
      subjectUserId: params.userId,
      resourceType: 'escrow',
      resourceId: params.escrowId ?? params.bookingId ?? null,
      amount: params.providerAmount,
      currency: resolveWalletCurrency(params.wallet.currency),
      walletRow: params.wallet,
      hooks: params.hooks,
      execute: async (tx, operationId) => {
        const wallet = await this.ensurePrismaWallet(tx, params.wallet, params.userId);
        const beforeWallet = mapWalletRow(wallet);
        assertPositiveWalletAmount(params.providerAmount);
        if (params.platformFeeAmount < 0) {
          throw new BadRequestException('Le montant de commission est invalide.');
        }

        const updatedWallet = await this.updateWalletWithLock(tx, wallet, {
          balance: wallet.balance + params.providerAmount,
          availableBalance: wallet.availableBalance + params.providerAmount,
        });

        if (params.escrowId) {
          await markEscrowReleased(tx, params.escrowId, operationId);
        }

        const transaction = await tx.walletTransaction.create({
          data: {
            id: walletOperationScopedId('txn', operationId),
            userId: params.userId,
            type: 'deposit',
            amount: params.providerAmount,
            currency: wallet.currency,
            method: 'wallet',
            status: 'completed',
            description: `Liberation sequestre - ${params.serviceLabel}`,
            reference: walletOperationReference('REL', operationId),
            occurredAt: new Date(),
            source: 'native',
            metadata: walletJson({
              operation_kind: 'escrow_release',
              financial_operation_id: operationId,
              booking_id: params.bookingId ?? null,
              escrow_id: params.escrowId ?? null,
            }),
          },
        });

        const commission = await tx.commissionLedgerEntry.create({
          data: {
            id: walletOperationScopedId('com', operationId),
            sourceType: 'booking',
            sourceId: params.bookingId ?? params.escrowId ?? null,
            userId: params.userId,
            beneficiaryUserId: 'usr-admin',
            amount: params.platformFeeAmount,
            currency: wallet.currency,
            status: 'recognized',
            description: `Commission C2P - ${params.serviceLabel}`,
            recognizedAt: new Date(),
            source: 'native',
            metadata: walletJson({
              operation_kind: 'commission',
              financial_operation_id: operationId,
              booking_id: params.bookingId ?? null,
              escrow_id: params.escrowId ?? null,
            }),
          },
        });

        return {
          wallet: mapWalletRow(updatedWallet),
          transaction: mapWalletTransactionRow(transaction, operationId),
          commission: mapCommissionRow(commission, operationId),
          audit: {
            entityType: 'escrow',
            entityId: params.escrowId ?? params.bookingId ?? null,
            before: { wallet: beforeWallet },
            after: { wallet: mapWalletRow(updatedWallet), escrowId: params.escrowId ?? null },
            reason: params.reason ?? 'escrow_release',
          },
        };
      },
    });

    return this.projectWalletOperation(params.wallet, params.hooks, result);
  }

  async refund(params: RefundInput): Promise<WalletOperationResult> {
    if (!this.prisma.isConnected) {
      return refundProjection(params);
    }

    const result = await this.runPrismaFirstOperation({
      kind: 'refund',
      idempotencyKey: params.idempotencyKey,
      actorId: params.actorId ?? params.userId,
      subjectUserId: params.userId,
      resourceType: 'escrow',
      resourceId: params.escrowId ?? null,
      amount: params.amount,
      currency: resolveWalletCurrency(params.wallet.currency),
      walletRow: params.wallet,
      hooks: params.hooks,
      execute: async (tx, operationId) => {
        const wallet = await this.ensurePrismaWallet(tx, params.wallet, params.userId);
        const beforeWallet = mapWalletRow(wallet);
        assertPositiveWalletAmount(params.amount);

        const updatedWallet = await this.updateWalletWithLock(tx, wallet, {
          balance: wallet.balance + params.amount,
          availableBalance: wallet.availableBalance + params.amount,
        });

        if (params.escrowId) {
          await markEscrowRefunded(tx, params.escrowId, operationId);
        }

        const transaction = await tx.walletTransaction.create({
          data: {
            id: walletOperationScopedId('txn', operationId),
            userId: params.userId,
            type: 'refund',
            amount: params.amount,
            currency: wallet.currency,
            method: 'wallet',
            status: 'completed',
            description: `Remboursement sequestre - ${params.serviceLabel}`,
            reference: walletOperationReference('RFD', operationId),
            occurredAt: new Date(),
            source: 'native',
            metadata: walletJson({
              operation_kind: 'refund',
              financial_operation_id: operationId,
              escrow_id: params.escrowId ?? null,
            }),
          },
        });

        return {
          wallet: mapWalletRow(updatedWallet),
          transaction: mapWalletTransactionRow(transaction, operationId),
          audit: {
            entityType: 'escrow',
            entityId: params.escrowId ?? null,
            before: { wallet: beforeWallet },
            after: { wallet: mapWalletRow(updatedWallet), escrowId: params.escrowId ?? null },
            reason: params.reason ?? 'refund',
          },
        };
      },
    });

    return this.projectWalletOperation(params.wallet, params.hooks, result);
  }

  async chargeSubscription(params: ChargeSubscriptionInput): Promise<WalletOperationResult> {
    if (!this.prisma.isConnected) {
      return chargeSubscriptionProjection(params);
    }

    const result = await this.runPrismaFirstOperation({
      kind: 'subscription_charge',
      idempotencyKey: params.idempotencyKey,
      actorId: params.actorId ?? params.userId,
      subjectUserId: params.userId,
      resourceType: 'subscription',
      resourceId: params.sourceId ?? null,
      amount: params.amount,
      currency: resolveWalletCurrency(params.wallet.currency),
      walletRow: params.wallet,
      hooks: params.hooks,
      execute: async (tx, operationId) => {
        const wallet = await this.ensurePrismaWallet(tx, params.wallet, params.userId);
        const beforeWallet = mapWalletRow(wallet);
        assertPositiveWalletAmount(params.amount);
        if (wallet.balance < params.amount || wallet.availableBalance < params.amount) {
          throw new BadRequestException('Solde insuffisant.');
        }

        const updatedWallet = await this.updateWalletWithLock(tx, wallet, {
          balance: wallet.balance - params.amount,
          availableBalance: Math.max(0, wallet.availableBalance - params.amount),
        });

        if (params.sourceId) {
          await upsertSubscriptionChargeState(tx, params, operationId);
        }

        const transaction = await tx.walletTransaction.create({
          data: {
            id: walletOperationScopedId('txn', operationId),
            userId: params.userId,
            type: 'payment',
            amount: params.amount,
            currency: wallet.currency,
            method: 'wallet',
            status: 'completed',
            description: `Abonnement ${params.planName}`,
            reference: walletOperationReference('SUB', operationId),
            occurredAt: new Date(),
            source: 'native',
            metadata: walletJson({
              operation_kind: 'subscription_charge',
              financial_operation_id: operationId,
              subscription_id: params.sourceId ?? null,
            }),
          },
        });

        const commission = await tx.commissionLedgerEntry.create({
          data: {
            id: walletOperationScopedId('com', operationId),
            sourceType: 'subscription',
            sourceId: params.sourceId ?? null,
            userId: params.userId,
            beneficiaryUserId: 'usr-admin',
            amount: params.amount,
            currency: wallet.currency,
            status: 'recognized',
            description: `Abonnement ${params.planName}`,
            recognizedAt: new Date(),
            source: 'native',
            metadata: walletJson({
              operation_kind: 'commission',
              financial_operation_id: operationId,
              subscription_id: params.sourceId ?? null,
            }),
          },
        });

        return {
          wallet: mapWalletRow(updatedWallet),
          transaction: mapWalletTransactionRow(transaction, operationId),
          commission: mapCommissionRow(commission, operationId),
          audit: {
            entityType: 'subscription',
            entityId: params.sourceId ?? null,
            before: { wallet: beforeWallet },
            after: { wallet: mapWalletRow(updatedWallet), subscriptionId: params.sourceId ?? null },
            reason: params.reason ?? 'subscription_charge',
          },
        };
      },
    });

    return this.projectWalletOperation(params.wallet, params.hooks, result);
  }

  async chargeProviderVisibility(params: ChargeProviderVisibilityInput): Promise<WalletOperationResult> {
    if (!this.prisma.isConnected) {
      return chargeProviderVisibilityProjection(params);
    }

    const result = await this.runPrismaFirstOperation({
      kind: 'provider_visibility_charge',
      idempotencyKey: params.idempotencyKey,
      actorId: params.actorId ?? params.userId,
      subjectUserId: params.userId,
      resourceType: 'provider_visibility_order',
      resourceId: params.sourceId ?? null,
      amount: params.amount,
      currency: resolveWalletCurrency(params.wallet.currency),
      walletRow: params.wallet,
      hooks: params.hooks,
      execute: async (tx, operationId) => {
        const wallet = await this.ensurePrismaWallet(tx, params.wallet, params.userId);
        const beforeWallet = mapWalletRow(wallet);
        assertPositiveWalletAmount(params.amount);
        if (wallet.balance < params.amount || wallet.availableBalance < params.amount) {
          throw new BadRequestException('Solde insuffisant.');
        }

        const updatedWallet = await this.updateWalletWithLock(tx, wallet, {
          balance: wallet.balance - params.amount,
          availableBalance: Math.max(0, wallet.availableBalance - params.amount),
        });

        const transaction = await tx.walletTransaction.create({
          data: {
            id: walletOperationScopedId('txn', operationId),
            userId: params.userId,
            type: 'payment',
            amount: params.amount,
            currency: wallet.currency,
            method: 'wallet',
            status: 'completed',
            description: `Billet SenPresta - ${params.productName}`,
            reference: walletOperationReference('VIS', operationId),
            occurredAt: new Date(),
            source: 'native',
            metadata: walletJson({
              operation_kind: 'provider_visibility_charge',
              financial_operation_id: operationId,
              provider_visibility_order_id: params.sourceId ?? null,
              provider_visibility_product_id: params.productId ?? null,
              pass_tier: params.tier ?? null,
            }),
          },
        });

        const commission = await tx.commissionLedgerEntry.create({
          data: {
            id: walletOperationScopedId('com', operationId),
            sourceType: 'provider_visibility_order',
            sourceId: params.sourceId ?? null,
            userId: params.userId,
            beneficiaryUserId: 'usr-admin',
            amount: params.amount,
            currency: wallet.currency,
            status: 'recognized',
            description: `Billet SenPresta - ${params.productName}`,
            recognizedAt: new Date(),
            source: 'native',
            metadata: walletJson({
              operation_kind: 'commission',
              financial_operation_id: operationId,
              provider_visibility_order_id: params.sourceId ?? null,
              provider_visibility_product_id: params.productId ?? null,
            }),
          },
        });

        return {
          wallet: mapWalletRow(updatedWallet),
          transaction: mapWalletTransactionRow(transaction, operationId),
          commission: mapCommissionRow(commission, operationId),
          audit: {
            entityType: 'provider_visibility_order',
            entityId: params.sourceId ?? null,
            before: { wallet: beforeWallet },
            after: { wallet: mapWalletRow(updatedWallet), provider_visibility_order_id: params.sourceId ?? null },
            reason: params.reason ?? 'provider_visibility_charge',
          },
        };
      },
    });

    return this.projectWalletOperation(params.wallet, params.hooks, result);
  }

  async completePayout(params: CompletePayoutInput): Promise<WalletOperationResult> {
    if (!this.prisma.isConnected) {
      return completePayoutProjection(params);
    }

    const result = await this.runPrismaFirstOperation({
      kind: 'payout',
      idempotencyKey: params.idempotencyKey,
      actorId: params.actorId ?? params.userId,
      subjectUserId: params.userId,
      resourceType: 'payout_request',
      resourceId: params.payoutRequestId ?? null,
      amount: params.amount,
      currency: resolveWalletCurrency(params.wallet.currency),
      walletRow: params.wallet,
      hooks: params.hooks,
      execute: async (tx, operationId) => {
        const wallet = await this.ensurePrismaWallet(tx, params.wallet, params.userId);
        const beforeWallet = mapWalletRow(wallet);
        assertPositiveWalletAmount(params.amount);
        if (wallet.balance < params.amount || wallet.availableBalance < params.amount) {
          throw new BadRequestException('Solde insuffisant.');
        }

        const updatedWallet = await this.updateWalletWithLock(tx, wallet, {
          balance: wallet.balance - params.amount,
          availableBalance: Math.max(0, wallet.availableBalance - params.amount),
          pendingPayoutAmount: Math.max(0, wallet.pendingPayoutAmount - params.amount),
        });

        if (params.payoutRequestId) {
          await markPayoutPaid(tx, params.payoutRequestId, operationId);
        }

        const transaction = await tx.walletTransaction.create({
          data: {
            id: walletOperationScopedId('txn', operationId),
            userId: params.userId,
            type: 'withdrawal',
            amount: params.amount,
            currency: wallet.currency,
            method: params.method ?? 'bank',
            status: 'completed',
            description: `Retrait ${params.payoutLabel}`,
            reference: walletOperationReference('OUT', operationId),
            occurredAt: new Date(),
            source: 'native',
            metadata: walletJson({
              operation_kind: 'payout',
              financial_operation_id: operationId,
              payout_request_id: params.payoutRequestId ?? null,
            }),
          },
        });

        return {
          wallet: mapWalletRow(updatedWallet),
          transaction: mapWalletTransactionRow(transaction, operationId),
          audit: {
            entityType: 'payout_request',
            entityId: params.payoutRequestId ?? null,
            before: { wallet: beforeWallet },
            after: { wallet: mapWalletRow(updatedWallet), payoutRequestId: params.payoutRequestId ?? null },
            reason: params.reason ?? 'payout',
          },
        };
      },
    });

    return this.projectWalletOperation(params.wallet, params.hooks, result);
  }

  private async runPrismaFirstOperation(args: {
    kind: string;
    idempotencyKey: string;
    actorId?: string | null;
    subjectUserId?: string | null;
    resourceType?: string | null;
    resourceId?: string | null;
    amount?: number | null;
    currency?: string | null;
    walletRow: Row;
    hooks: WalletMutationHooks;
    execute: (tx: Prisma.TransactionClient, operationId: string) => Promise<Omit<PrismaFirstResult, 'financialOperationId'>>;
  }): Promise<PrismaFirstResult> {
    const completed = await this.prisma.$transaction(async (tx) => {
      const requestedOperationId = this.nextFinancialOperationId(args.kind);
      const operation = await tx.financialOperation.upsert({
        where: { idempotencyKey: args.idempotencyKey },
        create: {
          id: requestedOperationId,
          kind: args.kind,
          status: 'pending',
          idempotencyKey: args.idempotencyKey,
          actorId: args.actorId ?? null,
          subjectUserId: args.subjectUserId ?? null,
          resourceType: args.resourceType ?? null,
          resourceId: args.resourceId ?? null,
          amount: walletNullableInt(args.amount),
          currency: args.currency ?? null,
          metadata: walletJson({
            reason: 'wallet_service',
            financial_operation_id: requestedOperationId,
            idempotency_key: args.idempotencyKey,
          }),
        },
        update: { idempotencyKey: args.idempotencyKey },
      });

      if (operation.status === 'completed') {
        return this.loadCompletedOperation(tx, operation, args.walletRow);
      }

      if (operation.status === 'pending' && operation.id !== requestedOperationId) {
        throw new ConflictException('Une operation financiere identique est deja en cours.');
      }

      const operationId = operation.id;
      if (operation.status !== 'pending') {
        await tx.financialOperation.update({
          where: { id: operation.id },
          data: {
            status: 'pending',
            actorId: args.actorId ?? operation.actorId ?? null,
            subjectUserId: args.subjectUserId ?? operation.subjectUserId ?? null,
            resourceType: args.resourceType ?? operation.resourceType ?? null,
            resourceId: args.resourceId ?? operation.resourceId ?? null,
            amount: walletNullableInt(args.amount) ?? operation.amount,
            currency: args.currency ?? operation.currency ?? null,
          },
        });
      }

      const result = await args.execute(tx, operationId);
      await this.appendFinanceLedgerEntry(tx, {
        operationId,
        kind: args.kind,
        wallet: result.wallet,
        transactionId: result.transaction?.id,
        userId: args.subjectUserId ?? args.actorId ?? null,
        amount: walletNullableInt(args.amount) ?? walletAmount(result.transaction?.amount),
        currency: args.currency ?? resolveWalletCurrency(result.wallet.currency),
        resourceType: args.resourceType ?? null,
        resourceId: args.resourceId ?? null,
      });
      await tx.financialOperation.update({
        where: { id: operationId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          metadata: walletJson({
            financial_operation_id: operationId,
            idempotency_key: args.idempotencyKey,
            walletId: result.wallet.id,
            transactionId: result.transaction?.id ?? null,
            commissionEntryId: result.commission?.id ?? null,
            resourceType: args.resourceType ?? null,
            resourceId: args.resourceId ?? null,
          }),
        },
      });

      return {
        financialOperationId: operationId,
        ...result,
      };
    }, {
      maxWait: 10_000,
      timeout: 30_000,
    });

    await this.auditLogService.record({
      scope: 'finance',
      action: args.kind,
      userId: args.actorId ?? args.subjectUserId ?? undefined,
      targetType: completed.audit?.entityType ?? args.resourceType ?? 'wallet',
      targetId: walletNullableString(completed.audit?.entityId ?? args.resourceId ?? completed.wallet.id),
      financialOperationId: completed.financialOperationId,
      correlationId: args.idempotencyKey,
      reason: completed.audit?.reason ?? args.kind,
      before: completed.audit?.before ?? null,
      after: completed.audit?.after ?? { wallet: completed.wallet },
      metadata: {
        idempotencyKey: args.idempotencyKey,
        resourceType: args.resourceType ?? null,
        resourceId: args.resourceId ?? null,
      },
    });

    return completed;
  }

  private async appendFinanceLedgerEntry(
    tx: Prisma.TransactionClient,
    input: {
      operationId: string;
      kind: string;
      wallet: Row;
      transactionId?: unknown;
      userId?: string | null;
      amount?: number | null;
      currency?: string | null;
      resourceType?: string | null;
      resourceId?: string | null;
    },
  ) {
    const amount = walletNullableInt(input.amount);
    if (!amount || amount <= 0) {
      return;
    }

    await tx.financeLedgerEntry.create({
      data: {
        id: walletOperationScopedId('ledger-wallet', input.operationId),
        financialOperationId: input.operationId,
        entryType: input.kind,
        accountType: 'wallet',
        accountId: walletNullableString(input.wallet.id) ?? null,
        userId: input.userId ?? walletNullableString(input.wallet.user_id) ?? null,
        direction: resolveWalletLedgerDirection(input.kind),
        amount,
        currency: input.currency ?? resolveWalletCurrency(input.wallet.currency),
        sourceType: input.resourceType,
        sourceId: input.resourceId,
        transactionId: walletNullableString(input.transactionId) ?? null,
        metadata: walletJson({
          immutable: true,
          financial_operation_id: input.operationId,
          wallet_id: input.wallet.id ?? null,
          kind: input.kind,
        }),
      },
    });
  }

  async syncEscrowCase(
    row: Row,
    options: {
      actorId?: string | null;
      reason?: string;
    } = {},
  ) {
    if (!this.prisma.isConnected) {
      return row;
    }

    const escrowId = String(row.id);
    const before = await this.prisma.escrowCase.findUnique({ where: { id: escrowId } });
    const synced = await this.prisma.escrowCase.upsert({
      where: { id: escrowId },
      create: buildEscrowCreateInput(row),
      update: buildEscrowUpdateInput(row),
    });
    const mapped = mapEscrowRow(synced);

    await this.auditLogService.record({
      scope: 'finance',
      action: before ? 'escrow.sync' : 'escrow.create',
      userId: options.actorId ?? undefined,
      targetType: 'escrow',
      targetId: escrowId,
      financialOperationId: walletNullableString(row.financial_operation_id),
      reason: options.reason ?? (before ? 'escrow_sync' : 'escrow_create'),
      before: before ? mapEscrowRow(before) : null,
      after: mapped,
      metadata: {
        bookingId: row.booking_id ?? null,
      },
    });

    return mapped;
  }

  async syncUserSubscription(
    row: Row,
    options: {
      actorId?: string | null;
      reason?: string;
    } = {},
  ) {
    if (!this.prisma.isConnected) {
      return row;
    }

    const subscriptionId = String(row.id);
    const before = await this.prisma.userSubscription.findUnique({ where: { id: subscriptionId } });
    const synced = await this.prisma.userSubscription.upsert({
      where: { id: subscriptionId },
      create: buildUserSubscriptionCreateInput(row),
      update: buildUserSubscriptionUpdateInput(row),
    });
    const mapped = mapUserSubscriptionRow(synced);

    await this.auditLogService.record({
      scope: 'finance',
      action: before ? 'subscription.sync' : 'subscription.create',
      userId: options.actorId ?? undefined,
      targetType: 'subscription',
      targetId: subscriptionId,
      financialOperationId: walletNullableString(row.financial_operation_id),
      reason: options.reason ?? (before ? 'subscription_sync' : 'subscription_create'),
      before: before ? mapUserSubscriptionRow(before) : null,
      after: mapped,
      metadata: {
        planId: row.plan_id ?? null,
        userId: row.user_id ?? null,
      },
    });

    return mapped;
  }

  private async loadCompletedOperation(
    tx: Prisma.TransactionClient,
    operation: FinancialOperation,
    walletRow: Row,
  ): Promise<PrismaFirstResult> {
    const metadata = walletRecord(operation.metadata);
    const walletId = walletNullableString(metadata.walletId) ?? String(walletRow.id ?? '');
    const transactionId = walletNullableString(metadata.transactionId);
    const commissionEntryId = walletNullableString(metadata.commissionEntryId);

    const wallet = walletId
      ? await tx.wallet.findUnique({ where: { id: walletId } })
      : null;
    const transaction = transactionId
      ? await tx.walletTransaction.findUnique({ where: { id: transactionId } })
      : null;
    const commission = commissionEntryId
      ? await tx.commissionLedgerEntry.findUnique({ where: { id: commissionEntryId } })
      : null;

    return {
      financialOperationId: operation.id,
      wallet: wallet ? mapWalletRow(wallet) : mapWalletRowFromProjection(walletRow),
      transaction: transaction ? mapWalletTransactionRow(transaction, operation.id) : undefined,
      commission: commission ? mapCommissionRow(commission, operation.id) : undefined,
    };
  }

  private async ensurePrismaWallet(
    tx: Prisma.TransactionClient,
    walletRow: Row,
    userId: string,
  ) {
    const walletId = String(walletRow.id);
    const existing = await tx.wallet.findUnique({ where: { id: walletId } });
    if (existing) {
      return existing;
    }

    return tx.wallet.create({
      data: {
        id: walletId,
        userId,
        currency: resolveWalletCurrency(walletRow.currency),
        balance: walletAmount(walletRow.balance),
        availableBalance: walletAmount(walletRow.available_balance ?? walletRow.balance),
        heldBalance: walletAmount(walletRow.held_balance),
        pendingReleaseBalance: walletAmount(walletRow.pending_release_balance),
        pendingPayoutAmount: walletAmount(walletRow.pending_payout_amount),
        source: 'native',
        metadata: walletJson({
          projection: 'wallet_service',
          app_row_wallet_id: walletId,
        }),
      },
    });
  }

  private async updateWalletWithLock(
    tx: Prisma.TransactionClient,
    wallet: Wallet,
    next: {
      balance: number;
      availableBalance: number;
      heldBalance?: number;
      pendingReleaseBalance?: number;
      pendingPayoutAmount?: number;
    },
  ) {
    const updated = await tx.wallet.updateMany({
      where: {
        id: wallet.id,
        updatedAt: wallet.updatedAt,
      },
      data: {
        balance: next.balance,
        availableBalance: next.availableBalance,
        heldBalance: next.heldBalance ?? wallet.heldBalance,
        pendingReleaseBalance: next.pendingReleaseBalance ?? wallet.pendingReleaseBalance,
        pendingPayoutAmount: next.pendingPayoutAmount ?? wallet.pendingPayoutAmount,
        metadata: walletJson({
          ...(walletRecord(wallet.metadata)),
          last_financial_operation_at: new Date().toISOString(),
        }),
      },
    });

    if (updated.count !== 1) {
      throw new ConflictException('Le wallet a ete modifie en parallele. Reessayez.');
    }

    const reloaded = await tx.wallet.findUnique({ where: { id: wallet.id } });
    if (!reloaded) {
      throw new ConflictException('Wallet introuvable apres mise a jour.');
    }

    return reloaded;
  }

  private projectWalletOperation(
    walletTarget: Row,
    hooks: WalletMutationHooks,
    result: PrismaFirstResult,
  ): WalletOperationResult {
    this.syncWalletProjection(walletTarget, result.wallet, hooks);
    const transaction = result.transaction ? hooks.appendPaymentTransaction(result.transaction) : undefined;
    if (!transaction) {
      throw new ConflictException('Projection de transaction manquante.');
    }

    const commission = result.commission ? hooks.appendCommissionEntry(result.commission) : undefined;

    return {
      financialOperationId: result.financialOperationId,
      transaction,
      commission,
    };
  }

  private syncWalletProjection(target: Row, source: Row, hooks: WalletMutationHooks) {
    Object.assign(target, source, {
      metadata: {
        ...(walletRecord(target.metadata)),
        ...(walletRecord(source.metadata)),
      },
    });
    hooks.syncWalletRow(target);
  }
}
