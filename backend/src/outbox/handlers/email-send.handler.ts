import { Injectable } from '@nestjs/common';
import { EmailService } from '../../communications/email.service.js';
import { OutboxDeliveryLogService } from '../outbox-delivery-log.service.js';
import type { OutboxEventDescriptor, OutboxEventHandler } from '../outbox.types.js';

@Injectable()
export class EmailSendOutboxHandler implements OutboxEventHandler {
  constructor(
    private readonly emailService: EmailService,
    private readonly deliveryLogService: OutboxDeliveryLogService,
  ) {}

  supports(event: OutboxEventDescriptor) {
    return event.eventType === 'communications.email.send' && event.eventVersion === 1;
  }

  async handle(event: OutboxEventDescriptor) {
    const recipients = Array.isArray(event.payload.recipients) ? event.payload.recipients : [];
    const subject = String(event.payload.subject ?? '').trim();
    const message = String(event.payload.message ?? '').trim();
    const purpose = String(event.payload.purpose ?? 'outbox-email');
    if (!subject || !message || recipients.length === 0) {
      return;
    }

    for (const recipient of recipients) {
      if (!recipient || typeof recipient !== 'object') continue;
      const target = recipient as Record<string, unknown>;
      if (!target.email) continue;
      const email = String(target.email);
      const userId = typeof target.userId === 'string' ? target.userId : undefined;
      try {
        const result = await this.emailService.send({
          to: email,
          subject,
          text: message,
          html: typeof event.payload.html === 'string' ? event.payload.html : undefined,
          purpose,
          userId,
        });
        await this.deliveryLogService.recordNotificationDelivery({
          outboxEventId: event.id,
          eventType: event.eventType,
          channel: 'email',
          recipientUserId: userId,
          recipientAddress: email,
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
          channel: 'email',
          recipientUserId: userId,
          recipientAddress: email,
          provider: this.emailService.getStatus().provider,
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
