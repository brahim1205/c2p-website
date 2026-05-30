import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { OutboxModule } from '../outbox/outbox.module.js';
import { CommunicationsController } from './communications.controller.js';
import { CommunicationsService } from './communications.service.js';
import { EmailModule } from './email.module.js';
import { SmsModule } from './sms.module.js';

@Module({
  imports: [AuthModule, DatabaseModule, SmsModule, EmailModule, forwardRef(() => OutboxModule)],
  controllers: [CommunicationsController],
  providers: [CommunicationsService],
  exports: [CommunicationsService, EmailModule],
})
export class CommunicationsModule {}
