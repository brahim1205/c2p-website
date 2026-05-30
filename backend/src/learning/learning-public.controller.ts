import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LearningAccessService } from './learning-access.service.js';

@ApiTags('learning')
@Controller('learning')
export class LearningPublicController {
  constructor(
    private readonly learningAccessService: LearningAccessService,
  ) {}

  @Get('public/instructors/:instructorId/courses')
  getPublicInstructorCourses(@Param('instructorId') instructorId: string) {
    return this.learningAccessService.getPublicInstructorCourses(instructorId);
  }

  @Get('public/courses')
  getPublicCourses() {
    return this.learningAccessService.getPublicCourses();
  }

  @Get('public/courses/:courseId')
  getPublicCourseDetail(@Param('courseId') courseId: string) {
    return this.learningAccessService.getPublicCourseDetail(courseId);
  }

  @Get('public/virtual-classes/:classId')
  getPublicVirtualClassDetail(@Param('classId') classId: string) {
    return this.learningAccessService.getPublicVirtualClassDetail(classId);
  }
}
