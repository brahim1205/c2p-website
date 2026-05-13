import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '@/components/feature/AdminLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import {
  fetchDexPayPaymentIntents,
  fetchDexPayProviderTransactions,
  fetchDexPayProviderTransactionCapabilities,
  fetchDexPayReconciliationJobs,
  fetchAdminFinanceOverview,
  fetchDexPayWebhookReceipts,
  fetchOutboxDeadLetter,
  fetchOutboxDeliveries,
  fetchOutboxMetrics,
  fetchWebhookDispatchHistory,
  forceSyncDexPayProviderTransaction,
  ignoreOutboxEvent,
  processOutboxNow,
  reconcileDexPay,
  replayOutboxEvent,
  reprocessDexPayWebhookReceipt,
  requeueOutboxEvent,
  refundAdminTransaction,
  updateAdminEscrowStatus,
  updateAdminPayoutStatus,
  updateAdminTransactionStatusCommand,
  type AdminPaymentTransaction,
  type DexPayPaymentIntent,
  type DexPayProviderTransaction,
  type DexPayReconciliationJob,
  type DexPayWebhookReceipt,
  type NotificationDeliveryRow,
  type OutboxDeadLetterEvent,
  type OutboxMetrics,
  type WebhookDispatchHistoryRow,
} from '@/lib/adminApi';
import { fetchUsers } from '@/lib/accountApi';
import { downloadCsvFile } from '@/lib/downloads';
import {
  getPaymentLifecycleLabel,
  getPaymentLifecycleTone,
  hasFinanceCapabilityAction,
  resolvePaymentLifecycleStatus,
  resolvePaymentUiCapabilitiesFromSnapshot,
} from '@/lib/paymentStatus';
import {
  fetchEscrowCapabilities,
  fetchPayoutCapabilities,
  fetchTransactionCapabilities,
  type CommissionEntry,
  type EscrowCase,
  type FinanceCapabilitySnapshot,
  type PayoutRequest,
  type UserSubscription,
} from '@/lib/saasApi';
import { fetchDexPayStatus, type DexPayStatus } from '@/lib/paymentsApi';

type TransactionRow = AdminPaymentTransaction & { user: string; email: string; fee: number; net: number };
type EscrowRow = EscrowCase & { client: string; provider: string };
type PayoutRow = PayoutRequest & { user: string; email: string };
type SubscriptionRow = UserSubscription & { user: string; email: string };
type ProviderTransactionRow = DexPayProviderTransaction & { linkedUser: string };
type PaymentIntentRow = DexPayPaymentIntent & { linkedUser: string };

export default function AdminPaymentsPage() {
  const { success, error } = useToast();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [escrowRows, setEscrowRows] = useState<EscrowRow[]>([]);
  const [payoutRows, setPayoutRows] = useState<PayoutRow[]>([]);
  const [subscriptionRows, setSubscriptionRows] = useState<SubscriptionRow[]>([]);
  const [commissionRows, setCommissionRows] = useState<CommissionEntry[]>([]);
  const [transactionCapabilities, setTransactionCapabilities] = useState<Record<string, FinanceCapabilitySnapshot>>({});
  const [providerTransactionCapabilities, setProviderTransactionCapabilities] = useState<Record<string, FinanceCapabilitySnapshot>>({});
  const [escrowCapabilities, setEscrowCapabilities] = useState<Record<string, FinanceCapabilitySnapshot>>({});
  const [payoutCapabilities, setPayoutCapabilities] = useState<Record<string, FinanceCapabilitySnapshot>>({});
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionRow | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [outboxMetrics, setOutboxMetrics] = useState<OutboxMetrics | null>(null);
  const [deadLetterRows, setDeadLetterRows] = useState<OutboxDeadLetterEvent[]>([]);
  const [deliveryRows, setDeliveryRows] = useState<NotificationDeliveryRow[]>([]);
  const [webhookDispatchRows, setWebhookDispatchRows] = useState<WebhookDispatchHistoryRow[]>([]);
  const [providerWebhookReceipts, setProviderWebhookReceipts] = useState<DexPayWebhookReceipt[]>([]);
  const [reconciliationJobs, setReconciliationJobs] = useState<DexPayReconciliationJob[]>([]);
  const [providerTransactions, setProviderTransactions] = useState<ProviderTransactionRow[]>([]);
  const [paymentIntents, setPaymentIntents] = useState<PaymentIntentRow[]>([]);
  const [dexPayStatus, setDexPayStatus] = useState<DexPayStatus | null>(null);
  const [processingOutbox, setProcessingOutbox] = useState(false);
  const [reconcilingProvider, setReconcilingProvider] = useState(false);
  const [operatorBusyKey, setOperatorBusyKey] = useState<string | null>(null);
  const focusedPanel = searchParams.get('panel')?.trim().toLowerCase() || '';

  const loadTransactions = useCallback(async () => {
    try {
      const [
        overview,
        users,
        metrics,
        deadLetters,
        deliveries,
        webhookHistory,
        receipts,
        jobs,
        providerTxs,
        intents,
        dexPayRuntime,
      ] = await Promise.all([
        fetchAdminFinanceOverview(),
        fetchUsers(),
        fetchOutboxMetrics(),
        fetchOutboxDeadLetter(10),
        fetchOutboxDeliveries(12),
        fetchWebhookDispatchHistory(10),
        fetchDexPayWebhookReceipts(10),
        fetchDexPayReconciliationJobs(8),
        fetchDexPayProviderTransactions(10),
        fetchDexPayPaymentIntents(10),
        fetchDexPayStatus().catch(() => null),
      ]);
      const usersById = new Map(users.map((user) => [user.id, user]));
      setOutboxMetrics(metrics);
      setDeadLetterRows(deadLetters);
      setDeliveryRows(deliveries);
      setWebhookDispatchRows(webhookHistory);
      setProviderWebhookReceipts(receipts);
      setReconciliationJobs(jobs);
      setDexPayStatus(dexPayRuntime);
      setProviderTransactions(providerTxs.map((item) => {
        const metadataUserId = typeof item.metadata?.user_id === 'string' ? item.metadata.user_id : undefined;
        const linkedUser = metadataUserId ? usersById.get(metadataUserId) : undefined;
        return {
          ...item,
          linkedUser: linkedUser ? `${linkedUser.firstName} ${linkedUser.lastName}` : item.paymentIntentId || '-',
        };
      }));
      setPaymentIntents(intents.map((item) => {
        const linkedUser = item.userId ? usersById.get(item.userId) : undefined;
        return {
          ...item,
          linkedUser: linkedUser ? `${linkedUser.firstName} ${linkedUser.lastName}` : item.userId || '-',
        };
      }));
      setTransactions(overview.transactions.map((item) => {
        const linkedUser = usersById.get(item.user_id);
        const fee = Math.round(Number(item.amount || 0) * 0.03);
        return {
          ...item,
          user: linkedUser ? `${linkedUser.firstName} ${linkedUser.lastName}` : item.user_id,
          email: linkedUser?.email || '-',
          fee,
          net: Math.max(0, Number(item.amount || 0) - fee),
        };
      }));
      setEscrowRows((overview.escrowCases || []).map((item) => ({
        ...item,
        client: item.client_name || usersById.get(item.client_id)?.firstName || item.client_id,
        provider: item.provider_name || (item.provider_user_id ? `${usersById.get(item.provider_user_id)?.firstName || ''} ${usersById.get(item.provider_user_id)?.lastName || ''}`.trim() : 'Non assigne'),
      })));
      setPayoutRows((overview.payoutRequests || []).map((item) => {
        const linkedUser = usersById.get(item.user_id);
        return {
          ...item,
          user: linkedUser ? `${linkedUser.firstName} ${linkedUser.lastName}` : item.user_id,
          email: linkedUser?.email || '-',
        };
      }));
      setSubscriptionRows((overview.subscriptions || []).map((item) => {
        const linkedUser = usersById.get(item.user_id);
        return {
          ...item,
          user: linkedUser ? `${linkedUser.firstName} ${linkedUser.lastName}` : item.user_id,
          email: linkedUser?.email || '-',
        };
      }));
      setCommissionRows(overview.commissionEntries || []);
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de charger les paiements.');
    }
  }, [error]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    if (!focusedPanel) {
      return;
    }

    const section = document.getElementById(`panel-${focusedPanel}`);
    if (!section) {
      return;
    }

    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focusedPanel, outboxMetrics, providerTransactions.length, providerWebhookReceipts.length, reconciliationJobs.length]);

  const filteredTransactions = useMemo(
    () => (activeTab === 'all' ? transactions : transactions.filter((transaction) => transaction.status === activeTab)),
    [activeTab, transactions],
  );

  const getStatusBadge = (status: TransactionRow['status']) => {
    const styles = { completed: 'bg-green-100 text-green-700', pending: 'bg-orange-100 text-orange-700', failed: 'bg-red-100 text-red-700' };
    const labels = { completed: 'Complete', pending: 'En attente', failed: 'Echoue' };
    return <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status]}`}>{labels[status]}</span>;
  };

  const getTransactionCapabilitySnapshot = (transaction: TransactionRow) => transactionCapabilities[String(transaction.id)] ?? null;
  const getProviderTransactionCapabilitySnapshot = (item: ProviderTransactionRow) => providerTransactionCapabilities[item.providerReference] ?? null;
  const getEscrowCapabilitySnapshot = (escrow: EscrowRow) => escrowCapabilities[String(escrow.id)] ?? null;
  const getPayoutCapabilitySnapshot = (request: PayoutRow) => payoutCapabilities[String(request.id)] ?? null;

  const getTransactionCapabilities = (transaction: TransactionRow) => resolvePaymentUiCapabilitiesFromSnapshot(getTransactionCapabilitySnapshot(transaction), {
    status: resolvePaymentLifecycleStatus({
      type: transaction.type,
      status: transaction.status,
    }),
    role: 'admin',
    context: 'transaction_list',
    providerBacked: false,
    transactionType: transaction.type,
  });

  const getProviderTransactionCapabilities = (item: ProviderTransactionRow) => {
    const lifecycle = ['initiated', 'pending_provider', 'processing', 'confirmed', 'failed', 'refunded', 'reconciled'].includes(String(item.lifecycleStatus || item.providerStatus).toLowerCase())
      ? String(item.lifecycleStatus || item.providerStatus).toLowerCase()
      : 'processing';

    return resolvePaymentUiCapabilitiesFromSnapshot(getProviderTransactionCapabilitySnapshot(item), {
      status: lifecycle as Parameters<typeof getPaymentLifecycleLabel>[0],
      role: 'admin',
      context: 'provider_console',
      providerBacked: true,
    });
  };

  const handleChangeStatus = async (transaction: TransactionRow, status: TransactionRow['status']) => {
    try {
      const { transaction: updated } = await updateAdminTransactionStatusCommand(transaction.id, status);
      setTransactions((prev) => prev.map((item) => item.id === transaction.id ? { ...item, ...updated } : item));
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
      loadTransactions();
    } catch (err) {
      console.error(err);
      error('Erreur', 'Remboursement impossible.');
    }
  };

  const handleEscrowAction = async (escrow: EscrowRow, status: 'released' | 'refunded') => {
    try {
      await updateAdminEscrowStatus(String(escrow.id), status);
      success(status === 'released' ? 'Séquestre libéré' : 'Séquestre remboursé', escrow.booking_title || escrow.service || String(escrow.booking_id));
      loadTransactions();
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de mettre à jour ce séquestre.');
    }
  };

  const handlePayoutAction = async (request: PayoutRow, status: 'approved' | 'paid' | 'rejected') => {
    try {
      await updateAdminPayoutStatus(String(request.id), status);
      success('Retrait mis à jour', `${request.user} · ${status}`);
      loadTransactions();
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

  useEffect(() => {
    const missingTransactionIds = filteredTransactions
      .map((transaction) => String(transaction.id))
      .filter((id) => !transactionCapabilities[id]);
    const missingProviderReferences = providerTransactions
      .map((transaction) => transaction.providerReference)
      .filter((reference): reference is string => Boolean(reference) && !providerTransactionCapabilities[reference]);
    const missingEscrowIds = pendingEscrows
      .map((escrow) => String(escrow.id))
      .filter((id) => !escrowCapabilities[id]);
    const missingPayoutIds = pendingPayouts
      .map((request) => String(request.id))
      .filter((id) => !payoutCapabilities[id]);

    if (!missingTransactionIds.length && !missingProviderReferences.length && !missingEscrowIds.length && !missingPayoutIds.length) {
      return;
    }

    let cancelled = false;
    void Promise.allSettled([
      ...missingTransactionIds.map(async (id) => ({ kind: 'transaction' as const, id, snapshot: await fetchTransactionCapabilities(id) })),
      ...missingProviderReferences.map(async (reference) => ({ kind: 'provider' as const, id: reference, snapshot: await fetchDexPayProviderTransactionCapabilities(reference) })),
      ...missingEscrowIds.map(async (id) => ({ kind: 'escrow' as const, id, snapshot: await fetchEscrowCapabilities(id) })),
      ...missingPayoutIds.map(async (id) => ({ kind: 'payout' as const, id, snapshot: await fetchPayoutCapabilities(id) })),
    ]).then((results) => {
      if (cancelled) {
        return;
      }

      const nextTransactions: Record<string, FinanceCapabilitySnapshot> = {};
      const nextProviders: Record<string, FinanceCapabilitySnapshot> = {};
      const nextEscrows: Record<string, FinanceCapabilitySnapshot> = {};
      const nextPayouts: Record<string, FinanceCapabilitySnapshot> = {};

      for (const result of results) {
        if (result.status !== 'fulfilled') {
          continue;
        }
        const { kind, id, snapshot } = result.value;
        if (kind === 'transaction') nextTransactions[id] = snapshot;
        if (kind === 'provider') nextProviders[id] = snapshot;
        if (kind === 'escrow') nextEscrows[id] = snapshot;
        if (kind === 'payout') nextPayouts[id] = snapshot;
      }

      if (Object.keys(nextTransactions).length) {
        setTransactionCapabilities((current) => ({ ...current, ...nextTransactions }));
      }
      if (Object.keys(nextProviders).length) {
        setProviderTransactionCapabilities((current) => ({ ...current, ...nextProviders }));
      }
      if (Object.keys(nextEscrows).length) {
        setEscrowCapabilities((current) => ({ ...current, ...nextEscrows }));
      }
      if (Object.keys(nextPayouts).length) {
        setPayoutCapabilities((current) => ({ ...current, ...nextPayouts }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    escrowCapabilities,
    filteredTransactions,
    payoutCapabilities,
    pendingEscrows,
    pendingPayouts,
    providerTransactionCapabilities,
    providerTransactions,
    transactionCapabilities,
  ]);

  const canReleaseEscrow = (escrow: EscrowRow) => {
    const snapshot = getEscrowCapabilitySnapshot(escrow);
    if (snapshot) {
      return hasFinanceCapabilityAction(snapshot, 'release_escrow');
    }
    return ['funded', 'assigned', 'in_progress', 'delivery_review'].includes(escrow.status);
  };

  const canRefundEscrow = (escrow: EscrowRow) => {
    const snapshot = getEscrowCapabilitySnapshot(escrow);
    if (snapshot) {
      return hasFinanceCapabilityAction(snapshot, 'refund_escrow');
    }
    return ['delivery_review', 'assigned', 'in_progress', 'funded'].includes(escrow.status);
  };

  const canApprovePayout = (request: PayoutRow) => {
    const snapshot = getPayoutCapabilitySnapshot(request);
    if (snapshot) {
      return hasFinanceCapabilityAction(snapshot, 'approve_payout');
    }
    return request.status === 'pending';
  };

  const canRejectPayout = (request: PayoutRow) => {
    const snapshot = getPayoutCapabilitySnapshot(request);
    if (snapshot) {
      return hasFinanceCapabilityAction(snapshot, 'reject_payout');
    }
    return ['pending', 'approved'].includes(request.status);
  };

  const canMarkPayoutPaid = (request: PayoutRow) => {
    const snapshot = getPayoutCapabilitySnapshot(request);
    if (snapshot) {
      return hasFinanceCapabilityAction(snapshot, 'mark_payout_paid');
    }
    return ['pending', 'approved'].includes(request.status);
  };

  const handleProcessOutbox = async () => {
    try {
      setProcessingOutbox(true);
      const result = await processOutboxNow(25);
      success('Worker outbox relancé', `${result.processed} traite(s), ${result.failed} echec(s).`);
      await loadTransactions();
    } catch (err) {
      console.error(err);
      error('Erreur', "Impossible de relancer l'outbox.");
    } finally {
      setProcessingOutbox(false);
    }
  };

  const handleReconcileProvider = async () => {
    try {
      setReconcilingProvider(true);
      const result = await reconcileDexPay(25, { onlyPending: true });
      success('Réconciliation DexPay lancée', result.jobId);
      await loadTransactions();
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de lancer la réconciliation provider.');
    } finally {
      setReconcilingProvider(false);
    }
  };

  const handleRequeueOutboxEvent = async (eventId: string) => {
    const actionKey = `outbox-requeue:${eventId}`;
    try {
      setOperatorBusyKey(actionKey);
      await requeueOutboxEvent(eventId, 'admin_manual_requeue');
      success('Événement relancé', eventId);
      await loadTransactions();
    } catch (err) {
      console.error(err);
      error('Erreur', "Impossible de relancer cet événement.");
    } finally {
      setOperatorBusyKey(null);
    }
  };

  const handleIgnoreOutboxEvent = async (eventId: string) => {
    const actionKey = `outbox-ignore:${eventId}`;
    try {
      setOperatorBusyKey(actionKey);
      await ignoreOutboxEvent(eventId, 'admin_manual_ignore');
      success('Dead-letter ignoré', eventId);
      await loadTransactions();
    } catch (err) {
      console.error(err);
      error('Erreur', "Impossible d'ignorer cet événement.");
    } finally {
      setOperatorBusyKey(null);
    }
  };

  const handleReplayOutboxEvent = async (eventId: string) => {
    const actionKey = `outbox-replay:${eventId}`;
    try {
      setOperatorBusyKey(actionKey);
      await replayOutboxEvent(eventId, 'admin_manual_replay');
      success('Événement rejoué', eventId);
      await loadTransactions();
    } catch (err) {
      console.error(err);
      error('Erreur', "Impossible de rejouer cet événement.");
    } finally {
      setOperatorBusyKey(null);
    }
  };

  const handleReprocessWebhookReceipt = async (receiptId: string) => {
    const actionKey = `receipt-reprocess:${receiptId}`;
    try {
      setOperatorBusyKey(actionKey);
      await reprocessDexPayWebhookReceipt(receiptId, 'admin_manual_reprocess');
      success('Webhook reprocessé', receiptId);
      await loadTransactions();
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de reprocesser ce webhook.');
    } finally {
      setOperatorBusyKey(null);
    }
  };

  const handleForceSyncProviderTransaction = async (providerReference: string) => {
    const actionKey = `provider-force-sync:${providerReference}`;
    try {
      setOperatorBusyKey(actionKey);
      await forceSyncDexPayProviderTransaction(providerReference, 'admin_manual_force_sync');
      success('Transaction resynchronisée', providerReference);
      await loadTransactions();
    } catch (err) {
      console.error(err);
      error('Erreur', 'Impossible de resynchroniser cette transaction provider.');
    } finally {
      setOperatorBusyKey(null);
    }
  };

  const getProviderStatusBadge = (status?: string | null) => {
    const normalized = String(status ?? '').toLowerCase();
    if (['initiated', 'pending_provider', 'processing', 'confirmed', 'failed', 'refunded', 'reconciled'].includes(normalized)) {
      return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getPaymentLifecycleTone(normalized as Parameters<typeof getPaymentLifecycleLabel>[0])}`}>{getPaymentLifecycleLabel(normalized as Parameters<typeof getPaymentLifecycleLabel>[0])}</span>;
    }
    const styles = normalized.includes('complete') || normalized.includes('confirm') || normalized.includes('settled')
      ? 'bg-green-100 text-green-700'
      : normalized.includes('pending') || normalized.includes('process') || normalized.includes('running')
        ? 'bg-orange-100 text-orange-700'
        : normalized.includes('fail') || normalized.includes('reject') || normalized.includes('cancel') || normalized.includes('dead')
          ? 'bg-red-100 text-red-700'
          : 'bg-gray-100 text-gray-700';
    return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${styles}`}>{status || 'unknown'}</span>;
  };

  const getPanelClassName = (panel: string) => (
    focusedPanel === panel ? 'ring-2 ring-teal-200 ring-offset-2 ring-offset-white' : ''
  );

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl">
        <Breadcrumb items={[{ label: 'Admin', path: '/admin/dashboard' }, { label: 'Paiements' }]} />
        <section className="mb-6 rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-teal-600">Administration</p>
              <h1 className="mt-1 text-2xl font-bold text-gray-900 md:text-3xl">Gestion des paiements</h1>
              <p className="mt-2 text-sm text-gray-600 md:text-base">Suivi des transactions, validations, incidents et remboursements.</p>
            </div>
            <button onClick={handleExport} className="rounded-2xl bg-teal-600 px-5 py-3 text-sm font-medium text-white hover:bg-teal-700 whitespace-nowrap">
              Exporter le rapport
            </button>
          </div>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-4">
          <div id="panel-outbox" className={`rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm ${getPanelClassName('outbox')}`}>
            <p className="text-sm text-gray-500">Ledger total C2P</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{commissionTotals.all.toLocaleString('fr-FR')} FCFA</p>
            <p className="mt-2 text-sm text-gray-500">Commissions et abonnements reconnus</p>
          </div>
          <div id="panel-provider" className={`rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm ${getPanelClassName('provider')}`}>
            <p className="text-sm text-gray-500">MRR abonnements</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{commissionTotals.subscriptions.toLocaleString('fr-FR')} FCFA</p>
            <p className="mt-2 text-sm text-gray-500">{activeSubscriptions.length} abonnement(s) actif(s)</p>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <p className="text-sm text-gray-500">Séquestres à superviser</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{pendingEscrows.length}</p>
            <p className="mt-2 text-sm text-gray-500">{pendingEscrows.reduce((sum, row) => sum + Number(row.amount_total || 0), 0).toLocaleString('fr-FR')} FCFA engagés</p>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <p className="text-sm text-gray-500">Retraits en attente</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{pendingPayouts.length}</p>
            <p className="mt-2 text-sm text-gray-500">{pendingPayouts.reduce((sum, row) => sum + Number(row.amount || 0), 0).toLocaleString('fr-FR')} FCFA à traiter</p>
          </div>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Supervision outbox</h2>
                <p className="text-sm text-gray-500">Retries, dead-letter, delivery et health du worker.</p>
              </div>
              <button
                onClick={() => void handleProcessOutbox()}
                disabled={processingOutbox}
                className="rounded-2xl border border-teal-200 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {processingOutbox ? 'Traitement...' : 'Relancer le worker'}
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">Pending</p>
                <p className="mt-2 text-xl font-bold text-gray-900">{outboxMetrics?.counts.pending ?? 0}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">Failed</p>
                <p className="mt-2 text-xl font-bold text-orange-600">{outboxMetrics?.counts.failed ?? 0}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">Dead</p>
                <p className="mt-2 text-xl font-bold text-red-600">{outboxMetrics?.counts.dead ?? 0}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">Lag</p>
                <p className="mt-2 text-xl font-bold text-gray-900">{outboxMetrics?.oldestDueLagSeconds ?? 0}s</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Dead-letter récents</h3>
                <span className="text-xs text-gray-500">{deadLetterRows.length} événement(s)</span>
              </div>
              {deadLetterRows.slice(0, 4).map((event) => (
                <div key={event.id} className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{event.eventType}</p>
                      <p className="mt-1 text-xs text-gray-500">{event.aggregateType || 'aggregate'} · {event.aggregateId || event.id}</p>
                    </div>
                    {getProviderStatusBadge('dead')}
                  </div>
                  <p className="mt-2 text-sm text-red-600">{event.lastError || 'Erreur non renseignée'}</p>
                  <p className="mt-1 text-xs text-gray-500">Tentatives {event.attemptCount}/{event.maxRetries}</p>
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      onClick={() => void handleRequeueOutboxEvent(event.id)}
                      disabled={operatorBusyKey === `outbox-requeue:${event.id}`}
                      className="rounded-xl border border-teal-200 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {operatorBusyKey === `outbox-requeue:${event.id}` ? 'Relance...' : 'Relancer'}
                    </button>
                    <button
                      onClick={() => void handleIgnoreOutboxEvent(event.id)}
                      disabled={operatorBusyKey === `outbox-ignore:${event.id}`}
                      className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {operatorBusyKey === `outbox-ignore:${event.id}` ? 'Traitement...' : 'Ignorer'}
                    </button>
                  </div>
                </div>
              ))}
              {deadLetterRows.length === 0 && <p className="text-sm text-gray-500">Aucun événement dead-letter.</p>}
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Supervision provider</h2>
                <p className="text-sm text-gray-500">DexPay, receipts webhook et réconciliation opérateur.</p>
              </div>
              <button
                onClick={() => void handleReconcileProvider()}
                disabled={reconcilingProvider || dexPayStatus?.configured === false}
                className="rounded-2xl border border-teal-200 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {reconcilingProvider ? 'Réconciliation...' : 'Lancer une réconciliation'}
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">Runtime provider</p>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${providerRuntimeBadge.tone}`}>
                      {providerRuntimeBadge.label}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    Mode {dexPayStatus?.mode === 'live' ? 'live' : 'désactivé'}
                    {dexPayStatus?.baseUrlHost ? ` · ${dexPayStatus.baseUrlHost}` : ''}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                    <p className="text-xs text-gray-500">API provider</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {dexPayStatus?.configured ? (dexPayStatus.reachable === false ? 'Config OK / ping KO' : 'Config OK') : 'Non configurée'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                    <p className="text-xs text-gray-500">Webhook verification</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {dexPayStatus?.webhookVerification === 'strict' ? 'Signature stricte' : 'Sans secret'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                    <p className="text-xs text-gray-500">Dernier contrôle</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {dexPayStatus?.lastCheckedAt ? new Date(dexPayStatus.lastCheckedAt).toLocaleTimeString('fr-FR') : '-'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">Tx pending</p>
                <p className="mt-2 text-xl font-bold text-gray-900">{providerHealth.pendingTransactions}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">Tx failed</p>
                <p className="mt-2 text-xl font-bold text-red-600">{providerHealth.failedTransactions}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">Webhook KO</p>
                <p className="mt-2 text-xl font-bold text-orange-600">{providerHealth.failedReceipts}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">Jobs actifs</p>
                <p className="mt-2 text-xl font-bold text-gray-900">{providerHealth.activeJobs}</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Receipts webhook récents</h3>
                <span className="text-xs text-gray-500">{providerWebhookReceipts.length} reçu(s)</span>
              </div>
              {providerWebhookReceipts.slice(0, 4).map((receipt) => (
                <div key={receipt.id} className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{receipt.eventType || 'provider.webhook.received'}</p>
                      <p className="mt-1 text-xs text-gray-500">{receipt.providerEventId || receipt.id}</p>
                    </div>
                    {getProviderStatusBadge(receipt.status)}
                  </div>
                  <p className="mt-2 text-sm text-gray-600">Corrélation {receipt.correlationId || '-'}</p>
                  {receipt.error && <p className="mt-1 text-sm text-red-600">{receipt.error}</p>}
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => void handleReprocessWebhookReceipt(receipt.id)}
                      disabled={operatorBusyKey === `receipt-reprocess:${receipt.id}` || dexPayStatus?.configured === false}
                      className="rounded-xl border border-teal-200 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {operatorBusyKey === `receipt-reprocess:${receipt.id}` ? 'Reprocess...' : 'Reprocesser'}
                    </button>
                  </div>
                </div>
              ))}
              {providerWebhookReceipts.length === 0 && <p className="text-sm text-gray-500">Aucun webhook reçu.</p>}
            </div>
          </div>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm xl:col-span-1">
            <h2 className="text-lg font-bold text-gray-900">Delivery logs</h2>
            <p className="mt-1 text-sm text-gray-500">Email, SMS et notifications in-app.</p>
            <div className="mt-4 space-y-3">
              {deliveryRows.slice(0, 6).map((delivery) => (
                <div key={delivery.id} className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">{delivery.channel}</p>
                      <p className="mt-1 text-xs text-gray-500">{delivery.recipientAddress || delivery.recipientUserId || '-'}</p>
                    </div>
                    {getProviderStatusBadge(delivery.status)}
                  </div>
                  <p className="mt-2 text-sm text-gray-600">{delivery.eventType}</p>
                  {delivery.error && <p className="mt-1 text-xs text-red-600">{delivery.error}</p>}
                </div>
              ))}
              {deliveryRows.length === 0 && <p className="text-sm text-gray-500">Aucun log de delivery.</p>}
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm xl:col-span-1">
            <h2 className="text-lg font-bold text-gray-900">Dispatch webhooks</h2>
            <p className="mt-1 text-sm text-gray-500">Historique de livraison vers les cibles externes.</p>
            <div className="mt-4 space-y-3">
              {webhookDispatchRows.slice(0, 6).map((item) => (
                <div key={item.id} className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">{item.eventType}</p>
                      <p className="mt-1 line-clamp-1 text-xs text-gray-500">{item.targetUrl}</p>
                    </div>
                    {getProviderStatusBadge(item.status)}
                  </div>
                  <p className="mt-2 text-sm text-gray-600">{item.method} · HTTP {item.responseStatus || '-'}</p>
                  {item.error && <p className="mt-1 text-xs text-red-600">{item.error}</p>}
                  {item.outboxEventId ? (
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => void handleReplayOutboxEvent(item.outboxEventId!)}
                        disabled={operatorBusyKey === `outbox-replay:${item.outboxEventId}`}
                        className="rounded-xl border border-teal-200 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {operatorBusyKey === `outbox-replay:${item.outboxEventId}` ? 'Replay...' : 'Rejouer'}
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
              {webhookDispatchRows.length === 0 && <p className="text-sm text-gray-500">Aucun dispatch webhook.</p>}
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm xl:col-span-1">
            <h2 className="text-lg font-bold text-gray-900">Réconciliation provider</h2>
            <p className="mt-1 text-sm text-gray-500">Jobs récents et état de convergence.</p>
            <div className="mt-4 space-y-3">
              {reconciliationJobs.slice(0, 6).map((job) => (
                <div key={job.id} className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">{job.scope || 'scan'}</p>
                      <p className="mt-1 text-xs text-gray-500">{job.id}</p>
                    </div>
                    {getProviderStatusBadge(job.status)}
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    {job.summary?.scanned ? `${String(job.summary.scanned)} analysé(s)` : 'Aucun résumé'}{job.summary?.updated ? ` · ${String(job.summary.updated)} mis à jour` : ''}
                  </p>
                  {job.error && <p className="mt-1 text-xs text-red-600">{job.error}</p>}
                </div>
              ))}
              {reconciliationJobs.length === 0 && <p className="text-sm text-gray-500">Aucun job de réconciliation.</p>}
            </div>
          </div>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Provider transactions</h2>
                <p className="text-sm text-gray-500">Vue DexPay normalisée côté plateforme.</p>
              </div>
              <span className="text-sm text-gray-500">{providerTransactions.length} élément(s)</span>
            </div>
            <div className="space-y-3">
              {providerTransactions.slice(0, 6).map((item) => (
                <div key={item.id} className="rounded-2xl border border-gray-200 p-4">
                  {(() => {
                    const capabilities = getProviderTransactionCapabilities(item);
                    return (
                      <>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{item.providerReference}</p>
                      <p className="mt-1 text-sm text-gray-600">{item.linkedUser} · {item.direction || '-'}</p>
                      <p className="mt-1 text-xs text-gray-500">{capabilities.summary}</p>
                    </div>
                    {getProviderStatusBadge(item.lifecycleStatus || item.providerStatus)}
                  </div>
                  <p className="mt-2 text-sm text-gray-600">{Number(item.amount || 0).toLocaleString('fr-FR')} {item.currency || 'XAF'}</p>
                  <div className="mt-3 flex justify-end">
                    {capabilities.actions.force_sync_provider ? (
                      <button
                        onClick={() => void handleForceSyncProviderTransaction(item.providerReference)}
                        disabled={operatorBusyKey === `provider-force-sync:${item.providerReference}` || dexPayStatus?.configured === false}
                        className="rounded-xl border border-teal-200 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {operatorBusyKey === `provider-force-sync:${item.providerReference}` ? 'Sync...' : 'Force sync'}
                      </button>
                    ) : (
                      <span className="rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600">
                        Lecture seule
                      </span>
                    )}
                  </div>
                      </>
                    );
                  })()}
                </div>
              ))}
              {providerTransactions.length === 0 && <p className="text-sm text-gray-500">Aucune transaction provider.</p>}
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Payment intents</h2>
                <p className="text-sm text-gray-500">Intentions de paiement internes avant confirmation provider.</p>
              </div>
              <span className="text-sm text-gray-500">{paymentIntents.length} élément(s)</span>
            </div>
            <div className="space-y-3">
              {paymentIntents.slice(0, 6).map((item) => (
                <div key={item.id} className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{item.contextType || 'payment_intent'}</p>
                      <p className="mt-1 text-sm text-gray-600">{item.linkedUser} · {item.providerIntentRef || item.id}</p>
                    </div>
                    {getProviderStatusBadge(item.status)}
                  </div>
                  <p className="mt-2 text-sm text-gray-600">{Number(item.amount || 0).toLocaleString('fr-FR')} {item.currency}</p>
                </div>
              ))}
              {paymentIntents.length === 0 && <p className="text-sm text-gray-500">Aucun payment intent.</p>}
            </div>
          </div>
        </section>

        <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Séquestres C2P</h2>
                <p className="text-sm text-gray-500">Validation finale avant libération ou remboursement.</p>
              </div>
              <span className="text-sm text-gray-500">{pendingEscrows.length} dossier(s)</span>
            </div>
            <div className="space-y-3">
              {pendingEscrows.slice(0, 5).map((escrow) => (
                <div key={escrow.id} className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{escrow.booking_title || escrow.service || `Mission ${escrow.booking_id}`}</p>
                      <p className="mt-1 text-sm text-gray-600">{escrow.client} → {escrow.provider}</p>
                      <p className="mt-1 text-xs text-gray-500">Statut: {escrow.status}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{Number(escrow.amount_total || 0).toLocaleString('fr-FR')} FCFA</p>
                      <p className="mt-1 text-xs text-gray-500">Net prestataire {Number(escrow.provider_amount || 0).toLocaleString('fr-FR')} FCFA</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {canReleaseEscrow(escrow) ? (
                      <button onClick={() => void handleEscrowAction(escrow, 'released')} className="rounded-lg bg-teal-600 px-3 py-2 text-xs font-medium text-white hover:bg-teal-700">
                        Libérer
                      </button>
                    ) : null}
                    {canRefundEscrow(escrow) ? (
                      <button onClick={() => void handleEscrowAction(escrow, 'refunded')} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50">
                        Rembourser
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
              {pendingEscrows.length === 0 && <p className="text-sm text-gray-500">Aucun séquestre à traiter.</p>}
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Retraits et abonnements</h2>
                <p className="text-sm text-gray-500">Décaissements à approuver et base récurrente active.</p>
              </div>
              <span className="text-sm text-gray-500">{pendingPayouts.length} retrait(s)</span>
            </div>
            <div className="space-y-3">
              {pendingPayouts.slice(0, 4).map((request) => (
                <div key={request.id} className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{request.user}</p>
                      <p className="mt-1 text-sm text-gray-600">{request.account_label || request.method}</p>
                      <p className="mt-1 text-xs text-gray-500">{request.status}</p>
                    </div>
                    <p className="font-semibold text-gray-900">{Number(request.amount || 0).toLocaleString('fr-FR')} FCFA</p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {canApprovePayout(request) && (
                      <button onClick={() => void handlePayoutAction(request, 'approved')} className="rounded-lg border border-teal-200 px-3 py-2 text-xs font-medium text-teal-700 hover:bg-teal-50">
                        Approuver
                      </button>
                    )}
                    {canMarkPayoutPaid(request) ? (
                      <button onClick={() => void handlePayoutAction(request, 'paid')} className="rounded-lg bg-teal-600 px-3 py-2 text-xs font-medium text-white hover:bg-teal-700">
                        Marquer payé
                      </button>
                    ) : null}
                    {canRejectPayout(request) ? (
                      <button onClick={() => void handlePayoutAction(request, 'rejected')} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50">
                        Rejeter
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
              {activeSubscriptions.slice(0, 3).map((subscription) => (
                <div key={subscription.id} className="rounded-2xl bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">{subscription.user}</p>
                      <p className="mt-1 text-sm text-gray-600">{subscription.plan_name} · renouvellement {new Date(subscription.renews_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <p className="font-semibold text-gray-900">{Number(subscription.amount || 0).toLocaleString('fr-FR')} FCFA</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200">
            <div className="flex space-x-8 px-6 overflow-x-auto">
              {(['all', 'completed', 'pending', 'failed'] as const).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === tab ? 'border-[#5fa6f3] text-[#5fa6f3]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  {tab === 'all' && `Toutes (${transactions.length})`}
                  {tab === 'completed' && `Completees (${transactions.filter((item) => item.status === 'completed').length})`}
                  {tab === 'pending' && `En attente (${transactions.filter((item) => item.status === 'pending').length})`}
                  {tab === 'failed' && `Echouees (${transactions.filter((item) => item.status === 'failed').length})`}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Transaction</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Methode</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{transaction.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{transaction.user}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{transaction.type}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{transaction.amount.toLocaleString('fr-FR')} FCFA</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{transaction.method}</td>
                    <td className="px-6 py-4">{getStatusBadge(transaction.status)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(transaction.date).toLocaleString('fr-FR')}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setSelectedTransaction(transaction); setShowDetailModal(true); }} className="px-3 py-1.5 text-[#5fa6f3] hover:text-[#27346b] text-sm font-medium whitespace-nowrap hover:bg-[#5fa6f3]/10 rounded-lg transition-colors">Details</button>
                        {transaction.status !== 'completed' && <button onClick={() => void handleChangeStatus(transaction, 'completed')} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-green-50 transition-colors" title="Valider"><i className="ri-check-line text-green-500 text-sm"></i></button>}
                        {getTransactionCapabilities(transaction).actions.retry_transaction && <button onClick={() => void handleChangeStatus(transaction, 'pending')} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-orange-50 transition-colors" title="Relancer"><i className="ri-restart-line text-orange-500 text-sm"></i></button>}
                        {getTransactionCapabilities(transaction).actions.refund_transaction && <button onClick={() => { setSelectedTransaction(transaction); setShowRefundModal(true); }} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors" title="Rembourser"><i className="ri-refund-line text-red-500 text-sm"></i></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {showDetailModal && selectedTransaction && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-lg w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Detail transaction</h3>
                <button onClick={() => setShowDetailModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"><i className="ri-close-line text-gray-500 text-xl"></i></button>
              </div>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">ID</span><span className="font-medium text-gray-900">{selectedTransaction.id}</span></div>
                <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Utilisateur</span><span className="font-medium text-gray-900">{selectedTransaction.user}</span></div>
                <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Email</span><span className="font-medium text-gray-900">{selectedTransaction.email}</span></div>
                <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Montant</span><span className="font-medium text-gray-900">{selectedTransaction.amount.toLocaleString('fr-FR')} FCFA</span></div>
                <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Frais</span><span className="font-medium text-gray-900">{selectedTransaction.fee.toLocaleString('fr-FR')} FCFA</span></div>
                <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Net</span><span className="font-medium text-green-600">{selectedTransaction.net.toLocaleString('fr-FR')} FCFA</span></div>
                <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Methode</span><span className="font-medium text-gray-900">{selectedTransaction.method}</span></div>
                <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Statut</span><span>{getStatusBadge(selectedTransaction.status)}</span></div>
                <div className="py-2"><span className="text-gray-500 block mb-1">Description</span><span className="font-medium text-gray-900">{selectedTransaction.description}</span></div>
              </div>
              <div className="flex gap-3 mt-6"><button onClick={() => setShowDetailModal(false)} className="flex-1 px-4 py-2.5 bg-[#5fa6f3] text-white rounded-lg text-sm font-medium hover:bg-[#27346b] transition-colors">Fermer</button></div>
            </div>
          </div>
        )}

        {showRefundModal && selectedTransaction && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Rembourser la transaction</h3>
                <button onClick={() => setShowRefundModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"><i className="ri-close-line text-gray-500 text-xl"></i></button>
              </div>
              <p className="text-sm text-red-600 mb-6">Vous allez rembourser {selectedTransaction.amount.toLocaleString('fr-FR')} FCFA a {selectedTransaction.user}.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowRefundModal(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Annuler</button>
                <button onClick={() => void handleRefund()} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">Confirmer</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
