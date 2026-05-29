import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { FormateurCourseProgramService } from './formateur-course-program.service.js';
import { FormateurCommunityService } from './formateur-community.service.js';
import { FormateurLearnersService } from './formateur-learners.service.js';
import { FormateurVirtualClassesService } from './formateur-virtual-classes.service.js';
import { LearningAccessService } from './learning-access.service.js';
import { LearningAssessmentsCommandService } from './learning-assessments-command.service.js';
import { LearningAssessmentsReadService } from './learning-assessments-read.service.js';
import { LearningController } from './learning.controller.js';
import { LearningProgressReadService } from './learning-progress-read.service.js';
import { LearningPublicReadService } from './learning-public-read.service.js';
import { LearningService } from './learning.service.js';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [LearningController],
  providers: [
    FormateurCommunityService,
    FormateurCourseProgramService,
    FormateurLearnersService,
    FormateurVirtualClassesService,
    LearningAccessService,
    LearningAssessmentsCommandService,
    LearningAssessmentsReadService,
    LearningProgressReadService,
    LearningPublicReadService,
    LearningService,
  ],
})
export class LearningModule {}
