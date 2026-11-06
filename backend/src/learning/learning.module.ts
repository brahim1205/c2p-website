import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { PaymentsModule } from '../payments/payments.module.js';
import { CertificateBrandingService } from './certificate-branding.service.js';
import { ExamLifecycleService } from './exam-lifecycle.service.js';
import { FormateurCourseProgramService } from './formateur-course-program.service.js';
import { FormateurCommunityService } from './formateur-community.service.js';
import { FormateurEngagementController } from './formateur-engagement.controller.js';
import { FormateurEngagementService } from './formateur-engagement.service.js';
import { FormateurLearnersService } from './formateur-learners.service.js';
import { FormateurVirtualClassesService } from './formateur-virtual-classes.service.js';
import { LearningAccessService } from './learning-access.service.js';
import { LearningAssessmentsCommandService } from './learning-assessments-command.service.js';
import { LearningAssessmentsReadService } from './learning-assessments-read.service.js';
import { LearningCertificationService } from './learning-certification.service.js';
import { LearningController } from './learning.controller.js';
import { LearningLifecycleController } from './learning-lifecycle.controller.js';
import { LearningParentController } from './learning-parent.controller.js';
import { LearningProgressReadService } from './learning-progress-read.service.js';
import { LearningPublicController } from './learning-public.controller.js';
import { LearningPublicFallbackService } from './learning-public-fallback.service.js';
import { LearningPublicReadService } from './learning-public-read.service.js';
import { LearningService } from './learning.service.js';
import { VirtualClassEngagementService } from './virtual-class-engagement.service.js';

@Module({
  imports: [AuthModule, DatabaseModule, NotificationsModule, PaymentsModule],
  controllers: [FormateurEngagementController, LearningController, LearningLifecycleController, LearningParentController, LearningPublicController],
  providers: [
    CertificateBrandingService,
    ExamLifecycleService,
    VirtualClassEngagementService,
    FormateurCommunityService,
    FormateurEngagementService,
    FormateurCourseProgramService,
    FormateurLearnersService,
    FormateurVirtualClassesService,
    LearningAccessService,
    LearningAssessmentsCommandService,
    LearningAssessmentsReadService,
    LearningCertificationService,
    LearningProgressReadService,
    LearningPublicFallbackService,
    LearningPublicReadService,
    LearningService,
  ],
})
export class LearningModule {}
