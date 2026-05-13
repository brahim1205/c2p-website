import { pushNotificationDispatchOutboxEvent } from '../notifications/notification-outbox.js';
import { createVirtualClassNotifications, type AppNotificationRow } from '../notifications/notification-payloads.js';
import type { OutboxEventInput } from '../outbox/outbox.types.js';
import type { Row } from './mock-store.js';

type VirtualClassNotificationEvent = 'live-scheduled' | 'live-updated' | 'live-started' | 'live-ended' | 'replay-ready';

interface VirtualClassEventsContext {
  getCourseEnrollments: (courseId: string) => Array<{ user_id: string; student_name: string }>;
}

function buildVirtualClassNotificationRows(
  ctx: VirtualClassEventsContext,
  vclass: Row,
  eventType: VirtualClassNotificationEvent,
) {
  const recipients = ctx.getCourseEnrollments(String(vclass.course_id ?? ''));
  return createVirtualClassNotifications({
    vclass,
    recipients,
    eventType,
  });
}

export function appendVirtualClassCreateEvents(
  ctx: VirtualClassEventsContext,
  createdRows: Row[],
  outboxEvents: OutboxEventInput[],
  actorId?: string | null,
) {
  const notifications = createdRows.flatMap((row) => buildVirtualClassNotificationRows(ctx, row, 'live-scheduled'));
  pushNotificationDispatchOutboxEvent(outboxEvents, {
    eventType: 'virtual_class.scheduled',
    aggregateId: String(createdRows[0]?.id ?? ''),
    actorId: actorId ?? null,
    idempotencyKey: `virtual_class.scheduled:${String(createdRows[0]?.id ?? '')}`,
    notifications,
  });
}

export function appendVirtualClassUpdateEvents(
  ctx: VirtualClassEventsContext,
  previousRows: Row[],
  updatedRows: Row[],
  outboxEvents: OutboxEventInput[],
  actorId?: string | null,
) {
  const previousById = new Map(previousRows.map((row) => [String(row.id), row] as const));
  const notifications = updatedRows.flatMap((row) => {
    const previous = previousById.get(String(row.id));
    if (!previous) return [] as AppNotificationRow[];

    if (String(previous.status) !== String(row.status)) {
      if (String(row.status) === 'live') {
        return buildVirtualClassNotificationRows(ctx, row, 'live-started');
      }
      if (String(row.status) === 'ended') {
        return buildVirtualClassNotificationRows(ctx, row, row.recording_url ? 'replay-ready' : 'live-ended');
      }
    }

    const relevantKeys = ['title', 'class_date', 'class_time', 'room_link', 'recording_url', 'recording_status'];
    const changed = relevantKeys.some((key) => String(previous[key] ?? '') !== String(row[key] ?? ''));
    if (changed) {
      if (String(row.status) === 'ended' && row.recording_url && !previous.recording_url) {
        return buildVirtualClassNotificationRows(ctx, row, 'replay-ready');
      }
      if (String(row.status) === 'scheduled') {
        return buildVirtualClassNotificationRows(ctx, row, 'live-updated');
      }
    }

    return [] as AppNotificationRow[];
  });

  if (notifications.length === 0) {
    return;
  }

  const firstRowId = String(updatedRows[0]?.id ?? previousRows[0]?.id ?? '');
  pushNotificationDispatchOutboxEvent(outboxEvents, {
    eventType: `virtual_class.${String((notifications[0]?.metadata as Record<string, unknown> | undefined)?.event ?? 'updated').replace(/-/g, '_')}`,
    aggregateId: firstRowId,
    actorId: actorId ?? null,
    idempotencyKey: `virtual_class:${firstRowId}:${String(updatedRows[0]?.updated_at ?? '')}`,
    notifications,
  });
}
