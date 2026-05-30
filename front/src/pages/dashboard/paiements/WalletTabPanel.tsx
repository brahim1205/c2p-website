import {
  getEscrowStatusLabel,
  getEscrowStatusTone,
} from '@/lib/paymentStatus';
import type {
  CommissionEntry,
  EscrowCase,
  PayoutAccount,
  PayoutRequest,
  ProviderVisibilityOrder,
  ProviderVisibilityPassRecord,
  ProviderVisibilityProduct,
  SubscriptionPlan,
  UserSubscription,
} from '@/lib/saasApi';
import {
  formatAmount,
  type PaymentMethodId,
  type Transaction,
} from './paymentPageModel';
import ProviderCyclePanel from './ProviderCyclePanel';
import ProviderVisibilityPanel from './ProviderVisibilityPanel';
import SubscriptionPlansPanel from './SubscriptionPlansPanel';

interface WalletTabPanelProps {
  availableBalance: number;
  heldBalance: number;
  pendingPayoutAmount: number;
  pendingReleaseBalance: number;
  subscriptionRevenueView: number;
  currency: string;
  activeSubscription: UserSubscription | null;
  monetizedRole: boolean;
  dexPayAvailable: boolean;
  providerBackedTransactions: Transaction[];
  activeProviderTransactions: Transaction[];
  reconciledProviderTransactionsCount: number;
  failedProviderTransactionsCount: number;
  syncingDexPay: boolean;
  defaultPayoutAccount: PayoutAccount | null;
  subscriptionPlans: SubscriptionPlan[];
  selectedPlanId: string;
  selectedPlan: SubscriptionPlan | null;
  selectedPlanUnavailable: boolean;
  selectedPlanName: string;
  selectedPlanRole: string;
  userRole?: string;
  providerVisibilityProducts: ProviderVisibilityProduct[];
  activeProviderVisibilityPass: ProviderVisibilityPassRecord | null;
  latestProviderVisibilityOrder: ProviderVisibilityOrder | null;
  providerVisibilityOrders: ProviderVisibilityOrder[];
  purchasingVisibilityProductId: string | null;
  activeEscrows: EscrowCase[];
  payoutRequests: PayoutRequest[];
  commissionEntries: CommissionEntry[];
  onRecharge: () => void;
  onOpenDexPay: () => void;
  onWithdraw: () => void;
  getTransactionLifecycleState: (transaction: Transaction) => NonNullable<Transaction['lifecycle_status']>;
  getProviderCapabilitySummary: (transaction: Transaction) => string;
  canSyncProvider: (transaction: Transaction) => boolean;
  onSyncDexPayTransaction: (transaction: Transaction) => void;
  onActivatePlan: (plan: SubscriptionPlan, paymentMethod: PaymentMethodId) => void;
  onPurchaseVisibilityProduct: (product: ProviderVisibilityProduct, paymentMethod: PaymentMethodId) => void;
}

export default function WalletTabPanel({
  availableBalance,
  heldBalance,
  pendingPayoutAmount,
  pendingReleaseBalance,
  subscriptionRevenueView,
  currency,
  activeSubscription,
  monetizedRole,
  dexPayAvailable,
  providerBackedTransactions,
  activeProviderTransactions,
  reconciledProviderTransactionsCount,
  failedProviderTransactionsCount,
  syncingDexPay,
  defaultPayoutAccount,
  subscriptionPlans,
  selectedPlanId,
  selectedPlan,
  selectedPlanUnavailable,
  selectedPlanName,
  selectedPlanRole,
  userRole,
  providerVisibilityProducts,
  activeProviderVisibilityPass,
  latestProviderVisibilityOrder,
  providerVisibilityOrders,
  purchasingVisibilityProductId,
  activeEscrows,
  payoutRequests,
  commissionEntries,
  onRecharge,
  onOpenDexPay,
  onWithdraw,
  getTransactionLifecycleState,
  getProviderCapabilitySummary,
  canSyncProvider,
  onSyncDexPayTransaction,
  onActivatePlan,
  onPurchaseVisibilityProduct,
}: WalletTabPanelProps) {
  return (
    <div>
      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-4">
        <div className="rounded-2xl border border-teal-100 bg-[#f5faf9] p-6 xl:col-span-2">
          <p className="mb-1 text-sm text-gray-600">Solde disponible</p>
          <p className="text-3xl font-bold text-gray-900">{formatAmount(availableBalance, currency)}</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-gray-600">
            <span>Séquestres en cours : {formatAmount(heldBalance, currency)}</span>
            <span>Retraits en attente : {formatAmount(pendingPayoutAmount, currency)}</span>
          </div>
          {activeSubscription ? (
            <div className="mt-4 inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium text-teal-700">
              {activeSubscription.plan_name} • {activeSubscription.status === 'trialing' ? 'essai jusqu au' : 'renouvellement'} {new Date(activeSubscription.renews_at).toLocaleDateString('fr-FR')}
            </div>
          ) : null}
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">Paiements à libérer</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{formatAmount(pendingReleaseBalance, currency)}</p>
          <p className="mt-2 text-sm text-gray-500">Montants sous supervision C2P avant libération.</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">Revenus / frais reconnus</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{formatAmount(subscriptionRevenueView, currency)}</p>
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
            onClick={onRecharge}
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
            onClick={onOpenDexPay}
            disabled={!dexPayAvailable}
            className="w-full px-4 py-2 border border-[#0f766e]/20 text-[#0f766e] text-sm font-medium rounded-lg hover:bg-[#f5faf9] transition-colors disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
          >
            {dexPayAvailable ? 'Ouvrir DexPay' : 'DexPay non configuré'}
          </button>
        </div>
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
            <div className="w-6 h-6 flex items-center justify-center"><i className="ri-arrow-up-line text-xl text-purple-600"></i></div>
          </div>
          <h3 className="font-medium text-gray-900 mb-2">Retirer des fonds</h3>
          <p className="text-sm text-gray-600 mb-4">Transférez vos fonds vers vos moyens de paiement</p>
          <button
            onClick={onWithdraw}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            {monetizedRole ? 'Demander un retrait' : 'Effectuer un retrait'}
          </button>
        </div>
      </div>

      <ProviderCyclePanel
        providerBackedTransactions={providerBackedTransactions}
        activeProviderTransactions={activeProviderTransactions}
        reconciledProviderTransactionsCount={reconciledProviderTransactionsCount}
        failedProviderTransactionsCount={failedProviderTransactionsCount}
        syncingDexPay={syncingDexPay}
        getTransactionLifecycleState={getTransactionLifecycleState}
        getCapabilitySummary={getProviderCapabilitySummary}
        canSyncProvider={canSyncProvider}
        onSyncDexPayTransaction={onSyncDexPayTransaction}
      />

      {monetizedRole && (
        <SubscriptionPlansPanel
          activeSubscription={activeSubscription}
          defaultPayoutAccount={defaultPayoutAccount}
          plans={subscriptionPlans}
          selectedPlanId={selectedPlanId}
          selectedPlan={selectedPlan}
          selectedPlanUnavailable={selectedPlanUnavailable}
          selectedPlanName={selectedPlanName}
          selectedPlanRole={selectedPlanRole}
          availableBalance={availableBalance}
          dexPayAvailable={dexPayAvailable}
          onActivatePlan={onActivatePlan}
        />
      )}

      {userRole === 'prestataire' && (
        <ProviderVisibilityPanel
          products={providerVisibilityProducts}
          activePass={activeProviderVisibilityPass}
          latestOrder={latestProviderVisibilityOrder}
          orders={providerVisibilityOrders}
          purchasingProductId={purchasingVisibilityProductId}
          availableBalance={availableBalance}
          dexPayAvailable={dexPayAvailable}
          onPurchaseProduct={onPurchaseVisibilityProduct}
        />
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
  );
}
