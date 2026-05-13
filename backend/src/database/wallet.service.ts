import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import type { CommissionLedgerEntry, FinancialOperation, Prisma, Wallet, WalletTransaction } from '@prisma/client';
import { PrismaService } from './prisma.service.js';
import { AuditLogService } from './audit-log.service.js';
import type { Row } from '../data/mock-store.js';

interface WalletMutationHooks {
  syncWalletRow: (wallet: Row) => void;
  appendPaymentTransaction: (payload: Row) => Row;
  appendCommissionEntry: (payload: Row) => Row;
}

interface DebitInput {
  wallet: Row;
  userId: string;
  amount: number;
  method?: string;
  type?: string;
  description: string;
  financialOperationId?: string;
  metadata?: Record<string, unknown>;
  hooks: WalletMutationHooks;
}

interface CreditInput {
  wallet: Row;
  userId: string;
  amount: number;
  method?: string;
  type?: string;
  description: string;
  financialOperationId?: string;
  metadata?: Record<string, unknown>;
  hooks: WalletMutationHooks;
}

interface CommissionInput {
  sourceType: string;
  sourceId?: string | null;
  userId?: string | null;
  beneficiaryUserId?: string | null;
  amount: number;
  description: string;
  financialOperationId?: string;
  hooks: WalletMutationHooks;
}

interface WalletOperationResult {
  financialOperationId: string;
  transaction: Row;
  commission?: Row;
}

interface PrismaOperationPayload {
  walletId?: string | null;
  transactionId?: string | null;
  commissionEntryId?: string | null;
  transaction?: Row;
  commission?: Row;
}

type PrismaFirstResult = {
  financialOperationId: string;
  wallet: Row;
  transaction?: Row;
  commission?: Row;
  audit?: {
    entityType: string;
    entityId?: string | null;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    reason?: string;
  };
};

interface PrismaFirstBaseInput {
  wallet: Row;
  userId: string;
  hooks: WalletMutationHooks;
  idempotencyKey: string;
  actorId?: string | null;
  reason?: string;
}

interface HoldFundsInput extends PrismaFirstBaseInput {
  amount: number;
  serviceLabel: string;
  method?: string | null;
  bookingId?: string | null;
}

interface ReleaseEscrowInput extends PrismaFirstBaseInput {
  providerAmount: number;
  platformFeeAmount: number;
  serviceLabel: string;
  bookingId?: string | null;
  escrowId?: string | null;
}

interface RefundInput extends PrismaFirstBaseInput {
  amount: number;
  serviceLabel: string;
  escrowId?: string | null;
}

interface ChargeSubscriptionInput extends PrismaFirstBaseInput {
  amount: number;
  planName: string;
  sourceId?: string | null;
  role?: string | null;
  planId?: string | null;
  commissionRate?: number | null;
  autoRenew?: boolean | null;
  startedAt?: string | null;
  renewsAt?: string | null;
  lastBilledAt?: string | null;
}

interface ChargeProviderVisibilityInput extends PrismaFirstBaseInput {
  amount: number;
  productName: string;
  sourceId?: string | null;
  productId?: string | null;
  tier?: string | null;
}

interface CompletePayoutInput extends PrismaFirstBaseInput {
  amount: number;
  payoutLabel: string;
  method?: string | null;
  payoutRequestId?: string | null;
}

interface WalletTopupInput extends PrismaFirstBaseInput {
  amount: number;
  method?: string | null;
  description?: string | null;
  type?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface WalletWithdrawInput extends PrismaFirstBaseInput {
  amount: number;
  method?: string | null;
  description?: string | null;
  type?: string | null;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  nextFinancialOperationId(kind = 'op') {
    return `finop_${kind}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  async topupWallet(params: WalletTopupInput): Promise<WalletOperationResult> {
    if (!this.prisma.isConnected) {
      const credit = this.creditProjection({
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
      currency: this.resolveCurrency(params.wallet.currency),
      walletRow: params.wallet,
      hooks: params.hooks,
      execute: async (tx, operationId) => {
        const wallet = await this.ensurePrismaWallet(tx, params.wallet, params.userId);
        const beforeWallet = this.mapWalletRow(wallet);
        this.assertPositiveAmount(params.amount);

        const updatedWallet = await this.updateWalletWithLock(tx, wallet, {
          balance: wallet.balance + params.amount,
          availableBalance: wallet.availableBalance + params.amount,
        });

        const transaction = await tx.walletTransaction.create({
          data: {
            id: this.operationScopedId('txn', operationId),
            userId: params.userId,
            type: params.type ?? 'deposit',
            amount: params.amount,
            currency: wallet.currency,
            method: params.method ?? 'wallet',
            status: 'completed',
            description: params.description ?? 'Rechargement portefeuille C2P',
            reference: this.operationReference('TOP', operationId),
            occurredAt: new Date(),
            source: 'native',
            metadata: this.toJson({
              operation_kind: params.type ?? 'wallet_topup',
              financial_operation_id: operationId,
              ...(params.metadata ?? {}),
            }),
          },
        });

        return {
          wallet: this.mapWalletRow(updatedWallet),
          transaction: this.mapWalletTransactionRow(transaction, operationId),
          audit: {
            entityType: 'wallet',
            entityId: wallet.id,
            before: beforeWallet,
            after: this.mapWalletRow(updatedWallet),
            reason: params.reason ?? 'wallet_topup',
          },
        };
      },
    });

    return this.projectWalletOperation(params.wallet, params.hooks, result);
  }

  async withdrawWallet(params: WalletWithdrawInput): Promise<WalletOperationResult> {
    if (!this.prisma.isConnected) {
      const debit = this.debitProjection({
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
      currency: this.resolveCurrency(params.wallet.currency),
      walletRow: params.wallet,
      hooks: params.hooks,
      execute: async (tx, operationId) => {
        const wallet = await this.ensurePrismaWallet(tx, params.wallet, params.userId);
        const beforeWallet = this.mapWalletRow(wallet);
        this.assertPositiveAmount(params.amount);
        if (wallet.balance < params.amount || wallet.availableBalance < params.amount) {
          throw new BadRequestException('Solde insuffisant.');
        }

        const updatedWallet = await this.updateWalletWithLock(tx, wallet, {
          balance: wallet.balance - params.amount,
          availableBalance: Math.max(0, wallet.availableBalance - params.amount),
        });

        const transaction = await tx.walletTransaction.create({
          data: {
            id: this.operationScopedId('txn', operationId),
            userId: params.userId,
            type: params.type ?? 'withdrawal',
            amount: params.amount,
            currency: wallet.currency,
            method: params.method ?? 'wallet',
            status: 'completed',
            description: params.description ?? 'Retrait portefeuille C2P',
            reference: this.operationReference('WDL', operationId),
            occurredAt: new Date(),
            source: 'native',
            metadata: this.toJson({
              operation_kind: params.type ?? 'wallet_withdraw',
              financial_operation_id: operationId,
              ...(params.metadata ?? {}),
            }),
          },
        });

        return {
          wallet: this.mapWalletRow(updatedWallet),
          transaction: this.mapWalletTransactionRow(transaction, operationId),
          audit: {
            entityType: 'wallet',
            entityId: wallet.id,
            before: beforeWallet,
            after: this.mapWalletRow(updatedWallet),
            reason: params.reason ?? 'wallet_withdraw',
          },
        };
      },
    });

    return this.projectWalletOperation(params.wallet, params.hooks, result);
  }

  async holdFunds(params: HoldFundsInput): Promise<WalletOperationResult> {
    if (!this.prisma.isConnected) {
      return this.holdFundsProjection(params);
    }

    const result = await this.runPrismaFirstOperation({
      kind: 'escrow_hold',
      idempotencyKey: params.idempotencyKey,
      actorId: params.actorId ?? params.userId,
      subjectUserId: params.userId,
      resourceType: 'booking',
      resourceId: params.bookingId ?? null,
      amount: params.amount,
      currency: this.resolveCurrency(params.wallet.currency),
      walletRow: params.wallet,
      hooks: params.hooks,
      execute: async (tx, operationId) => {
        const wallet = await this.ensurePrismaWallet(tx, params.wallet, params.userId);
        const beforeWallet = this.mapWalletRow(wallet);
        this.assertPositiveAmount(params.amount);
        if (wallet.balance < params.amount || wallet.availableBalance < params.amount) {
          throw new BadRequestException('Solde insuffisant.');
        }

        const updatedWallet = await this.updateWalletWithLock(tx, wallet, {
          balance: wallet.balance - params.amount,
          availableBalance: Math.max(0, wallet.availableBalance - params.amount),
        });

        const transaction = await tx.walletTransaction.create({
          data: {
            id: this.operationScopedId('txn', operationId),
            userId: params.userId,
            type: 'payment',
            amount: params.amount,
            currency: wallet.currency,
            method: params.method ?? 'wallet',
            status: 'completed',
            description: `Sequestre C2P - ${params.serviceLabel}`,
            reference: this.operationReference('ESC', operationId),
            occurredAt: new Date(),
            source: 'native',
            metadata: this.toJson({
              operation_kind: 'escrow_hold',
              financial_operation_id: operationId,
              booking_id: params.bookingId ?? null,
            }),
          },
        });

        return {
          wallet: this.mapWalletRow(updatedWallet),
          transaction: this.mapWalletTransactionRow(transaction, operationId),
          audit: {
            entityType: 'wallet',
            entityId: wallet.id,
            before: beforeWallet,
            after: this.mapWalletRow(updatedWallet),
            reason: params.reason ?? 'escrow_hold',
          },
        };
      },
    });

    return this.projectWalletOperation(params.wallet, params.hooks, result);
  }

  async releaseEscrow(params: ReleaseEscrowInput): Promise<WalletOperationResult> {
    if (!this.prisma.isConnected) {
      return this.releaseEscrowProjection(params);
    }

    const result = await this.runPrismaFirstOperation({
      kind: 'escrow_release',
      idempotencyKey: params.idempotencyKey,
      actorId: params.actorId ?? params.userId,
      subjectUserId: params.userId,
      resourceType: 'escrow',
      resourceId: params.escrowId ?? params.bookingId ?? null,
      amount: params.providerAmount,
      currency: this.resolveCurrency(params.wallet.currency),
      walletRow: params.wallet,
      hooks: params.hooks,
      execute: async (tx, operationId) => {
        const wallet = await this.ensurePrismaWallet(tx, params.wallet, params.userId);
        const beforeWallet = this.mapWalletRow(wallet);
        this.assertPositiveAmount(params.providerAmount);
        if (params.platformFeeAmount < 0) {
          throw new BadRequestException('Le montant de commission est invalide.');
        }

        const updatedWallet = await this.updateWalletWithLock(tx, wallet, {
          balance: wallet.balance + params.providerAmount,
          availableBalance: wallet.availableBalance + params.providerAmount,
        });

        if (params.escrowId) {
          await this.markEscrowReleased(tx, params.escrowId, operationId);
        }

        const transaction = await tx.walletTransaction.create({
          data: {
            id: this.operationScopedId('txn', operationId),
            userId: params.userId,
            type: 'deposit',
            amount: params.providerAmount,
            currency: wallet.currency,
            method: 'wallet',
            status: 'completed',
            description: `Liberation sequestre - ${params.serviceLabel}`,
            reference: this.operationReference('REL', operationId),
            occurredAt: new Date(),
            source: 'native',
            metadata: this.toJson({
              operation_kind: 'escrow_release',
              financial_operation_id: operationId,
              booking_id: params.bookingId ?? null,
              escrow_id: params.escrowId ?? null,
            }),
          },
        });

        const commission = await tx.commissionLedgerEntry.create({
          data: {
            id: this.operationScopedId('com', operationId),
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
            metadata: this.toJson({
              operation_kind: 'commission',
              financial_operation_id: operationId,
              booking_id: params.bookingId ?? null,
              escrow_id: params.escrowId ?? null,
            }),
          },
        });

        return {
          wallet: this.mapWalletRow(updatedWallet),
          transaction: this.mapWalletTransactionRow(transaction, operationId),
          commission: this.mapCommissionRow(commission, operationId),
          audit: {
            entityType: 'escrow',
            entityId: params.escrowId ?? params.bookingId ?? null,
            before: { wallet: beforeWallet },
            after: { wallet: this.mapWalletRow(updatedWallet), escrowId: params.escrowId ?? null },
            reason: params.reason ?? 'escrow_release',
          },
        };
      },
    });

    return this.projectWalletOperation(params.wallet, params.hooks, result);
  }

  async refund(params: RefundInput): Promise<WalletOperationResult> {
    if (!this.prisma.isConnected) {
      return this.refundProjection(params);
    }

    const result = await this.runPrismaFirstOperation({
      kind: 'refund',
      idempotencyKey: params.idempotencyKey,
      actorId: params.actorId ?? params.userId,
      subjectUserId: params.userId,
      resourceType: 'escrow',
      resourceId: params.escrowId ?? null,
      amount: params.amount,
      currency: this.resolveCurrency(params.wallet.currency),
      walletRow: params.wallet,
      hooks: params.hooks,
      execute: async (tx, operationId) => {
        const wallet = await this.ensurePrismaWallet(tx, params.wallet, params.userId);
        const beforeWallet = this.mapWalletRow(wallet);
        this.assertPositiveAmount(params.amount);

        const updatedWallet = await this.updateWalletWithLock(tx, wallet, {
          balance: wallet.balance + params.amount,
          availableBalance: wallet.availableBalance + params.amount,
        });

        if (params.escrowId) {
          await this.markEscrowRefunded(tx, params.escrowId, operationId);
        }

        const transaction = await tx.walletTransaction.create({
          data: {
            id: this.operationScopedId('txn', operationId),
            userId: params.userId,
            type: 'refund',
            amount: params.amount,
            currency: wallet.currency,
            method: 'wallet',
            status: 'completed',
            description: `Remboursement sequestre - ${params.serviceLabel}`,
            reference: this.operationReference('RFD', operationId),
            occurredAt: new Date(),
            source: 'native',
            metadata: this.toJson({
              operation_kind: 'refund',
              financial_operation_id: operationId,
              escrow_id: params.escrowId ?? null,
            }),
          },
        });

        return {
          wallet: this.mapWalletRow(updatedWallet),
          transaction: this.mapWalletTransactionRow(transaction, operationId),
          audit: {
            entityType: 'escrow',
            entityId: params.escrowId ?? null,
            before: { wallet: beforeWallet },
            after: { wallet: this.mapWalletRow(updatedWallet), escrowId: params.escrowId ?? null },
            reason: params.reason ?? 'refund',
          },
        };
      },
    });

    return this.projectWalletOperation(params.wallet, params.hooks, result);
  }

  async chargeSubscription(params: ChargeSubscriptionInput): Promise<WalletOperationResult> {
    if (!this.prisma.isConnected) {
      return this.chargeSubscriptionProjection(params);
    }

    const result = await this.runPrismaFirstOperation({
      kind: 'subscription_charge',
      idempotencyKey: params.idempotencyKey,
      actorId: params.actorId ?? params.userId,
      subjectUserId: params.userId,
      resourceType: 'subscription',
      resourceId: params.sourceId ?? null,
      amount: params.amount,
      currency: this.resolveCurrency(params.wallet.currency),
      walletRow: params.wallet,
      hooks: params.hooks,
      execute: async (tx, operationId) => {
        const wallet = await this.ensurePrismaWallet(tx, params.wallet, params.userId);
        const beforeWallet = this.mapWalletRow(wallet);
        this.assertPositiveAmount(params.amount);
        if (wallet.balance < params.amount || wallet.availableBalance < params.amount) {
          throw new BadRequestException('Solde insuffisant.');
        }

        const updatedWallet = await this.updateWalletWithLock(tx, wallet, {
          balance: wallet.balance - params.amount,
          availableBalance: Math.max(0, wallet.availableBalance - params.amount),
        });

        if (params.sourceId) {
          await this.upsertSubscriptionChargeState(tx, params, operationId);
        }

        const transaction = await tx.walletTransaction.create({
          data: {
            id: this.operationScopedId('txn', operationId),
            userId: params.userId,
            type: 'payment',
            amount: params.amount,
            currency: wallet.currency,
            method: 'wallet',
            status: 'completed',
            description: `Abonnement ${params.planName}`,
            reference: this.operationReference('SUB', operationId),
            occurredAt: new Date(),
            source: 'native',
            metadata: this.toJson({
              operation_kind: 'subscription_charge',
              financial_operation_id: operationId,
              subscription_id: params.sourceId ?? null,
            }),
          },
        });

        const commission = await tx.commissionLedgerEntry.create({
          data: {
            id: this.operationScopedId('com', operationId),
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
            metadata: this.toJson({
              operation_kind: 'commission',
              financial_operation_id: operationId,
              subscription_id: params.sourceId ?? null,
            }),
          },
        });

        return {
          wallet: this.mapWalletRow(updatedWallet),
          transaction: this.mapWalletTransactionRow(transaction, operationId),
          commission: this.mapCommissionRow(commission, operationId),
          audit: {
            entityType: 'subscription',
            entityId: params.sourceId ?? null,
            before: { wallet: beforeWallet },
            after: { wallet: this.mapWalletRow(updatedWallet), subscriptionId: params.sourceId ?? null },
            reason: params.reason ?? 'subscription_charge',
          },
        };
      },
    });

    return this.projectWalletOperation(params.wallet, params.hooks, result);
  }

  async chargeProviderVisibility(params: ChargeProviderVisibilityInput): Promise<WalletOperationResult> {
    if (!this.prisma.isConnected) {
      return this.chargeProviderVisibilityProjection(params);
    }

    const result = await this.runPrismaFirstOperation({
      kind: 'provider_visibility_charge',
      idempotencyKey: params.idempotencyKey,
      actorId: params.actorId ?? params.userId,
      subjectUserId: params.userId,
      resourceType: 'provider_visibility_order',
      resourceId: params.sourceId ?? null,
      amount: params.amount,
      currency: this.resolveCurrency(params.wallet.currency),
      walletRow: params.wallet,
      hooks: params.hooks,
      execute: async (tx, operationId) => {
        const wallet = await this.ensurePrismaWallet(tx, params.wallet, params.userId);
        const beforeWallet = this.mapWalletRow(wallet);
        this.assertPositiveAmount(params.amount);
        if (wallet.balance < params.amount || wallet.availableBalance < params.amount) {
          throw new BadRequestException('Solde insuffisant.');
        }

        const updatedWallet = await this.updateWalletWithLock(tx, wallet, {
          balance: wallet.balance - params.amount,
          availableBalance: Math.max(0, wallet.availableBalance - params.amount),
        });

        const transaction = await tx.walletTransaction.create({
          data: {
            id: this.operationScopedId('txn', operationId),
            userId: params.userId,
            type: 'payment',
            amount: params.amount,
            currency: wallet.currency,
            method: 'wallet',
            status: 'completed',
            description: `Billet SenPresta - ${params.productName}`,
            reference: this.operationReference('VIS', operationId),
            occurredAt: new Date(),
            source: 'native',
            metadata: this.toJson({
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
            id: this.operationScopedId('com', operationId),
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
            metadata: this.toJson({
              operation_kind: 'commission',
              financial_operation_id: operationId,
              provider_visibility_order_id: params.sourceId ?? null,
              provider_visibility_product_id: params.productId ?? null,
            }),
          },
        });

        return {
          wallet: this.mapWalletRow(updatedWallet),
          transaction: this.mapWalletTransactionRow(transaction, operationId),
          commission: this.mapCommissionRow(commission, operationId),
          audit: {
            entityType: 'provider_visibility_order',
            entityId: params.sourceId ?? null,
            before: { wallet: beforeWallet },
            after: { wallet: this.mapWalletRow(updatedWallet), provider_visibility_order_id: params.sourceId ?? null },
            reason: params.reason ?? 'provider_visibility_charge',
          },
        };
      },
    });

    return this.projectWalletOperation(params.wallet, params.hooks, result);
  }

  async completePayout(params: CompletePayoutInput): Promise<WalletOperationResult> {
    if (!this.prisma.isConnected) {
      return this.completePayoutProjection(params);
    }

    const result = await this.runPrismaFirstOperation({
      kind: 'payout',
      idempotencyKey: params.idempotencyKey,
      actorId: params.actorId ?? params.userId,
      subjectUserId: params.userId,
      resourceType: 'payout_request',
      resourceId: params.payoutRequestId ?? null,
      amount: params.amount,
      currency: this.resolveCurrency(params.wallet.currency),
      walletRow: params.wallet,
      hooks: params.hooks,
      execute: async (tx, operationId) => {
        const wallet = await this.ensurePrismaWallet(tx, params.wallet, params.userId);
        const beforeWallet = this.mapWalletRow(wallet);
        this.assertPositiveAmount(params.amount);
        if (wallet.balance < params.amount || wallet.availableBalance < params.amount) {
          throw new BadRequestException('Solde insuffisant.');
        }

        const updatedWallet = await this.updateWalletWithLock(tx, wallet, {
          balance: wallet.balance - params.amount,
          availableBalance: Math.max(0, wallet.availableBalance - params.amount),
          pendingPayoutAmount: Math.max(0, wallet.pendingPayoutAmount - params.amount),
        });

        if (params.payoutRequestId) {
          await this.markPayoutPaid(tx, params.payoutRequestId, operationId);
        }

        const transaction = await tx.walletTransaction.create({
          data: {
            id: this.operationScopedId('txn', operationId),
            userId: params.userId,
            type: 'withdrawal',
            amount: params.amount,
            currency: wallet.currency,
            method: params.method ?? 'bank',
            status: 'completed',
            description: `Retrait ${params.payoutLabel}`,
            reference: this.operationReference('OUT', operationId),
            occurredAt: new Date(),
            source: 'native',
            metadata: this.toJson({
              operation_kind: 'payout',
              financial_operation_id: operationId,
              payout_request_id: params.payoutRequestId ?? null,
            }),
          },
        });

        return {
          wallet: this.mapWalletRow(updatedWallet),
          transaction: this.mapWalletTransactionRow(transaction, operationId),
          audit: {
            entityType: 'payout_request',
            entityId: params.payoutRequestId ?? null,
            before: { wallet: beforeWallet },
            after: { wallet: this.mapWalletRow(updatedWallet), payoutRequestId: params.payoutRequestId ?? null },
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
      const existing = await tx.financialOperation.findUnique({
        where: { idempotencyKey: args.idempotencyKey },
      });

      if (existing?.status === 'completed') {
        return this.loadCompletedOperation(tx, existing, args.walletRow);
      }

      if (existing?.status === 'pending') {
        throw new ConflictException('Une operation financiere identique est deja en cours.');
      }

      const operationId = existing?.id ?? this.nextFinancialOperationId(args.kind);
      if (!existing) {
        await tx.financialOperation.create({
          data: {
            id: operationId,
            kind: args.kind,
            status: 'pending',
            idempotencyKey: args.idempotencyKey,
            actorId: args.actorId ?? null,
            subjectUserId: args.subjectUserId ?? null,
            resourceType: args.resourceType ?? null,
            resourceId: args.resourceId ?? null,
            amount: this.toNullableInt(args.amount),
            currency: args.currency ?? null,
            metadata: this.toJson({
              reason: 'wallet_service',
              financial_operation_id: operationId,
              idempotency_key: args.idempotencyKey,
            }),
          },
        });
      } else {
        await tx.financialOperation.update({
          where: { id: existing.id },
          data: {
            status: 'pending',
            actorId: args.actorId ?? existing.actorId ?? null,
            subjectUserId: args.subjectUserId ?? existing.subjectUserId ?? null,
            resourceType: args.resourceType ?? existing.resourceType ?? null,
            resourceId: args.resourceId ?? existing.resourceId ?? null,
            amount: this.toNullableInt(args.amount) ?? existing.amount,
            currency: args.currency ?? existing.currency ?? null,
          },
        });
      }

      const result = await args.execute(tx, operationId);
      await tx.financialOperation.update({
        where: { id: operationId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          metadata: this.toJson({
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
      targetId: this.toNullableString(completed.audit?.entityId ?? args.resourceId ?? completed.wallet.id),
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
      create: this.buildEscrowCreateInput(row),
      update: this.buildEscrowUpdateInput(row),
    });
    const mapped = this.mapEscrowRow(synced);

    await this.auditLogService.record({
      scope: 'finance',
      action: before ? 'escrow.sync' : 'escrow.create',
      userId: options.actorId ?? undefined,
      targetType: 'escrow',
      targetId: escrowId,
      financialOperationId: this.toNullableString(row.financial_operation_id),
      reason: options.reason ?? (before ? 'escrow_sync' : 'escrow_create'),
      before: before ? this.mapEscrowRow(before) : null,
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
      create: this.buildUserSubscriptionCreateInput(row),
      update: this.buildUserSubscriptionUpdateInput(row),
    });
    const mapped = this.mapUserSubscriptionRow(synced);

    await this.auditLogService.record({
      scope: 'finance',
      action: before ? 'subscription.sync' : 'subscription.create',
      userId: options.actorId ?? undefined,
      targetType: 'subscription',
      targetId: subscriptionId,
      financialOperationId: this.toNullableString(row.financial_operation_id),
      reason: options.reason ?? (before ? 'subscription_sync' : 'subscription_create'),
      before: before ? this.mapUserSubscriptionRow(before) : null,
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
    const metadata = this.toRecord(operation.metadata);
    const walletId = this.toNullableString(metadata.walletId) ?? String(walletRow.id ?? '');
    const transactionId = this.toNullableString(metadata.transactionId);
    const commissionEntryId = this.toNullableString(metadata.commissionEntryId);

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
      wallet: wallet ? this.mapWalletRow(wallet) : this.mapWalletRowFromProjection(walletRow),
      transaction: transaction ? this.mapWalletTransactionRow(transaction, operation.id) : undefined,
      commission: commission ? this.mapCommissionRow(commission, operation.id) : undefined,
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
        currency: this.resolveCurrency(walletRow.currency),
        balance: this.toAmount(walletRow.balance),
        availableBalance: this.toAmount(walletRow.available_balance ?? walletRow.balance),
        heldBalance: this.toAmount(walletRow.held_balance),
        pendingReleaseBalance: this.toAmount(walletRow.pending_release_balance),
        pendingPayoutAmount: this.toAmount(walletRow.pending_payout_amount),
        source: 'native',
        metadata: this.toJson({
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
        metadata: this.toJson({
          ...(this.toRecord(wallet.metadata)),
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

  private async markEscrowReleased(
    tx: Prisma.TransactionClient,
    escrowId: string,
    operationId: string,
  ) {
    const escrow = await tx.escrowCase.findUnique({ where: { id: escrowId } });
    if (!escrow) {
      return;
    }

    if (escrow.status === 'released') {
      return;
    }

    const allowedStatuses = ['funded', 'assigned', 'in_progress', 'delivery_review'];
    const updated = await tx.escrowCase.updateMany({
      where: {
        id: escrowId,
        status: { in: allowedStatuses },
      },
      data: {
        status: 'released',
        releasedAt: new Date(),
        metadata: this.toJson({
          ...(this.toRecord(escrow.metadata)),
          financial_operation_id: operationId,
          operation_kind: 'escrow_release',
        }),
      },
    });

    if (updated.count !== 1) {
      throw new ConflictException('Le sequestre a deja ete traite ou n est plus liberable.');
    }
  }

  private async markEscrowRefunded(
    tx: Prisma.TransactionClient,
    escrowId: string,
    operationId: string,
  ) {
    const escrow = await tx.escrowCase.findUnique({ where: { id: escrowId } });
    if (!escrow) {
      return;
    }

    if (escrow.status === 'refunded') {
      return;
    }

    const allowedStatuses = ['funded', 'assigned', 'in_progress', 'delivery_review'];
    const updated = await tx.escrowCase.updateMany({
      where: {
        id: escrowId,
        status: { in: allowedStatuses },
      },
      data: {
        status: 'refunded',
        refundedAt: new Date(),
        metadata: this.toJson({
          ...(this.toRecord(escrow.metadata)),
          financial_operation_id: operationId,
          operation_kind: 'refund',
        }),
      },
    });

    if (updated.count !== 1) {
      throw new ConflictException('Le sequestre a deja ete rembourse ou n est plus remboursable.');
    }
  }

  private async markPayoutPaid(
    tx: Prisma.TransactionClient,
    payoutRequestId: string,
    operationId: string,
  ) {
    const request = await tx.payoutRequest.findUnique({ where: { id: payoutRequestId } });
    if (!request) {
      return;
    }

    if (request.status === 'paid') {
      return;
    }

    const updated = await tx.payoutRequest.updateMany({
      where: {
        id: payoutRequestId,
        status: { in: ['approved', 'pending', 'processing'] },
      },
      data: {
        status: 'paid',
        processedAt: new Date(),
        metadata: this.toJson({
          ...(this.toRecord(request.metadata)),
          financial_operation_id: operationId,
          operation_kind: 'payout',
        }),
      },
    });

    if (updated.count !== 1) {
      throw new ConflictException('La demande de retrait a deja ete traitee ou n est plus payable.');
    }
  }

  private async upsertSubscriptionChargeState(
    tx: Prisma.TransactionClient,
    params: ChargeSubscriptionInput,
    operationId: string,
  ) {
    const existing = await tx.userSubscription.findUnique({
      where: { id: String(params.sourceId) },
    });

    if (!existing) {
      await tx.userSubscription.create({
        data: {
          id: String(params.sourceId),
          userId: params.userId,
          role: String(params.role ?? 'unknown'),
          planId: String(params.planId ?? 'unknown-plan'),
          planName: params.planName,
          status: 'active',
          amount: params.amount,
          currency: this.resolveCurrency(params.wallet.currency),
          commissionRate: Number(params.commissionRate ?? 0),
          autoRenew: Boolean(params.autoRenew ?? false),
          startedAt: this.toDate(params.startedAt),
          renewsAt: this.toDate(params.renewsAt),
          lastBilledAt: this.toDate(params.lastBilledAt) ?? new Date(),
          source: 'native',
          metadata: this.toJson({
            financial_operation_id: operationId,
            operation_kind: 'subscription_charge',
          }),
        },
      });
      return;
    }

    await tx.userSubscription.update({
      where: { id: existing.id },
      data: {
        status: 'active',
        amount: params.amount,
        currency: this.resolveCurrency(params.wallet.currency),
        lastBilledAt: this.toDate(params.lastBilledAt) ?? existing.lastBilledAt ?? new Date(),
        renewsAt: this.toDate(params.renewsAt) ?? existing.renewsAt,
        metadata: this.toJson({
          ...(this.toRecord(existing.metadata)),
          financial_operation_id: operationId,
          operation_kind: 'subscription_charge',
        }),
      },
    });
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
        ...(this.toRecord(target.metadata)),
        ...(this.toRecord(source.metadata)),
      },
    });
    hooks.syncWalletRow(target);
  }

  private mapWalletRow(wallet: Wallet): Row {
    const metadata = this.toRecord(wallet.metadata);
    return {
      ...(metadata.app_row_snapshot && typeof metadata.app_row_snapshot === 'object' ? this.clone(metadata.app_row_snapshot as Record<string, unknown>) : {}),
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
            ...(this.toRecord(metadata.app_row_snapshot)),
            financial_source: wallet.source,
          }
        : {
            financial_source: wallet.source,
          },
    };
  }

  private mapWalletRowFromProjection(wallet: Row): Row {
    return {
      ...wallet,
      id: wallet.id,
      user_id: wallet.user_id,
      balance: this.toAmount(wallet.balance),
      currency: this.resolveCurrency(wallet.currency),
      available_balance: this.toAmount(wallet.available_balance ?? wallet.balance),
      held_balance: this.toAmount(wallet.held_balance),
      pending_release_balance: this.toAmount(wallet.pending_release_balance),
      pending_payout_amount: this.toAmount(wallet.pending_payout_amount),
      updated_at: this.toIsoString(wallet.updated_at) ?? new Date().toISOString(),
      created_at: this.toIsoString(wallet.created_at) ?? new Date().toISOString(),
    };
  }

  private mapWalletTransactionRow(transaction: WalletTransaction, financialOperationId?: string): Row {
    const metadata = this.toRecord(transaction.metadata);
    return {
      ...(metadata.app_row_snapshot && typeof metadata.app_row_snapshot === 'object' ? this.clone(metadata.app_row_snapshot as Record<string, unknown>) : {}),
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
      financial_operation_id: financialOperationId ?? this.toNullableString(metadata.financial_operation_id),
      metadata: {
        ...metadata,
        financial_operation_id: financialOperationId ?? this.toNullableString(metadata.financial_operation_id),
      },
    };
  }

  private mapCommissionRow(entry: CommissionLedgerEntry, financialOperationId?: string): Row {
    const metadata = this.toRecord(entry.metadata);
    return {
      ...(metadata.app_row_snapshot && typeof metadata.app_row_snapshot === 'object' ? this.clone(metadata.app_row_snapshot as Record<string, unknown>) : {}),
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
      financial_operation_id: financialOperationId ?? this.toNullableString(metadata.financial_operation_id),
      metadata: {
        ...metadata,
        financial_operation_id: financialOperationId ?? this.toNullableString(metadata.financial_operation_id),
      },
    };
  }

  private mapEscrowRow(escrow: {
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
  }): Row {
    const metadata = this.toRecord(escrow.metadata);
    return {
      ...(metadata.app_row_snapshot && typeof metadata.app_row_snapshot === 'object' ? this.clone(metadata.app_row_snapshot as Record<string, unknown>) : {}),
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
      financial_operation_id: this.toNullableString(metadata.financial_operation_id),
      created_at: escrow.createdAt.toISOString(),
      updated_at: escrow.updatedAt.toISOString(),
    };
  }

  private mapUserSubscriptionRow(subscription: {
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
  }): Row {
    const metadata = this.toRecord(subscription.metadata);
    return {
      ...(metadata.app_row_snapshot && typeof metadata.app_row_snapshot === 'object' ? this.clone(metadata.app_row_snapshot as Record<string, unknown>) : {}),
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
      financial_operation_id: this.toNullableString(metadata.financial_operation_id),
      created_at: subscription.createdAt.toISOString(),
      updated_at: subscription.updatedAt.toISOString(),
    };
  }

  private holdFundsProjection(params: HoldFundsInput): WalletOperationResult {
    const operationId = this.nextFinancialOperationId('escrow_hold');
    const debit = this.debitProjection({
      wallet: params.wallet,
      userId: params.userId,
      amount: params.amount,
      type: 'payment',
      method: params.method ?? 'wallet',
      description: `Sequestre C2P - ${params.serviceLabel}`,
      financialOperationId: operationId,
      hooks: params.hooks,
    });

    return {
      financialOperationId: operationId,
      transaction: debit.transaction,
    };
  }

  private releaseEscrowProjection(params: ReleaseEscrowInput): WalletOperationResult {
    const operationId = this.nextFinancialOperationId('escrow_release');
    const credit = this.creditProjection({
      wallet: params.wallet,
      userId: params.userId,
      amount: params.providerAmount,
      type: 'deposit',
      method: 'wallet',
      description: `Liberation sequestre - ${params.serviceLabel}`,
      financialOperationId: operationId,
      hooks: params.hooks,
    });

    const commission = this.recordCommissionProjection({
      sourceType: 'booking',
      sourceId: params.bookingId ?? params.escrowId ?? null,
      userId: params.userId,
      amount: params.platformFeeAmount,
      description: `Commission C2P - ${params.serviceLabel}`,
      financialOperationId: operationId,
      hooks: params.hooks,
    });

    return {
      financialOperationId: operationId,
      transaction: credit.transaction,
      commission: commission.entry,
    };
  }

  private refundProjection(params: RefundInput): WalletOperationResult {
    const operationId = this.nextFinancialOperationId('refund');
    const credit = this.creditProjection({
      wallet: params.wallet,
      userId: params.userId,
      amount: params.amount,
      type: 'refund',
      method: 'wallet',
      description: `Remboursement sequestre - ${params.serviceLabel}`,
      financialOperationId: operationId,
      hooks: params.hooks,
    });

    return {
      financialOperationId: operationId,
      transaction: credit.transaction,
    };
  }

  private chargeSubscriptionProjection(params: ChargeSubscriptionInput): WalletOperationResult {
    const operationId = this.nextFinancialOperationId('subscription_charge');
    const debit = this.debitProjection({
      wallet: params.wallet,
      userId: params.userId,
      amount: params.amount,
      type: 'payment',
      method: 'wallet',
      description: `Abonnement ${params.planName}`,
      financialOperationId: operationId,
      hooks: params.hooks,
    });

    const commission = this.recordCommissionProjection({
      sourceType: 'subscription',
      sourceId: params.sourceId ?? null,
      userId: params.userId,
      amount: params.amount,
      description: `Abonnement ${params.planName}`,
      financialOperationId: operationId,
      hooks: params.hooks,
    });

    return {
      financialOperationId: operationId,
      transaction: debit.transaction,
      commission: commission.entry,
    };
  }

  private chargeProviderVisibilityProjection(params: ChargeProviderVisibilityInput): WalletOperationResult {
    const operationId = this.nextFinancialOperationId('provider_visibility_charge');
    const debit = this.debitProjection({
      wallet: params.wallet,
      userId: params.userId,
      amount: params.amount,
      type: 'payment',
      method: 'wallet',
      description: `Billet SenPresta - ${params.productName}`,
      financialOperationId: operationId,
      metadata: {
        provider_visibility_order_id: params.sourceId ?? null,
        provider_visibility_product_id: params.productId ?? null,
        pass_tier: params.tier ?? null,
      },
      hooks: params.hooks,
    });

    const commission = this.recordCommissionProjection({
      sourceType: 'provider_visibility_order',
      sourceId: params.sourceId ?? null,
      userId: params.userId,
      amount: params.amount,
      description: `Billet SenPresta - ${params.productName}`,
      financialOperationId: operationId,
      hooks: params.hooks,
    });

    return {
      financialOperationId: operationId,
      transaction: debit.transaction,
      commission: commission.entry,
    };
  }

  private completePayoutProjection(params: CompletePayoutInput): WalletOperationResult {
    const operationId = this.nextFinancialOperationId('payout');
    const debit = this.debitProjection({
      wallet: params.wallet,
      userId: params.userId,
      amount: params.amount,
      type: 'withdrawal',
      method: params.method ?? 'bank',
      description: `Retrait ${params.payoutLabel}`,
      financialOperationId: operationId,
      hooks: params.hooks,
    });

    return {
      financialOperationId: operationId,
      transaction: debit.transaction,
    };
  }

  private debitProjection(input: DebitInput) {
    const operationId = input.financialOperationId ?? this.nextFinancialOperationId('debit');
    const currentBalance = this.toAmount(input.wallet.balance);
    if (currentBalance < input.amount) {
      throw new BadRequestException('Solde insuffisant.');
    }

    input.wallet.balance = currentBalance - input.amount;
    input.wallet.updated_at = new Date().toISOString();
    input.hooks.syncWalletRow(input.wallet);

    const transaction = input.hooks.appendPaymentTransaction({
      user_id: input.userId,
      type: input.type ?? 'payment',
      amount: input.amount,
      method: input.method ?? 'wallet',
      description: input.description,
      financial_operation_id: operationId,
      metadata: {
        operation_kind: input.type ?? 'payment',
        financial_operation_id: operationId,
        ...(input.metadata ?? {}),
      },
    });

    return { financialOperationId: operationId, transaction };
  }

  private creditProjection(input: CreditInput) {
    const operationId = input.financialOperationId ?? this.nextFinancialOperationId('credit');
    const currentBalance = this.toAmount(input.wallet.balance);

    input.wallet.balance = currentBalance + input.amount;
    input.wallet.updated_at = new Date().toISOString();
    input.hooks.syncWalletRow(input.wallet);

    const transaction = input.hooks.appendPaymentTransaction({
      user_id: input.userId,
      type: input.type ?? 'deposit',
      amount: input.amount,
      method: input.method ?? 'wallet',
      description: input.description,
      financial_operation_id: operationId,
      metadata: {
        operation_kind: input.type ?? 'deposit',
        financial_operation_id: operationId,
        ...(input.metadata ?? {}),
      },
    });

    return { financialOperationId: operationId, transaction };
  }

  private recordCommissionProjection(input: CommissionInput) {
    const operationId = input.financialOperationId ?? this.nextFinancialOperationId('commission');
    const entry = input.hooks.appendCommissionEntry({
      source_type: input.sourceType,
      source_id: input.sourceId ?? null,
      user_id: input.userId ?? null,
      beneficiary_user_id: input.beneficiaryUserId ?? 'usr-admin',
      amount: input.amount,
      description: input.description,
      financial_operation_id: operationId,
      metadata: {
        operation_kind: 'commission',
        financial_operation_id: operationId,
      },
    });

    return { financialOperationId: operationId, entry };
  }

  private resolveCurrency(value: unknown) {
    const currency = this.toNullableString(value);
    return currency ?? 'XAF';
  }

  private operationScopedId(prefix: string, operationId: string) {
    return `${prefix}_${operationId}`;
  }

  private operationReference(prefix: string, operationId: string) {
    return `${prefix}-${operationId.toUpperCase()}`;
  }

  private buildEscrowCreateInput(row: Row): Prisma.EscrowCaseCreateInput {
    return {
      id: String(row.id),
      bookingId: this.toNullableString(row.booking_id),
      clientId: this.toNullableString(row.client_id),
      providerId: this.toNullableString(row.provider_id),
      providerUserId: this.toNullableString(row.provider_user_id),
      requestedProviderId: this.toNullableString(row.requested_provider_id),
      service: this.toNullableString(row.service),
      amountTotal: this.toAmount(row.amount_total),
      currency: this.resolveCurrency(row.currency),
      platformFeeAmount: this.toAmount(row.platform_fee_amount),
      providerAmount: this.toAmount(row.provider_amount),
      status: this.toNullableString(row.status) ?? 'draft',
      fundedAt: this.toDate(row.funded_at),
      releasedAt: this.toDate(row.released_at),
      refundedAt: this.toDate(row.refunded_at),
      note: this.toNullableString(row.note),
      paymentTransactionId: this.toNullableString(row.payment_transaction_id),
      source: 'native',
      metadata: this.toJson({
        financial_operation_id: this.toNullableString(row.financial_operation_id) ?? null,
        app_row_snapshot: row,
      }),
      createdAt: this.toDate(row.created_at) ?? new Date(),
      updatedAt: this.toDate(row.updated_at) ?? new Date(),
    };
  }

  private buildEscrowUpdateInput(row: Row): Prisma.EscrowCaseUpdateInput {
    return {
      bookingId: this.toNullableString(row.booking_id),
      clientId: this.toNullableString(row.client_id),
      providerId: this.toNullableString(row.provider_id),
      providerUserId: this.toNullableString(row.provider_user_id),
      requestedProviderId: this.toNullableString(row.requested_provider_id),
      service: this.toNullableString(row.service),
      amountTotal: this.toAmount(row.amount_total),
      currency: this.resolveCurrency(row.currency),
      platformFeeAmount: this.toAmount(row.platform_fee_amount),
      providerAmount: this.toAmount(row.provider_amount),
      status: this.toNullableString(row.status) ?? 'draft',
      fundedAt: this.toDate(row.funded_at),
      releasedAt: this.toDate(row.released_at),
      refundedAt: this.toDate(row.refunded_at),
      note: this.toNullableString(row.note),
      paymentTransactionId: this.toNullableString(row.payment_transaction_id),
      metadata: this.toJson({
        financial_operation_id: this.toNullableString(row.financial_operation_id) ?? null,
        app_row_snapshot: row,
      }),
      updatedAt: this.toDate(row.updated_at) ?? new Date(),
    };
  }

  private buildUserSubscriptionCreateInput(row: Row): Prisma.UserSubscriptionCreateInput {
    return {
      id: String(row.id),
      userId: String(row.user_id),
      role: this.toNullableString(row.role) ?? 'unknown',
      planId: this.toNullableString(row.plan_id) ?? 'unknown-plan',
      planName: this.toNullableString(row.plan_name) ?? 'Plan',
      status: this.toNullableString(row.status) ?? 'inactive',
      amount: this.toAmount(row.amount),
      currency: this.resolveCurrency(row.currency),
      commissionRate: Number(row.commission_rate ?? 0),
      autoRenew: Boolean(row.auto_renew ?? false),
      startedAt: this.toDate(row.started_at),
      renewsAt: this.toDate(row.renews_at),
      lastBilledAt: this.toDate(row.last_billed_at),
      endedAt: this.toDate(row.ended_at),
      source: 'native',
      metadata: this.toJson({
        financial_operation_id: this.toNullableString(row.financial_operation_id) ?? null,
        app_row_snapshot: row,
      }),
      createdAt: this.toDate(row.created_at) ?? new Date(),
      updatedAt: this.toDate(row.updated_at) ?? new Date(),
    };
  }

  private buildUserSubscriptionUpdateInput(row: Row): Prisma.UserSubscriptionUpdateInput {
    return {
      role: this.toNullableString(row.role) ?? 'unknown',
      planId: this.toNullableString(row.plan_id) ?? 'unknown-plan',
      planName: this.toNullableString(row.plan_name) ?? 'Plan',
      status: this.toNullableString(row.status) ?? 'inactive',
      amount: this.toAmount(row.amount),
      currency: this.resolveCurrency(row.currency),
      commissionRate: Number(row.commission_rate ?? 0),
      autoRenew: Boolean(row.auto_renew ?? false),
      startedAt: this.toDate(row.started_at),
      renewsAt: this.toDate(row.renews_at),
      lastBilledAt: this.toDate(row.last_billed_at),
      endedAt: this.toDate(row.ended_at),
      metadata: this.toJson({
        financial_operation_id: this.toNullableString(row.financial_operation_id) ?? null,
        app_row_snapshot: row,
      }),
      updatedAt: this.toDate(row.updated_at) ?? new Date(),
    };
  }

  private assertPositiveAmount(amount: number) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Le montant est invalide.');
    }
  }

  private toJson(value: unknown) {
    return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
  }

  private toRecord(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {} as Record<string, unknown>;
    }
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  }

  private toNullableString(value: unknown) {
    if (value === null || value === undefined) {
      return undefined;
    }
    const normalized = String(value).trim();
    return normalized ? normalized : undefined;
  }

  private toNullableInt(value: unknown) {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }
    return this.toAmount(value);
  }

  private toDate(value: unknown) {
    if (!value) return undefined;
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  private toIsoString(value: unknown) {
    const date = this.toDate(value);
    return date?.toISOString();
  }

  private toAmount(value: unknown) {
    const amount = Number(value);
    return Number.isFinite(amount) ? Math.round(amount) : 0;
  }

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }
}
