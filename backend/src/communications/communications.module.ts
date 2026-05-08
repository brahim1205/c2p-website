import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { CommunicationsController } from './communications.controller.js';
import { SmsModule } from './sms.module.js';

@Module({
  imports: [AuthModule, SmsModule],
  controllers: [CommunicationsController],
})
export class CommunicationsModule {}
