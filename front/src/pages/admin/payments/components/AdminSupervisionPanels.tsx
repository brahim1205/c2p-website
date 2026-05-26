import AdminProviderPaymentSignalsPanel from './AdminProviderPaymentSignalsPanel';
import AdminSupervisionRuntimePanels from './AdminSupervisionRuntimePanels';
import type { AdminSupervisionPanelsProps, ProviderTransactionSignalRow } from './adminSupervisionModel';

export default function AdminSupervisionPanels<TProviderTransaction extends ProviderTransactionSignalRow>({
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
  getProviderTransactionCapabilities,
  renderProviderStatusBadge,
  onProcessOutbox,
  onReconcileProvider,
  onRequeueOutboxEvent,
  onIgnoreOutboxEvent,
  onReplayOutboxEvent,
  onReprocessWebhookReceipt,
  onForceSyncProviderTransaction,
}: AdminSupervisionPanelsProps<TProviderTransaction>) {
  return (
    <>
      <AdminSupervisionRuntimePanels
        deadLetterRows={deadLetterRows}
        dexPayStatus={dexPayStatus}
        operatorBusyKey={operatorBusyKey}
        outboxMetrics={outboxMetrics}
        processingOutbox={processingOutbox}
        providerHealth={providerHealth}
        providerRuntimeBadge={providerRuntimeBadge}
        providerWebhookReceipts={providerWebhookReceipts}
        reconcilingProvider={reconcilingProvider}
        renderProviderStatusBadge={renderProviderStatusBadge}
        onIgnoreOutboxEvent={onIgnoreOutboxEvent}
        onProcessOutbox={onProcessOutbox}
        onReconcileProvider={onReconcileProvider}
        onReprocessWebhookReceipt={onReprocessWebhookReceipt}
        onRequeueOutboxEvent={onRequeueOutboxEvent}
      />

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
                  {renderProviderStatusBadge(delivery.status)}
                </div>
                <p className="mt-2 text-sm text-gray-600">{delivery.eventType}</p>
                {delivery.error ? <p className="mt-1 text-xs text-red-600">{delivery.error}</p> : null}
              </div>
            ))}
            {deliveryRows.length === 0 ? <p className="text-sm text-gray-500">Aucun log de delivery.</p> : null}
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
                  {renderProviderStatusBadge(item.status)}
                </div>
                <p className="mt-2 text-sm text-gray-600">{item.method} · HTTP {item.responseStatus || '-'}</p>
                {item.error ? <p className="mt-1 text-xs text-red-600">{item.error}</p> : null}
                {item.outboxEventId ? (
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => onReplayOutboxEvent(item.outboxEventId!)}
                      disabled={operatorBusyKey === `outbox-replay:${item.outboxEventId}`}
                      className="rounded-xl border border-teal-200 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {operatorBusyKey === `outbox-replay:${item.outboxEventId}` ? 'Replay...' : 'Rejouer'}
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
            {webhookDispatchRows.length === 0 ? <p className="text-sm text-gray-500">Aucun dispatch webhook.</p> : null}
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
                  {renderProviderStatusBadge(job.status)}
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  {job.summary?.scanned ? `${String(job.summary.scanned)} analysé(s)` : 'Aucun résumé'}{job.summary?.updated ? ` · ${String(job.summary.updated)} mis à jour` : ''}
                </p>
                {job.error ? <p className="mt-1 text-xs text-red-600">{job.error}</p> : null}
              </div>
            ))}
            {reconciliationJobs.length === 0 ? <p className="text-sm text-gray-500">Aucun job de réconciliation.</p> : null}
          </div>
        </div>
      </section>

      <AdminProviderPaymentSignalsPanel
        providerTransactions={providerTransactions}
        paymentIntents={paymentIntents}
        operatorBusyKey={operatorBusyKey}
        providerConfigured={dexPayStatus?.configured !== false}
        getProviderTransactionCapabilities={getProviderTransactionCapabilities}
        renderProviderStatusBadge={renderProviderStatusBadge}
        onForceSyncProviderTransaction={onForceSyncProviderTransaction}
      />
    </>
  );
}
