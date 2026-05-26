import { apiRequest } from '../api';
import { fetchFinanceCapabilities } from '../saasApi';
import type { DexPayPaymentIntent, DexPayProviderTransaction, DexPayReconciliationJob, DexPayWebhookReceipt } from './types';

export async function reconcileDexPay(limit = 25, options?: { onlyPending?: boolean; providerReference?: string }) {
  return apiRequest<{ jobId: string; summary: Record<string, unknown> }>(`/payments/admin/providers/dexpay/reconcile`, {
    method: 'POST',
    body: JSON.stringify({
      limit,
      onlyPending: options?.onlyPending ?? true,
      providerReference: options?.providerReference,
    }),
  });
}

export async function fetchDexPayReconciliationJobs(limit = 50) {
  return apiRequest<DexPayReconciliationJob[]>(`/payments/admin/providers/dexpay/reconciliation-jobs?limit=${encodeURIComponent(String(limit))}`);
}

export async function fetchDexPayWebhookReceipts(limit = 50, status?: string) {
  const query = new URLSearchParams({ limit: String(limit) });
  if (status) query.set('status', status);
  return apiRequest<DexPayWebhookReceipt[]>(`/payments/admin/providers/dexpay/webhook-receipts?${query.toString()}`);
}

export async function fetchDexPayProviderTransactions(limit = 50, status?: string) {
  const query = new URLSearchParams({ limit: String(limit) });
  if (status) query.set('status', status);
  return apiRequest<DexPayProviderTransaction[]>(`/payments/admin/providers/dexpay/transactions?${query.toString()}`);
}

export async function fetchDexPayProviderTransactionCapabilities(providerReference: string) {
  return fetchFinanceCapabilities('provider_transaction', providerReference);
}

export async function fetchDexPayPaymentIntents(limit = 50, status?: string) {
  const query = new URLSearchParams({ limit: String(limit) });
  if (status) query.set('status', status);
  return apiRequest<DexPayPaymentIntent[]>(`/payments/admin/providers/dexpay/intents?${query.toString()}`);
}

export async function fetchDexPayPaymentIntentCapabilities(intentId: string) {
  return fetchFinanceCapabilities('payment_intent', intentId);
}

export async function reprocessDexPayWebhookReceipt(receiptId: string, reason?: string) {
  return apiRequest<{ receiptId: string; providerReference: string; matched: boolean; status: string }>(
    `/payments/admin/providers/dexpay/webhook-receipts/${encodeURIComponent(receiptId)}/reprocess`,
    {
      method: 'POST',
      body: JSON.stringify({ reason }),
    },
  );
}

export async function forceSyncDexPayProviderTransaction(providerReference: string, reason?: string) {
  return apiRequest<{ providerReference: string; matched: boolean; status: string; transactionId?: string | null }>(
    `/payments/admin/providers/dexpay/transactions/${encodeURIComponent(providerReference)}/force-sync`,
    {
      method: 'POST',
      body: JSON.stringify({ reason }),
    },
  );
}
