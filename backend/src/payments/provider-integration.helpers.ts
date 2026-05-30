import type { Prisma } from '@prisma/client';
import type { Row } from '../data/mock-store.js';
import type { DexPayOrder } from './dexpay.service.js';
import type { DexPayWebhookDto } from './dto/dexpay.dto.js';

export function providerJson(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export function readProviderRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function readProviderString(value: unknown) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

export function readProviderHeader(
  headers: Record<string, string | string[] | undefined> | undefined,
  name: string,
) {
  if (!headers) return undefined;
  const value = headers[name.toLowerCase()] ?? headers[name];
  if (Array.isArray(value)) return value[0];
  return value;
}

export function extractDexPayProviderReference(payload: DexPayWebhookDto) {
  return readProviderString(
    payload.orderId
    ?? payload.order_id
    ?? payload.reference
    ?? payload.id
    ?? readProviderRecord(payload.data)?.id
    ?? readProviderRecord(payload.order)?.id,
  );
}

export function extractDexPayProviderEventId(payload: DexPayWebhookDto) {
  return readProviderString(
    payload.eventId
    ?? payload.event_id
    ?? readProviderRecord(payload.event)?.id
    ?? readProviderRecord(payload.data)?.eventId,
  );
}

export function extractDexPayProviderStatus(payload: DexPayWebhookDto) {
  return readProviderString(
    payload.status
    ?? payload.orderStatus
    ?? payload.order_status
    ?? readProviderRecord(payload.data)?.status
    ?? readProviderRecord(payload.order)?.status,
  );
}

export function mapDexPayStatus(status?: string) {
  const normalized = String(status ?? '').trim().toUpperCase();
  if (['COMPLETED', 'SUCCESS', 'SETTLED'].includes(normalized)) return 'completed';
  if (['FAILED', 'ERROR', 'REJECTED', 'EXPIRED'].includes(normalized)) return 'failed';
  if (['CANCELLED', 'CANCELED'].includes(normalized)) return 'cancelled';
  return 'pending';
}

export function buildDexPayCheckoutTransaction(input: {
  actorId: string;
  direction: string;
  asset?: string;
  chain?: string;
  fiatAmount?: number;
  quote: DexPayOrder;
  order: DexPayOrder;
}) {
  return {
    id: `trx-dxp-${Date.now()}`,
    user_id: input.actorId,
    type: input.direction === 'onramp' ? 'deposit' : 'withdrawal',
    amount: Number(input.order.fiatAmount ?? input.quote.fiatAmount ?? input.fiatAmount ?? 0),
    currency: 'XAF',
    method: 'dexpay',
    status: mapDexPayStatus(input.order.status),
    description: input.direction === 'onramp'
      ? `DexPay on-ramp ${input.asset}/${input.chain}`
      : `DexPay off-ramp ${input.asset}/${input.chain}`,
    date: input.order.createdAt ?? new Date().toISOString(),
    reference: input.order.id,
    provider: 'dexpay',
    provider_quote_id: input.quote.id,
    provider_order_id: input.order.id,
    provider_status: input.order.status ?? 'PENDING',
    payment_account: input.order.paymentAccount ?? null,
    deposit_address: input.order.address ?? null,
    asset: input.asset,
    chain: input.chain,
    direction: input.direction,
    settled_to_wallet: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies Row;
}
