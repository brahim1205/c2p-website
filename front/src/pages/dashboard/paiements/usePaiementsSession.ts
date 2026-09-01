import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { downloadCsvFile, downloadHtmlFile } from '@/lib/downloads';
import {
  fetchDexPayBanks,
  fetchDexPayStatus,
  type DexPayBank,
} from '@/lib/paymentsApi';
import {
  fetchFinanceSnapshot,
  fetchFinanceTransactions,
  type CommissionEntry,
  type EscrowCase,
  type PayoutAccount,
  type PayoutRequest,
  type ProviderVisibilityOrder,
  type ProviderVisibilityPassRecord,
  type ProviderVisibilityProduct,
  type SubscriptionPlan,
  type UserSubscription,
  type WalletAccount,
} from '@/lib/saasApi';
import { queryKeys } from '@/lib/queryKeys';
import {
  buildReceiptHtml,
  getMethodName,
  getStatusLabel,
  getTypeLabel,
  type PaymentTab,
  type Transaction,
  type TransactionStatus,
  type TransactionType,
} from './paymentPageModel';
import {
  buildRelatedInvoicesPath,
  filterPaymentTransactions,
  hasFinanceContext as hasFinanceContextParams,
  readFinanceContextParams,
  useFinanceContextRelations,
  usePaymentDerivedState,
} from './paymentPageState';
import { usePaymentActions } from './usePaymentActions';
import { useTransactionCapabilities } from './useTransactionCapabilities';

export function usePaiementsSession() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<PaymentTab>('transactions');
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<TransactionStatus | 'all'>('all');

  const {
    contextFinancialOperationId,
    contextInvoiceNumber,
    contextTransactionId,
    contextProviderReference,
    contextView,
    selectedPlanId,
    selectedPlanName,
    selectedPlanRole,
  } = readFinanceContextParams(searchParams);

  const paymentsQueryKey = queryKeys.finance.dashboard(user?.id, user?.role);
  const paymentsQuery = useQuery({
    queryKey: paymentsQueryKey,
    queryFn: async () => {
      const [snapshot, financeTransactions] = await Promise.all([
        fetchFinanceSnapshot(user!.id, user!.role),
        fetchFinanceTransactions(),
      ]);
      return { snapshot, financeTransactions: (financeTransactions ?? []) as Transaction[] };
    },
    enabled: Boolean(user?.id && user?.role),
  });

  const dexPayQuery = useQuery({
    queryKey: queryKeys.finance.dexPayRuntime(),
    queryFn: async () => {
      try {
        const [status, banks] = await Promise.all([
          fetchDexPayStatus(),
          fetchDexPayBanks().catch(() => []),
        ]);
        return { status, banks };
      } catch {
        return { status: { configured: false, enabled: false }, banks: [] as DexPayBank[] };
      }
    },
  });

  useEffect(() => {
    if (paymentsQuery.isError) {
      console.error(paymentsQuery.error);
    }
  }, [paymentsQuery.error, paymentsQuery.isError]);

  const refreshPayments = async () => {
    if (!user?.id) return;
    await queryClient.invalidateQueries({ queryKey: paymentsQueryKey });
  };

  const snapshot = paymentsQuery.data?.snapshot;
  const walletDetails: WalletAccount | null = snapshot?.wallet ?? null;
  const walletId = walletDetails?.id ?? null;
  const transactions: Transaction[] = useMemo(() => paymentsQuery.data?.financeTransactions ?? [], [paymentsQuery.data?.financeTransactions]);
  const loadingPayments = paymentsQuery.isLoading;
  const loadError = paymentsQuery.isError ? 'Impossible de charger vos informations de paiement pour le moment.' : null;
  const subscriptionPlans: SubscriptionPlan[] = useMemo(() => snapshot?.plans ?? [], [snapshot?.plans]);
  const subscriptions: UserSubscription[] = useMemo(() => snapshot?.subscriptions ?? [], [snapshot?.subscriptions]);
  const providerVisibilityProducts: ProviderVisibilityProduct[] = useMemo(() => snapshot?.providerVisibilityProducts ?? [], [snapshot?.providerVisibilityProducts]);
  const providerVisibilityOrders: ProviderVisibilityOrder[] = useMemo(() => snapshot?.providerVisibilityOrders ?? [], [snapshot?.providerVisibilityOrders]);
  const providerVisibilityPasses: ProviderVisibilityPassRecord[] = useMemo(() => snapshot?.providerVisibilityPasses ?? [], [snapshot?.providerVisibilityPasses]);
  const escrowCases: EscrowCase[] = useMemo(() => snapshot?.escrowCases ?? [], [snapshot?.escrowCases]);
  const commissionEntries: CommissionEntry[] = useMemo(() => snapshot?.commissionEntries ?? [], [snapshot?.commissionEntries]);
  const payoutAccounts: PayoutAccount[] = useMemo(() => snapshot?.payoutAccounts ?? [], [snapshot?.payoutAccounts]);
  const payoutRequests: PayoutRequest[] = useMemo(() => snapshot?.payoutRequests ?? [], [snapshot?.payoutRequests]);
  const dexPayStatus = dexPayQuery.data?.status ?? null;
  const dexPayBanks = dexPayQuery.data?.banks ?? [];

  useEffect(() => {
    if (contextView === 'wallet' || contextView === 'methods' || contextView === 'transactions') {
      setActiveTab(contextView);
      return;
    }

    if (selectedPlanId) {
      setActiveTab('wallet');
      return;
    }

    if (contextFinancialOperationId || contextInvoiceNumber || contextTransactionId || contextProviderReference) {
      setActiveTab('transactions');
    }
  }, [
    contextFinancialOperationId,
    contextInvoiceNumber,
    contextProviderReference,
    contextTransactionId,
    contextView,
    selectedPlanId,
  ]);

  useEffect(() => {
    if (!selectedPlanId || !subscriptionPlans.length) return;
    document.getElementById('c2p-subscription-plans')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [selectedPlanId, subscriptionPlans.length]);

  const derivedState = usePaymentDerivedState({
    userRole: user?.role,
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
  });
  const dexPayAvailable = Boolean(dexPayStatus?.enabled && dexPayStatus?.configured);

  const paymentActions = usePaymentActions({
    user,
    walletId,
    availableWalletBalance: derivedState.availableWalletBalance,
    monetizedRole: derivedState.monetizedRole,
    defaultPayoutAccount: derivedState.defaultPayoutAccount,
    dexPayAvailable,
    activeSubscription: derivedState.activeSubscription,
    refreshPayments,
    success,
    error,
  });

  const financeRelations = useFinanceContextRelations({
    contextFinancialOperationId,
    contextProviderReference,
    contextTransactionId,
    transactions,
    escrowCases,
    payoutRequests,
    subscriptions,
    commissionEntries,
  });

  const hasFinanceContext = hasFinanceContextParams({
    contextFinancialOperationId,
    contextInvoiceNumber,
    contextProviderReference,
    contextTransactionId,
  });

  const filteredTransactions = useMemo(() => filterPaymentTransactions({
    context: {
      contextFinancialOperationId,
      contextProviderReference,
      contextTransactionId,
    },
    filterStatus,
    filterType,
    hasContext: hasFinanceContext,
    transactions,
  }), [
    contextFinancialOperationId,
    contextProviderReference,
    contextTransactionId,
    filterStatus,
    filterType,
    hasFinanceContext,
    transactions,
  ]);

  const {
    getSelfServiceCapabilities,
    getTransactionLifecycleState,
  } = useTransactionCapabilities({
    filteredTransactions,
    selectedTransaction: paymentActions.selectedTransaction,
  });

  useEffect(() => {
    if (!hasFinanceContext || paymentActions.selectedTransaction) {
      return;
    }

    if (financeRelations.relatedTransactions.length === 1) {
      paymentActions.setSelectedTransaction(financeRelations.relatedTransactions[0]);
    }
  }, [financeRelations.relatedTransactions, hasFinanceContext, paymentActions]);

  const handleExport = () => {
    downloadCsvFile('paiements-transactions.csv', filteredTransactions.map((transaction) => ({
      id: transaction.id,
      type: getTypeLabel(transaction.type),
      montant: transaction.amount,
      devise: transaction.currency,
      methode: getMethodName(transaction.method),
      statut: getStatusLabel(transaction.status),
      description: transaction.description,
      date: transaction.date,
      reference: transaction.reference,
    })));
    success('Export termine', `${filteredTransactions.length} transaction(s) exportee(s).`);
  };

  const handleDownloadReceipt = (transaction: Transaction) => {
    downloadHtmlFile(`${transaction.id}-recu.html`, buildReceiptHtml(transaction));
    success('Recu genere', `Le recu de la transaction ${transaction.id} a ete telecharge.`);
  };

  const clearFinanceContext = () => {
    setSearchParams({});
  };

  const openRelatedInvoices = (transaction: Transaction) => {
    navigate(buildRelatedInvoicesPath(transaction));
  };

  return {
    activeTab,
    clearFinanceContext,
    commissionEntries,
    contextFinancialOperationId,
    contextInvoiceNumber,
    contextProviderReference,
    contextTransactionId,
    dexPayAvailable,
    dexPayBanks,
    dexPayStatus,
    filterStatus,
    filterType,
    filteredTransactions,
    financeRelations,
    getSelfServiceCapabilities,
    getTransactionLifecycleState,
    handleDownloadReceipt,
    handleExport,
    hasFinanceContext,
    loadError,
    loadingPayments,
    openRelatedInvoices,
    paymentActions,
    payoutRequests,
    providerVisibilityOrders,
    providerVisibilityProducts,
    selectedPlanId,
    selectedPlanName,
    selectedPlanRole,
    setActiveTab,
    setFilterStatus,
    setFilterType,
    subscriptionPlans,
    user,
    walletDetails,
    walletId,
    ...derivedState,
  };
}
