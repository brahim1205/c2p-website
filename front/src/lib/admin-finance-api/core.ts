import { apiRequest } from '../api';
import type { AdminFinanceOverview, AdminPaymentTransaction } from './types';

export async function fetchAdminTransactions() {
  return apiRequest<AdminPaymentTransaction[]>('/payments/admin/transactions');
}

export async function fetchAdminFinanceOverview() {
  return apiRequest<AdminFinanceOverview>('/payments/admin/overview');
}

export async function updateAdminEscrowStatus(id: string, status: 'released' | 'refunded') {
  return apiRequest<{ escrow: unknown }>(`/payments/admin/escrows/${encodeURIComponent(id)}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
}

export async function updateAdminPayoutStatus(id: string, status: 'approved' | 'paid' | 'rejected') {
  return apiRequest<{ request: unknown }>(`/payments/admin/payouts/${encodeURIComponent(id)}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
}

export async function updateAdminTransactionStatusCommand(id: string, status: 'completed' | 'pending' | 'failed') {
  return apiRequest<{ transaction: AdminPaymentTransaction }>(`/payments/admin/transactions/${encodeURIComponent(id)}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
}

export async function refundAdminTransaction(id: string) {
  return apiRequest<{ transaction: AdminPaymentTransaction }>(`/payments/admin/transactions/${encodeURIComponent(id)}/refund`, {
    method: 'POST',
  });
}
