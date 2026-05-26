import { useMemo } from 'react';
import { isMonetizedRole } from '@/lib/publicSubscriptions';
import {
  resolvePaymentLifecycleStatus,
  resolvePaymentUiCapabilitiesFromSnapshot,
} from '@/lib/paymentStatus';
import type {
  CommissionEntry,
  EscrowCase,
  FinanceCapabilitySnapshot,
  PayoutAccount,
  PayoutRequest,
  ProviderVisibilityOrder,
  ProviderVisibilityPassRecord,
  SubscriptionPlan,
  UserSubscription,
  WalletAccount,
} from '@/lib/saasApi';
import {
  isProviderBackedTransaction,
  type Transaction,
} from './paymentPageModel';

export interface FinanceContextParams {
  contextFinancialOperationId: string;
  contextInvoiceNumber: string;
  contextTransactionId: string;
  contextProviderReference: string;
  contextView: string;
  selectedPlanId: string;
  selectedPlanName: string;
  selectedPlanRole: string;
}

export function readFinanceContextParams(searchParams: URLSearchParams): FinanceContextParams {
  return {
    contextFinancialOperationId: searchParams.get('financialOperationId')?.trim() || '',
    contextInvoiceNumber: searchParams.get('invoice')?.trim() || '',
    contextTransactionId: searchParams.get('transaction')?.trim() || '',
    contextProviderReference: searchParams.get('providerReference')?.trim() || '',
    contextView: searchParams.get('view')?.trim() || '',
    selectedPlanId: searchParams.get('plan')?.trim() || '',
    selectedPlanName: searchParams.get('planName')?.trim() || '',
    selectedPlanRole: searchParams.get('planRole')?.trim() || '',
  };
}

export function hasFinanceContext(params: Pick<FinanceContextParams, 'contextFinancialOperationId' | 'contextInvoiceNumber' | 'contextTransactionId' | 'contextProviderReference'>) {
  return Boolean(
    params.contextFinancialOperationId
    || params.contextInvoiceNumber
    || params.contextTransactionId
    || params.contextProviderReference,
  );
}

export function transactionMatchesFinanceContext(
  transaction: Transaction,
  params: Pick<FinanceContextParams, 'contextFinancialOperationId' | 'contextTransactionId' | 'contextProviderReference'>,
) {
  const matchesTransaction = params.contextTransactionId ? String(transaction.id) === params.contextTransactionId : false;
  const matchesFinancialOperation = params.contextFinancialOperationId
    ? String(transaction.financial_operation_id || '') === params.contextFinancialOperationId
    : false;
  const matchesProviderReference = params.contextProviderReference
    ? [transaction.provider_reference, transaction.provider_order_id, transaction.reference].some((value) => String(value || '') === params.contextProviderReference)
    : false;

  return matchesTransaction || matchesFinancialOperation || matchesProviderReference;
}

export function filterPaymentTransactions({
  context,
  filterStatus,
  filterType,
  hasContext,
  transactions,
}: {
  context: Pick<FinanceContextParams, 'contextFinancialOperationId' | 'contextTransactionId' | 'contextProviderReference'>;
  filterStatus: Transaction['status'] | 'all';
  filterType: Transaction['type'] | 'all';
  hasContext: boolean;
  transactions: Transaction[];
}) {
  return transactions.filter((transaction) => {
    if (filterType !== 'all' && transaction.type !== filterType) return false;
    if (filterStatus !== 'all' && transaction.status !== filterStatus) return false;
    if (hasContext && !transactionMatchesFinanceContext(transaction, context)) return false;
    return true;
  });
}

export function getMissingTransactionCapabilityIds({
  capabilities,
  selectedTransaction,
  transactions,
}: {
  capabilities: Record<string, FinanceCapabilitySnapshot>;
  selectedTransaction: Transaction | null;
  transactions: Transaction[];
}) {
  const candidateIds = Array.from(new Set(
    [
      ...transactions.map((transaction) => String(transaction.id)),
      selectedTransaction ? String(selectedTransaction.id) : null,
    ].filter((value): value is string => Boolean(value)),
  ));

  return candidateIds.filter((id) => !capabilities[id]);
}

export function buildRelatedInvoicesPath(transaction: Transaction) {
  const params = new URLSearchParams();
  if (transaction.financial_operation_id) {
    params.set('financialOperationId', transaction.financial_operation_id);
  }
  if (transaction.id) {
    params.set('transaction', transaction.id);
  }
  return `/dashboard/factures${params.toString() ? `?${params.toString()}` : ''}`;
}

export function getTransactionCapabilitySnapshot(
  capabilities: Record<string, FinanceCapabilitySnapshot>,
  transaction: Transaction,
) {
  return capabilities[String(transaction.id)] ?? null;
}

export function getTransactionLifecycleState(
  capabilities: Record<string, FinanceCapabilitySnapshot>,
  transaction: Transaction,
) {
  const backendState = getTransactionCapabilitySnapshot(capabilities, transaction)?.currentState;
  if (backendState && ['initiated', 'pending_provider', 'processing', 'confirmed', 'failed', 'refunded', 'reconciled'].includes(backendState)) {
    return backendState as NonNullable<Transaction['lifecycle_status']>;
  }
  return resolvePaymentLifecycleStatus(transaction);
}

export function getSelfServiceCapabilities(
  capabilities: Record<string, FinanceCapabilitySnapshot>,
  transaction: Transaction,
  context: 'transaction_list' | 'transaction_modal' | 'provider_console' = 'transaction_list',
) {
  return resolvePaymentUiCapabilitiesFromSnapshot(getTransactionCapabilitySnapshot(capabilities, transaction), {
    status: resolvePaymentLifecycleStatus(transaction),
    role: 'self_service',
    context,
    providerBacked: isProviderBackedTransaction(transaction),
    transactionType: transaction.type,
  });
}

export function useFinanceContextRelations({
  contextFinancialOperationId,
  contextProviderReference,
  contextTransactionId,
  transactions,
  escrowCases,
  payoutRequests,
  subscriptions,
  commissionEntries,
}: {
  contextFinancialOperationId: string;
  contextProviderReference: string;
  contextTransactionId: string;
  transactions: Transaction[];
  escrowCases: EscrowCase[];
  payoutRequests: PayoutRequest[];
  subscriptions: UserSubscription[];
  commissionEntries: CommissionEntry[];
}) {
  const relatedTransactions = useMemo(
    () => transactions.filter((transaction) => {
      if (contextTransactionId && String(transaction.id) === contextTransactionId) return true;
      if (contextFinancialOperationId && String(transaction.financial_operation_id || '') === contextFinancialOperationId) return true;
      if (contextProviderReference && [transaction.provider_reference, transaction.provider_order_id, transaction.reference].some((value) => String(value || '') === contextProviderReference)) return true;
      return false;
    }),
    [contextFinancialOperationId, contextProviderReference, contextTransactionId, transactions],
  );

  const relatedEscrows = useMemo(
    () => contextFinancialOperationId
      ? escrowCases.filter((entry) => String(entry.financial_operation_id || '') === contextFinancialOperationId)
      : [],
    [contextFinancialOperationId, escrowCases],
  );

  const relatedPayoutRequests = useMemo(
    () => contextFinancialOperationId
      ? payoutRequests.filter((entry) => String(entry.financial_operation_id || '') === contextFinancialOperationId)
      : [],
    [contextFinancialOperationId, payoutRequests],
  );

  const relatedSubscriptions = useMemo(
    () => contextFinancialOperationId
      ? subscriptions.filter((entry) => String(entry.financial_operation_id || '') === contextFinancialOperationId)
      : [],
    [contextFinancialOperationId, subscriptions],
  );

  const relatedCommissionEntries = useMemo(
    () => contextFinancialOperationId
      ? commissionEntries.filter((entry) => String(entry.financial_operation_id || '') === contextFinancialOperationId)
      : [],
    [commissionEntries, contextFinancialOperationId],
  );

  return {
    relatedTransactions,
    relatedEscrows,
    relatedPayoutRequests,
    relatedSubscriptions,
    relatedCommissionEntries,
  };
}

export function usePaymentDerivedState({
  userRole,
  walletDetails,
  transactions,
  subscriptions,
  subscriptionPlans,
  providerVisibilityPasses,
  providerVisibilityOrders,
  escrowCases,
  commissionEntries,
  payoutAccounts,
  selectedPlanId,
}: {
  userRole?: string | null;
  walletDetails: WalletAccount | null;
  transactions: Transaction[];
  subscriptions: UserSubscription[];
  subscriptionPlans: SubscriptionPlan[];
  providerVisibilityPasses: ProviderVisibilityPassRecord[];
  providerVisibilityOrders: ProviderVisibilityOrder[];
  escrowCases: EscrowCase[];
  commissionEntries: CommissionEntry[];
  payoutAccounts: PayoutAccount[];
  selectedPlanId: string;
}) {
  const walletBalance = Number(walletDetails?.balance ?? 0);
  const activeSubscription = subscriptions.find((subscription) => subscription.status === 'active' || subscription.status === 'trialing') ?? null;
  const monetizedRole = userRole ? isMonetizedRole(userRole) : false;
  const activeProviderVisibilityPass = providerVisibilityPasses.find((entry) => entry.status === 'active') ?? null;
  const latestProviderVisibilityOrder = providerVisibilityOrders[0] ?? null;
  const selectedPlan = selectedPlanId
    ? subscriptionPlans.find((plan) => String(plan.id) === selectedPlanId) ?? null
    : null;
  const selectedPlanUnavailable = Boolean(selectedPlanId) && !selectedPlan && subscriptionPlans.length > 0;
  const availableWalletBalance = Number(walletDetails?.available_balance ?? walletBalance);
  const heldWalletBalance = Number(walletDetails?.held_balance ?? 0);
  const pendingReleaseBalance = Number(walletDetails?.pending_release_balance ?? 0);
  const pendingPayoutAmount = Number(walletDetails?.pending_payout_amount ?? 0);
  const defaultPayoutAccount = payoutAccounts.find((account) => account.is_default) ?? payoutAccounts[0] ?? null;
  const activeEscrows = escrowCases.filter((entry) => ['funded', 'assigned', 'in_progress', 'delivery_review'].includes(entry.status));
  const providerBackedTransactions = transactions.filter((transaction) => isProviderBackedTransaction(transaction));
  const activeProviderTransactions = providerBackedTransactions.filter((transaction) => {
    const status = resolvePaymentLifecycleStatus(transaction);
    return ['initiated', 'pending_provider', 'processing'].includes(status);
  });
  const reconciledProviderTransactions = providerBackedTransactions.filter((transaction) => resolvePaymentLifecycleStatus(transaction) === 'reconciled');
  const failedProviderTransactions = providerBackedTransactions.filter((transaction) => resolvePaymentLifecycleStatus(transaction) === 'failed');
  const subscriptionRevenueView = commissionEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);

  return {
    activeEscrows,
    activeProviderTransactions,
    activeProviderVisibilityPass,
    activeSubscription,
    availableWalletBalance,
    defaultPayoutAccount,
    failedProviderTransactions,
    heldWalletBalance,
    latestProviderVisibilityOrder,
    monetizedRole,
    pendingPayoutAmount,
    pendingReleaseBalance,
    providerBackedTransactions,
    reconciledProviderTransactions,
    selectedPlan,
    selectedPlanUnavailable,
    subscriptionRevenueView,
    walletBalance,
  };
}
