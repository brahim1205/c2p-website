import { apiRequest } from './api';
import type { ProviderVisibilityOrder, ProviderVisibilityPassRecord, ProviderVisibilityProduct } from './saasApi';

export interface DexPayStatus {
  provider: 'dexpay';
  mode: 'live' | 'disabled';
  enabled: boolean;
  configured: boolean;
  apiConfigured?: boolean;
  reachable?: boolean;
  webhookSecretConfigured?: boolean;
  webhookVerification?: 'strict' | 'skipped_no_secret';
  baseUrlHost?: string | null;
  lastCheckedAt?: string;
  errorCode?: string | null;
  business?: {
    name?: string;
    emailaddress?: string;
    walletAddresses?: Array<{ _id?: string; address?: string; chain?: string }>;
  };
}

export interface DexPayBank {
  name?: string;
  code?: string;
  currency?: string;
}

export interface DexPayCheckoutPayload {
  direction: 'onramp' | 'offramp';
  fiatAmount?: number;
  tokenAmount?: number;
  asset: string;
  chain: string;
  bankCode?: string;
  accountName?: string;
  accountNumber?: string;
  recipientWallet?: string;
}

export interface DexPayOrder {
  id: string;
  status?: string;
  fiatAmount?: number;
  tokenAmount?: number;
  address?: string;
  paymentAccount?: {
    accountName?: string;
    accountNumber?: string;
    bankName?: string;
  };
}

export interface WalletCommandPayload {
  amount: number;
  method?: 'orange_money' | 'wave' | 'yas' | 'kaypay' | 'card' | 'wallet' | 'dexpay' | 'bank' | 'paypal' | 'free_money' | 'mtn_money';
  description?: string;
}

export interface PayoutAccountCommandPayload {
  method: 'bank' | 'paypal' | 'orange_money' | 'wave' | 'free_money' | 'mtn_money';
  account_name: string;
  account_identifier: string;
  label: string;
  is_default?: boolean;
}

export interface PayoutRequestCommandPayload {
  amount: number;
  account_id: string;
  note?: string;
}

export interface SubscriptionActivatePayload {
  plan_id: string;
  auto_renew?: boolean;
  renew_now?: boolean;
  trial?: boolean;
  trial_days?: number;
}

export interface ProviderVisibilityPurchasePayload {
  product_id: string;
}

export async function fetchDexPayStatus() {
  return apiRequest<DexPayStatus>('/payments/dexpay/status');
}

export async function fetchDexPayBanks() {
  return apiRequest<DexPayBank[]>('/payments/dexpay/banks');
}

export async function createDexPayCheckout(payload: DexPayCheckoutPayload) {
  return apiRequest<{
    transaction: Record<string, unknown>;
    quote: DexPayOrder;
    order: DexPayOrder;
  }>('/payments/dexpay/checkout', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function syncDexPayOrder(orderId: string, transactionId?: string) {
  return apiRequest<{
    order: DexPayOrder;
    transaction: Record<string, unknown>;
  }>(`/payments/dexpay/orders/${encodeURIComponent(orderId)}/sync`, {
    method: 'POST',
    body: JSON.stringify({ transactionId }),
  });
}

export async function topupWallet(payload: WalletCommandPayload) {
  return apiRequest<{
    wallet: Record<string, unknown> | null;
    transaction: Record<string, unknown>;
    financialOperationId: string;
  }>('/payments/wallet/topup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function withdrawWallet(payload: WalletCommandPayload) {
  return apiRequest<{
    wallet: Record<string, unknown> | null;
    transaction: Record<string, unknown>;
    financialOperationId: string;
  }>('/payments/wallet/withdraw', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function createPayoutAccount(payload: PayoutAccountCommandPayload) {
  return apiRequest<{
    account: Record<string, unknown>;
  }>('/payments/payout-accounts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function setDefaultPayoutAccount(accountId: string) {
  return apiRequest<{
    account: Record<string, unknown>;
  }>(`/payments/payout-accounts/${encodeURIComponent(accountId)}/default`, {
    method: 'POST',
  });
}

export async function createPayoutRequest(payload: PayoutRequestCommandPayload) {
  return apiRequest<{
    request: Record<string, unknown>;
  }>('/payments/payouts/request', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function activateSubscriptionPlan(payload: SubscriptionActivatePayload) {
  return apiRequest<{
    subscription: Record<string, unknown>;
  }>('/payments/subscriptions/activate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchProviderVisibilityProducts() {
  return apiRequest<ProviderVisibilityProduct[]>('/payments/provider-visibility/products');
}

export async function fetchProviderVisibilityOrders() {
  return apiRequest<ProviderVisibilityOrder[]>('/payments/provider-visibility/orders/me');
}

export async function fetchProviderVisibilityPasses() {
  return apiRequest<ProviderVisibilityPassRecord[]>('/payments/provider-visibility/passes/me');
}

export async function purchaseProviderVisibility(payload: ProviderVisibilityPurchasePayload) {
  return apiRequest<{
    wallet: Record<string, unknown> | null;
    order: ProviderVisibilityOrder;
    pass: ProviderVisibilityPassRecord;
    transaction: Record<string, unknown>;
    financialOperationId: string;
  }>('/payments/provider-visibility/purchase', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
