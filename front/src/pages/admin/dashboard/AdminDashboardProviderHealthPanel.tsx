import { Link } from 'react-router-dom';
import { getPaymentLifecycleLabel, getPaymentLifecycleTone } from '@/lib/paymentStatus';
import type {
  DexPayStatus,
  FinanceProviderSignal,
  ProviderRuntimeBadge,
} from './adminDashboardContentModel';

export function ProviderHealthPanel({
  dexPayStatus,
  financeProviderSignals,
  providerRuntimeBadge,
}: {
  dexPayStatus: DexPayStatus | null;
  financeProviderSignals: FinanceProviderSignal[];
  providerRuntimeBadge: ProviderRuntimeBadge;
}) {
  return (
    <section className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Santé finance / provider</h2>
          <p className="text-sm text-gray-500">Vision opérateur sur l’état des confirmations provider et de la delivery asynchrone.</p>
        </div>
        <Link to="/superadmin/dashboard" className="text-sm font-medium text-teal-600 hover:text-teal-700">Ouvrir la supervision</Link>
      </div>
      <div className="mb-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-gray-900">Runtime provider DexPay</p>
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
            <ProviderRuntimeMetric
              label="API provider"
              value={dexPayStatus?.configured ? (dexPayStatus.reachable === false ? 'Config OK / ping KO' : 'Config OK') : 'Non configurée'}
            />
            <ProviderRuntimeMetric
              label="Webhook verification"
              value={dexPayStatus?.webhookVerification === 'strict' ? 'Signature stricte' : 'Sans secret'}
            />
            <ProviderRuntimeMetric
              label="Dernier contrôle"
              value={dexPayStatus?.lastCheckedAt ? new Date(dexPayStatus.lastCheckedAt).toLocaleTimeString('fr-FR') : '-'}
            />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {financeProviderSignals.map((signal) => (
          <Link key={signal.label} to={signal.path} className={`rounded-2xl px-4 py-4 transition-opacity hover:opacity-90 ${signal.tone}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{signal.label}</p>
                <p className="mt-2 text-2xl font-bold">{signal.value}</p>
                <p className="mt-1 text-xs opacity-80">{signal.helper}</p>
              </div>
              {signal.badge ? (
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getPaymentLifecycleTone(signal.badge)}`}>
                  {getPaymentLifecycleLabel(signal.badge)}
                </span>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ProviderRuntimeMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}
