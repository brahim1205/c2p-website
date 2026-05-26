import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/components/feature/AdminLayout';
import Breadcrumb from '@/components/base/Breadcrumb';
import { useToast } from '@/hooks/useToast';
import {
  fetchDexPayProviderTransactions,
  fetchDexPayReconciliationJobs,
  fetchDexPayWebhookReceipts,
  reconcileDexPay,
  type DexPayProviderTransaction,
  type DexPayReconciliationJob,
  type DexPayWebhookReceipt,
} from '@/lib/adminApi';
import { fetchDexPayStatus, type DexPayStatus } from '@/lib/paymentsApi';

function statusTone(status?: string | null) {
  const normalized = String(status ?? '').toLowerCase();
  if (normalized.includes('fail') || normalized.includes('reject') || normalized.includes('cancel')) return 'bg-red-100 text-red-700';
  if (normalized.includes('pending') || normalized.includes('process') || normalized.includes('running')) return 'bg-amber-100 text-amber-700';
  if (normalized.includes('complete') || normalized.includes('confirm') || normalized.includes('reconciled')) return 'bg-emerald-100 text-emerald-700';
  return 'bg-gray-100 text-gray-700';
}

function StatusBadge({ status }: { status?: string | null }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${statusTone(status)}`}>{status || 'unknown'}</span>;
}

export default function SuperAdminFinancePage() {
  const { success, error } = useToast();
  const [dexPayStatus, setDexPayStatus] = useState<DexPayStatus | null>(null);
  const [receipts, setReceipts] = useState<DexPayWebhookReceipt[]>([]);
  const [transactions, setTransactions] = useState<DexPayProviderTransaction[]>([]);
  const [jobs, setJobs] = useState<DexPayReconciliationJob[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [nextStatus, nextReceipts, nextTransactions, nextJobs] = await Promise.all([
        fetchDexPayStatus().catch(() => null),
        fetchDexPayWebhookReceipts(20).catch(() => []),
        fetchDexPayProviderTransactions(20).catch(() => []),
        fetchDexPayReconciliationJobs(20).catch(() => []),
      ]);
      setDexPayStatus(nextStatus);
      setReceipts(nextReceipts);
      setTransactions(nextTransactions);
      setJobs(nextJobs);
    } catch (loadError) {
      console.error(loadError);
      error('Erreur', 'Impossible de charger la supervision finance.');
    }
  }, [error]);

  useEffect(() => {
    void load();
  }, [load]);

  const health = useMemo(() => ({
    pending: transactions.filter((item) => ['initiated', 'pending_provider', 'processing'].includes(String(item.lifecycleStatus || item.providerStatus).toLowerCase())).length,
    failed: transactions.filter((item) => ['failed', 'error', 'cancelled', 'canceled'].includes(String(item.lifecycleStatus || item.providerStatus).toLowerCase())).length,
    webhookKo: receipts.filter((item) => ['failed', 'rejected'].includes(String(item.status).toLowerCase())).length,
    activeJobs: jobs.filter((job) => ['running', 'processing', 'pending'].includes(String(job.status).toLowerCase())).length,
  }), [jobs, receipts, transactions]);

  const runtimeLabel = !dexPayStatus
    ? 'Statut indisponible'
    : !dexPayStatus.configured
      ? 'DexPay non configuré'
      : dexPayStatus.reachable === false
        ? 'DexPay injoignable'
        : 'DexPay opérationnel';

  const runReconciliation = async () => {
    setBusy(true);
    try {
      await reconcileDexPay();
      success('Réconciliation lancée', 'Le job provider est enregistré.');
      await load();
    } catch (runError) {
      console.error(runError);
      error('Erreur', 'Impossible de lancer la réconciliation.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <Breadcrumb items={[{ label: 'Superadmin', path: '/superadmin/dashboard' }, { label: 'Finance provider' }]} />

        <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-rose-600">Finance sensible</p>
              <h1 className="mt-1 text-3xl font-bold text-gray-900">Supervision provider</h1>
              <p className="mt-2 max-w-3xl text-sm text-gray-600">
                Suivre DexPay, les receipts webhook, les transactions provider et la convergence de réconciliation.
              </p>
            </div>
            <button type="button" disabled={busy || dexPayStatus?.configured === false} onClick={() => void runReconciliation()} className="rounded-2xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
              {busy ? 'Réconciliation...' : 'Lancer une réconciliation'}
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.75fr)]">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">Runtime provider</h2>
              <StatusBadge status={runtimeLabel} />
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Mode {dexPayStatus?.mode === 'live' ? 'live' : 'désactivé'}
              {dexPayStatus?.baseUrlHost ? ` · ${dexPayStatus.baseUrlHost}` : ''}
            </p>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">API provider</p>
                <p className="mt-2 font-semibold text-gray-900">{dexPayStatus?.configured ? 'Configurée' : 'Non configurée'}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">Webhook verification</p>
                <p className="mt-2 font-semibold text-gray-900">{dexPayStatus?.webhookVerification === 'strict' ? 'Signature stricte' : 'Sans secret'}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <p className="text-xs text-gray-500">Dernier contrôle</p>
                <p className="mt-2 font-semibold text-gray-900">{dexPayStatus?.lastCheckedAt ? new Date(dexPayStatus.lastCheckedAt).toLocaleTimeString('fr-FR') : '-'}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              ['Tx pending', health.pending],
              ['Tx failed', health.failed],
              ['Webhook KO', health.webhookKo],
              ['Jobs actifs', health.activeJobs],
            ].map(([label, value]) => (
              <div key={label} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="mt-3 text-2xl font-bold text-gray-900">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Receipts webhook</h2>
            <div className="mt-4 space-y-3">
              {receipts.map((receipt) => (
                <div key={receipt.id} className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">{receipt.eventType || 'provider.webhook.received'}</p>
                      <p className="mt-1 text-xs text-gray-500">{receipt.providerEventId || receipt.id}</p>
                    </div>
                    <StatusBadge status={receipt.status} />
                  </div>
                </div>
              ))}
              {receipts.length === 0 ? <p className="text-sm text-gray-500">Aucun webhook reçu.</p> : null}
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Transactions provider</h2>
            <div className="mt-4 space-y-3">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">{transaction.providerReference}</p>
                      <p className="mt-1 text-xs text-gray-500">{transaction.amount ?? '-'} {transaction.currency ?? ''}</p>
                    </div>
                    <StatusBadge status={transaction.lifecycleStatus || transaction.providerStatus} />
                  </div>
                </div>
              ))}
              {transactions.length === 0 ? <p className="text-sm text-gray-500">Aucune transaction provider.</p> : null}
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Réconciliation</h2>
            <div className="mt-4 space-y-3">
              {jobs.map((job) => (
                <div key={job.id} className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">{job.scope || 'scan'}</p>
                      <p className="mt-1 text-xs text-gray-500">{job.id}</p>
                    </div>
                    <StatusBadge status={job.status} />
                  </div>
                </div>
              ))}
              {jobs.length === 0 ? <p className="text-sm text-gray-500">Aucun job de réconciliation.</p> : null}
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
