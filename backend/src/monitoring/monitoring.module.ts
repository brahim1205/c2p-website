import { Module } from '@nestjs/common';
import { EmailModule } from '../communications/email.module.js';
import { AlertmanagerNotificationService } from './alertmanager-notification.service.js';
import { MonitoringController } from './monitoring.controller.js';
import { MonitoringService } from './monitoring.service.js';

@Module({
  imports: [EmailModule],
  controllers: [MonitoringController],
  providers: [AlertmanagerNotificationService, MonitoringService],
  exports: [MonitoringService],
})
export class MonitoringModule {}
