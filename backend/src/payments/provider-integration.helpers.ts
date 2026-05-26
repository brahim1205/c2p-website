import type { Prisma } from '@prisma/client';
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
