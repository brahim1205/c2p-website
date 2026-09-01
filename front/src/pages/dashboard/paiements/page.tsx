import Breadcrumb from '@/components/base/Breadcrumb';
import DashboardLayout from '../components/DashboardLayout';
import DexPayCheckoutModal from './DexPayCheckoutModal';
import FinanceContextBanner from './FinanceContextBanner';
import PaymentMethodsPanel from './PaymentMethodsPanel';
import PaymentTabs from './PaymentTabs';
import TransactionDetailModal from './TransactionDetailModal';
import TransactionsPanel from './TransactionsPanel';
import { RechargeWalletModal, WithdrawWalletModal } from './WalletActionModals';
import WalletBalanceCard from './WalletBalanceCard';
import WalletTabPanel from './WalletTabPanel';
import { usePaiementsSession } from './usePaiementsSession';

export default function PaiementsPage() {
  const session = usePaiementsSession();
  const actions = session.paymentActions;

  return (
    <DashboardLayout>
      <Breadcrumb items={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Paiements' }]} />
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Paiements</h1>
        <p className="text-gray-600">Gérez vos transactions et moyens de paiement</p>
      </div>

      {session.loadError ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {session.loadError}
        </div>
      ) : null}

      {session.hasFinanceContext ? (
        <FinanceContextBanner
          invoiceNumber={session.contextInvoiceNumber}
          financialOperationId={session.contextFinancialOperationId}
          providerReference={session.contextProviderReference}
          transactionId={session.contextTransactionId}
          relatedTransactions={session.financeRelations.relatedTransactions}
          relatedEscrows={session.financeRelations.relatedEscrows}
          relatedPayoutRequests={session.financeRelations.relatedPayoutRequests}
          relatedSubscriptions={session.financeRelations.relatedSubscriptions}
          relatedCommissionEntries={session.financeRelations.relatedCommissionEntries}
          onOpenTransaction={(transaction) => {
            session.setActiveTab('transactions');
            actions.setSelectedTransaction(transaction);
          }}
          onOpenWallet={() => session.setActiveTab('wallet')}
          onClear={session.clearFinanceContext}
        />
      ) : null}

      <WalletBalanceCard
        availableBalance={session.availableWalletBalance}
        currency={session.walletDetails?.currency ?? 'XAF'}
        loading={session.loadingPayments}
        hasWallet={Boolean(session.walletId)}
        onRecharge={() => actions.setShowRechargeModal(true)}
        onWithdraw={() => actions.setShowWithdrawModal(true)}
        compactOnMobile
      />

      {session.loadingPayments ? <PaymentsSkeleton /> : null}

      <PaymentTabs activeTab={session.activeTab} onTabChange={session.setActiveTab}>
        {session.activeTab === 'transactions' ? (
          <TransactionsPanel
            filterType={session.filterType}
            filterStatus={session.filterStatus}
            onFilterTypeChange={session.setFilterType}
            onFilterStatusChange={session.setFilterStatus}
            onExport={session.handleExport}
            loading={session.loadingPayments}
            transactions={session.filteredTransactions}
            hasFinanceContext={session.hasFinanceContext}
            relatedTransactions={session.financeRelations.relatedTransactions}
            getTransactionLifecycleState={session.getTransactionLifecycleState}
            onOpenTransaction={actions.setSelectedTransaction}
          />
        ) : null}

        {session.activeTab === 'methods' ? (
          <PaymentMethodsPanel />
        ) : null}

        {session.activeTab === 'wallet' ? (
          <WalletTabPanel
            availableBalance={session.availableWalletBalance}
            heldBalance={session.heldWalletBalance}
            pendingPayoutAmount={session.pendingPayoutAmount}
            pendingReleaseBalance={session.pendingReleaseBalance}
            subscriptionRevenueView={session.subscriptionRevenueView}
            currency={session.walletDetails?.currency ?? 'XAF'}
            activeSubscription={session.activeSubscription}
            monetizedRole={session.monetizedRole}
            providerBackedTransactions={session.providerBackedTransactions}
            activeProviderTransactions={session.activeProviderTransactions}
            reconciledProviderTransactionsCount={session.reconciledProviderTransactions.length}
            failedProviderTransactionsCount={session.failedProviderTransactions.length}
            syncingDexPay={actions.syncingDexPay}
            defaultPayoutAccount={session.defaultPayoutAccount}
            subscriptionPlans={session.subscriptionPlans}
            selectedPlanId={session.selectedPlanId}
            selectedPlanUnavailable={session.selectedPlanUnavailable}
            selectedPlanName={session.selectedPlanName}
            selectedPlanRole={session.selectedPlanRole}
            userRole={session.user?.role}
            providerVisibilityProducts={session.providerVisibilityProducts}
            activeProviderVisibilityPass={session.activeProviderVisibilityPass}
            latestProviderVisibilityOrder={session.latestProviderVisibilityOrder}
            providerVisibilityOrders={session.providerVisibilityOrders}
            purchasingVisibilityProductId={actions.purchasingVisibilityProductId}
            activeEscrows={session.activeEscrows}
            payoutRequests={session.payoutRequests}
            commissionEntries={session.commissionEntries}
            onRecharge={() => actions.setShowRechargeModal(true)}
            onWithdraw={() => actions.setShowWithdrawModal(true)}
            getTransactionLifecycleState={session.getTransactionLifecycleState}
            getProviderCapabilitySummary={(transaction) => session.getSelfServiceCapabilities(transaction, 'provider_console').summary}
            canSyncProvider={(transaction) => session.getSelfServiceCapabilities(transaction, 'provider_console').actions.sync_provider}
            onSyncDexPayTransaction={(transaction) => void actions.handleSyncDexPayTransaction(transaction)}
            onActivatePlan={(plan, paymentMethod) => void actions.handleActivatePlan(plan, paymentMethod)}
            onPurchaseVisibilityProduct={(product, paymentMethod) => void actions.handlePurchaseVisibilityProduct(product, paymentMethod)}
          />
        ) : null}
      </PaymentTabs>

      {actions.showRechargeModal ? (
        <RechargeWalletModal
          amount={actions.rechargeAmount}
          paymentMethod={actions.rechargePaymentMethod}
          onAmountChange={actions.setRechargeAmount}
          onPaymentMethodChange={actions.setRechargePaymentMethod}
          onClose={actions.closeRechargeModal}
          onSubmit={actions.handleRecharge}
        />
      ) : null}

      {actions.showWithdrawModal ? (
        <WithdrawWalletModal
          amount={actions.withdrawAmount}
          availableBalance={session.availableWalletBalance}
          currency={session.walletDetails?.currency ?? 'XAF'}
          onAmountChange={actions.setWithdrawAmount}
          onClose={actions.closeWithdrawModal}
          onSubmit={actions.handleWithdraw}
        />
      ) : null}

      {actions.showDexPayModal ? (
        <DexPayCheckoutModal
          form={actions.dexPayForm}
          banks={session.dexPayBanks}
          submitting={actions.dexPaySubmitting}
          onFormChange={actions.updateDexPayForm}
          onClose={() => actions.setShowDexPayModal(false)}
          onSubmit={actions.handleStartDexPayCheckout}
        />
      ) : null}

      {actions.selectedTransaction ? (
        <TransactionDetailModal
          transaction={actions.selectedTransaction}
          syncingDexPay={actions.syncingDexPay}
          getLifecycleState={session.getTransactionLifecycleState}
          getCapabilitySummary={(transaction) => session.getSelfServiceCapabilities(transaction, 'transaction_modal').summary}
          canOpenLinkedInvoices={(transaction) => session.getSelfServiceCapabilities(transaction, 'transaction_modal').actions.open_linked_invoices}
          canSyncProvider={(transaction) => session.getSelfServiceCapabilities(transaction, 'transaction_modal').actions.sync_provider}
          onClose={() => actions.setSelectedTransaction(null)}
          onOpenRelatedInvoices={session.openRelatedInvoices}
          onSyncDexPay={actions.handleSyncDexPay}
          onDownloadReceipt={session.handleDownloadReceipt}
        />
      ) : null}
    </DashboardLayout>
  );
}

function PaymentsSkeleton() {
  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="h-5 w-48 animate-pulse rounded bg-gray-100" />
      <div className="mt-4 space-y-3">
        <div className="h-16 animate-pulse rounded-xl bg-gray-100" />
        <div className="h-16 animate-pulse rounded-xl bg-gray-100" />
      </div>
    </div>
  );
}
