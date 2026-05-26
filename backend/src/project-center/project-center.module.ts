import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { ProjectCenterController } from './project-center.controller.js';
import { ProjectCenterService } from './project-center.service.js';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [ProjectCenterController],
  providers: [ProjectCenterService],
})
export class ProjectCenterModule {}
