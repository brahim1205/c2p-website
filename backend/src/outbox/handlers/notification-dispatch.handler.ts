import { Injectable } from '@nestjs/common';
import { OutboxDeliveryLogService } from '../outbox-delivery-log.service.js';
import { OutboxNotificationService } from '../outbox-notification.service.js';
import type { OutboxEventDescriptor, OutboxEventHandler } from '../outbox.types.js';

const SUPPORTED_NOTIFICATION_EVENTS = new Set([
  'communications.notification.dispatch',
  'support.contact_submitted',
  'payout.requested',
  'payment.refunded',
  'booking.requested',
  'booking.assigned',
  'booking.refunded',
  'escrow.released',
  'escrow.refunded',
  'subscription.activated',
  'virtual_class.scheduled',
  'virtual_class.updated',
  'virtual_class.started',
  'virtual_class.ended',
  'virtual_class.replay_ready',
]);

@Injectable()
export class NotificationDispatchOutboxHandler implements OutboxEventHandler {
  constructor(
    private readonly notificationService: OutboxNotificationService,
    private readonly deliveryLogService: OutboxDeliveryLogService,
  ) {}

  supports(event: OutboxEventDescriptor) {
    return event.eventVersion === 1 && SUPPORTED_NOTIFICATION_EVENTS.has(event.eventType);
  }

  async handle(event: OutboxEventDescriptor) {
    const notifications = Array.isArray(event.payload.notifications) ? event.payload.notifications : [];
    if (notifications.length === 0) {
      return;
    }
    await this.notificationService.persistNotifications(
      notifications.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object'),
    );
    for (const entry of notifications) {
      if (!entry || typeof entry !== 'object') continue;
      const notification = entry as Record<string, unknown>;
      await this.deliveryLogService.recordNotificationDelivery({
        outboxEventId: event.id,
        eventType: event.eventType,
        channel: 'in_app',
        recipientUserId: typeof notification.user_id === 'string' ? notification.user_id : undefined,
        recipientAddress: typeof notification.link === 'string' ? notification.link : undefined,
        provider: 'in-app',
        providerMessageId: typeof notification.id === 'string' ? notification.id : null,
        status: 'delivered',
        metadata: {
          correlationId: event.correlationId ?? null,
          financialOperationId: event.financialOperationId ?? null,
        },
      });
    }
  }
}
