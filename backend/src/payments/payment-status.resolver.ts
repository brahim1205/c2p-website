export type PaymentLifecycleStatus =
  | 'initiated'
  | 'pending_provider'
  | 'processing'
  | 'confirmed'
  | 'failed'
  | 'refunded'
  | 'reconciled';

type PaymentStatusInput = {
  type?: string | null;
  status?: string | null;
  providerStatus?: string | null;
  settledToWallet?: boolean | null;
};

function normalize(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function includesAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle));
}

export function resolvePaymentLifecycleStatus(input: PaymentStatusInput): PaymentLifecycleStatus {
  const type = normalize(input.type);
  const status = normalize(input.status);
  const providerStatus = normalize(input.providerStatus);
  const settledToWallet = Boolean(input.settledToWallet);

  if (type === 'refund' && (status === 'completed' || includesAny(providerStatus, ['refund', 'refunded']))) {
    return 'refunded';
  }

  if (settledToWallet && status === 'completed') {
    return 'reconciled';
  }

  if (status === 'failed' || status === 'cancelled' || includesAny(providerStatus, ['failed', 'error', 'rejected', 'cancelled', 'canceled', 'expired'])) {
    return 'failed';
  }

  if (status === 'completed' || includesAny(providerStatus, ['completed', 'success', 'confirmed', 'settled'])) {
    return 'confirmed';
  }

  if (includesAny(providerStatus, ['processing', 'in_progress', 'in progress', 'validating', 'confirming'])) {
    return 'processing';
  }

  if (providerStatus.length > 0 || status === 'pending') {
    return 'pending_provider';
  }

  return 'initiated';
}
