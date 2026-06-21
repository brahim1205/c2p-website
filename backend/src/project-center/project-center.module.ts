import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { OwnerProjectCommandsService } from './owner-project-commands.service.js';
import { ProjectCenterController } from './project-center.controller.js';
import { ProjectCenterService } from './project-center.service.js';
import { ProjectFundingController } from './project-funding.controller.js';
import { ProjectFundingService } from './project-funding.service.js';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [ProjectCenterController, ProjectFundingController],
  providers: [OwnerProjectCommandsService, ProjectCenterService, ProjectFundingService],
})
export class ProjectCenterModule {}
