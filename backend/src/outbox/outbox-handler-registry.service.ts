import { Injectable } from '@nestjs/common';
import { EmailSendOutboxHandler } from './handlers/email-send.handler.js';
import { NotificationDispatchOutboxHandler } from './handlers/notification-dispatch.handler.js';
import { SmsSendOutboxHandler } from './handlers/sms-send.handler.js';
import { WebhookDispatchOutboxHandler } from './handlers/webhook-dispatch.handler.js';
import { supportedOutboxHandlerKeys } from './outbox-contract.js';
import type { OutboxEventDescriptor, OutboxEventHandler } from './outbox.types.js';

@Injectable()
export class OutboxHandlerRegistryService {
  private readonly handlers: OutboxEventHandler[];

  constructor(
    emailSendHandler: EmailSendOutboxHandler,
    smsSendHandler: SmsSendOutboxHandler,
    notificationDispatchHandler: NotificationDispatchOutboxHandler,
    webhookDispatchHandler: WebhookDispatchOutboxHandler,
  ) {
    this.handlers = [
      emailSendHandler,
      smsSendHandler,
      notificationDispatchHandler,
      webhookDispatchHandler,
    ];
  }

  resolve(event: OutboxEventDescriptor) {
    return this.handlers.find((handler) => handler.supports(event)) ?? null;
  }

  supportedKeys() {
    return supportedOutboxHandlerKeys();
  }
}
