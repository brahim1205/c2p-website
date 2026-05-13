import { z } from 'zod';
import type { OutboxEventInput } from './outbox.types.js';

export const OUTBOX_EVENT_CATALOG = {
  'booking.assigned': { aggregateType: 'booking', eventVersion: 1 },
  'booking.refunded': { aggregateType: 'booking', eventVersion: 1 },
  'booking.requested': { aggregateType: 'booking', eventVersion: 1 },
  'communications.email.send': { aggregateType: 'communication', eventVersion: 1 },
  'communications.notification.dispatch': { aggregateType: 'notification', eventVersion: 1 },
  'communications.sms.send': { aggregateType: 'communication', eventVersion: 1 },
  'escrow.refunded': { aggregateType: 'escrow', eventVersion: 1 },
  'escrow.released': { aggregateType: 'escrow', eventVersion: 1 },
  'payment.refunded': { aggregateType: 'payment_transaction', eventVersion: 1 },
  'payout.completed': { aggregateType: 'payout_request', eventVersion: 1 },
  'payout.requested': { aggregateType: 'payout_request', eventVersion: 1 },
  'subscription.activated': { aggregateType: 'subscription', eventVersion: 1 },
  'support.contact_submitted': { aggregateType: 'public_contact_submission', eventVersion: 1 },
  'virtual_class.ended': { aggregateType: 'virtual_class', eventVersion: 1 },
  'virtual_class.replay_ready': { aggregateType: 'virtual_class', eventVersion: 1 },
  'virtual_class.scheduled': { aggregateType: 'virtual_class', eventVersion: 1 },
  'virtual_class.started': { aggregateType: 'virtual_class', eventVersion: 1 },
  'virtual_class.updated': { aggregateType: 'virtual_class', eventVersion: 1 },
  'webhook.dispatch': { aggregateType: 'webhook', eventVersion: 1 },
} as const;

export type OutboxEventType = keyof typeof OUTBOX_EVENT_CATALOG;

const OUTBOX_EVENT_ALIASES: Record<string, OutboxEventType> = {
  'virtual_class.live_ended': 'virtual_class.ended',
  'virtual_class.live_started': 'virtual_class.started',
  'virtual_class.live_updated': 'virtual_class.updated',
};

const OUTBOX_EVENT_VALUES = Object.keys(OUTBOX_EVENT_CATALOG) as [OutboxEventType, ...OutboxEventType[]];

const outboxEventEnvelopeSchema = z.object({
  id: z.string().min(1).optional(),
  eventType: z.string().min(1),
  eventVersion: z.number().int().positive().optional(),
  aggregateType: z.string().min(1).nullable().optional(),
  aggregateId: z.string().min(1).nullable().optional(),
  actorId: z.string().min(1).nullable().optional(),
  idempotencyKey: z.string().min(1).nullable().optional(),
  dedupeKey: z.string().min(1).nullable().optional(),
  availableAt: z.union([z.string(), z.date()]).nullable().optional(),
  nextRetryAt: z.union([z.string(), z.date()]).nullable().optional(),
  occurredAt: z.union([z.string(), z.date()]).nullable().optional(),
  correlationId: z.string().min(1).nullable().optional(),
  financialOperationId: z.string().min(1).nullable().optional(),
  payload: z.record(z.string(), z.unknown()),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  maxRetries: z.number().int().positive().optional(),
});

function toIso(value: string | Date | null | undefined, fallback = new Date()) {
  if (!value) return fallback.toISOString();
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid outbox datetime value: ${String(value)}`);
  }
  return date.toISOString();
}

function canonicalizeEventType(eventType: string) {
  const direct = eventType.trim();
  return OUTBOX_EVENT_ALIASES[direct] ?? direct;
}

export function supportedOutboxHandlerKeys() {
  return OUTBOX_EVENT_VALUES.map((eventType) => `${eventType}@${OUTBOX_EVENT_CATALOG[eventType].eventVersion}`);
}

export function normalizeOutboxEventInput(input: OutboxEventInput): OutboxEventInput {
  const parsed = outboxEventEnvelopeSchema.parse(input);
  const canonicalEventType = canonicalizeEventType(parsed.eventType);
  const definition = OUTBOX_EVENT_CATALOG[canonicalEventType as OutboxEventType];
  if (!definition || !z.enum(OUTBOX_EVENT_VALUES).safeParse(canonicalEventType).success) {
    throw new Error(`Unsupported outbox event type: ${parsed.eventType}`);
  }

  const eventVersion = parsed.eventVersion ?? definition.eventVersion;
  if (eventVersion !== definition.eventVersion) {
    throw new Error(`Unsupported version for ${canonicalEventType}: expected ${definition.eventVersion}, got ${eventVersion}`);
  }

  if (parsed.aggregateType && parsed.aggregateType !== definition.aggregateType) {
    throw new Error(`Invalid aggregate type for ${canonicalEventType}: expected ${definition.aggregateType}, got ${parsed.aggregateType}`);
  }

  const idempotencyKey = parsed.idempotencyKey ?? parsed.dedupeKey ?? null;
  const occurredAt = toIso(parsed.occurredAt);
  const availableAt = toIso(parsed.availableAt, new Date(occurredAt));
  const nextRetryAt = toIso(parsed.nextRetryAt ?? parsed.availableAt, new Date(availableAt));
  const correlationId = parsed.correlationId ?? parsed.financialOperationId ?? idempotencyKey ?? `${canonicalEventType}:${parsed.aggregateId ?? 'global'}`;

  return {
    id: parsed.id,
    eventType: canonicalEventType,
    eventVersion,
    aggregateType: definition.aggregateType,
    aggregateId: parsed.aggregateId ?? null,
    actorId: parsed.actorId ?? null,
    idempotencyKey,
    dedupeKey: parsed.dedupeKey ?? idempotencyKey,
    availableAt,
    nextRetryAt,
    occurredAt,
    correlationId,
    financialOperationId: parsed.financialOperationId ?? null,
    payload: parsed.payload,
    metadata: {
      ...(parsed.metadata ?? {}),
      ...(canonicalEventType !== parsed.eventType ? { legacyEventType: parsed.eventType } : {}),
    },
    maxRetries: parsed.maxRetries ?? 5,
  };
}

export function buildOutboxEvent(input: OutboxEventInput) {
  return normalizeOutboxEventInput(input);
}
