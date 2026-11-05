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

const NEGATION_TOKENS = new Set(['not', 'no', 'non']);

function tokenize(value: string) {
  return value.split(/[^a-z0-9]+/).filter(Boolean);
}

/**
 * Matches whole status words (or multi-word phrases) instead of raw substrings,
 * so that `UNCONFIRMED`, `unsettled` or `NOT_COMPLETED` are never read as a success.
 */
function includesAny(value: string, needles: string[]) {
  const tokens = tokenize(value);
  return needles.some((needle) => {
    const phrase = tokenize(needle);
    for (let index = 0; index + phrase.length <= tokens.length; index += 1) {
      const matches = phrase.every((part, offset) => tokens[index + offset] === part);
      if (matches && !NEGATION_TOKENS.has(tokens[index - 1] ?? '')) {
        return true;
      }
    }
    return false;
  });
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

  if (status === 'failed' || status === 'cancelled' || includesAny(providerStatus, ['failed', 'failure', 'error', 'rejected', 'declined', 'cancelled', 'canceled', 'expired', 'unsuccessful'])) {
    return 'failed';
  }

  if (status === 'completed' || includesAny(providerStatus, ['completed', 'success', 'successful', 'succeeded', 'confirmed', 'settled'])) {
    return 'confirmed';
  }

  if (includesAny(providerStatus, ['processing', 'in progress', 'validating', 'confirming'])) {
    return 'processing';
  }

  if (providerStatus.length > 0 || status === 'pending') {
    return 'pending_provider';
  }

  return 'initiated';
}
