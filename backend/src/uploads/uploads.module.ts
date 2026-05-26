import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { MonitoringModule } from '../monitoring/monitoring.module.js';
import { UploadsController } from './uploads.controller.js';
import { UploadsService } from './uploads.service.js';

@Module({
  imports: [DatabaseModule, MonitoringModule],
  controllers: [UploadsController],
  providers: [UploadsService],
})
export class UploadsModule {}
