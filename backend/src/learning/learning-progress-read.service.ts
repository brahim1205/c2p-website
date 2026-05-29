import { Injectable } from '@nestjs/common';
import type { LearningCourseEnrollment, LearningLessonProgress, Prisma } from '@prisma/client';
import { isAdminRole, type AuthUser } from '../auth/auth.store.js';
import { PrismaService } from '../database/prisma.service.js';
import { toNumber, trimText } from '../data/data-normalizers.js';
import type { Row } from '../data/mock-store.js';

type CourseProgressContext = {
  enrollment: Row | null;
  lessonProgress: Row[];
};

@Injectable()
export class LearningProgressReadService {
  constructor(private readonly prisma: PrismaService) {}

  async getCourseContext(courseId: string, user: AuthUser): Promise<CourseProgressContext | null> {
    if (!(await this.hasProjection())) return null;
    const studentFilter = isAdminRole(user) ? {} : { studentId: String(user.id) };
    const [enrollment, lessonProgress] = await Promise.all([
      this.prisma.learningCourseEnrollment.findFirst({
        where: { source: 'app_row', courseId: String(courseId), ...studentFilter },
      }),
      this.prisma.learningLessonProgress.findMany({
        where: { source: 'app_row', courseId: String(courseId), ...studentFilter },
      }),
    ]);
    return {
      enrollment: enrollment ? this.mapEnrollment(enrollment) : null,
      lessonProgress: lessonProgress
        .map((row) => this.mapLessonProgress(row))
        .sort((left, right) => this.compareDatesDesc(left.last_viewed_at ?? left.created_at, right.last_viewed_at ?? right.created_at)),
    };
  }

  private async hasProjection() {
    const [enrollmentCount, progressCount] = await Promise.all([
      this.prisma.learningCourseEnrollment.count({ where: { source: 'app_row' } }),
      this.prisma.learningLessonProgress.count({ where: { source: 'app_row' } }),
    ]);
    return enrollmentCount > 0 || progressCount > 0;
  }

  private mapEnrollment(enrollment: LearningCourseEnrollment): Row {
    const row = this.metadataRow(enrollment.metadata);
    row.id = this.idValue(row.id ?? enrollment.id);
    row.course_id = this.idValue(row.course_id ?? enrollment.courseId);
    row.course_name = enrollment.courseName ?? row.course_name ?? null;
    row.course_category = enrollment.courseCategory ?? row.course_category ?? null;
    row.course_lessons_count = toNumber(row.course_lessons_count) ?? enrollment.courseLessonsCount;
    row.student_id = enrollment.studentId;
    row.student_name = enrollment.studentName;
    row.student_email = enrollment.studentEmail;
    row.student_avatar = trimText(enrollment.studentAvatar);
    row.progress = enrollment.progress;
    row.grade = enrollment.grade;
    row.status = enrollment.status;
    row.last_active = this.iso(row.last_active, enrollment.lastActiveAt);
    row.enrolled_at = this.iso(row.enrolled_at, enrollment.enrolledAt);
    row.created_at = this.iso(row.created_at, enrollment.createdAt);
    row.updated_at = this.iso(row.updated_at, enrollment.updatedAt);
    return row;
  }

  private mapLessonProgress(progress: LearningLessonProgress): Row {
    const row = this.metadataRow(progress.metadata);
    row.id = this.idValue(row.id ?? progress.id);
    row.course_id = this.idValue(row.course_id ?? progress.courseId);
    row.section_id = progress.sectionId ? this.idValue(row.section_id ?? progress.sectionId) : null;
    row.lesson_id = this.idValue(row.lesson_id ?? progress.lessonId);
    row.student_id = progress.studentId;
    row.student_name = progress.studentName;
    row.progress = progress.progress;
    row.completed = progress.completed;
    row.bookmarked = progress.bookmarked;
    row.note = progress.note;
    row.video_position_seconds = progress.videoPositionSeconds;
    row.status = progress.status;
    row.first_viewed_at = this.iso(row.first_viewed_at, progress.firstViewedAt);
    row.last_viewed_at = this.iso(row.last_viewed_at, progress.lastViewedAt);
    row.completed_at = this.iso(row.completed_at, progress.completedAt);
    row.created_at = this.iso(row.created_at, progress.createdAt);
    row.updated_at = this.iso(row.updated_at, progress.updatedAt);
    return row;
  }

  private metadataRow(metadata: Prisma.JsonValue | null): Row {
    return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? structuredClone(metadata as Record<string, unknown>)
      : {};
  }

  private idValue(value: unknown) {
    const numberValue = Number(value);
    return Number.isSafeInteger(numberValue) ? numberValue : String(value);
  }

  private iso(value: unknown, fallback?: Date | null) {
    if (typeof value === 'string' && value.trim()) return value;
    return fallback ? fallback.toISOString() : null;
  }

  private compareDatesDesc(left: unknown, right: unknown) {
    return this.dateTime(right) - this.dateTime(left);
  }

  private dateTime(value: unknown) {
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'string' || typeof value === 'number') return new Date(value).getTime();
    return 0;
  }
}
