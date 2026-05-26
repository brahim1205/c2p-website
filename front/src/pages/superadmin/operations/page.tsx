import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '@/components/feature/AdminLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import {
  fetchOutboxDeadLetter,
  fetchOutboxDeliveries,
  fetchOutboxMetrics,
  fetchWebhookDispatchHistory,
  processOutboxNow,
  type NotificationDeliveryRow,
  type OutboxDeadLetterEvent,
  type OutboxMetrics,
  type WebhookDispatchHistoryRow,
} from '@/lib/adminApi';

function statusTone(status?: string | null) {
  const normalized = String(status ?? '').toLowerCase();
  if (normalized.includes('fail') || normalized.includes('dead') || normalized.includes('reject')) return 'bg-red-100 text-red-700';
  if (normalized.includes('pending') || normalized.includes('process') || normalized.includes('running')) return 'bg-amber-100 text-amber-700';
  if (normalized.includes('complete') || normalized.includes('deliver') || normalized.includes('success')) return 'bg-emerald-100 text-emerald-700';
  return 'bg-gray-100 text-gray-700';
}

function StatusBadge({ status }: { status?: string | null }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusTone(status)}`}>{status || 'unknown'}</span>;
}

export default function SuperAdminOperationsPage() {
  const { success, error } = useToast();
  const [metrics, setMetrics] = useState<OutboxMetrics | null>(null);
  const [deadLetters, setDeadLetters] = useState<OutboxDeadLetterEvent[]>([]);
  const [deliveries, setDeliveries] = useState<NotificationDeliveryRow[]>([]);
  const [dispatches, setDispatches] = useState<WebhookDispatchHistoryRow[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [nextMetrics, nextDeadLetters, nextDeliveries, nextDispatches] = await Promise.all([
        fetchOutboxMetrics().catch(() => null),
        fetchOutboxDeadLetter(20).catch(() => []),
        fetchOutboxDeliveries(20).catch(() => []),
        fetchWebhookDispatchHistory(20).catch(() => []),
      ]);
      setMetrics(nextMetrics);
      setDeadLetters(nextDeadLetters);
      setDeliveries(nextDeliveries);
      setDispatches(nextDispatches);
    } catch (loadError) {
      console.error(loadError);
      error('Erreur', 'Impossible de charger les opérations.');
    }
  }, [error]);

  useEffect(() => {
    void load();
  }, [load]);

  const runWorker = async () => {
    setBusy(true);
    try {
      await processOutboxNow();
      success('Worker relancé', 'La file outbox a été traitée.');
      await load();
    } catch (runError) {
      console.error(runError);
      error('Erreur', 'Impossible de relancer le worker.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <Breadcrumb items={[{ label: 'Superadmin', path: '/superadmin/dashboard' }, { label: 'Opérations' }]} />

        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-rose-600">Supervision technique</p>
              <h1 className="mt-1 text-3xl font-bold text-gray-900">Opérations outbox et delivery</h1>
              <p className="mt-2 max-w-3xl text-sm text-gray-600">
                Surveiller les retries, dead-letter, notifications et webhooks externes sans encombrer le cockpit principal.
              </p>
            </div>
            <button type="button" disabled={busy} onClick={() => void runWorker()} className="rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
              {busy ? 'Traitement...' : 'Relancer le worker'}
            </button>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            ['Pending', metrics?.counts.pending ?? 0],
            ['Processing', metrics?.counts.processing ?? 0],
            ['Failed', metrics?.counts.failed ?? 0],
            ['Dead', metrics?.counts.dead ?? 0],
            ['Lag', `${metrics?.oldestDueLagSeconds ?? 0}s`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs text-gray-500">{label}</p>
              <p className="mt-3 text-2xl font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Dead-letter récents</h2>
            <div className="mt-4 space-y-3">
              {deadLetters.map((event) => (
                <div key={event.id} className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">{event.eventType}</p>
                      <p className="mt-1 text-xs text-gray-500">{event.aggregateType || 'aggregate'} · {event.aggregateId || event.id}</p>
                    </div>
                    <StatusBadge status="dead" />
                  </div>
                  {event.lastError ? <p className="mt-2 text-sm text-red-600">{event.lastError}</p> : null}
                </div>
              ))}
              {deadLetters.length === 0 ? <p className="text-sm text-gray-500">Aucun événement dead-letter.</p> : null}
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Delivery logs</h2>
            <div className="mt-4 space-y-3">
              {deliveries.map((delivery) => (
                <div key={delivery.id} className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">{delivery.channel} · {delivery.eventType}</p>
                      <p className="mt-1 text-xs text-gray-500">{delivery.recipientAddress || delivery.recipientUserId || '-'}</p>
                    </div>
                    <StatusBadge status={delivery.status} />
                  </div>
                </div>
              ))}
              {deliveries.length === 0 ? <p className="text-sm text-gray-500">Aucun log de delivery.</p> : null}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Dispatch webhooks</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
            {dispatches.map((item) => (
              <div key={item.id} className="rounded-2xl border border-gray-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{item.eventType}</p>
                    <p className="mt-1 truncate text-xs text-gray-500">{item.targetUrl}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
              </div>
            ))}
            {dispatches.length === 0 ? <p className="text-sm text-gray-500">Aucun dispatch webhook.</p> : null}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
