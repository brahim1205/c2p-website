import type { Row } from '../data/mock-store.js';

export interface WalletMutationHooks {
  syncWalletRow: (wallet: Row) => void;
  appendPaymentTransaction: (payload: Row) => Row;
  appendCommissionEntry: (payload: Row) => Row;
}

export interface DebitInput {
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

export interface CreditInput {
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

export interface CommissionInput {
  sourceType: string;
  sourceId?: string | null;
  userId?: string | null;
  beneficiaryUserId?: string | null;
  amount: number;
  description: string;
  financialOperationId?: string;
  hooks: WalletMutationHooks;
}

export interface WalletOperationResult {
  financialOperationId: string;
  transaction: Row;
  commission?: Row;
}

export interface PrismaOperationPayload {
  walletId?: string | null;
  transactionId?: string | null;
  commissionEntryId?: string | null;
  transaction?: Row;
  commission?: Row;
}

export type PrismaFirstResult = {
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

export interface PrismaFirstBaseInput {
  wallet: Row;
  userId: string;
  hooks: WalletMutationHooks;
  idempotencyKey: string;
  actorId?: string | null;
  reason?: string;
}

export interface HoldFundsInput extends PrismaFirstBaseInput {
  amount: number;
  serviceLabel: string;
  method?: string | null;
  bookingId?: string | null;
}

export interface ReleaseEscrowInput extends PrismaFirstBaseInput {
  providerAmount: number;
  platformFeeAmount: number;
  serviceLabel: string;
  bookingId?: string | null;
  escrowId?: string | null;
}

export interface RefundInput extends PrismaFirstBaseInput {
  amount: number;
  serviceLabel: string;
  escrowId?: string | null;
}

export interface ChargeSubscriptionInput extends PrismaFirstBaseInput {
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

export interface ChargeProviderVisibilityInput extends PrismaFirstBaseInput {
  amount: number;
  productName: string;
  sourceId?: string | null;
  productId?: string | null;
  tier?: string | null;
}

export interface CompletePayoutInput extends PrismaFirstBaseInput {
  amount: number;
  payoutLabel: string;
  method?: string | null;
  payoutRequestId?: string | null;
}

export interface WalletTopupInput extends PrismaFirstBaseInput {
  amount: number;
  method?: string | null;
  description?: string | null;
  type?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface WalletWithdrawInput extends PrismaFirstBaseInput {
  amount: number;
  method?: string | null;
  description?: string | null;
  type?: string | null;
  metadata?: Record<string, unknown> | null;
}
