import { createHash } from 'crypto';

function stableNormalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stableNormalize(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableNormalize(item)]),
    );
  }

  return value;
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function createProviderWebhookFingerprint(input: {
  provider: string;
  providerEventId?: string | null;
  providerReference?: string | null;
  providerStatus?: string | null;
  eventType?: string | null;
  payload: unknown;
}) {
  return sha256(JSON.stringify(stableNormalize({
    provider: input.provider,
    providerEventId: input.providerEventId ?? null,
    providerReference: input.providerReference ?? null,
    providerStatus: input.providerStatus ?? null,
    eventType: input.eventType ?? null,
    payload: input.payload,
  })));
}

export function createProviderWebhookReceiptId(provider: string, idempotencyKey: string) {
  return `whr-${provider}-${sha256(idempotencyKey).slice(0, 32)}`;
}
