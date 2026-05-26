import { apiRequest } from '../api';
import type {
  FinanceCapabilityContractDescriptor,
  FinanceCapabilityEntity,
  FinanceCapabilitySnapshot,
} from './types';
import { FINANCE_CAPABILITY_CONTRACT_VERSION } from './types';

export async function fetchFinanceCapabilities(entity: FinanceCapabilityEntity, entityId: string) {
  return apiRequest<FinanceCapabilitySnapshot>(
    `/payments/capabilities/${encodeURIComponent(entity)}/${encodeURIComponent(entityId)}?contractVersion=${FINANCE_CAPABILITY_CONTRACT_VERSION}`,
  );
}

export async function fetchFinanceCapabilitiesContract() {
  return apiRequest<FinanceCapabilityContractDescriptor>(
    `/payments/capabilities/contract?contractVersion=${FINANCE_CAPABILITY_CONTRACT_VERSION}`,
  );
}

export async function fetchTransactionCapabilities(transactionId: string) {
  return fetchFinanceCapabilities('transaction', transactionId);
}

export async function fetchEscrowCapabilities(escrowId: string) {
  return fetchFinanceCapabilities('escrow', escrowId);
}

export async function fetchPayoutCapabilities(requestId: string) {
  return fetchFinanceCapabilities('payout', requestId);
}

export async function fetchSubscriptionCapabilities(subscriptionId: string) {
  return fetchFinanceCapabilities('subscription', subscriptionId);
}

export async function fetchInvoiceCapabilities(invoiceId: string) {
  return fetchFinanceCapabilities('invoice', invoiceId);
}
