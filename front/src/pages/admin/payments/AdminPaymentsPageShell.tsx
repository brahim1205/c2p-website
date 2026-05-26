import Breadcrumb from '@/components/base/Breadcrumb';
import AdminFinanceOperationsPanel from './components/AdminFinanceOperationsPanel';
import { AdminPaymentModals } from './components/AdminPaymentModals';
import AdminPaymentSummaryCards from './components/AdminPaymentSummaryCards';
import AdminSupervisionPanels from './components/AdminSupervisionPanels';
import AdminTransactionsTable from './components/AdminTransactionsTable';
import type { useAdminPaymentsPageSession } from './useAdminPaymentsPageSession';

type AdminPaymentsPageSession = ReturnType<typeof useAdminPaymentsPageSession>;

export default function AdminPaymentsPageShell({ session }: { session: AdminPaymentsPageSession }) {
  return (
    <div className="mx-auto max-w-7xl">
      <Breadcrumb items={[{ label: 'Admin', path: '/admin/dashboard' }, { label: 'Paiements' }]} />
      <section className="mb-6 rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-teal-600">Administration</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900 md:text-3xl">Gestion des paiements</h1>
            <p className="mt-2 text-sm text-gray-600 md:text-base">
              Suivi des transactions, validations, incidents et remboursements.
            </p>
          </div>
          <button
            onClick={session.handleExport}
            className="whitespace-nowrap rounded-2xl bg-teal-600 px-5 py-3 text-sm font-medium text-white hover:bg-teal-700"
          >
            Exporter le rapport
          </button>
        </div>
      </section>

      <AdminPaymentSummaryCards
        commissionTotal={session.commissionTotals.all}
        subscriptionMrr={session.commissionTotals.subscriptions}
        activeSubscriptionsCount={session.activeSubscriptions.length}
        pendingEscrowsCount={session.pendingEscrows.length}
        pendingEscrowsAmount={session.pendingEscrows.reduce((sum, row) => sum + Number(row.amount_total || 0), 0)}
        pendingPayoutsCount={session.pendingPayouts.length}
        pendingPayoutsAmount={session.pendingPayouts.reduce((sum, row) => sum + Number(row.amount || 0), 0)}
        getPanelClassName={session.getPanelClassName}
      />

      {session.isSuperAdmin ? (
        <AdminSupervisionPanels
          outboxMetrics={session.outboxMetrics}
          deadLetterRows={session.deadLetterRows}
          deliveryRows={session.deliveryRows}
          webhookDispatchRows={session.webhookDispatchRows}
          providerWebhookReceipts={session.providerWebhookReceipts}
          reconciliationJobs={session.reconciliationJobs}
          providerTransactions={session.providerTransactions}
          paymentIntents={session.paymentIntents}
          dexPayStatus={session.dexPayStatus}
          providerHealth={session.providerHealth}
          providerRuntimeBadge={session.providerRuntimeBadge}
          processingOutbox={session.processingOutbox}
          reconcilingProvider={session.reconcilingProvider}
          operatorBusyKey={session.operatorBusyKey}
          getProviderTransactionCapabilities={session.getProviderTransactionCapabilities}
          renderProviderStatusBadge={session.getProviderStatusBadge}
          onProcessOutbox={() => void session.handleProcessOutbox()}
          onReconcileProvider={() => void session.handleReconcileProvider()}
          onRequeueOutboxEvent={(eventId) => void session.handleRequeueOutboxEvent(eventId)}
          onIgnoreOutboxEvent={(eventId) => void session.handleIgnoreOutboxEvent(eventId)}
          onReplayOutboxEvent={(eventId) => void session.handleReplayOutboxEvent(eventId)}
          onReprocessWebhookReceipt={(receiptId) => void session.handleReprocessWebhookReceipt(receiptId)}
          onForceSyncProviderTransaction={(providerReference) => void session.handleForceSyncProviderTransaction(providerReference)}
        />
      ) : null}

      <AdminFinanceOperationsPanel
        pendingEscrows={session.pendingEscrows}
        pendingPayouts={session.pendingPayouts}
        activeSubscriptions={session.activeSubscriptions}
        canReleaseEscrow={session.canReleaseEscrow}
        canRefundEscrow={session.canRefundEscrow}
        canApprovePayout={session.canApprovePayout}
        canMarkPayoutPaid={session.canMarkPayoutPaid}
        canRejectPayout={session.canRejectPayout}
        onEscrowAction={(escrow, status) => void session.handleEscrowAction(escrow, status)}
        onPayoutAction={(request, status) => void session.handlePayoutAction(request, status)}
      />

      <AdminTransactionsTable
        activeTab={session.activeTab}
        transactions={session.transactions}
        filteredTransactions={session.filteredTransactions}
        onTabChange={session.setActiveTab}
        renderStatusBadge={session.getStatusBadge}
        onOpenDetails={(transaction) => {
          session.setSelectedTransaction(transaction);
          session.setShowDetailModal(true);
        }}
        onMarkCompleted={(transaction) => void session.handleChangeStatus(transaction, 'completed')}
        onRetry={(transaction) => void session.handleChangeStatus(transaction, 'pending')}
        onRefund={(transaction) => {
          session.setSelectedTransaction(transaction);
          session.setShowRefundModal(true);
        }}
        canRetry={(transaction) => session.getTransactionCapabilities(transaction).actions.retry_transaction}
        canRefund={(transaction) => session.getTransactionCapabilities(transaction).actions.refund_transaction}
      />

      <AdminPaymentModals
        transaction={session.selectedTransaction}
        showDetail={session.showDetailModal}
        showRefund={session.showRefundModal}
        renderStatusBadge={session.getStatusBadge}
        onCloseDetail={() => session.setShowDetailModal(false)}
        onCloseRefund={() => session.setShowRefundModal(false)}
        onConfirmRefund={session.handleRefund}
      />
    </div>
  );
}
