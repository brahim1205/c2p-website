import type { ReactNode } from 'react';

interface ProviderPaymentCapabilitySummary {
  summary: string;
  actions: {
    force_sync_provider?: boolean;
  };
}

interface ProviderPaymentSignalRow {
  id: string | number;
  providerReference: string;
  linkedUser: string;
  direction?: string | null;
  lifecycleStatus?: string | null;
  providerStatus?: string | null;
  amount?: number | string | null;
  currency?: string | null;
}

interface PaymentIntentSignalRow {
  id: string | number;
  contextType?: string | null;
  linkedUser: string;
  providerIntentRef?: string | null;
  status?: string | null;
  amount?: number | string | null;
  currency?: string | null;
}

interface AdminProviderPaymentSignalsPanelProps<TProviderTransaction extends ProviderPaymentSignalRow, TPaymentIntent extends PaymentIntentSignalRow> {
  providerTransactions: TProviderTransaction[];
  paymentIntents: TPaymentIntent[];
  operatorBusyKey: string | null;
  providerConfigured: boolean;
  getProviderTransactionCapabilities: (transaction: TProviderTransaction) => ProviderPaymentCapabilitySummary;
  renderProviderStatusBadge: (status?: string | null) => ReactNode;
  onForceSyncProviderTransaction: (providerReference: string) => void;
}

export default function AdminProviderPaymentSignalsPanel<TProviderTransaction extends ProviderPaymentSignalRow, TPaymentIntent extends PaymentIntentSignalRow>({
  providerTransactions,
  paymentIntents,
  operatorBusyKey,
  providerConfigured,
  getProviderTransactionCapabilities,
  renderProviderStatusBadge,
  onForceSyncProviderTransaction,
}: AdminProviderPaymentSignalsPanelProps<TProviderTransaction, TPaymentIntent>) {
  return (
    <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
      <div className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Provider transactions</h2>
            <p className="text-sm text-gray-500">Vue DexPay normalisée côté plateforme.</p>
          </div>
          <span className="text-sm text-gray-500">{providerTransactions.length} élément(s)</span>
        </div>
        <div className="space-y-3">
          {providerTransactions.slice(0, 6).map((item) => {
            const capabilities = getProviderTransactionCapabilities(item);
            return (
              <div key={item.id} className="rounded-2xl border border-gray-200 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{item.providerReference}</p>
                    <p className="mt-1 text-sm text-gray-600">{item.linkedUser} · {item.direction || '-'}</p>
                    <p className="mt-1 text-xs text-gray-500">{capabilities.summary}</p>
                  </div>
                  {renderProviderStatusBadge(item.lifecycleStatus || item.providerStatus)}
                </div>
                <p className="mt-2 text-sm text-gray-600">{Number(item.amount || 0).toLocaleString('fr-FR')} {item.currency || 'XAF'}</p>
                <div className="mt-3 flex justify-end">
                  {capabilities.actions.force_sync_provider ? (
                    <button
                      onClick={() => onForceSyncProviderTransaction(item.providerReference)}
                      disabled={operatorBusyKey === `provider-force-sync:${item.providerReference}` || !providerConfigured}
                      className="rounded-xl border border-teal-200 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {operatorBusyKey === `provider-force-sync:${item.providerReference}` ? 'Sync...' : 'Force sync'}
                    </button>
                  ) : (
                    <span className="rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600">
                      Lecture seule
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {providerTransactions.length === 0 && <p className="text-sm text-gray-500">Aucune transaction provider.</p>}
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white px-5 py-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Payment intents</h2>
            <p className="text-sm text-gray-500">Intentions de paiement internes avant confirmation provider.</p>
          </div>
          <span className="text-sm text-gray-500">{paymentIntents.length} élément(s)</span>
        </div>
        <div className="space-y-3">
          {paymentIntents.slice(0, 6).map((item) => (
            <div key={item.id} className="rounded-2xl border border-gray-200 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-medium text-gray-900">{item.contextType || 'payment_intent'}</p>
                  <p className="mt-1 text-sm text-gray-600">{item.linkedUser} · {item.providerIntentRef || item.id}</p>
                </div>
                {renderProviderStatusBadge(item.status)}
              </div>
              <p className="mt-2 text-sm text-gray-600">{Number(item.amount || 0).toLocaleString('fr-FR')} {item.currency}</p>
            </div>
          ))}
          {paymentIntents.length === 0 && <p className="text-sm text-gray-500">Aucun payment intent.</p>}
        </div>
      </div>
    </section>
  );
}
