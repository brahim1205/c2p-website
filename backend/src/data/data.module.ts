import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { MonitoringModule } from '../monitoring/monitoring.module.js';
import { DataController } from './data.controller.js';
import { DataBootstrapService } from './data-bootstrap.service.js';

@Module({
  imports: [DatabaseModule, AuthModule, MonitoringModule],
  controllers: [DataController],
  providers: [DataBootstrapService],
})
export class DataModule {}
