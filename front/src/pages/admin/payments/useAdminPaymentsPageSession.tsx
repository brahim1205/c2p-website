import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import {
  refundAdminTransaction,
  updateAdminEscrowStatus,
  updateAdminPayoutStatus,
  updateAdminTransactionStatusCommand,
} from '@/lib/adminApi';
import { downloadCsvFile } from '@/lib/downloads';
import type { AdminPaymentsTab } from './components/AdminTransactionsTable';
import {
  useAdminPaymentsData,
  type AdminPaymentsSnapshot,
  type EscrowRow,
  type PayoutRow,
  type TransactionRow,
} from './useAdminPaymentsData';
import {
  getProviderStatusBadge,
  getTransactionStatusBadge,
} from './adminPaymentStatusBadges';
import { useAdminPaymentCapabilities } from './useAdminPaymentCapabilities';
import { useAdminPaymentOperatorActions } from './useAdminPaymentOperatorActions';

export function useAdminPaymentsPageSession() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<AdminPaymentsTab>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionRow | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const isSuperAdmin = user?.role === 'superadmin';
  const focusedPanel = searchParams.get('panel')?.trim().toLowerCase() || '';
  const { paymentsKey, paymentsQuery } = useAdminPaymentsData(isSuperAdmin);

  useEffect(() => {
    if (paymentsQuery.isError) {
      console.error(paymentsQuery.error);
      error('Erreur', 'Impossible de charger les paiements.');
    }
  }, [error, paymentsQuery.error, paymentsQuery.isError]);

  const paymentsSnapshot = paymentsQuery.data;
  const transactions = useMemo(() => paymentsSnapshot?.transactions ?? [], [paymentsSnapshot?.transactions]);
  const escrowRows = useMemo(() => paymentsSnapshot?.escrowRows ?? [], [paymentsSnapshot?.escrowRows]);
  const payoutRows = useMemo(() => paymentsSnapshot?.payoutRows ?? [], [paymentsSnapshot?.payoutRows]);
  const subscriptionRows = useMemo(() => paymentsSnapshot?.subscriptionRows ?? [], [paymentsSnapshot?.subscriptionRows]);
  const commissionRows = useMemo(() => paymentsSnapshot?.commissionRows ?? [], [paymentsSnapshot?.commissionRows]);
  const outboxMetrics = paymentsSnapshot?.outboxMetrics ?? null;
  const deadLetterRows = useMemo(() => paymentsSnapshot?.deadLetterRows ?? [], [paymentsSnapshot?.deadLetterRows]);
  const deliveryRows = useMemo(() => paymentsSnapshot?.deliveryRows ?? [], [paymentsSnapshot?.deliveryRows]);
  const webhookDispatchRows = useMemo(() => paymentsSnapshot?.webhookDispatchRows ?? [], [paymentsSnapshot?.webhookDispatchRows]);
  const providerWebhookReceipts = useMemo(() => paymentsSnapshot?.providerWebhookReceipts ?? [], [paymentsSnapshot?.providerWebhookReceipts]);
  const reconciliationJobs = useMemo(() => paymentsSnapshot?.reconciliationJobs ?? [], [paymentsSnapshot?.reconciliationJobs]);
  const providerTransactions = useMemo(() => paymentsSnapshot?.providerTransactions ?? [], [paymentsSnapshot?.providerTransactions]);
  const paymentIntents = useMemo(() => paymentsSnapshot?.paymentIntents ?? [], [paymentsSnapshot?.paymentIntents]);
  const dexPayStatus = paymentsSnapshot?.dexPayStatus ?? null;

  const refetchPayments = () => paymentsQuery.refetch();

  const {
    handleForceSyncProviderTransaction,
    handleIgnoreOutboxEvent,
    handleProcessOutbox,
    handleReconcileProvider,
    handleReplayOutboxEvent,
    handleReprocessWebhookReceipt,
    handleRequeueOutboxEvent,
    operatorBusyKey,
    processingOutbox,
    reconcilingProvider,
  } = useAdminPaymentOperatorActions({
    error,
    refetchPayments,
    success,
  });

  const updatePaymentsCache = (updater: (snapshot: AdminPaymentsSnapshot) => AdminPaymentsSnapshot) => {
    queryClient.setQueryData<AdminPaymentsSnapshot>(paymentsKey, (current) => current ? updater(current) : current);
    void queryClient.invalidateQueries({ queryKey: paymentsKey });
  };

  useEffect(() => {
    if (!focusedPanel) return;
    const section = document.getElementById(`panel-${focusedPanel}`);
    if (!section) return;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focusedPanel, outboxMetrics, providerTransactions.length, providerWebhookReceipts.length, reconciliationJobs.length]);

  const filteredTransactions = useMemo(
    () => (activeTab === 'all' ? transactions : transactions.filter((transaction) => transaction.status === activeTab)),
    [activeTab, transactions],
  );

  const pendingEscrows = useMemo(
    () => escrowRows.filter((row) => ['delivery_review', 'assigned', 'in_progress', 'funded'].includes(row.status)),
    [escrowRows],
  );

  const pendingPayouts = useMemo(
    () => payoutRows.filter((row) => ['pending', 'approved'].includes(row.status)),
    [payoutRows],
  );

  const activeSubscriptions = useMemo(
    () => subscriptionRows.filter((row) => row.status === 'active'),
    [subscriptionRows],
  );

  const providerHealth = useMemo(() => ({
    pendingTransactions: providerTransactions.filter((item) => ['initiated', 'pending_provider', 'processing'].includes(String(item.lifecycleStatus || item.providerStatus).toLowerCase())).length,
    failedTransactions: providerTransactions.filter((item) => ['failed', 'error', 'cancelled', 'canceled'].includes(String(item.lifecycleStatus || item.providerStatus).toLowerCase())).length,
    failedReceipts: providerWebhookReceipts.filter((item) => ['failed', 'rejected'].includes(String(item.status).toLowerCase())).length,
    activeJobs: reconciliationJobs.filter((item) => ['running'].includes(String(item.status).toLowerCase())).length,
  }), [providerTransactions, providerWebhookReceipts, reconciliationJobs]);

  const providerRuntimeBadge = useMemo(() => {
    if (!dexPayStatus) {
      return { label: 'Statut indisponible', tone: 'bg-gray-100 text-gray-700' };
    }
    if (!dexPayStatus.configured) {
      return { label: 'DexPay non configuré', tone: 'bg-slate-100 text-slate-700' };
    }
    if (dexPayStatus.reachable === false) {
      return { label: 'DexPay live injoignable', tone: 'bg-red-100 text-red-700' };
    }
    return { label: 'DexPay live opérationnel', tone: 'bg-emerald-100 text-emerald-700' };
  }, [dexPayStatus]);

  const commissionTotals = useMemo(() => ({
    all: commissionRows.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    subscriptions: commissionRows.filter((row) => row.source_type === 'subscription').reduce((sum, row) => sum + Number(row.amount || 0), 0),
    bookings: commissionRows.filter((row) => row.source_type === 'booking').reduce((sum, row) => sum + Number(row.amount || 0), 0),
  }), [commissionRows]);

  const {
    getTransactionCapabilities,
    getProviderTransactionCapabilities,
    canReleaseEscrow,
    canRefundEscrow,
    canApprovePayout,
    canRejectPayout,
    canMarkPayoutPaid,
  } = useAdminPaymentCapabilities({
    filteredTransactions,
    pendingEscrows,
    pendingPayouts,
    providerTransactions,
  });

  const handleChangeStatus = async (transaction: TransactionRow, status: TransactionRow['status']) => {
    try {
      const { transaction: updated } = await updateAdminTransactionStatusCommand(transaction.id, status);
      updatePaymentsCache((snapshot) => ({
        ...snapshot,
        transactions: snapshot.transactions.map((item) => item.id === transaction.id ? { ...item, ...updated } : item),
      }));
      success('Statut mis a jour', transaction.id);
    } catch (err) {
      console.error(err);
      error('Erreur', 'Mise a jour impossible.');
    }
  };

  const handleRefund = async () => {
    if (!selectedTransaction) return;
    try {
      await refundAdminTransaction(selectedTransaction.id);
      setShowRefundModal(false);
      success('Remboursement initie', selectedTransaction.user);
      void refetchPayments();
    } catch (err) {
      console.error(err);
      error('Erreur', 'Remboursement impossible.');
    }
  };

  const handleEscrowAction = async (escrow: EscrowRow, status: 'released' | 'refunded') => {
    try {
      await updateAdminEscrowStatus(String(escrow.id), status);
      success(status === 'released' ? 'Séquestre libéré' : 'Séquestre remboursé', escrow.booking_title || escrow.service || String(escrow.booking_id));
      void refetchPayments();
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de mettre à jour ce séquestre.');
    }
  };

  const handlePayoutAction = async (request: PayoutRow, status: 'approved' | 'paid' | 'rejected') => {
    try {
      await updateAdminPayoutStatus(String(request.id), status);
      success('Retrait mis à jour', `${request.user} · ${status}`);
      void refetchPayments();
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de mettre à jour ce retrait.');
    }
  };

  const handleExport = () => {
    downloadCsvFile('admin-paiements.csv', filteredTransactions.map((transaction) => ({
      id: transaction.id,
      utilisateur: transaction.user,
      email: transaction.email,
      type: transaction.type,
      montant: transaction.amount,
      devise: transaction.currency,
      methode: transaction.method,
      statut: transaction.status,
      frais: transaction.fee,
      net: transaction.net,
      date: transaction.date,
      reference: transaction.reference ?? '',
    })));
    success('Rapport exporte', 'Le rapport financier a ete telecharge.');
  };

  const getPanelClassName = (panel: string) => (
    focusedPanel === panel ? 'ring-2 ring-teal-200 ring-offset-2 ring-offset-white' : ''
  );

  return {
    activeTab,
    transactions,
    filteredTransactions,
    selectedTransaction,
    showDetailModal,
    showRefundModal,
    isSuperAdmin,
    outboxMetrics,
    deadLetterRows,
    deliveryRows,
    webhookDispatchRows,
    providerWebhookReceipts,
    reconciliationJobs,
    providerTransactions,
    paymentIntents,
    dexPayStatus,
    providerHealth,
    providerRuntimeBadge,
    processingOutbox,
    reconcilingProvider,
    operatorBusyKey,
    pendingEscrows,
    pendingPayouts,
    activeSubscriptions,
    commissionTotals,
    setActiveTab,
    setSelectedTransaction,
    setShowDetailModal,
    setShowRefundModal,
    handleExport,
    handleRefund,
    handleChangeStatus,
    handleEscrowAction,
    handlePayoutAction,
    handleProcessOutbox,
    handleReconcileProvider,
    handleRequeueOutboxEvent,
    handleIgnoreOutboxEvent,
    handleReplayOutboxEvent,
    handleReprocessWebhookReceipt,
    handleForceSyncProviderTransaction,
    getStatusBadge: getTransactionStatusBadge,
    getTransactionCapabilities,
    getProviderTransactionCapabilities,
    getProviderStatusBadge,
    getPanelClassName,
    canReleaseEscrow,
    canRefundEscrow,
    canApprovePayout,
    canMarkPayoutPaid,
    canRejectPayout,
  };
}
