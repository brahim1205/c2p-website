import { Body, Controller, Get, Param, Patch, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PermissionGuard } from '../auth/permission.guard.js';
import { RequirePermission } from '../auth/require-permission.decorator.js';
import type { AuthenticatedRequest } from '../common/http/request-context.js';
import { CertificateBrandingService } from './certificate-branding.service.js';
import { ExamLifecycleService } from './exam-lifecycle.service.js';
import { FormateurCourseProgramService } from './formateur-course-program.service.js';
import { VirtualClassEngagementService } from './virtual-class-engagement.service.js';

/** Exam lifecycle (edit, open / close, timed start) and live-session attendance. */
@ApiTags('learning')
@Controller('learning')
export class LearningLifecycleController {
  constructor(
    private readonly examLifecycleService: ExamLifecycleService,
    private readonly virtualClassEngagementService: VirtualClassEngagementService,
    private readonly certificateBrandingService: CertificateBrandingService,
    private readonly formateurCourseProgramService: FormateurCourseProgramService,
  ) {}

  /** Course studio drag & drop: applies the full curriculum order in one write. */
  @Put('formateur/courses/:courseId/curriculum/order')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  applyFormateurCurriculumOrder(@Req() request: AuthenticatedRequest, @Param('courseId') courseId: string, @Body() payload: unknown) {
    return this.formateurCourseProgramService.applyCurriculumOrder(courseId, payload, request.auth?.user ?? null);
  }

  /** Stamp and management signature printed on certificates (public: needed to render them). */
  @Get('public/certificate-branding')
  getCertificateBranding() {
    return this.certificateBrandingService.get();
  }

  @Put('admin/certificate-branding')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.admin.write')
  updateCertificateBranding(@Req() request: AuthenticatedRequest, @Body() payload: unknown) {
    return this.certificateBrandingService.update(payload, request.auth?.user ?? null);
  }

  @Patch('formateur/exams/:examId')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  updateFormateurExam(@Req() request: AuthenticatedRequest, @Param('examId') examId: string, @Body() payload: unknown) {
    return this.examLifecycleService.updateExam(examId, payload, request.auth?.user ?? null);
  }

  @Patch('formateur/exams/:examId/status')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  changeFormateurExamStatus(@Req() request: AuthenticatedRequest, @Param('examId') examId: string, @Body() payload: unknown) {
    return this.examLifecycleService.changeStatus(examId, payload, request.auth?.user ?? null);
  }

  @Post('apprenant/exams/:examId/start')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  startApprenantExam(@Req() request: AuthenticatedRequest, @Param('examId') examId: string) {
    return this.examLifecycleService.startQuiz(examId, request.auth?.user ?? null);
  }

  @Post('apprenant/virtual-classes/:classId/attendance')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  checkInVirtualClass(@Req() request: AuthenticatedRequest, @Param('classId') classId: string) {
    return this.virtualClassEngagementService.checkIn(classId, request.auth?.user ?? null);
  }

  @Get('formateur/virtual-classes/:classId/attendance')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.read')
  getVirtualClassAttendance(@Req() request: AuthenticatedRequest, @Param('classId') classId: string) {
    return this.virtualClassEngagementService.getAttendance(classId, request.auth?.user ?? null);
  }

  @Patch('formateur/virtual-classes/:classId/attendance')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  markVirtualClassAttendance(@Req() request: AuthenticatedRequest, @Param('classId') classId: string, @Body() payload: unknown) {
    return this.virtualClassEngagementService.markAttendance(classId, payload, request.auth?.user ?? null);
  }
}
