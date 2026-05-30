import { useState } from 'react';
import type { AuthUser } from '@/lib/roles';
import {
  activateSubscriptionPlan,
  createDexPayCheckout,
  createPayoutRequest,
  purchaseProviderVisibility,
  syncDexPayOrder,
  topupWallet,
  withdrawWallet,
} from '@/lib/paymentsApi';
import {
  getPaymentLifecycleLabel,
  resolvePaymentLifecycleStatus,
} from '@/lib/paymentStatus';
import type {
  PayoutAccount,
  ProviderVisibilityProduct,
  SubscriptionPlan,
  UserSubscription,
} from '@/lib/saasApi';
import type { DexPayCheckoutForm } from './DexPayCheckoutModal';
import type { PaymentMethodId, Transaction } from './paymentPageModel';

type ToastFn = (title: string, message?: string) => void;

interface UsePaymentActionsParams {
  user: AuthUser | null;
  walletId: string | number | null;
  availableWalletBalance: number;
  monetizedRole: boolean;
  defaultPayoutAccount: PayoutAccount | null;
  dexPayAvailable: boolean;
  activeSubscription: UserSubscription | null;
  refreshPayments: () => Promise<void>;
  success: ToastFn;
  error: ToastFn;
}

const normalizeTransaction = (rawTransaction: unknown): Transaction => {
  const transaction = rawTransaction as Transaction;
  return {
    ...transaction,
    lifecycle_status: transaction.lifecycle_status ?? resolvePaymentLifecycleStatus(transaction),
  };
};

const getRequestErrorMessage = (requestError: unknown, fallback: string) => {
  if (requestError instanceof Error) {
    return requestError.message;
  }
  if (requestError && typeof requestError === 'object' && 'message' in requestError) {
    return String(requestError.message);
  }
  return fallback;
};

export function usePaymentActions({
  user,
  walletId,
  availableWalletBalance,
  monetizedRole,
  defaultPayoutAccount,
  dexPayAvailable,
  activeSubscription,
  refreshPayments,
  success,
  error,
}: UsePaymentActionsParams) {
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showDexPayModal, setShowDexPayModal] = useState(false);
  const [dexPaySubmitting, setDexPaySubmitting] = useState(false);
  const [syncingDexPay, setSyncingDexPay] = useState(false);
  const [purchasingVisibilityProductId, setPurchasingVisibilityProductId] = useState<string | null>(null);
  const [dexPayForm, setDexPayForm] = useState<DexPayCheckoutForm>({
    direction: 'onramp',
    fiatAmount: '',
    tokenAmount: '',
    asset: 'DUSD',
    chain: 'BSC',
    bankCode: '',
    accountName: user ? `${user.firstName} ${user.lastName}` : '',
    accountNumber: '',
    recipientWallet: '',
  });

  const closeRechargeModal = () => { setShowRechargeModal(false); setRechargeAmount(''); };
  const closeWithdrawModal = () => { setShowWithdrawModal(false); setWithdrawAmount(''); };
  const updateDexPayForm = (patch: Partial<DexPayCheckoutForm>) => setDexPayForm((current) => ({ ...current, ...patch }));

  const handleRecharge = () => {
    if (!walletId) {
      error('Portefeuille indisponible', 'Votre portefeuille C2P n est pas encore pret.');
      return;
    }
    const amount = parseInt(rechargeAmount.replace(/\s/g, ''), 10);
    if (Number.isNaN(amount) || amount <= 0) {
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
        await refreshPayments();
        success('Rechargement effectué', `${amount.toLocaleString('fr-FR')} XAF ont été ajoutés à votre portefeuille.`);
        closeRechargeModal();
      } catch (requestError) {
        error('Erreur', getRequestErrorMessage(requestError, 'Le rechargement n a pas pu etre enregistre.'));
      }
    })();
  };

  const handleWithdraw = () => {
    if (!walletId) {
      error('Portefeuille indisponible', 'Votre portefeuille C2P n est pas encore pret.');
      return;
    }
    const amount = parseInt(withdrawAmount.replace(/\s/g, ''), 10);
    if (Number.isNaN(amount) || amount <= 0) {
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
          await refreshPayments();
          success('Demande envoyée', 'C2P a bien reçu votre demande de retrait.');
          closeWithdrawModal();
        } catch (requestError) {
          error('Erreur', getRequestErrorMessage(requestError, 'La demande de retrait n a pas pu etre enregistree.'));
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
        await refreshPayments();
        success('Retrait effectué', `${amount.toLocaleString('fr-FR')} XAF ont été retirés de votre portefeuille.`);
        closeWithdrawModal();
      } catch (requestError) {
        error('Erreur', getRequestErrorMessage(requestError, 'Le retrait n a pas pu etre enregistre.'));
      }
    })();
  };

  const handleStartDexPayCheckout = async () => {
    if (!dexPayAvailable) {
      error('DexPay indisponible', 'Le provider DexPay n est pas encore configure.');
      return;
    }
    setDexPaySubmitting(true);
    try {
      const result = await createDexPayCheckout({
        direction: dexPayForm.direction,
        fiatAmount: dexPayForm.fiatAmount ? Number(dexPayForm.fiatAmount) : undefined,
        tokenAmount: dexPayForm.tokenAmount ? Number(dexPayForm.tokenAmount) : undefined,
        asset: dexPayForm.asset,
        chain: dexPayForm.chain,
        bankCode: dexPayForm.bankCode || undefined,
        accountName: dexPayForm.accountName || undefined,
        accountNumber: dexPayForm.accountNumber || undefined,
        recipientWallet: dexPayForm.recipientWallet || undefined,
      });
      const transaction = normalizeTransaction(result.transaction);
      setSelectedTransaction(transaction);
      await refreshPayments();
      setShowDexPayModal(false);
      success(
        'Operation DexPay creee',
        transaction.payment_account
          ? 'Les instructions de paiement bancaire sont disponibles dans le detail.'
          : 'L adresse de depot DexPay est disponible dans le detail.',
      );
    } catch (requestError) {
      error('DexPay indisponible', getRequestErrorMessage(requestError, 'Impossible de demarrer l operation DexPay.'));
    } finally {
      setDexPaySubmitting(false);
    }
  };

  const syncDexPayTransaction = async (transactionRow: Transaction) => {
    setSyncingDexPay(true);
    try {
      const orderId = transactionRow.provider_order_id || transactionRow.reference;
      const result = await syncDexPayOrder(orderId, transactionRow.id);
      const transaction = normalizeTransaction(result.transaction);
      setSelectedTransaction(transaction);
      await refreshPayments();
      success('Statut synchronise', `Cycle de paiement: ${getPaymentLifecycleLabel(resolvePaymentLifecycleStatus(transaction))}.`);
    } catch (requestError) {
      error('Synchronisation impossible', getRequestErrorMessage(requestError, 'Impossible de synchroniser la transaction DexPay.'));
    } finally {
      setSyncingDexPay(false);
    }
  };

  const handleSyncDexPay = async () => {
    if (!selectedTransaction?.provider_order_id && !selectedTransaction?.reference) return;
    await syncDexPayTransaction(selectedTransaction);
  };

  const handleSyncDexPayTransaction = async (transactionRow: Transaction) => {
    setSelectedTransaction(transactionRow);
    await syncDexPayTransaction(transactionRow);
  };

  const handleActivatePlan = async (plan: SubscriptionPlan, paymentMethod: PaymentMethodId = 'dexpay') => {
    if (!user?.id) return;
    try {
      await activateSubscriptionPlan({
        plan_id: plan.id,
        payment_method: paymentMethod,
        auto_renew: true,
        renew_now: Boolean(activeSubscription),
      });
      await refreshPayments();
      success(
        'Abonnement mis à jour',
        paymentMethod === 'wallet'
          ? `Le plan ${plan.name} a été réglé avec votre solde C2P.`
          : `Le plan ${plan.name} a été réglé directement via ${paymentMethod === 'dexpay' ? 'DexPay' : paymentMethod}.`,
      );
    } catch (requestError) {
      error('Abonnement impossible', getRequestErrorMessage(requestError, 'Impossible d activer ce plan.'));
    }
  };

  const handlePurchaseVisibilityProduct = async (product: ProviderVisibilityProduct, paymentMethod: PaymentMethodId = 'dexpay') => {
    if (user?.role !== 'prestataire') return;
    setPurchasingVisibilityProductId(product.id);
    try {
      const result = await purchaseProviderVisibility({ product_id: product.id, payment_method: paymentMethod });
      await refreshPayments();
      success(
        'Billet activé',
        `${product.name} est actif${result.pass?.code ? ` avec le code ${result.pass.code}` : ''}. Paiement ${paymentMethod === 'wallet' ? 'par solde C2P' : 'direct'}.`,
      );
    } catch (requestError) {
      error('Achat impossible', getRequestErrorMessage(requestError, 'Impossible d acheter ce billet SenPresta.'));
    } finally {
      setPurchasingVisibilityProductId(null);
    }
  };

  return {
    closeRechargeModal,
    closeWithdrawModal,
    dexPayForm,
    dexPaySubmitting,
    handleActivatePlan,
    handlePurchaseVisibilityProduct,
    handleRecharge,
    handleStartDexPayCheckout,
    handleSyncDexPay,
    handleSyncDexPayTransaction,
    handleWithdraw,
    purchasingVisibilityProductId,
    rechargeAmount,
    selectedTransaction,
    setRechargeAmount,
    setSelectedTransaction,
    setShowDexPayModal,
    setShowRechargeModal,
    setShowWithdrawModal,
    setWithdrawAmount,
    showDexPayModal,
    showRechargeModal,
    showWithdrawModal,
    syncingDexPay,
    updateDexPayForm,
    withdrawAmount,
  };
}
