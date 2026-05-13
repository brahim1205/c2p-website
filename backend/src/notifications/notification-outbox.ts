import { buildOutboxEvent } from '../outbox/outbox-contract.js';
import type { OutboxEventInput } from '../outbox/outbox.types.js';
import type { AppNotificationRow } from './notification-payloads.js';

export function buildNotificationDispatchOutboxEvent(input: {
  eventType: string;
  notifications: AppNotificationRow[];
  aggregateId?: string | null;
  actorId?: string | null;
  idempotencyKey?: string | null;
  financialOperationId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  return buildOutboxEvent({
    eventType: input.eventType,
    aggregateId: input.aggregateId ?? null,
    actorId: input.actorId ?? null,
    idempotencyKey: input.idempotencyKey ?? null,
    financialOperationId: input.financialOperationId ?? null,
    payload: {
      notifications: input.notifications,
    },
    metadata: {
      notificationCount: input.notifications.length,
      ...(input.metadata ?? {}),
    },
  });
}

export function pushNotificationDispatchOutboxEvent(
  target: OutboxEventInput[],
  input: Parameters<typeof buildNotificationDispatchOutboxEvent>[0],
) {
  if (input.notifications.length === 0) {
    return;
  }

  target.push(buildNotificationDispatchOutboxEvent(input));
}
