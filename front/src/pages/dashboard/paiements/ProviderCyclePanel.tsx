import {
  getPaymentLifecycleLabel,
  getPaymentLifecycleTone,
} from '@/lib/paymentStatus';
import {
  formatAmount,
  formatDate,
  type Transaction,
} from './paymentPageModel';

interface ProviderCyclePanelProps {
  providerBackedTransactions: Transaction[];
  activeProviderTransactions: Transaction[];
  reconciledProviderTransactionsCount: number;
  failedProviderTransactionsCount: number;
  syncingDexPay: boolean;
  getTransactionLifecycleState: (transaction: Transaction) => NonNullable<Transaction['lifecycle_status']>;
  getCapabilitySummary: (transaction: Transaction) => string;
  canSyncProvider: (transaction: Transaction) => boolean;
  onSyncDexPayTransaction: (transaction: Transaction) => void;
}

export default function ProviderCyclePanel({
  providerBackedTransactions,
  activeProviderTransactions,
  reconciledProviderTransactionsCount,
  failedProviderTransactionsCount,
  syncingDexPay,
  getTransactionLifecycleState,
  getCapabilitySummary,
  canSyncProvider,
  onSyncDexPayTransaction,
}: ProviderCyclePanelProps) {
  if (providerBackedTransactions.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Cycle provider</h3>
          <p className="text-sm text-gray-600">Suivi unifié des opérations externalisées avant confirmation et réconciliation C2P.</p>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
          {providerBackedTransactions.length} opération(s)
        </span>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <CycleMetric tone="amber" label="En cours provider" value={activeProviderTransactions.length} />
        <CycleMetric tone="teal" label="Réconciliées" value={reconciledProviderTransactionsCount} />
        <CycleMetric tone="red" label="À revoir" value={failedProviderTransactionsCount} />
      </div>

      <div className="space-y-3">
        {activeProviderTransactions.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune opération provider en attente pour le moment.</p>
        ) : activeProviderTransactions.slice(0, 4).map((transaction) => (
          <div key={transaction.id} className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-gray-900">{transaction.description}</p>
              <p className="mt-1 text-sm text-gray-600">
                {formatAmount(transaction.amount, transaction.currency)} · {transaction.provider_status || 'provider pending'} · {formatDate(transaction.date)}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {getCapabilitySummary(transaction)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getPaymentLifecycleTone(getTransactionLifecycleState(transaction))}`}>
                {getPaymentLifecycleLabel(getTransactionLifecycleState(transaction))}
              </span>
              {transaction.method === 'dexpay' && canSyncProvider(transaction) ? (
                <button
                  onClick={() => onSyncDexPayTransaction(transaction)}
                  disabled={syncingDexPay}
                  className="rounded-lg border border-[#0f766e]/20 px-3 py-1.5 text-xs font-medium text-[#0f766e] hover:bg-[#f5faf9] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Synchroniser
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CycleMetric({ label, value, tone }: { label: string; value: number; tone: 'amber' | 'teal' | 'red' }) {
  const classes = {
    amber: 'border-amber-200 bg-amber-50 text-amber-700 text-amber-900',
    teal: 'border-teal-200 bg-teal-50 text-teal-700 text-teal-900',
    red: 'border-red-200 bg-red-50 text-red-700 text-red-900',
  };
  const [borderClass, bgClass, labelClass, valueClass] = classes[tone].split(' ');

  return (
    <div className={`rounded-xl border ${borderClass} ${bgClass} p-4`}>
      <p className={`text-xs font-medium ${labelClass}`}>{label}</p>
      <p className={`mt-2 text-2xl font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}
