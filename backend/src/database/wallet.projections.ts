import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  ChargeProviderVisibilityInput,
  ChargeSubscriptionInput,
  CommissionInput,
  CompletePayoutInput,
  CreditInput,
  DebitInput,
  HoldFundsInput,
  RefundInput,
  ReleaseEscrowInput,
  WalletOperationResult,
} from './wallet.types.js';

export function nextFinancialOperationId(kind = 'op') {
  return `finop_${kind}_${Date.now()}_${randomUUID()}`;
}

function toAmount(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount) : 0;
}

export function debitProjection(input: DebitInput) {
  const operationId = input.financialOperationId ?? nextFinancialOperationId('debit');
  const currentBalance = toAmount(input.wallet.balance);
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

export function creditProjection(input: CreditInput) {
  const operationId = input.financialOperationId ?? nextFinancialOperationId('credit');
  const currentBalance = toAmount(input.wallet.balance);

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

export function recordCommissionProjection(input: CommissionInput) {
  const operationId = input.financialOperationId ?? nextFinancialOperationId('commission');
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

export function holdFundsProjection(params: HoldFundsInput): WalletOperationResult {
  const operationId = nextFinancialOperationId('escrow_hold');
  const debit = debitProjection({
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

export function releaseEscrowProjection(params: ReleaseEscrowInput): WalletOperationResult {
  const operationId = nextFinancialOperationId('escrow_release');
  const credit = creditProjection({
    wallet: params.wallet,
    userId: params.userId,
    amount: params.providerAmount,
    type: 'deposit',
    method: 'wallet',
    description: `Liberation sequestre - ${params.serviceLabel}`,
    financialOperationId: operationId,
    hooks: params.hooks,
  });

  const commission = recordCommissionProjection({
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

export function refundProjection(params: RefundInput): WalletOperationResult {
  const operationId = nextFinancialOperationId('refund');
  const credit = creditProjection({
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

export function chargeSubscriptionProjection(params: ChargeSubscriptionInput): WalletOperationResult {
  const operationId = nextFinancialOperationId('subscription_charge');
  const debit = debitProjection({
    wallet: params.wallet,
    userId: params.userId,
    amount: params.amount,
    type: 'payment',
    method: 'wallet',
    description: `Abonnement ${params.planName}`,
    financialOperationId: operationId,
    hooks: params.hooks,
  });

  const commission = recordCommissionProjection({
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

export function chargeProviderVisibilityProjection(params: ChargeProviderVisibilityInput): WalletOperationResult {
  const operationId = nextFinancialOperationId('provider_visibility_charge');
  const debit = debitProjection({
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

  const commission = recordCommissionProjection({
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

export function completePayoutProjection(params: CompletePayoutInput): WalletOperationResult {
  const operationId = nextFinancialOperationId('payout');
  const debit = debitProjection({
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
