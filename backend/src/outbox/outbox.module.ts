import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { CommunicationsModule } from '../communications/communications.module.js';
import { SmsModule } from '../communications/sms.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { OutboxController } from './outbox.controller.js';
import { EmailSendOutboxHandler } from './handlers/email-send.handler.js';
import { NotificationDispatchOutboxHandler } from './handlers/notification-dispatch.handler.js';
import { SmsSendOutboxHandler } from './handlers/sms-send.handler.js';
import { WebhookDispatchOutboxHandler } from './handlers/webhook-dispatch.handler.js';
import { OutboxDeliveryLogService } from './outbox-delivery-log.service.js';
import { OutboxHandlerRegistryService } from './outbox-handler-registry.service.js';
import { OutboxNotificationService } from './outbox-notification.service.js';
import { OutboxProcessorService } from './outbox.processor.service.js';
import { OutboxService } from './outbox.service.js';

@Module({
  imports: [DatabaseModule, AuthModule, SmsModule, forwardRef(() => CommunicationsModule)],
  controllers: [OutboxController],
  providers: [
    OutboxService,
    OutboxProcessorService,
    OutboxNotificationService,
    OutboxDeliveryLogService,
    OutboxHandlerRegistryService,
    EmailSendOutboxHandler,
    SmsSendOutboxHandler,
    NotificationDispatchOutboxHandler,
    WebhookDispatchOutboxHandler,
  ],
  exports: [OutboxService, OutboxProcessorService],
})
export class OutboxModule {}
