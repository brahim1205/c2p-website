import { Injectable } from '@nestjs/common';
import { SmsService } from '../../communications/sms.service.js';
import { OutboxDeliveryLogService } from '../outbox-delivery-log.service.js';
import type { OutboxEventDescriptor, OutboxEventHandler } from '../outbox.types.js';

@Injectable()
export class SmsSendOutboxHandler implements OutboxEventHandler {
  constructor(
    private readonly smsService: SmsService,
    private readonly deliveryLogService: OutboxDeliveryLogService,
  ) {}

  supports(event: OutboxEventDescriptor) {
    return event.eventType === 'communications.sms.send' && event.eventVersion === 1;
  }

  async handle(event: OutboxEventDescriptor) {
    const recipients = Array.isArray(event.payload.recipients) ? event.payload.recipients : [];
    const message = String(event.payload.message ?? '').trim();
    const purpose = String(event.payload.purpose ?? 'outbox-sms');
    if (!message || recipients.length === 0) {
      return;
    }

    for (const recipient of recipients) {
      if (!recipient || typeof recipient !== 'object') continue;
      const target = recipient as Record<string, unknown>;
      if (!target.phone) continue;
      const phone = String(target.phone);
      const userId = typeof target.userId === 'string' ? target.userId : undefined;
      try {
        const result = await this.smsService.send({
          phone,
          message,
          purpose,
          userId,
        });
        await this.deliveryLogService.recordNotificationDelivery({
          outboxEventId: event.id,
          eventType: event.eventType,
          channel: 'sms',
          recipientUserId: userId,
          recipientAddress: phone,
          provider: result.provider,
          providerMessageId: result.providerMessageId ?? null,
          status: result.accepted ? 'delivered' : 'failed',
          metadata: {
            correlationId: event.correlationId ?? null,
            financialOperationId: event.financialOperationId ?? null,
            purpose,
          },
        });
      } catch (error) {
        await this.deliveryLogService.recordNotificationDelivery({
          outboxEventId: event.id,
          eventType: event.eventType,
          channel: 'sms',
          recipientUserId: userId,
          recipientAddress: phone,
          provider: this.smsService.getStatus().provider,
          status: 'failed',
          error: String(error),
          metadata: {
            correlationId: event.correlationId ?? null,
            financialOperationId: event.financialOperationId ?? null,
            purpose,
          },
        });
        throw error;
      }
    }
  }
}
