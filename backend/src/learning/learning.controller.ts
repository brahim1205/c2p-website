import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PermissionGuard } from '../auth/permission.guard.js';
import { RequirePermission } from '../auth/require-permission.decorator.js';
import type { AuthenticatedRequest } from '../common/http/request-context.js';
import { FormateurCourseProgramService } from './formateur-course-program.service.js';
import { FormateurCommunityService } from './formateur-community.service.js';
import { FormateurLearnersService } from './formateur-learners.service.js';
import { FormateurVirtualClassesService } from './formateur-virtual-classes.service.js';
import { LearningAccessService } from './learning-access.service.js';
import { LearningService } from './learning.service.js';

@ApiTags('learning')
@Controller('learning')
export class LearningController {
  constructor(
    private readonly learningAccessService: LearningAccessService,
    private readonly learningService: LearningService,
    private readonly formateurCommunityService: FormateurCommunityService,
    private readonly formateurCourseProgramService: FormateurCourseProgramService,
    private readonly formateurLearnersService: FormateurLearnersService,
    private readonly formateurVirtualClassesService: FormateurVirtualClassesService,
  ) {}

  @Get('apprenant/courses/:courseId')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.read')
  getApprenantCourseDetail(
    @Req() request: AuthenticatedRequest,
    @Param('courseId') courseId: string,
  ) {
    return this.learningAccessService.getApprenantCourseDetail(courseId, request.auth?.user ?? null);
  }

  @Get('virtual-classes/:classId')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.read')
  getAuthorizedVirtualClass(
    @Req() request: AuthenticatedRequest,
    @Param('classId') classId: string,
  ) {
    return this.learningAccessService.getAuthorizedVirtualClassDetail(classId, request.auth?.user ?? null);
  }

  @Get('apprenant/courses/:courseId/context')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.read')
  getApprenantCourseContext(
    @Req() request: AuthenticatedRequest,
    @Param('courseId') courseId: string,
  ) {
    return this.learningAccessService.getApprenantCourseContext(courseId, request.auth?.user ?? null);
  }

  @Post('apprenant/courses/:courseId/enroll')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  enrollApprenantCourse(
    @Req() request: AuthenticatedRequest,
    @Param('courseId') courseId: string,
  ) {
    return this.learningAccessService.enrollApprenantCourse(courseId, request.auth?.user ?? null);
  }

  @Post('apprenant/courses/:courseId/purchase')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  purchaseApprenantCourse(
    @Req() request: AuthenticatedRequest,
    @Param('courseId') courseId: string,
  ) {
    return this.learningAccessService.purchaseApprenantCourse(courseId, request.auth?.user ?? null);
  }

  @Post('apprenant/courses/:courseId/purchase/external')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  purchaseApprenantCourseWithExternalPayment(
    @Req() request: AuthenticatedRequest,
    @Param('courseId') courseId: string,
    @Body() payload: unknown,
  ) {
    return this.learningAccessService.purchaseApprenantCourseWithExternalPayment(courseId, payload, request.auth?.user ?? null);
  }

  @Post('apprenant/courses/:courseId/reviews')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  publishApprenantCourseReview(
    @Req() request: AuthenticatedRequest,
    @Param('courseId') courseId: string,
    @Body() payload: unknown,
  ) {
    return this.learningAccessService.publishApprenantCourseReview(courseId, payload, request.auth?.user ?? null);
  }

  @Patch('apprenant/courses/:courseId/progress')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  updateApprenantCourseProgress(
    @Req() request: AuthenticatedRequest,
    @Param('courseId') courseId: string,
    @Body() payload: unknown,
  ) {
    return this.learningAccessService.updateApprenantCourseProgress(courseId, payload, request.auth?.user ?? null);
  }

  @Patch('apprenant/courses/:courseId/activity')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  updateApprenantCourseActivity(
    @Req() request: AuthenticatedRequest,
    @Param('courseId') courseId: string,
    @Body() payload: unknown,
  ) {
    return this.learningAccessService.updateApprenantCourseActivity(courseId, payload, request.auth?.user ?? null);
  }

  @Patch('apprenant/courses/:courseId/lessons/:lessonId/progress')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  updateApprenantLessonProgress(
    @Req() request: AuthenticatedRequest,
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
    @Body() payload: unknown,
  ) {
    return this.learningAccessService.updateApprenantLessonProgress(courseId, lessonId, payload, request.auth?.user ?? null);
  }

  @Post('apprenant/courses/:courseId/quiz-attempts')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  submitApprenantCourseQuizAttempt(
    @Req() request: AuthenticatedRequest,
    @Param('courseId') courseId: string,
    @Body() payload: unknown,
  ) {
    return this.learningAccessService.submitApprenantCourseQuizAttempt(courseId, payload, request.auth?.user ?? null);
  }

  @Get('apprenant/lessons/:lessonId/comments')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.read')
  getApprenantLessonComments(
    @Req() request: AuthenticatedRequest,
    @Param('lessonId') lessonId: string,
  ) {
    return this.learningAccessService.getApprenantLessonComments(lessonId, request.auth?.user ?? null);
  }

  @Post('apprenant/lessons/:lessonId/comments')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  createApprenantLessonComment(
    @Req() request: AuthenticatedRequest,
    @Param('lessonId') lessonId: string,
    @Body() payload: unknown,
  ) {
    return this.learningAccessService.createApprenantLessonComment(lessonId, payload, request.auth?.user ?? null);
  }

  @Get('apprenant/exams')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.read')
  getApprenantExamsSnapshot(@Req() request: AuthenticatedRequest) {
    return this.learningService.getApprenantExamsSnapshot(request.auth?.user ?? null);
  }

  @Get('apprenant/enrollments')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.read')
  getApprenantEnrollments(
    @Req() request: AuthenticatedRequest,
    @Query('limit') limit?: string,
  ) {
    return this.learningService.getApprenantEnrollments(request.auth?.user ?? null, { limit });
  }

  @Get('apprenant/certificates')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.read')
  getApprenantCertificates(
    @Req() request: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.learningService.getApprenantCertificates(request.auth?.user ?? null, { limit, status });
  }

  @Get('apprenant/dashboard')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.read')
  getApprenantDashboardSnapshot(@Req() request: AuthenticatedRequest) {
    return this.learningService.getApprenantDashboardSnapshot(request.auth?.user ?? null);
  }

  @Get('apprenant/progression')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.read')
  getApprenantProgressionSnapshot(@Req() request: AuthenticatedRequest) {
    return this.learningService.getApprenantProgressionSnapshot(request.auth?.user ?? null);
  }

  @Get('apprenant/exams/:examId/quiz')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.read')
  getApprenantQuizStructure(
    @Req() request: AuthenticatedRequest,
    @Param('examId') examId: string,
  ) {
    return this.learningService.getApprenantQuizStructure(examId, request.auth?.user ?? null);
  }

  @Post('apprenant/exams/:examId/submissions')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  submitApprenantExam(
    @Req() request: AuthenticatedRequest,
    @Param('examId') examId: string,
    @Body() payload: unknown,
  ) {
    return this.learningService.submitApprenantExam(examId, payload, request.auth?.user ?? null);
  }

  @Get('formateur/courses')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.read')
  getFormateurCourses(@Req() request: AuthenticatedRequest) {
    return this.formateurCourseProgramService.getCourses(request.auth?.user ?? null);
  }

  @Get('formateur/course-wizard-draft')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.read')
  getFormateurCourseWizardDraft(@Req() request: AuthenticatedRequest) {
    return this.formateurCourseProgramService.getWizardDraft(request.auth?.user ?? null);
  }

  @Put('formateur/course-wizard-draft')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  saveFormateurCourseWizardDraft(
    @Req() request: AuthenticatedRequest,
    @Body() payload: unknown,
  ) {
    return this.formateurCourseProgramService.saveWizardDraft(payload, request.auth?.user ?? null);
  }

  @Delete('formateur/course-wizard-draft')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  clearFormateurCourseWizardDraft(@Req() request: AuthenticatedRequest) {
    return this.formateurCourseProgramService.clearWizardDraft(request.auth?.user ?? null);
  }

  @Post('formateur/courses/bundle')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  createFormateurCourseBundle(
    @Req() request: AuthenticatedRequest,
    @Body() payload: unknown,
  ) {
    return this.formateurCourseProgramService.createBundle(payload, request.auth?.user ?? null);
  }

  @Patch('formateur/courses/:courseId')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  updateFormateurCourse(
    @Req() request: AuthenticatedRequest,
    @Param('courseId') courseId: string,
    @Body() payload: unknown,
  ) {
    return this.formateurCourseProgramService.updateCourse(courseId, payload, request.auth?.user ?? null);
  }

  @Patch('formateur/courses/:courseId/workflow')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  updateFormateurCourseWorkflow(
    @Req() request: AuthenticatedRequest,
    @Param('courseId') courseId: string,
    @Body() payload: unknown,
  ) {
    return this.formateurCourseProgramService.updateWorkflow(courseId, payload, request.auth?.user ?? null);
  }

  @Delete('formateur/courses/:courseId')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  deleteFormateurCourse(
    @Req() request: AuthenticatedRequest,
    @Param('courseId') courseId: string,
  ) {
    return this.formateurCourseProgramService.deleteCourse(courseId, request.auth?.user ?? null);
  }

  @Get('formateur/courses/:courseId/program')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.read')
  getFormateurCourseProgram(
    @Req() request: AuthenticatedRequest,
    @Param('courseId') courseId: string,
  ) {
    return this.formateurCourseProgramService.getProgram(courseId, request.auth?.user ?? null);
  }

  @Post('formateur/courses/:courseId/sections')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  createFormateurCourseSection(
    @Req() request: AuthenticatedRequest,
    @Param('courseId') courseId: string,
    @Body() payload: unknown,
  ) {
    return this.formateurCourseProgramService.saveSection(courseId, payload, request.auth?.user ?? null);
  }

  @Patch('formateur/courses/:courseId/sections/:sectionId')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  updateFormateurCourseSection(
    @Req() request: AuthenticatedRequest,
    @Param('courseId') courseId: string,
    @Param('sectionId') sectionId: string,
    @Body() payload: unknown,
  ) {
    return this.formateurCourseProgramService.saveSection(courseId, payload, request.auth?.user ?? null, sectionId);
  }

  @Delete('formateur/courses/:courseId/sections/:sectionId')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  deleteFormateurCourseSection(
    @Req() request: AuthenticatedRequest,
    @Param('courseId') courseId: string,
    @Param('sectionId') sectionId: string,
  ) {
    return this.formateurCourseProgramService.deleteSection(courseId, sectionId, request.auth?.user ?? null);
  }

  @Patch('formateur/courses/:courseId/sections/actions/reorder')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  reorderFormateurCourseSections(
    @Req() request: AuthenticatedRequest,
    @Param('courseId') courseId: string,
    @Body() payload: unknown,
  ) {
    return this.formateurCourseProgramService.reorderSections(courseId, payload, request.auth?.user ?? null);
  }

  @Post('formateur/courses/:courseId/lessons')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  createFormateurCourseLesson(
    @Req() request: AuthenticatedRequest,
    @Param('courseId') courseId: string,
    @Body() payload: unknown,
  ) {
    return this.formateurCourseProgramService.saveLesson(courseId, payload, request.auth?.user ?? null);
  }

  @Patch('formateur/courses/:courseId/lessons/:lessonId')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  updateFormateurCourseLesson(
    @Req() request: AuthenticatedRequest,
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
    @Body() payload: unknown,
  ) {
    return this.formateurCourseProgramService.saveLesson(courseId, payload, request.auth?.user ?? null, lessonId);
  }

  @Delete('formateur/courses/:courseId/lessons/:lessonId')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  deleteFormateurCourseLesson(
    @Req() request: AuthenticatedRequest,
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
  ) {
    return this.formateurCourseProgramService.deleteLesson(courseId, lessonId, request.auth?.user ?? null);
  }

  @Patch('formateur/courses/:courseId/lessons/actions/reorder')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  reorderFormateurCourseLessons(
    @Req() request: AuthenticatedRequest,
    @Param('courseId') courseId: string,
    @Body() payload: unknown,
  ) {
    return this.formateurCourseProgramService.reorderLessons(courseId, payload, request.auth?.user ?? null);
  }

  @Post('formateur/courses/:courseId/assets')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  createFormateurLessonAsset(
    @Req() request: AuthenticatedRequest,
    @Param('courseId') courseId: string,
    @Body() payload: unknown,
  ) {
    return this.formateurCourseProgramService.saveAsset(courseId, payload, request.auth?.user ?? null);
  }

  @Patch('formateur/courses/:courseId/assets/:assetId')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  updateFormateurLessonAsset(
    @Req() request: AuthenticatedRequest,
    @Param('courseId') courseId: string,
    @Param('assetId') assetId: string,
    @Body() payload: unknown,
  ) {
    return this.formateurCourseProgramService.saveAsset(courseId, payload, request.auth?.user ?? null, assetId);
  }

  @Delete('formateur/courses/:courseId/assets/:assetId')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  deleteFormateurLessonAsset(
    @Req() request: AuthenticatedRequest,
    @Param('courseId') courseId: string,
    @Param('assetId') assetId: string,
  ) {
    return this.formateurCourseProgramService.deleteAsset(courseId, assetId, request.auth?.user ?? null);
  }

  @Get('formateur/certificates')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.read')
  getFormateurCertificates(@Req() request: AuthenticatedRequest) {
    return this.formateurLearnersService.getCertificates(request.auth?.user ?? null);
  }

  @Patch('formateur/certificates/:certId/issue')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  issueFormateurCertificate(
    @Req() request: AuthenticatedRequest,
    @Param('certId') certId: string,
  ) {
    return this.formateurLearnersService.issueCertificate(certId, request.auth?.user ?? null);
  }

  @Delete('formateur/certificates/:certId')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  deleteFormateurCertificate(
    @Req() request: AuthenticatedRequest,
    @Param('certId') certId: string,
  ) {
    return this.formateurLearnersService.deleteCertificate(certId, request.auth?.user ?? null);
  }

  @Get('formateur/learners')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.read')
  getFormateurLearners(@Req() request: AuthenticatedRequest) {
    return this.formateurLearnersService.getLearners(request.auth?.user ?? null);
  }

  @Get('formateur/learners/:studentId')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.read')
  getFormateurLearnerDetail(
    @Req() request: AuthenticatedRequest,
    @Param('studentId') studentId: string,
  ) {
    return this.formateurLearnersService.getLearnerDetail(studentId, request.auth?.user ?? null);
  }

  @Get('formateur/evaluations')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.read')
  getFormateurEvaluationsSnapshot(@Req() request: AuthenticatedRequest) {
    return this.learningService.getFormateurEvaluationsSnapshot(request.auth?.user ?? null);
  }

  @Post('formateur/exams')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  createFormateurExam(
    @Req() request: AuthenticatedRequest,
    @Body() payload: unknown,
  ) {
    return this.learningService.createFormateurExam(payload, request.auth?.user ?? null);
  }

  @Delete('formateur/exams/:examId')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  deleteFormateurExam(
    @Req() request: AuthenticatedRequest,
    @Param('examId') examId: string,
  ) {
    return this.learningService.deleteFormateurExam(examId, request.auth?.user ?? null);
  }

  @Get('formateur/exams/:examId/quiz')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.read')
  getFormateurQuizStructure(
    @Req() request: AuthenticatedRequest,
    @Param('examId') examId: string,
  ) {
    return this.learningService.getFormateurQuizStructure(examId, request.auth?.user ?? null);
  }

  @Post('formateur/exams/:examId/quiz/questions')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  createFormateurQuizQuestion(
    @Req() request: AuthenticatedRequest,
    @Param('examId') examId: string,
    @Body() payload: unknown,
  ) {
    return this.learningService.createFormateurQuizQuestion(examId, payload, request.auth?.user ?? null);
  }

  @Patch('formateur/quiz/questions/:questionId')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  updateFormateurQuizQuestion(
    @Req() request: AuthenticatedRequest,
    @Param('questionId') questionId: string,
    @Body() payload: unknown,
  ) {
    return this.learningService.updateFormateurQuizQuestion(questionId, payload, request.auth?.user ?? null);
  }

  @Delete('formateur/quiz/questions/:questionId')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  deleteFormateurQuizQuestion(
    @Req() request: AuthenticatedRequest,
    @Param('questionId') questionId: string,
  ) {
    return this.learningService.deleteFormateurQuizQuestion(questionId, request.auth?.user ?? null);
  }

  @Patch('formateur/exams/:examId/quiz/questions/reorder')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  reorderFormateurQuizQuestion(
    @Req() request: AuthenticatedRequest,
    @Param('examId') examId: string,
    @Body() payload: unknown,
  ) {
    return this.learningService.reorderFormateurQuizQuestion(examId, payload, request.auth?.user ?? null);
  }

  @Post('formateur/exams/:examId/quiz/choices')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  createFormateurQuizChoice(
    @Req() request: AuthenticatedRequest,
    @Param('examId') examId: string,
    @Body() payload: unknown,
  ) {
    return this.learningService.createFormateurQuizChoice(examId, payload, request.auth?.user ?? null);
  }

  @Patch('formateur/quiz/choices/:choiceId')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  updateFormateurQuizChoice(
    @Req() request: AuthenticatedRequest,
    @Param('choiceId') choiceId: string,
    @Body() payload: unknown,
  ) {
    return this.learningService.updateFormateurQuizChoice(choiceId, payload, request.auth?.user ?? null);
  }

  @Delete('formateur/exams/:examId/quiz/choices/:choiceId')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  deleteFormateurQuizChoice(
    @Req() request: AuthenticatedRequest,
    @Param('examId') examId: string,
    @Param('choiceId') choiceId: string,
  ) {
    return this.learningService.deleteFormateurQuizChoice(examId, choiceId, request.auth?.user ?? null);
  }

  @Patch('formateur/exams/:examId/quiz/choices/reorder')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  reorderFormateurQuizChoice(
    @Req() request: AuthenticatedRequest,
    @Param('examId') examId: string,
    @Body() payload: unknown,
  ) {
    return this.learningService.reorderFormateurQuizChoice(examId, payload, request.auth?.user ?? null);
  }

  @Patch('formateur/submissions/:submissionId/grade')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  gradeFormateurSubmission(
    @Req() request: AuthenticatedRequest,
    @Param('submissionId') submissionId: string,
    @Body() payload: unknown,
  ) {
    return this.learningService.gradeFormateurSubmission(submissionId, payload, request.auth?.user ?? null);
  }

  @Get('formateur/virtual-classes')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.read')
  getFormateurVirtualClassesSnapshot(@Req() request: AuthenticatedRequest) {
    return this.formateurVirtualClassesService.getSnapshot(request.auth?.user ?? null);
  }

  @Post('formateur/virtual-classes')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  createFormateurVirtualClass(
    @Req() request: AuthenticatedRequest,
    @Body() payload: unknown,
  ) {
    return this.formateurVirtualClassesService.create(payload, request.auth?.user ?? null);
  }

  @Patch('formateur/virtual-classes/:classId')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  updateFormateurVirtualClass(
    @Req() request: AuthenticatedRequest,
    @Param('classId') classId: string,
    @Body() payload: unknown,
  ) {
    return this.formateurVirtualClassesService.update(classId, payload, request.auth?.user ?? null);
  }

  @Patch('formateur/virtual-classes/:classId/status')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  updateFormateurVirtualClassStatus(
    @Req() request: AuthenticatedRequest,
    @Param('classId') classId: string,
    @Body() payload: unknown,
  ) {
    return this.formateurVirtualClassesService.updateStatus(classId, payload, request.auth?.user ?? null);
  }

  @Delete('formateur/virtual-classes/:classId')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  deleteFormateurVirtualClass(
    @Req() request: AuthenticatedRequest,
    @Param('classId') classId: string,
  ) {
    return this.formateurVirtualClassesService.delete(classId, request.auth?.user ?? null);
  }

  @Get('formateur/community')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.read')
  getFormateurCommunitySnapshot(@Req() request: AuthenticatedRequest) {
    return this.formateurCommunityService.getSnapshot(request.auth?.user ?? null);
  }

  @Patch('formateur/community/comments/:commentId')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  moderateFormateurCommunityComment(
    @Req() request: AuthenticatedRequest,
    @Param('commentId') commentId: string,
    @Body() payload: unknown,
  ) {
    return this.formateurCommunityService.moderateComment(commentId, payload, request.auth?.user ?? null);
  }

  @Post('formateur/community/comments/:commentId/replies')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  replyToFormateurCommunityComment(
    @Req() request: AuthenticatedRequest,
    @Param('commentId') commentId: string,
    @Body() payload: unknown,
  ) {
    return this.formateurCommunityService.replyToComment(commentId, payload, request.auth?.user ?? null);
  }

  @Delete('formateur/community/comments/:commentId')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  deleteFormateurCommunityComment(
    @Req() request: AuthenticatedRequest,
    @Param('commentId') commentId: string,
  ) {
    return this.formateurCommunityService.deleteComment(commentId, request.auth?.user ?? null);
  }

  @Post('formateur/community/faqs')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  createFormateurCommunityFaq(
    @Req() request: AuthenticatedRequest,
    @Body() payload: unknown,
  ) {
    return this.formateurCommunityService.createFaq(payload, request.auth?.user ?? null);
  }

  @Patch('formateur/community/faqs/:faqId')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  updateFormateurCommunityFaq(
    @Req() request: AuthenticatedRequest,
    @Param('faqId') faqId: string,
    @Body() payload: unknown,
  ) {
    return this.formateurCommunityService.updateFaq(faqId, payload, request.auth?.user ?? null);
  }

  @Delete('formateur/community/faqs/:faqId')
  @UseGuards(PermissionGuard)
  @RequirePermission('data.learning.write')
  deleteFormateurCommunityFaq(
    @Req() request: AuthenticatedRequest,
    @Param('faqId') faqId: string,
  ) {
    return this.formateurCommunityService.deleteFaq(faqId, request.auth?.user ?? null);
  }
}
