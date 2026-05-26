import type { ReactNode } from 'react';
import type { DexPayWebhookReceipt, OutboxDeadLetterEvent, OutboxMetrics } from '@/lib/adminApi';
import type { DexPayStatus } from '@/lib/paymentsApi';
import type { ProviderHealth, RuntimeBadge } from './adminSupervisionModel';

interface AdminSupervisionRuntimePanelsProps {
  deadLetterRows: OutboxDeadLetterEvent[];
  dexPayStatus: DexPayStatus | null;
  operatorBusyKey: string | null;
  outboxMetrics: OutboxMetrics | null;
  processingOutbox: boolean;
  providerHealth: ProviderHealth;
  providerRuntimeBadge: RuntimeBadge;
  providerWebhookReceipts: DexPayWebhookReceipt[];
  reconcilingProvider: boolean;
  renderProviderStatusBadge: (status?: string | null) => ReactNode;
  onIgnoreOutboxEvent: (eventId: string) => void;
  onProcessOutbox: () => void;
  onReconcileProvider: () => void;
  onReprocessWebhookReceipt: (receiptId: string) => void;
  onRequeueOutboxEvent: (eventId: string) => void;
}

export default function AdminSupervisionRuntimePanels({
  deadLetterRows,
  dexPayStatus,
  operatorBusyKey,
  outboxMetrics,
  processingOutbox,
  providerHealth,
  providerRuntimeBadge,
  providerWebhookReceipts,
  reconcilingProvider,
  renderProviderStatusBadge,
  onIgnoreOutboxEvent,
  onProcessOutbox,
  onReconcileProvider,
  onReprocessWebhookReceipt,
  onRequeueOutboxEvent,
}: AdminSupervisionRuntimePanelsProps) {
  return (
    <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
      <OutboxRuntimePanel
        deadLetterRows={deadLetterRows}
        operatorBusyKey={operatorBusyKey}
        outboxMetrics={outboxMetrics}
        processingOutbox={processingOutbox}
        renderProviderStatusBadge={renderProviderStatusBadge}
        onIgnoreOutboxEvent={onIgnoreOutboxEvent}
        onProcessOutbox={onProcessOutbox}
        onRequeueOutboxEvent={onRequeueOutboxEvent}
      />
      <ProviderRuntimePanel
        dexPayStatus={dexPayStatus}
        operatorBusyKey={operatorBusyKey}
        providerHealth={providerHealth}
        providerRuntimeBadge={providerRuntimeBadge}
        providerWebhookReceipts={providerWebhookReceipts}
        reconcilingProvider={reconcilingProvider}
        renderProviderStatusBadge={renderProviderStatusBadge}
        onReconcileProvider={onReconcileProvider}
        onReprocessWebhookReceipt={onReprocessWebhookReceipt}
      />
    </section>
  );
}

function OutboxRuntimePanel({
  deadLetterRows,
  operatorBusyKey,
  outboxMetrics,
  processingOutbox,
  renderProviderStatusBadge,
  onIgnoreOutboxEvent,
  onProcessOutbox,
  onRequeueOutboxEvent,
}: Pick<AdminSupervisionRuntimePanelsProps, 'deadLetterRows' | 'operatorBusyKey' | 'outboxMetrics' | 'processingOutbox' | 'renderProviderStatusBadge' | 'onIgnoreOutboxEvent' | 'onProcessOutbox' | 'onRequeueOutboxEvent'>) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Supervision outbox</h2>
          <p className="text-sm text-gray-500">Retries, dead-letter, delivery et health du worker.</p>
        </div>
        <button onClick={onProcessOutbox} disabled={processingOutbox} className="rounded-2xl border border-teal-200 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60">
          {processingOutbox ? 'Traitement...' : 'Relancer le worker'}
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <RuntimeMetric label="Pending" value={outboxMetrics?.counts.pending ?? 0} />
        <RuntimeMetric label="Failed" value={outboxMetrics?.counts.failed ?? 0} tone="text-orange-600" />
        <RuntimeMetric label="Dead" value={outboxMetrics?.counts.dead ?? 0} tone="text-red-600" />
        <RuntimeMetric label="Lag" value={`${outboxMetrics?.oldestDueLagSeconds ?? 0}s`} />
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
              {renderProviderStatusBadge('dead')}
            </div>
            <p className="mt-2 text-sm text-red-600">{event.lastError || 'Erreur non renseignée'}</p>
            <p className="mt-1 text-xs text-gray-500">Tentatives {event.attemptCount}/{event.maxRetries}</p>
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => onRequeueOutboxEvent(event.id)} disabled={operatorBusyKey === `outbox-requeue:${event.id}`} className="rounded-xl border border-teal-200 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60">
                {operatorBusyKey === `outbox-requeue:${event.id}` ? 'Relance...' : 'Relancer'}
              </button>
              <button onClick={() => onIgnoreOutboxEvent(event.id)} disabled={operatorBusyKey === `outbox-ignore:${event.id}`} className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60">
                {operatorBusyKey === `outbox-ignore:${event.id}` ? 'Traitement...' : 'Ignorer'}
              </button>
            </div>
          </div>
        ))}
        {deadLetterRows.length === 0 ? <p className="text-sm text-gray-500">Aucun événement dead-letter.</p> : null}
      </div>
    </div>
  );
}

function ProviderRuntimePanel({
  dexPayStatus,
  operatorBusyKey,
  providerHealth,
  providerRuntimeBadge,
  providerWebhookReceipts,
  reconcilingProvider,
  renderProviderStatusBadge,
  onReconcileProvider,
  onReprocessWebhookReceipt,
}: Pick<AdminSupervisionRuntimePanelsProps, 'dexPayStatus' | 'operatorBusyKey' | 'providerHealth' | 'providerRuntimeBadge' | 'providerWebhookReceipts' | 'reconcilingProvider' | 'renderProviderStatusBadge' | 'onReconcileProvider' | 'onReprocessWebhookReceipt'>) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Supervision provider</h2>
          <p className="text-sm text-gray-500">DexPay, receipts webhook et réconciliation opérateur.</p>
        </div>
        <button onClick={onReconcileProvider} disabled={reconcilingProvider || dexPayStatus?.configured === false} className="rounded-2xl border border-teal-200 px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60">
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
            <ProviderRuntimeState label="API provider" value={dexPayStatus?.configured ? (dexPayStatus.reachable === false ? 'Config OK / ping KO' : 'Config OK') : 'Non configurée'} />
            <ProviderRuntimeState label="Webhook verification" value={dexPayStatus?.webhookVerification === 'strict' ? 'Signature stricte' : 'Sans secret'} />
            <ProviderRuntimeState label="Dernier contrôle" value={dexPayStatus?.lastCheckedAt ? new Date(dexPayStatus.lastCheckedAt).toLocaleTimeString('fr-FR') : '-'} />
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <RuntimeMetric label="Tx pending" value={providerHealth.pendingTransactions} />
        <RuntimeMetric label="Tx failed" value={providerHealth.failedTransactions} tone="text-red-600" />
        <RuntimeMetric label="Webhook KO" value={providerHealth.failedReceipts} tone="text-orange-600" />
        <RuntimeMetric label="Jobs actifs" value={providerHealth.activeJobs} />
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
              {renderProviderStatusBadge(receipt.status)}
            </div>
            <p className="mt-2 text-sm text-gray-600">Corrélation {receipt.correlationId || '-'}</p>
            {receipt.error ? <p className="mt-1 text-sm text-red-600">{receipt.error}</p> : null}
            <div className="mt-3 flex justify-end">
              <button onClick={() => onReprocessWebhookReceipt(receipt.id)} disabled={operatorBusyKey === `receipt-reprocess:${receipt.id}` || dexPayStatus?.configured === false} className="rounded-xl border border-teal-200 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60">
                {operatorBusyKey === `receipt-reprocess:${receipt.id}` ? 'Reprocess...' : 'Reprocesser'}
              </button>
            </div>
          </div>
        ))}
        {providerWebhookReceipts.length === 0 ? <p className="text-sm text-gray-500">Aucun webhook reçu.</p> : null}
      </div>
    </div>
  );
}

function RuntimeMetric({ label, tone = 'text-gray-900', value }: { label: string; tone?: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-2 text-xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

function ProviderRuntimeState({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}
