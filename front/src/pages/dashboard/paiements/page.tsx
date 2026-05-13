import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { downloadCsvFile, downloadHtmlFile } from '@/lib/downloads';
import { isMonetizedRole } from '@/lib/publicSubscriptions';
import {
  getEscrowStatusLabel,
  getEscrowStatusTone,
  getPaymentLifecycleLabel,
  getPaymentLifecycleTone,
  resolvePaymentUiCapabilitiesFromSnapshot,
  resolvePaymentLifecycleStatus,
} from '@/lib/paymentStatus';
import {
  activateSubscriptionPlan,
  createPayoutRequest,
  createDexPayCheckout,
  fetchDexPayBanks,
  fetchDexPayStatus,
  purchaseProviderVisibility,
  syncDexPayOrder,
  topupWallet,
  type DexPayBank,
  withdrawWallet,
} from '@/lib/paymentsApi';
import {
  fetchFinanceSnapshot,
  fetchFinanceTransactions,
  fetchTransactionCapabilities,
  type CommissionEntry,
  type EscrowCase,
  type FinanceCapabilitySnapshot,
  type PayoutAccount,
  type PayoutRequest,
  type ProviderVisibilityOrder,
  type ProviderVisibilityPassRecord,
  type ProviderVisibilityProduct,
  type SubscriptionPlan,
  type UserSubscription,
  type WalletAccount,
} from '@/lib/saasApi';

type PaymentMethodId = 'orange_money' | 'wave' | 'yas' | 'kaypay' | 'card' | 'wallet' | 'dexpay';
type TransactionType = 'payment' | 'refund' | 'deposit' | 'withdrawal';
type TransactionStatus = 'completed' | 'pending' | 'failed' | 'cancelled';

interface Transaction {
  id: string;
  user_id?: string;
  type: TransactionType;
  amount: number;
  currency: string;
  method: PaymentMethodId;
  status: TransactionStatus;
  description: string;
  date: string;
  reference: string;
  financial_operation_id?: string | null;
  payment_intent_id?: string | null;
  provider_order_id?: string;
  provider_reference?: string | null;
  provider_status?: string;
  lifecycle_status?: 'initiated' | 'pending_provider' | 'processing' | 'confirmed' | 'failed' | 'refunded' | 'reconciled';
  payment_account?: {
    accountName?: string;
    accountNumber?: string;
    bankName?: string;
  } | null;
  deposit_address?: string | null;
  settled_to_wallet?: boolean;
}

interface MethodItem {
  id: PaymentMethodId;
  name: string;
  icon: string;
  color: string;
  active: boolean;
}

const isProviderBackedTransaction = (transaction: Transaction) =>
  transaction.method === 'dexpay' || Boolean(transaction.provider_status || transaction.provider_order_id || transaction.lifecycle_status);

export default function PaiementsPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'transactions' | 'methods' | 'wallet'>('transactions');
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodId | null>(null);
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<TransactionStatus | 'all'>('all');
  const [editingMethod, setEditingMethod] = useState<PaymentMethodId | null>(null);
  const [deletingMethod, setDeletingMethod] = useState<PaymentMethodId | null>(null);
  const [configuringMethod, setConfiguringMethod] = useState<PaymentMethodId | null>(null);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [walletId, setWalletId] = useState<number | string | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletDetails, setWalletDetails] = useState<WalletAccount | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [providerVisibilityProducts, setProviderVisibilityProducts] = useState<ProviderVisibilityProduct[]>([]);
  const [providerVisibilityOrders, setProviderVisibilityOrders] = useState<ProviderVisibilityOrder[]>([]);
  const [providerVisibilityPasses, setProviderVisibilityPasses] = useState<ProviderVisibilityPassRecord[]>([]);
  const [escrowCases, setEscrowCases] = useState<EscrowCase[]>([]);
  const [commissionEntries, setCommissionEntries] = useState<CommissionEntry[]>([]);
  const [payoutAccounts, setPayoutAccounts] = useState<PayoutAccount[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactionCapabilities, setTransactionCapabilities] = useState<Record<string, FinanceCapabilitySnapshot>>({});
  const [dexPayStatus, setDexPayStatus] = useState<{ configured: boolean; reachable?: boolean; enabled?: boolean } | null>(null);
  const [dexPayBanks, setDexPayBanks] = useState<DexPayBank[]>([]);
  const [showDexPayModal, setShowDexPayModal] = useState(false);
  const [dexPaySubmitting, setDexPaySubmitting] = useState(false);
  const [syncingDexPay, setSyncingDexPay] = useState(false);
  const [purchasingVisibilityProductId, setPurchasingVisibilityProductId] = useState<string | null>(null);
  const [dexPayForm, setDexPayForm] = useState({
    direction: 'onramp' as 'onramp' | 'offramp',
    fiatAmount: '',
    tokenAmount: '',
    asset: 'DUSD',
    chain: 'BSC',
    bankCode: '',
    accountName: user ? `${user.firstName} ${user.lastName}` : '',
    accountNumber: '',
    recipientWallet: '',
  });

  const contextFinancialOperationId = searchParams.get('financialOperationId')?.trim() || '';
  const contextInvoiceNumber = searchParams.get('invoice')?.trim() || '';
  const contextTransactionId = searchParams.get('transaction')?.trim() || '';
  const contextProviderReference = searchParams.get('providerReference')?.trim() || '';
  const contextView = searchParams.get('view')?.trim() || '';
  const selectedPlanId = searchParams.get('plan')?.trim() || '';
  const selectedPlanName = searchParams.get('planName')?.trim() || '';
  const selectedPlanRole = searchParams.get('planRole')?.trim() || '';

  const loadPayments = useCallback(async () => {
    if (!user?.id) {
      setTransactions([]);
      setWalletId(null);
      setWalletBalance(0);
      setWalletDetails(null);
      setSubscriptionPlans([]);
      setSubscriptions([]);
      setProviderVisibilityProducts([]);
      setProviderVisibilityOrders([]);
      setProviderVisibilityPasses([]);
      setEscrowCases([]);
      setCommissionEntries([]);
      setPayoutAccounts([]);
      setPayoutRequests([]);
      return;
    }

    try {
      const [snapshot, financeTransactions] = await Promise.all([
        fetchFinanceSnapshot(user.id, user.role),
        fetchFinanceTransactions(),
      ]);

      setWalletId(snapshot.wallet?.id ?? null);
      setWalletBalance(Number(snapshot.wallet?.balance ?? 0));
      setWalletDetails(snapshot.wallet);
      setTransactions(financeTransactions as Transaction[]);
      setSubscriptionPlans(snapshot.plans);
      setSubscriptions(snapshot.subscriptions);
      setProviderVisibilityProducts(snapshot.providerVisibilityProducts ?? []);
      setProviderVisibilityOrders(snapshot.providerVisibilityOrders ?? []);
      setProviderVisibilityPasses(snapshot.providerVisibilityPasses ?? []);
      setEscrowCases(snapshot.escrowCases);
      setCommissionEntries(snapshot.commissionEntries);
      setPayoutAccounts(snapshot.payoutAccounts);
      setPayoutRequests(snapshot.payoutRequests);
    } catch (err) {
      console.error(err);
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  useEffect(() => {
    void (async () => {
      try {
        const [status, banks] = await Promise.all([
          fetchDexPayStatus(),
          fetchDexPayBanks().catch(() => []),
        ]);
        setDexPayStatus(status);
        setDexPayBanks(banks);
      } catch {
        setDexPayStatus({ configured: false, enabled: false });
        setDexPayBanks([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (contextView === 'wallet' || contextView === 'methods' || contextView === 'transactions') {
      setActiveTab(contextView);
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
  ]);

  useEffect(() => {
    if (!selectedPlanId || !subscriptionPlans.length) return;
    document.getElementById('c2p-subscription-plans')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [selectedPlanId, subscriptionPlans.length]);

  const activeSubscription = subscriptions.find((subscription) => subscription.status === 'active') ?? null;
  const monetizedRole = user ? isMonetizedRole(user.role) : false;
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

  const hasFinanceContext = Boolean(
    contextFinancialOperationId
    || contextInvoiceNumber
    || contextTransactionId
    || contextProviderReference,
  );

  const [paymentMethods, setPaymentMethods] = useState<MethodItem[]>([
    { id: 'dexpay', name: 'DexPay', icon: 'ri-secure-payment-line', color: 'bg-[#0f766e]', active: true },
    { id: 'orange_money', name: 'Orange Money', icon: 'ri-smartphone-line', color: 'bg-orange-500', active: true },
    { id: 'wave', name: 'Wave', icon: 'ri-wallet-3-line', color: 'bg-blue-500', active: true },
    { id: 'yas', name: 'YAS', icon: 'ri-bank-card-line', color: 'bg-purple-500', active: false },
    { id: 'kaypay', name: 'KayPay', icon: 'ri-money-dollar-circle-line', color: 'bg-green-500', active: false },
    { id: 'card', name: 'Carte Bancaire', icon: 'ri-bank-card-2-line', color: 'bg-gray-700', active: true },
  ]);

  const handleEditMethod = () => {
    if (!editingMethod) return;
    success('Moyen de paiement mis à jour', `Les informations de ${paymentMethods.find(m => m.id === editingMethod)?.name} ont été enregistrées.`);
    setEditingMethod(null);
  };

  const handleDeleteMethod = () => {
    if (!deletingMethod) return;
    success('Moyen de paiement supprimé', `${paymentMethods.find(m => m.id === deletingMethod)?.name} a été retiré de vos moyens de paiement.`);
    setPaymentMethods(prev => prev.map(m => m.id === deletingMethod ? { ...m, active: false } : m));
    setDeletingMethod(null);
  };

  const handleConfigureMethod = () => {
    if (!configuringMethod) return;
    success('Moyen de paiement configuré', `${paymentMethods.find(m => m.id === configuringMethod)?.name} est maintenant actif.`);
    setPaymentMethods(prev => prev.map(m => m.id === configuringMethod ? { ...m, active: true } : m));
    setConfiguringMethod(null);
  };

  const handleRecharge = () => {
    const amount = parseInt(rechargeAmount.replace(/\s/g, ''), 10);
    if (isNaN(amount) || amount <= 0) {
      error('Montant invalide', 'Veuillez entrer un montant valide.');
      return;
    }

    void (async () => {
      try {
        await topupWallet({
          amount,
          method: 'wallet',
          description: 'Rechargement portefeuille C2P',
        });
        await loadPayments();
        success('Rechargement effectué', `${amount.toLocaleString('fr-FR')} XAF ont été ajoutés à votre portefeuille.`);
        setShowRechargeModal(false);
        setRechargeAmount('');
      } catch (requestError) {
        const message = requestError instanceof Error ? requestError.message : 'Le rechargement n a pas pu etre enregistre.';
        error('Erreur', message);
      }
    })();
  };

  const handleWithdraw = () => {
    const amount = parseInt(withdrawAmount.replace(/\s/g, ''), 10);
    if (isNaN(amount) || amount <= 0) {
      error('Montant invalide', 'Veuillez entrer un montant valide.');
      return;
    }
    if (amount > availableWalletBalance) {
      error('Solde insuffisant', 'Le montant demandé dépasse votre solde disponible.');
      return;
    }
    if (monetizedRole) {
      if (!defaultPayoutAccount) {
        error('Compte de retrait manquant', 'Ajoutez d abord un compte de retrait pour recevoir vos virements C2P.');
        return;
      }

      void (async () => {
        try {
          await createPayoutRequest({
            amount,
            account_id: defaultPayoutAccount.id,
            note: 'Demande initiee depuis le dashboard',
          });
          await loadPayments();
          success('Demande envoyée', 'C2P a bien reçu votre demande de retrait.');
          setShowWithdrawModal(false);
          setWithdrawAmount('');
        } catch (requestError) {
          const message = requestError instanceof Error ? requestError.message : 'La demande de retrait n a pas pu etre enregistree.';
          error('Erreur', message);
        }
      })();
      return;
    }

    void (async () => {
      try {
        await withdrawWallet({
          amount,
          method: 'wallet',
          description: 'Retrait portefeuille C2P',
        });
        await loadPayments();
        success('Retrait effectué', `${amount.toLocaleString('fr-FR')} XAF ont été retirés de votre portefeuille.`);
        setShowWithdrawModal(false);
        setWithdrawAmount('');
      } catch (requestError) {
        const message = requestError instanceof Error ? requestError.message : 'Le retrait n a pas pu etre enregistre.';
        error('Erreur', message);
      }
    })();
  };

  const handleStartDexPayCheckout = async () => {
    setDexPaySubmitting(true);
    try {
      const payload = {
        direction: dexPayForm.direction,
        fiatAmount: dexPayForm.fiatAmount ? Number(dexPayForm.fiatAmount) : undefined,
        tokenAmount: dexPayForm.tokenAmount ? Number(dexPayForm.tokenAmount) : undefined,
        asset: dexPayForm.asset,
        chain: dexPayForm.chain,
        bankCode: dexPayForm.bankCode || undefined,
        accountName: dexPayForm.accountName || undefined,
        accountNumber: dexPayForm.accountNumber || undefined,
        recipientWallet: dexPayForm.recipientWallet || undefined,
      };
      const result = await createDexPayCheckout(payload);
      const rawTransaction = result.transaction as unknown as Transaction;
      const transaction = {
        ...rawTransaction,
        lifecycle_status: rawTransaction.lifecycle_status ?? resolvePaymentLifecycleStatus(rawTransaction),
      } satisfies Transaction;
      setTransactions((prev) => [transaction, ...prev]);
      setSelectedTransaction(transaction);
      setShowDexPayModal(false);
      success(
        'Operation DexPay creee',
        transaction.payment_account
          ? 'Les instructions de paiement bancaire sont disponibles dans le detail.'
          : 'L adresse de depot DexPay est disponible dans le detail.',
      );
    } catch (requestError) {
      const message = requestError && typeof requestError === 'object' && 'message' in requestError
        ? String(requestError.message)
        : 'Impossible de demarrer l operation DexPay.';
      error('DexPay indisponible', message);
    } finally {
      setDexPaySubmitting(false);
    }
  };

  const handleSyncDexPay = async () => {
    if (!selectedTransaction?.provider_order_id && !selectedTransaction?.reference) return;
    setSyncingDexPay(true);
    try {
      const orderId = selectedTransaction.provider_order_id || selectedTransaction.reference;
      const result = await syncDexPayOrder(orderId, selectedTransaction.id);
      const rawTransaction = result.transaction as unknown as Transaction;
      const transaction = {
        ...rawTransaction,
        lifecycle_status: rawTransaction.lifecycle_status ?? resolvePaymentLifecycleStatus(rawTransaction),
      } satisfies Transaction;
      const shouldCreditWallet = selectedTransaction.settled_to_wallet !== true
        && transaction.type === 'deposit'
        && transaction.status === 'completed'
        && transaction.settled_to_wallet === true;
      setTransactions((prev) => prev.map((item) => item.id === transaction.id ? transaction : item));
      setSelectedTransaction(transaction);
      if (shouldCreditWallet) {
        setWalletBalance((prev) => prev + Number(transaction.amount || 0));
      }
      success('Statut synchronise', `Cycle de paiement: ${getPaymentLifecycleLabel(resolvePaymentLifecycleStatus(transaction))}.`);
    } catch (requestError) {
      const message = requestError && typeof requestError === 'object' && 'message' in requestError
        ? String(requestError.message)
        : 'Impossible de synchroniser la transaction DexPay.';
      error('Synchronisation impossible', message);
    } finally {
      setSyncingDexPay(false);
    }
  };

  const handleSyncDexPayTransaction = async (transactionRow: Transaction) => {
    setSelectedTransaction(transactionRow);
    setSyncingDexPay(true);
    try {
      const orderId = transactionRow.provider_order_id || transactionRow.reference;
      const result = await syncDexPayOrder(orderId, transactionRow.id);
      const rawTransaction = result.transaction as unknown as Transaction;
      const transaction = {
        ...rawTransaction,
        lifecycle_status: rawTransaction.lifecycle_status ?? resolvePaymentLifecycleStatus(rawTransaction),
      } satisfies Transaction;
      const shouldCreditWallet = transactionRow.settled_to_wallet !== true
        && transaction.type === 'deposit'
        && transaction.status === 'completed'
        && transaction.settled_to_wallet === true;
      setTransactions((prev) => prev.map((item) => item.id === transaction.id ? transaction : item));
      setSelectedTransaction(transaction);
      if (shouldCreditWallet) {
        setWalletBalance((prev) => prev + Number(transaction.amount || 0));
      }
      success('Statut synchronise', `Cycle de paiement: ${getPaymentLifecycleLabel(resolvePaymentLifecycleStatus(transaction))}.`);
    } catch (requestError) {
      const message = requestError && typeof requestError === 'object' && 'message' in requestError
        ? String(requestError.message)
        : 'Impossible de synchroniser la transaction DexPay.';
      error('Synchronisation impossible', message);
    } finally {
      setSyncingDexPay(false);
    }
  };

  const handleActivatePlan = async (plan: SubscriptionPlan) => {
    if (!user?.id) return;
    try {
      await activateSubscriptionPlan({
        plan_id: plan.id,
        auto_renew: true,
        renew_now: Boolean(activeSubscription),
      });
      await loadPayments();
      success('Abonnement mis à jour', `Le plan ${plan.name} est désormais pris en compte par C2P.`);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Impossible d activer ce plan.';
      error('Abonnement impossible', message);
    }
  };

  const handlePurchaseVisibilityProduct = async (product: ProviderVisibilityProduct) => {
    if (user?.role !== 'prestataire') return;
    setPurchasingVisibilityProductId(product.id);
    try {
      const result = await purchaseProviderVisibility({ product_id: product.id });
      await loadPayments();
      success(
        'Billet activé',
        `${product.name} est actif${result.pass?.code ? ` avec le code ${result.pass.code}` : ''}.`,
      );
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Impossible d acheter ce billet SenPresta.';
      error('Achat impossible', message);
    } finally {
      setPurchasingVisibilityProductId(null);
    }
  };

  const getMethodName = (method: PaymentMethodId): string => {
    const names: Record<PaymentMethodId, string> = {
      orange_money: 'Orange Money',
      wave: 'Wave',
      yas: 'YAS',
      kaypay: 'KayPay',
      card: 'Carte Bancaire',
      wallet: 'Portefeuille C2P',
      dexpay: 'DexPay',
    };
    return names[method];
  };

  const getTypeLabel = (type: TransactionType): string => {
    const labels: Record<TransactionType, string> = {
      payment: 'Paiement',
      refund: 'Remboursement',
      deposit: 'Dépôt',
      withdrawal: 'Retrait'
    };
    return labels[type];
  };

  const getStatusColor = (status: TransactionStatus): string => {
    const colors: Record<TransactionStatus, string> = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return colors[status];
  };

  const getStatusLabel = (status: TransactionStatus): string => {
    const labels: Record<TransactionStatus, string> = {
      completed: 'Complété',
      pending: 'En attente',
      failed: 'Échoué',
      cancelled: 'Annulé'
    };
    return labels[status];
  };

  const filteredTransactions = transactions.filter(t => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (hasFinanceContext) {
      const matchesTransaction = contextTransactionId ? String(t.id) === contextTransactionId : false;
      const matchesFinancialOperation = contextFinancialOperationId ? String(t.financial_operation_id || '') === contextFinancialOperationId : false;
      const matchesProviderReference = contextProviderReference
        ? [t.provider_reference, t.provider_order_id, t.reference].some((value) => String(value || '') === contextProviderReference)
        : false;
      if (!matchesTransaction && !matchesFinancialOperation && !matchesProviderReference) {
        return false;
      }
    }
    return true;
  });

  useEffect(() => {
    const candidateIds = Array.from(new Set(
      [
        ...filteredTransactions.map((transaction) => String(transaction.id)),
        selectedTransaction ? String(selectedTransaction.id) : null,
      ].filter((value): value is string => Boolean(value)),
    ));
    const missingIds = candidateIds.filter((id) => !transactionCapabilities[id]);
    if (!missingIds.length) {
      return;
    }

    let cancelled = false;
    void Promise.allSettled(
      missingIds.map(async (id) => [id, await fetchTransactionCapabilities(id)] as const),
    ).then((results) => {
      if (cancelled) {
        return;
      }

      const nextEntries: Record<string, FinanceCapabilitySnapshot> = {};
      for (const result of results) {
        if (result.status !== 'fulfilled') {
          continue;
        }
        const [id, snapshot] = result.value;
        nextEntries[id] = snapshot;
      }

      if (Object.keys(nextEntries).length > 0) {
        setTransactionCapabilities((current) => ({ ...current, ...nextEntries }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [filteredTransactions, selectedTransaction, transactionCapabilities]);

  useEffect(() => {
    if (!hasFinanceContext) {
      return;
    }

    if (selectedTransaction) {
      return;
    }

    if (relatedTransactions.length === 1) {
      setSelectedTransaction(relatedTransactions[0]);
    }
  }, [hasFinanceContext, relatedTransactions, selectedTransaction]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount: number, currency: string): string => {
    return `${amount.toLocaleString('fr-FR')} ${currency}`;
  };

  const activeMethods = paymentMethods.filter(m => !m.active);

  const buildReceiptHtml = (transaction: Transaction) => `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${transaction.id}</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f5f7f6; color: #111; margin: 0; padding: 40px; }
    main { max-width: 720px; margin: 0 auto; background: #fff; border-radius: 20px; border: 1px solid #d9ece8; padding: 36px; }
    .eyebrow { color: #0f766e; letter-spacing: 0.28em; text-transform: uppercase; font-size: 12px; font-weight: 700; }
    h1 { margin: 16px 0 26px; font-size: 32px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
    .card { background: #f5faf9; border-radius: 16px; padding: 16px; }
  </style>
</head>
<body>
  <main>
    <p class="eyebrow">Centre C2P</p>
    <h1>Recu de transaction ${transaction.id}</h1>
    <div class="grid">
      <div class="card"><strong>Montant</strong><br />${formatAmount(transaction.amount, transaction.currency)}</div>
      <div class="card"><strong>Statut</strong><br />${getStatusLabel(transaction.status)}</div>
      <div class="card"><strong>Type</strong><br />${getTypeLabel(transaction.type)}</div>
      <div class="card"><strong>Methode</strong><br />${getMethodName(transaction.method)}</div>
      <div class="card"><strong>Date</strong><br />${formatDate(transaction.date)}</div>
      <div class="card"><strong>Reference</strong><br />${transaction.reference}</div>
    </div>
    <p style="margin-top: 24px;">${transaction.description}</p>
  </main>
</body>
</html>`;

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

  const getTransactionCapabilitySnapshot = (transaction: Transaction) => transactionCapabilities[String(transaction.id)] ?? null;

  const getTransactionLifecycleState = (transaction: Transaction) => {
    const backendState = getTransactionCapabilitySnapshot(transaction)?.currentState;
    if (backendState && ['initiated', 'pending_provider', 'processing', 'confirmed', 'failed', 'refunded', 'reconciled'].includes(backendState)) {
      return backendState as NonNullable<Transaction['lifecycle_status']>;
    }
    return resolvePaymentLifecycleStatus(transaction);
  };

  const getSelfServiceCapabilities = (
    transaction: Transaction,
    context: 'transaction_list' | 'transaction_modal' | 'provider_console' = 'transaction_list',
  ) => resolvePaymentUiCapabilitiesFromSnapshot(getTransactionCapabilitySnapshot(transaction), {
      status: resolvePaymentLifecycleStatus(transaction),
      role: 'self_service',
      context,
      providerBacked: isProviderBackedTransaction(transaction),
      transactionType: transaction.type,
    });

  const openRelatedInvoices = (transaction: Transaction) => {
    const params = new URLSearchParams();
    if (transaction.financial_operation_id) {
      params.set('financialOperationId', transaction.financial_operation_id);
    }
    if (transaction.id) {
      params.set('transaction', transaction.id);
    }
    navigate(`/dashboard/factures${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <DashboardLayout>
      <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Paiements' }]} />
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Paiements</h1>
        <p className="text-gray-600">Gérez vos transactions et moyens de paiement</p>
      </div>

      {hasFinanceContext && (
        <div className="mb-6 rounded-2xl border border-teal-200 bg-teal-50 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-teal-700">Contexte financier lié</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {contextInvoiceNumber ? (
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700">
                    Facture {contextInvoiceNumber}
                  </span>
                ) : null}
                {contextFinancialOperationId ? (
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700">
                    Opération {contextFinancialOperationId}
                  </span>
                ) : null}
                {contextProviderReference ? (
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700">
                    Provider {contextProviderReference}
                  </span>
                ) : null}
                {contextTransactionId ? (
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700">
                    Transaction {contextTransactionId}
                  </span>
                ) : null}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
                <div className="rounded-xl border border-white/80 bg-white/80 p-3">
                  <p className="text-xs text-gray-500">Transactions</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{relatedTransactions.length}</p>
                </div>
                <div className="rounded-xl border border-white/80 bg-white/80 p-3">
                  <p className="text-xs text-gray-500">Séquestres</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{relatedEscrows.length}</p>
                </div>
                <div className="rounded-xl border border-white/80 bg-white/80 p-3">
                  <p className="text-xs text-gray-500">Retraits</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{relatedPayoutRequests.length}</p>
                </div>
                <div className="rounded-xl border border-white/80 bg-white/80 p-3">
                  <p className="text-xs text-gray-500">Abonnements</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{relatedSubscriptions.length}</p>
                </div>
                <div className="rounded-xl border border-white/80 bg-white/80 p-3">
                  <p className="text-xs text-gray-500">Ledger</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{relatedCommissionEntries.length}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {relatedTransactions.length > 0 ? (
                <button
                  onClick={() => {
                    setActiveTab('transactions');
                    setSelectedTransaction(relatedTransactions[0]);
                  }}
                  className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
                >
                  Ouvrir la transaction
                </button>
              ) : null}
              {relatedEscrows.length > 0 || relatedPayoutRequests.length > 0 || relatedSubscriptions.length > 0 ? (
                <button
                  onClick={() => setActiveTab('wallet')}
                  className="rounded-lg border border-teal-300 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-white"
                >
                  Ouvrir le portefeuille
                </button>
              ) : null}
              <button
                onClick={clearFinanceContext}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white"
              >
                Effacer le contexte
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Balance Card */}
      <div className="mb-8 rounded-xl border border-[#0f766e] bg-[#0f766e] p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="mb-2 text-sm text-white/72">Solde du portefeuille C2P</p>
            <p className="text-4xl font-bold mb-4">{formatAmount(availableWalletBalance, walletDetails?.currency ?? 'XAF')}</p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowRechargeModal(true)}
                className="whitespace-nowrap rounded-lg bg-white px-4 py-2 text-sm font-medium text-[#0f766e] transition-colors hover:bg-[#f3f7f6]"
              >
                <div className="w-4 h-4 inline-flex items-center justify-center mr-2"><i className="ri-add-line text-base"></i></div>
                Recharger
              </button>
              <button
                onClick={() => setShowDexPayModal(true)}
                className="whitespace-nowrap rounded-lg border border-white/18 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/16"
              >
                <div className="w-4 h-4 inline-flex items-center justify-center mr-2"><i className="ri-secure-payment-line text-base"></i></div>
                DexPay
              </button>
              <button
                onClick={() => setShowWithdrawModal(true)}
                className="whitespace-nowrap rounded-lg border border-white/18 bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/16"
              >
                <div className="w-4 h-4 inline-flex items-center justify-center mr-2"><i className="ri-arrow-up-line text-base"></i></div>
                Retirer
              </button>
            </div>
          </div>
          <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center">
            <div className="w-12 h-12 flex items-center justify-center">
              <i className="ri-wallet-3-line text-5xl text-white"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="border-b border-gray-200">
          <div className="flex space-x-8 px-6">
            {(['transactions', 'methods', 'wallet'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab ? 'border-teal-600 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                <div className="w-5 h-5 inline-flex items-center justify-center mr-2">
                  <i className={`${tab === 'transactions' ? 'ri-exchange-line' : tab === 'methods' ? 'ri-bank-card-line' : 'ri-wallet-3-line'} text-base`}></i>
                </div>
                {tab === 'transactions' ? 'Historique des transactions' : tab === 'methods' ? 'Moyens de paiement' : 'Portefeuille C2P'}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'transactions' && (
            <div>
              <div className="flex flex-wrap gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select value={filterType} onChange={(e) => setFilterType(e.target.value as TransactionType | 'all')} className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none">
                    <option value="all">Tous les types</option>
                    <option value="payment">Paiements</option>
                    <option value="refund">Remboursements</option>
                    <option value="deposit">Dépôts</option>
                    <option value="withdrawal">Retraits</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as TransactionStatus | 'all')} className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none">
                    <option value="all">Tous les statuts</option>
                    <option value="completed">Complétés</option>
                    <option value="pending">En attente</option>
                    <option value="failed">Échoués</option>
                    <option value="cancelled">Annulés</option>
                  </select>
                </div>
                <div className="ml-auto flex items-end">
                  <button onClick={handleExport} className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap">
                    <div className="w-4 h-4 inline-flex items-center justify-center mr-2"><i className="ri-download-line text-base"></i></div>
                    Exporter
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                {hasFinanceContext && filteredTransactions.length === 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    Aucun flux direct ne correspond au contexte demandé. Vérifiez le cycle provider ou les objets liés du portefeuille.
                  </div>
                ) : null}
                {filteredTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className={`rounded-lg border p-4 transition-colors ${
                      hasFinanceContext && relatedTransactions.some((entry) => entry.id === transaction.id)
                        ? 'border-teal-300 bg-teal-50/40'
                        : 'border-gray-200 hover:border-teal-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className={`w-12 h-12 ${transaction.type === 'payment' ? 'bg-red-100' : transaction.type === 'refund' ? 'bg-green-100' : transaction.type === 'deposit' ? 'bg-blue-100' : 'bg-purple-100'} rounded-lg flex items-center justify-center flex-shrink-0`}>
                          <div className="w-6 h-6 flex items-center justify-center">
                            <i className={`${transaction.type === 'payment' ? 'ri-arrow-up-line text-red-600' : transaction.type === 'refund' ? 'ri-arrow-down-line text-green-600' : transaction.type === 'deposit' ? 'ri-add-line text-blue-600' : 'ri-subtract-line text-purple-600'} text-xl`}></i>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-1">
                            <h3 className="font-medium text-gray-900">{transaction.description}</h3>
                            {isProviderBackedTransaction(transaction) ? (
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPaymentLifecycleTone(getTransactionLifecycleState(transaction))}`}>
                                {getPaymentLifecycleLabel(getTransactionLifecycleState(transaction))}
                              </span>
                            ) : (
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>{getStatusLabel(transaction.status)}</span>
                            )}
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>{getTypeLabel(transaction.type)}</span>
                            <span>•</span>
                            <span>{getMethodName(transaction.method)}</span>
                            <span>•</span>
                            <span>{formatDate(transaction.date)}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Réf: {transaction.reference}</p>
                          {isProviderBackedTransaction(transaction) && transaction.provider_status ? (
                            <p className="mt-1 text-xs text-gray-500">Provider: {transaction.provider_status}</p>
                          ) : null}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className={`text-lg font-bold ${transaction.type === 'payment' || transaction.type === 'withdrawal' ? 'text-red-600' : 'text-green-600'}`}>
                          {transaction.type === 'payment' || transaction.type === 'withdrawal' ? '-' : '+'}
                          {formatAmount(transaction.amount, transaction.currency)}
                        </p>
                        <button onClick={() => setSelectedTransaction(transaction)} className="text-sm text-teal-600 hover:text-teal-700 mt-2 cursor-pointer">Voir détails</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'methods' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm text-gray-600">Gérez vos moyens de paiement</p>
                  {dexPayStatus && (
                    <p className="mt-1 text-xs text-gray-500">
                      DexPay {dexPayStatus.configured ? 'configure' : 'non configure'}
                      {dexPayStatus.reachable === false ? ' · verification distante en echec' : ''}
                    </p>
                  )}
                </div>
                <button onClick={() => setShowAddMethod(true)} className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap">
                  <div className="w-4 h-4 inline-flex items-center justify-center mr-2"><i className="ri-add-line text-base"></i></div>
                  Ajouter un moyen de paiement
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paymentMethods.map((method) => (
                  <div key={method.id} className={`border-2 rounded-lg p-6 transition-all ${method.active ? 'border-teal-300 bg-teal-50' : 'border-gray-200 bg-white'}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 ${method.color} rounded-lg flex items-center justify-center`}>
                          <div className="w-6 h-6 flex items-center justify-center"><i className={`${method.icon} text-xl text-white`}></i></div>
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{method.name}</h3>
                          {method.active && <p className="text-sm text-teal-600 mt-1">Configuré</p>}
                        </div>
                      </div>
                      {method.active && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>Actif
                        </span>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      {method.active ? (
                        <>
                          <button
                            onClick={() => setEditingMethod(method.id)}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => setDeletingMethod(method.id)}
                            className="flex-1 px-4 py-2 border border-red-300 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap"
                          >
                            Supprimer
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfiguringMethod(method.id)}
                          className="w-full px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap"
                        >
                          Configurer
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'wallet' && (
            <div>
              <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-4">
                <div className="rounded-2xl border border-teal-100 bg-[#f5faf9] p-6 xl:col-span-2">
                  <p className="mb-1 text-sm text-gray-600">Solde disponible</p>
                  <p className="text-3xl font-bold text-gray-900">{formatAmount(availableWalletBalance, walletDetails?.currency ?? 'XAF')}</p>
                  <div className="mt-4 flex flex-wrap gap-3 text-sm text-gray-600">
                    <span>Séquestres en cours : {formatAmount(heldWalletBalance, walletDetails?.currency ?? 'XAF')}</span>
                    <span>Retraits en attente : {formatAmount(pendingPayoutAmount, walletDetails?.currency ?? 'XAF')}</span>
                  </div>
                  {activeSubscription ? (
                    <div className="mt-4 inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium text-teal-700">
                      {activeSubscription.plan_name} • renouvellement {new Date(activeSubscription.renews_at).toLocaleDateString('fr-FR')}
                    </div>
                  ) : null}
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-6">
                  <p className="text-sm text-gray-500">Paiements à libérer</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{formatAmount(pendingReleaseBalance, walletDetails?.currency ?? 'XAF')}</p>
                  <p className="mt-2 text-sm text-gray-500">Montants sous supervision C2P avant libération.</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-6">
                  <p className="text-sm text-gray-500">Revenus / frais reconnus</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{formatAmount(subscriptionRevenueView, walletDetails?.currency ?? 'XAF')}</p>
                  <p className="mt-2 text-sm text-gray-500">Ledger C2P visible pour vos flux SaaS et missions.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <div className="w-6 h-6 flex items-center justify-center"><i className="ri-add-line text-xl text-blue-600"></i></div>
                  </div>
                  <h3 className="font-medium text-gray-900 mb-2">Recharger le portefeuille</h3>
                  <p className="text-sm text-gray-600 mb-4">Ajoutez des fonds à votre portefeuille C2P depuis vos moyens de paiement</p>
                  <button
                    onClick={() => setShowRechargeModal(true)}
                    className="w-full px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap"
                  >
                    Recharger maintenant
                  </button>
                </div>
                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="w-12 h-12 bg-[#0f766e]/10 rounded-lg flex items-center justify-center mb-4">
                    <div className="w-6 h-6 flex items-center justify-center"><i className="ri-secure-payment-line text-xl text-[#0f766e]"></i></div>
                  </div>
                  <h3 className="font-medium text-gray-900 mb-2">Operation DexPay</h3>
                  <p className="text-sm text-gray-600 mb-4">Demarrez un on-ramp ou un off-ramp avec instructions bancaires ou adresse de depot.</p>
                  <button
                    onClick={() => setShowDexPayModal(true)}
                    className="w-full px-4 py-2 border border-[#0f766e]/20 text-[#0f766e] text-sm font-medium rounded-lg hover:bg-[#f5faf9] transition-colors whitespace-nowrap"
                  >
                    Ouvrir DexPay
                  </button>
                </div>
                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <div className="w-6 h-6 flex items-center justify-center"><i className="ri-arrow-up-line text-xl text-purple-600"></i></div>
                  </div>
                  <h3 className="font-medium text-gray-900 mb-2">Retirer des fonds</h3>
                  <p className="text-sm text-gray-600 mb-4">Transférez vos fonds vers vos moyens de paiement</p>
                  <button
                    onClick={() => setShowWithdrawModal(true)}
                    className="w-full px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                  >
                    {monetizedRole ? 'Demander un retrait' : 'Effectuer un retrait'}
                  </button>
                </div>
              </div>

              {providerBackedTransactions.length > 0 && (
                <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Cycle provider</h3>
                      <p className="text-sm text-gray-600">Suivi unifié des opérations externalisées avant confirmation et réconciliation C2P.</p>
                    </div>
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                      {providerBackedTransactions.length} opération(s)
                    </span>
                  </div>
                  <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-xs font-medium text-amber-700">En cours provider</p>
                      <p className="mt-2 text-2xl font-bold text-amber-900">{activeProviderTransactions.length}</p>
                    </div>
                    <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
                      <p className="text-xs font-medium text-teal-700">Réconciliées</p>
                      <p className="mt-2 text-2xl font-bold text-teal-900">{reconciledProviderTransactions.length}</p>
                    </div>
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                      <p className="text-xs font-medium text-red-700">À revoir</p>
                      <p className="mt-2 text-2xl font-bold text-red-900">{failedProviderTransactions.length}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {activeProviderTransactions.length === 0 ? (
                      <p className="text-sm text-gray-500">Aucune opération provider en attente pour le moment.</p>
                    ) : activeProviderTransactions.slice(0, 4).map((transaction) => (
                      <div key={transaction.id} className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{transaction.description}</p>
                          <p className="mt-1 text-sm text-gray-600">
                            {formatAmount(transaction.amount, transaction.currency)} · {transaction.provider_status || 'provider pending'} · {formatDate(transaction.date)}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {getSelfServiceCapabilities(transaction, 'provider_console').summary}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getPaymentLifecycleTone(getTransactionLifecycleState(transaction))}`}>
                            {getPaymentLifecycleLabel(getTransactionLifecycleState(transaction))}
                          </span>
                          {transaction.method === 'dexpay' && getSelfServiceCapabilities(transaction, 'provider_console').actions.sync_provider ? (
                            <button
                              onClick={() => void handleSyncDexPayTransaction(transaction)}
                              className="rounded-lg border border-[#0f766e]/20 px-3 py-1.5 text-xs font-medium text-[#0f766e] hover:bg-[#f5faf9]"
                            >
                              Synchroniser
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {monetizedRole && (
                <div id="c2p-subscription-plans" className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Abonnement C2P</h3>
                      <p className="text-sm text-gray-600">Le plan pilote votre niveau de commission, la priorisation et l’accès aux services SaaS.</p>
                    </div>
                    {defaultPayoutAccount ? (
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                        Retrait par défaut : {defaultPayoutAccount.label}
                      </span>
                    ) : null}
                  </div>
                  {selectedPlan ? (
                    <div className="mb-4 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
                      Plan cible : <strong>{selectedPlan.name}</strong>. Vous pouvez l’activer directement ci-dessous.
                    </div>
                  ) : selectedPlanUnavailable ? (
                    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      {selectedPlanName ? `Le plan ${selectedPlanName}` : 'Ce plan'} n’est pas disponible pour votre compte actuel{selectedPlanRole ? ` (${selectedPlanRole})` : ''}.
                    </div>
                  ) : null}
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    {subscriptionPlans.map((plan) => {
                      const isActive = activeSubscription?.plan_id === plan.id;
                      const isSelected = selectedPlanId === String(plan.id);
                      return (
                        <div key={plan.id} className={`rounded-2xl border p-5 ${isActive ? 'border-teal-300 bg-teal-50' : isSelected ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white'}`}>
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div>
                              <h4 className="font-semibold text-gray-900">{plan.name}</h4>
                              <p className="mt-1 text-sm text-gray-500">{formatAmount(plan.price_monthly, plan.currency)} / mois</p>
                            </div>
                            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-teal-700">
                              commission {plan.commission_rate}%
                            </span>
                          </div>
                          <ul className="space-y-2 text-sm text-gray-600">
                            {(plan.features || []).slice(0, 3).map((feature) => (
                              <li key={feature} className="flex items-start gap-2">
                                <i className="ri-check-line mt-0.5 text-teal-600"></i>
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                          <button
                            onClick={() => void handleActivatePlan(plan)}
                            className={`mt-5 w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors ${isActive ? 'border border-teal-200 bg-white text-teal-700 hover:bg-teal-100' : 'bg-teal-600 text-white hover:bg-teal-700'}`}
                          >
                            {isActive ? 'Renouveler ce plan' : 'Activer ce plan'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {user?.role === 'prestataire' && providerVisibilityProducts.length > 0 && (
                <div id="senpresta-visibility" className="mb-6 rounded-2xl border border-[#27346b]/10 bg-white p-6">
                  <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Billets SenPresta</h3>
                      <p className="text-sm text-gray-600">Achetez un billet pour renforcer votre visibilité, vos alertes et votre niveau de priorisation dans les flux SenPresta.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {activeProviderVisibilityPass ? (
                        <span className="rounded-full bg-[#27346b]/10 px-3 py-1 text-xs font-medium text-[#27346b]">
                          Actif : {activeProviderVisibilityPass.pass_label} {activeProviderVisibilityPass.code ? `· ${activeProviderVisibilityPass.code}` : ''}
                        </span>
                      ) : null}
                      {latestProviderVisibilityOrder ? (
                        <span className="rounded-full bg-[#dbad29]/15 px-3 py-1 text-xs font-medium text-[#8a6a12]">
                          Dernier achat : {formatDate(latestProviderVisibilityOrder.purchased_at)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
                    {providerVisibilityProducts.map((product) => {
                      const isCurrentTier = activeProviderVisibilityPass?.pass_tier === product.tier;
                      const isBusy = purchasingVisibilityProductId === product.id;
                      return (
                        <div key={product.id} className={`rounded-2xl border p-5 ${isCurrentTier ? 'border-[#dbad29]/40 bg-[#dbad29]/5' : 'border-gray-200 bg-white'}`}>
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div>
                              <h4 className="font-semibold text-gray-900">{product.name}</h4>
                              <p className="mt-1 text-sm text-gray-500">{formatAmount(product.price, product.currency)} / {product.duration_days} jours</p>
                            </div>
                            <span className="rounded-full bg-[#27346b]/10 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-[#27346b]">
                              {product.tier}
                            </span>
                          </div>
                          {product.description ? (
                            <p className="mb-3 text-sm text-gray-600">{product.description}</p>
                          ) : null}
                          <ul className="space-y-2 text-sm text-gray-600">
                            {product.features.slice(0, 3).map((feature) => (
                              <li key={feature} className="flex items-start gap-2">
                                <i className="ri-check-line mt-0.5 text-[#27346b]"></i>
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-500">
                            <span className="rounded-full bg-gray-100 px-2.5 py-1">
                              Priorité {product.matching_priority}
                            </span>
                            {product.alerts_enabled ? (
                              <span className="rounded-full bg-gray-100 px-2.5 py-1">Alertes incluses</span>
                            ) : null}
                            {product.verification_eligible ? (
                              <span className="rounded-full bg-gray-100 px-2.5 py-1">Éligible vérification</span>
                            ) : null}
                          </div>
                          <button
                            onClick={() => void handlePurchaseVisibilityProduct(product)}
                            disabled={isBusy}
                            className="mt-5 w-full rounded-lg bg-[#27346b] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1d2854] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isBusy ? 'Achat en cours...' : 'Acheter ce billet'}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                      <p className="text-sm font-medium text-gray-900">Billet actif</p>
                      {activeProviderVisibilityPass ? (
                        <div className="mt-3 space-y-2 text-sm text-gray-600">
                          <p><span className="font-medium text-gray-900">{activeProviderVisibilityPass.pass_label}</span> · {activeProviderVisibilityPass.code}</p>
                          <p>Échéance : {activeProviderVisibilityPass.expires_at ? formatDate(activeProviderVisibilityPass.expires_at) : 'non définie'}</p>
                          <p>Source : {activeProviderVisibilityPass.product_name || activeProviderVisibilityPass.plan_name || 'SenPresta'}</p>
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-gray-500">Aucun billet actif pour le moment.</p>
                      )}
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">Historique des achats</p>
                        <span className="text-xs text-gray-500">{providerVisibilityOrders.length} achat(s)</span>
                      </div>
                      <div className="space-y-3">
                        {providerVisibilityOrders.length === 0 ? (
                          <p className="text-sm text-gray-500">Aucun achat de billet enregistré.</p>
                        ) : providerVisibilityOrders.slice(0, 3).map((order) => (
                          <div key={order.id} className="rounded-xl border border-gray-200 bg-white p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-medium text-gray-900">{order.product_name || 'Billet SenPresta'}</p>
                                <p className="mt-1 text-sm text-gray-600">{formatDate(order.purchased_at)} · {order.pass_code || order.pass_tier}</p>
                              </div>
                              <p className="font-semibold text-gray-900">{formatAmount(order.amount, order.currency)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 bg-white p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Séquestres et paiements C2P</h3>
                    <span className="text-sm text-gray-500">{activeEscrows.length} actif(s)</span>
                  </div>
                  <div className="space-y-3">
                    {activeEscrows.length === 0 ? (
                      <p className="text-sm text-gray-500">Aucun flux sous séquestre pour le moment.</p>
                    ) : activeEscrows.slice(0, 4).map((escrow) => (
                      <div key={escrow.id} className="rounded-xl border border-gray-200 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-gray-900">{escrow.booking_title || escrow.service || 'Mission C2P'}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <p className="text-sm text-gray-600">{escrow.provider_name || 'En assignation'}</p>
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getEscrowStatusTone(escrow.status)}`}>
                                {getEscrowStatusLabel(escrow.status)}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">{formatAmount(escrow.amount_total, escrow.currency)}</p>
                            <p className="mt-1 text-xs text-gray-500">Net prestataire {formatAmount(escrow.provider_amount, escrow.currency)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Retraits et ledger</h3>
                    <span className="text-sm text-gray-500">{payoutRequests.length} demande(s)</span>
                  </div>
                  <div className="space-y-3">
                    {payoutRequests.slice(0, 4).map((request) => (
                      <div key={request.id} className="rounded-xl border border-gray-200 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-gray-900">{request.account_label || request.method}</p>
                            <p className="mt-1 text-sm text-gray-600">{new Date(request.requested_at).toLocaleDateString('fr-FR')} · {request.status}</p>
                          </div>
                          <p className="font-semibold text-gray-900">{formatAmount(request.amount, request.currency)}</p>
                        </div>
                      </div>
                    ))}
                    {payoutRequests.length === 0 && <p className="text-sm text-gray-500">Aucune demande de retrait.</p>}
                    {commissionEntries.length > 0 && (
                      <div className="rounded-xl bg-gray-50 p-4">
                        <p className="text-sm font-medium text-gray-900">Dernier mouvement ledger</p>
                        <p className="mt-1 text-sm text-gray-600">{commissionEntries[0].description}</p>
                        <p className="mt-2 text-sm font-semibold text-gray-900">{formatAmount(commissionEntries[0].amount, commissionEntries[0].currency)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Payment Method Modal */}
      {showAddMethod && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Ajouter un moyen de paiement</h2>
              <button onClick={() => setShowAddMethod(false)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                <div className="w-5 h-5 flex items-center justify-center"><i className="ri-close-line text-xl"></i></div>
              </button>
            </div>
            <div className="space-y-3 mb-6">
              {activeMethods.map((method) => (
                <button key={method.id} onClick={() => setSelectedMethod(method.id)} className={`w-full flex items-center space-x-4 p-4 border-2 rounded-lg transition-all ${selectedMethod === method.id ? 'border-teal-600 bg-teal-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className={`w-12 h-12 ${method.color} rounded-lg flex items-center justify-center`}>
                    <div className="w-6 h-6 flex items-center justify-center"><i className={`${method.icon} text-xl text-white`}></i></div>
                  </div>
                  <span className="font-medium text-gray-900">{method.name}</span>
                </button>
              ))}
            </div>
            <div className="flex space-x-3">
              <button onClick={() => setShowAddMethod(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap">Annuler</button>
              <button
                onClick={() => {
                  if (!selectedMethod) return;
                  handleConfigureMethod();
                  setShowAddMethod(false);
                  setSelectedMethod(null);
                }}
                disabled={!selectedMethod}
                className="flex-1 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                Continuer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Method Modal */}
      {editingMethod && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Modifier {paymentMethods.find(m => m.id === editingMethod)?.name}</h2>
              <button onClick={() => setEditingMethod(null)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                <div className="w-5 h-5 flex items-center justify-center"><i className="ri-close-line text-xl"></i></div>
              </button>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de compte / Téléphone</label>
                <input type="text" defaultValue="77 123 45 67" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du titulaire</label>
                <input type="text" defaultValue="Amadou Diop" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm" />
              </div>
            </div>
            <div className="flex space-x-3">
              <button onClick={() => setEditingMethod(null)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap">Annuler</button>
              <button onClick={handleEditMethod} className="flex-1 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Method Modal */}
      {deletingMethod && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <i className="ri-alert-line text-red-600 text-xl"></i>
              </div>
              <h2 className="text-lg font-bold text-gray-900">Supprimer le moyen de paiement</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir supprimer <strong>{paymentMethods.find(m => m.id === deletingMethod)?.name}</strong> ? Vous ne pourrez plus l'utiliser pour les paiements.
            </p>
            <div className="flex space-x-3">
              <button onClick={() => setDeletingMethod(null)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap">Annuler</button>
              <button onClick={handleDeleteMethod} className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Configure Method Modal */}
      {configuringMethod && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Configurer {paymentMethods.find(m => m.id === configuringMethod)?.name}</h2>
              <button onClick={() => setConfiguringMethod(null)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                <div className="w-5 h-5 flex items-center justify-center"><i className="ri-close-line text-xl"></i></div>
              </button>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de compte / Téléphone</label>
                <input type="text" placeholder="Entrez votre numéro" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du titulaire</label>
                <input type="text" placeholder="Nom complet" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm" />
              </div>
            </div>
            <div className="flex space-x-3">
              <button onClick={() => setConfiguringMethod(null)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap">Annuler</button>
              <button onClick={handleConfigureMethod} className="flex-1 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap">Activer</button>
            </div>
          </div>
        </div>
      )}

      {/* Recharge Modal */}
      {showRechargeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Recharger le portefeuille</h2>
              <button onClick={() => { setShowRechargeModal(false); setRechargeAmount(''); }} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                <div className="w-5 h-5 flex items-center justify-center"><i className="ri-close-line text-xl"></i></div>
              </button>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Montant (XAF)</label>
                <input
                  type="number"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  placeholder="Ex: 25000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Moyen de paiement</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm bg-white">
                  <option>Orange Money</option>
                  <option>Wave</option>
                  <option>Carte Bancaire</option>
                </select>
              </div>
            </div>
            <div className="flex space-x-3">
              <button onClick={() => { setShowRechargeModal(false); setRechargeAmount(''); }} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap">Annuler</button>
              <button onClick={handleRecharge} className="flex-1 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap">Recharger</button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Retirer des fonds</h2>
              <button onClick={() => { setShowWithdrawModal(false); setWithdrawAmount(''); }} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                <div className="w-5 h-5 flex items-center justify-center"><i className="ri-close-line text-xl"></i></div>
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">Solde disponible : {formatAmount(availableWalletBalance, walletDetails?.currency ?? 'XAF')}</p>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Montant (XAF)</label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Ex: 10000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Moyen de retrait</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm bg-white">
                  <option>Orange Money</option>
                  <option>Wave</option>
                  <option>Carte Bancaire</option>
                </select>
              </div>
            </div>
            <div className="flex space-x-3">
              <button onClick={() => { setShowWithdrawModal(false); setWithdrawAmount(''); }} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap">Annuler</button>
              <button onClick={handleWithdraw} className="flex-1 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap">Retirer</button>
            </div>
          </div>
        </div>
      )}

      {showDexPayModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Nouvelle operation DexPay</h2>
                <p className="text-sm text-gray-500 mt-1">Flux devise fiat / stablecoin pilote par DexPay</p>
              </div>
              <button onClick={() => setShowDexPayModal(false)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                <div className="w-5 h-5 flex items-center justify-center"><i className="ri-close-line text-xl"></i></div>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
                <select value={dexPayForm.direction} onChange={(e) => setDexPayForm((prev) => ({ ...prev, direction: e.target.value as 'onramp' | 'offramp' }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm bg-white">
                  <option value="onramp">On-ramp fiat vers stablecoin</option>
                  <option value="offramp">Off-ramp stablecoin vers fiat</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Montant fiat (XAF)</label>
                <input type="number" value={dexPayForm.fiatAmount} onChange={(e) => setDexPayForm((prev) => ({ ...prev, fiatAmount: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm" placeholder="Ex: 25000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Actif</label>
                <input type="text" value={dexPayForm.asset} onChange={(e) => setDexPayForm((prev) => ({ ...prev, asset: e.target.value.toUpperCase() }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chain</label>
                <input type="text" value={dexPayForm.chain} onChange={(e) => setDexPayForm((prev) => ({ ...prev, chain: e.target.value.toUpperCase() }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm" />
              </div>
              {dexPayForm.direction === 'onramp' ? (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Wallet de destination</label>
                  <input type="text" value={dexPayForm.recipientWallet} onChange={(e) => setDexPayForm((prev) => ({ ...prev, recipientWallet: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm" placeholder="0x..." />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Banque</label>
                    <select value={dexPayForm.bankCode} onChange={(e) => setDexPayForm((prev) => ({ ...prev, bankCode: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm bg-white">
                      <option value="">Selectionner une banque</option>
                      {dexPayBanks.map((bank) => (
                        <option key={bank.code} value={bank.code}>{bank.name} {bank.currency ? `(${bank.currency})` : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Titulaire</label>
                    <input type="text" value={dexPayForm.accountName} onChange={(e) => setDexPayForm((prev) => ({ ...prev, accountName: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Numero de compte</label>
                    <input type="text" value={dexPayForm.accountNumber} onChange={(e) => setDexPayForm((prev) => ({ ...prev, accountNumber: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-teal-500 text-sm" />
                  </div>
                </>
              )}
            </div>
            <div className="flex space-x-3">
              <button onClick={() => setShowDexPayModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap">Annuler</button>
              <button onClick={handleStartDexPayCheckout} disabled={dexPaySubmitting} className="flex-1 px-4 py-2 bg-[#0f766e] text-white text-sm font-medium rounded-lg hover:bg-[#0d665f] transition-colors disabled:opacity-60 whitespace-nowrap">
                {dexPaySubmitting ? 'Traitement...' : 'Creer l operation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedTransaction.type === 'payment' ? 'bg-red-100' : selectedTransaction.type === 'refund' ? 'bg-green-100' : selectedTransaction.type === 'deposit' ? 'bg-blue-100' : 'bg-purple-100'}`}>
                  <div className="w-5 h-5 flex items-center justify-center">
                    <i className={`${selectedTransaction.type === 'payment' ? 'ri-arrow-up-line text-red-600' : selectedTransaction.type === 'refund' ? 'ri-arrow-down-line text-green-600' : selectedTransaction.type === 'deposit' ? 'ri-add-line text-blue-600' : 'ri-subtract-line text-purple-600'} text-lg`}></i>
                  </div>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selectedTransaction.id}</h2>
                  <p className="text-xs text-gray-500">{getTypeLabel(selectedTransaction.type)}</p>
                </div>
              </div>
              <button onClick={() => setSelectedTransaction(null)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                <div className="w-5 h-5 flex items-center justify-center"><i className="ri-close-line text-xl"></i></div>
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Montant</span>
                <span className={`text-lg font-bold ${selectedTransaction.type === 'payment' || selectedTransaction.type === 'withdrawal' ? 'text-red-600' : 'text-green-600'}`}>
                  {selectedTransaction.type === 'payment' || selectedTransaction.type === 'withdrawal' ? '-' : '+'}{formatAmount(selectedTransaction.amount, selectedTransaction.currency)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Statut</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedTransaction.status)}`}>
                    {getStatusLabel(selectedTransaction.status)}
                  </span>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Moyen de paiement</p>
                  <p className="text-sm font-medium text-gray-900">{getMethodName(selectedTransaction.method)}</p>
                </div>
                {isProviderBackedTransaction(selectedTransaction) && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Cycle provider</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentLifecycleTone(getTransactionLifecycleState(selectedTransaction))}`}>
                      {getPaymentLifecycleLabel(getTransactionLifecycleState(selectedTransaction))}
                    </span>
                    <p className="mt-2 text-xs text-gray-500">
                      {getSelfServiceCapabilities(selectedTransaction, 'transaction_modal').summary}
                    </p>
                  </div>
                )}
                {isProviderBackedTransaction(selectedTransaction) && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Statut brut provider</p>
                    <p className="text-sm font-medium text-gray-900">{selectedTransaction.provider_status || 'En attente de confirmation'}</p>
                  </div>
                )}
                <div className="p-3 bg-gray-50 rounded-lg col-span-2">
                  <p className="text-xs text-gray-500 mb-1">Description</p>
                  <p className="text-sm font-medium text-gray-900">{selectedTransaction.description}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Date</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(selectedTransaction.date)}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Référence</p>
                  <p className="text-sm font-medium text-gray-900">{selectedTransaction.reference}</p>
                </div>
                {(selectedTransaction.financial_operation_id || selectedTransaction.provider_reference || selectedTransaction.payment_intent_id) && (
                  <div className="p-3 bg-gray-50 rounded-lg col-span-2">
                    <p className="text-xs text-gray-500 mb-2">Objets liés</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedTransaction.financial_operation_id ? (
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700">
                          Opération {selectedTransaction.financial_operation_id}
                        </span>
                      ) : null}
                      {selectedTransaction.payment_intent_id ? (
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700">
                          Intent {selectedTransaction.payment_intent_id}
                        </span>
                      ) : null}
                      {selectedTransaction.provider_reference ? (
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700">
                          Provider {selectedTransaction.provider_reference}
                        </span>
                      ) : null}
                    </div>
                  </div>
                )}
                {selectedTransaction.payment_account && (
                  <div className="p-3 bg-gray-50 rounded-lg col-span-2">
                    <p className="text-xs text-gray-500 mb-1">Instructions de paiement DexPay</p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedTransaction.payment_account.accountName} · {selectedTransaction.payment_account.accountNumber} · {selectedTransaction.payment_account.bankName}
                    </p>
                  </div>
                )}
                {selectedTransaction.deposit_address && (
                  <div className="p-3 bg-gray-50 rounded-lg col-span-2">
                    <p className="text-xs text-gray-500 mb-1">Adresse de depot DexPay</p>
                    <p className="text-sm font-medium break-all text-gray-900">{selectedTransaction.deposit_address}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex space-x-3">
              <button onClick={() => setSelectedTransaction(null)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap">Fermer</button>
              {(selectedTransaction.financial_operation_id || selectedTransaction.reference) && getSelfServiceCapabilities(selectedTransaction, 'transaction_modal').actions.open_linked_invoices && (
                <button
                  onClick={() => openRelatedInvoices(selectedTransaction)}
                  className="flex-1 px-4 py-2 border border-teal-200 text-teal-700 text-sm font-medium rounded-lg hover:bg-teal-50 transition-colors whitespace-nowrap"
                >
                  Voir les factures liées
                </button>
              )}
              {selectedTransaction.method === 'dexpay' && getSelfServiceCapabilities(selectedTransaction, 'transaction_modal').actions.sync_provider && (
                <button
                  onClick={handleSyncDexPay}
                  disabled={syncingDexPay}
                  className="flex-1 px-4 py-2 border border-[#0f766e]/30 text-[#0f766e] text-sm font-medium rounded-lg hover:bg-[#f5faf9] transition-colors disabled:opacity-60 whitespace-nowrap"
                >
                  {syncingDexPay ? 'Synchronisation...' : 'Synchroniser DexPay'}
                </button>
              )}
              <button
                onClick={() => handleDownloadReceipt(selectedTransaction)}
                className="flex-1 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors whitespace-nowrap"
              >
                <i className="ri-download-line mr-1"></i>Télécharger le reçu
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
