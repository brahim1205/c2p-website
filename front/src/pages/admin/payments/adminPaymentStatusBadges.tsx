import {
  getPaymentLifecycleLabel,
  getPaymentLifecycleTone,
} from '@/lib/paymentStatus';
import type { TransactionRow } from './useAdminPaymentsData';

export function getTransactionStatusBadge(status: TransactionRow['status']) {
  const styles = { completed: 'bg-green-100 text-green-700', pending: 'bg-orange-100 text-orange-700', failed: 'bg-red-100 text-red-700' };
  const labels = { completed: 'Complete', pending: 'En attente', failed: 'Echoue' };
  return <span className={`rounded-full px-3 py-1 text-xs font-medium ${styles[status]}`}>{labels[status]}</span>;
}

export function getProviderStatusBadge(status?: string | null) {
  const normalized = String(status ?? '').toLowerCase();
  if (['initiated', 'pending_provider', 'processing', 'confirmed', 'failed', 'refunded', 'reconciled'].includes(normalized)) {
    const lifecycle = normalized as Parameters<typeof getPaymentLifecycleLabel>[0];
    return (
      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getPaymentLifecycleTone(lifecycle)}`}>
        {getPaymentLifecycleLabel(lifecycle)}
      </span>
    );
  }
  const styles = normalized.includes('complete') || normalized.includes('confirm') || normalized.includes('settled')
    ? 'bg-green-100 text-green-700'
    : normalized.includes('pending') || normalized.includes('process') || normalized.includes('running')
      ? 'bg-orange-100 text-orange-700'
      : normalized.includes('fail') || normalized.includes('reject') || normalized.includes('cancel') || normalized.includes('dead')
        ? 'bg-red-100 text-red-700'
        : 'bg-gray-100 text-gray-700';
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${styles}`}>{status || 'unknown'}</span>;
}
