import { apiRequest } from '../api';
import type {
  CommissionEntry,
  EscrowCase,
  FinanceSnapshot,
  FinanceTransaction,
  InvoiceRecord,
  PayoutAccount,
  PayoutRequest,
  SubscriptionPlan,
  UserSubscription,
  WalletAccount,
} from './types';

export async function fetchWalletAccount(_userId: string) {
  return apiRequest<WalletAccount | null>('/payments/wallet/me');
}

export async function fetchSubscriptionPlans(role?: string) {
  const query = role ? `?role=${encodeURIComponent(role)}` : '';
  return apiRequest<SubscriptionPlan[]>(`/payments/subscription-plans${query}`);
}

export async function fetchAdminSubscriptionPlans() {
  return apiRequest<SubscriptionPlan[]>('/payments/admin/subscription-plans');
}

export async function createAdminSubscriptionPlan(payload: Partial<SubscriptionPlan>) {
  return apiRequest<SubscriptionPlan>('/payments/admin/subscription-plans', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAdminSubscriptionPlan(id: string, payload: Partial<SubscriptionPlan>) {
  return apiRequest<SubscriptionPlan>(`/payments/admin/subscription-plans/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deactivateAdminSubscriptionPlan(id: string) {
  return apiRequest<SubscriptionPlan>(`/payments/admin/subscription-plans/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function fetchUserSubscriptions(_userId: string) {
  return apiRequest<UserSubscription[]>('/payments/subscriptions/me');
}

export async function fetchEscrowCases() {
  return apiRequest<EscrowCase[]>('/payments/escrows/me');
}

export async function fetchCommissionEntries() {
  return apiRequest<CommissionEntry[]>('/payments/commissions/me');
}

export async function fetchPayoutAccounts(_userId: string) {
  return apiRequest<PayoutAccount[]>('/payments/payout-accounts/me');
}

export async function fetchPayoutRequests(_userId: string) {
  return apiRequest<PayoutRequest[]>('/payments/payouts/me');
}

export async function fetchFinanceTransactions() {
  return apiRequest<FinanceTransaction[]>('/payments/transactions/me');
}

export async function fetchInvoices() {
  return apiRequest<InvoiceRecord[]>('/payments/invoices/me');
}

export async function fetchFinanceSnapshot(_userId: string, _role?: string): Promise<FinanceSnapshot> {
  return apiRequest<FinanceSnapshot>('/payments/snapshot/me');
}
