import { apiRequest } from './api';

export interface DexPayStatus {
  enabled: boolean;
  configured: boolean;
  reachable?: boolean;
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
