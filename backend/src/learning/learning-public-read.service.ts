import { Injectable } from '@nestjs/common';
import type { LearningCourse, LearningCourseLesson, LearningCourseReview, LearningCourseSection, LearningVirtualClass, Prisma } from '@prisma/client';
import { findUserById } from '../auth/auth.store.js';
import { PrismaService } from '../database/prisma.service.js';
import {
  normalizeCourseBranch,
  normalizeCourseLevel,
  parseBoolean,
  requireNumberOrFallback,
  toNumber,
  trimText,
} from '../data/data-normalizers.js';
import type { Row } from '../data/mock-store.js';

type CourseDetail = {
  course: Row | null;
  sections: Row[];
  lessons: Row[];
  reviews: Row[];
  virtualClasses: Row[];
};

type VirtualClassDetail = {
  virtualClass: Row | null;
  course: Row | null;
  sections: Row[];
  lessons: Row[];
};

@Injectable()
export class LearningPublicReadService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicCourses() {
    if (!(await this.hasProjection())) return null;
    const [courses, sections, lessons, reviews] = await Promise.all([
      this.prisma.learningCourse.findMany({ where: { source: 'app_row', status: 'published' } }),
      this.prisma.learningCourseSection.findMany({ where: { source: 'app_row' } }),
      this.prisma.learningCourseLesson.findMany({ where: { source: 'app_row' } }),
      this.prisma.learningCourseReview.findMany({ where: { source: 'app_row', status: 'published' } }),
    ]);
    return courses
      .map((course) => this.mapCourse(course, sections, lessons, reviews))
      .sort((left, right) => {
        const studentDelta = (toNumber(right.students_count) ?? 0) - (toNumber(left.students_count) ?? 0);
        return studentDelta || this.compareDatesDesc(left.updated_at ?? left.created_at, right.updated_at ?? right.created_at);
      });
  }

  async getPublicInstructorCourses(instructorId: string) {
    if (!(await this.hasProjection())) return null;
    const [courses, sections, lessons, reviews] = await Promise.all([
      this.prisma.learningCourse.findMany({
        where: { source: 'app_row', status: 'published', instructorId: String(instructorId) },
      }),
      this.prisma.learningCourseSection.findMany({ where: { source: 'app_row', instructorId: String(instructorId) } }),
      this.prisma.learningCourseLesson.findMany({ where: { source: 'app_row', instructorId: String(instructorId) } }),
      this.prisma.learningCourseReview.findMany({ where: { source: 'app_row', status: 'published' } }),
    ]);
    return courses
      .map((course) => this.mapCourse(course, sections, lessons, reviews))
      .sort((left, right) => this.compareDatesDesc(left.updated_at ?? left.created_at, right.updated_at ?? right.created_at));
  }

  async getPublicCourseDetail(courseId: string): Promise<CourseDetail | null> {
    if (!(await this.hasProjection())) return null;
    const course = await this.prisma.learningCourse.findFirst({
      where: { id: String(courseId), source: 'app_row', status: 'published' },
    });
    if (!course) return { course: null, sections: [], lessons: [], reviews: [], virtualClasses: [] };
    const [allSections, allLessons, reviews, virtualClasses] = await Promise.all([
      this.prisma.learningCourseSection.findMany({ where: { source: 'app_row', courseId: String(courseId), NOT: { status: 'archived' } } }),
      this.prisma.learningCourseLesson.findMany({ where: { source: 'app_row', courseId: String(courseId), isPreview: true, NOT: { status: 'archived' } } }),
      this.prisma.learningCourseReview.findMany({ where: { source: 'app_row', courseId: String(courseId), status: 'published' } }),
      this.prisma.learningVirtualClass.findMany({ where: { source: 'app_row', courseId: String(courseId), NOT: { status: 'archived' } } }),
    ]);
    const visibleSectionIds = new Set(allLessons.map((lesson) => String(lesson.sectionId ?? '')));
    const sections = allSections.filter((section) => visibleSectionIds.has(String(section.id)));
    const mappedCourse = this.mapCourse(course, sections, allLessons, reviews);
    return {
      course: mappedCourse,
      sections: sections.map((section) => this.mapSection(section, mappedCourse, allLessons)).sort((left, right) => this.position(left) - this.position(right)),
      lessons: allLessons.map((lesson) => this.mapLesson(lesson, mappedCourse, sections)).sort((left, right) => this.position(left) - this.position(right)),
      reviews: reviews.map((review) => this.mapReview(review, mappedCourse)).sort((left, right) => this.compareDatesDesc(left.created_at, right.created_at)),
      virtualClasses: virtualClasses.map((row) => this.mapPublicVirtualClass(row, mappedCourse)).sort((left, right) => this.compareDatesDesc(left.class_date ?? left.created_at, right.class_date ?? right.created_at)),
    };
  }

  async getPublicVirtualClassDetail(classId: string): Promise<VirtualClassDetail | null> {
    if (!(await this.hasProjection())) return null;
    const virtualClass = await this.prisma.learningVirtualClass.findFirst({
      where: {
        id: String(classId),
        source: 'app_row',
        NOT: { status: 'archived' },
      },
    });
    if (!virtualClass) return { virtualClass: null, course: null, sections: [], lessons: [] };
    const courseId = String(virtualClass.courseId);
    const [course, sections, lessons] = await Promise.all([
      this.prisma.learningCourse.findFirst({ where: { id: courseId, source: 'app_row', status: 'published' } }),
      this.prisma.learningCourseSection.findMany({ where: { source: 'app_row', courseId, NOT: { status: 'archived' } } }),
      this.prisma.learningCourseLesson.findMany({ where: { source: 'app_row', courseId, isPreview: true, NOT: { status: 'archived' } } }),
    ]);
    if (!course) return { virtualClass: null, course: null, sections: [], lessons: [] };
    const visibleSectionIds = new Set(lessons.map((lesson) => String(lesson.sectionId ?? '')));
    const visibleSections = sections.filter((section) => visibleSectionIds.has(String(section.id)));
    const mappedCourse = this.mapCourse(course, visibleSections, lessons, []);
    return {
      virtualClass: this.mapPublicVirtualClass(virtualClass, mappedCourse),
      course: mappedCourse,
      sections: visibleSections.map((row) => this.mapSection(row, mappedCourse, lessons)).sort((left, right) => this.position(left) - this.position(right)),
      lessons: lessons.map((row) => this.mapLesson(row, mappedCourse, visibleSections)).sort((left, right) => this.position(left) - this.position(right)),
    };
  }

  private async hasProjection() {
    return (await this.prisma.learningCourse.count({ where: { source: 'app_row' } })) > 0;
  }

  private mapCourse(
    course: LearningCourse,
    sections: Array<{ courseId: string }>,
    lessons: Array<{ courseId: string; isPreview?: boolean | null; status?: string | null }>,
    reviews: Array<{ courseId: string }>,
  ): Row {
    const row = this.metadataRow(course.metadata);
    row.id = this.idValue(row.id ?? course.id);
    row.title = course.title;
    row.category = course.category;
    row.program_branch = normalizeCourseBranch(course.programBranch ?? row.program_branch) ?? 'form_actions';
    row.level = normalizeCourseLevel(course.level ?? row.level) ?? 'intermediate';
    row.description = course.description;
    row.instructor_id = course.instructorId;
    row.delivery_mode = this.deliveryMode(course.deliveryMode ?? row.delivery_mode);
    row.modules = course.modules;
    row.duration = course.duration;
    row.price = course.price ?? 0;
    row.rating = course.rating;
    row.students_count = course.studentsCount;
    row.completion_rate = course.completionRate;
    row.revenue = course.revenue;
    row.thumbnail = course.thumbnail;
    row.status = course.status;
    row.created_at = this.iso(row.created_at, course.createdAt);
    row.updated_at = this.iso(row.updated_at, course.updatedAt);
    return this.hydrateCourse(row, sections, lessons, reviews);
  }

  private mapSection(section: LearningCourseSection, course: Row, lessons: Array<{ sectionId?: string | null }>): Row {
    const row = this.metadataRow(section.metadata);
    row.id = this.idValue(row.id ?? section.id);
    row.course_id = this.idValue(row.course_id ?? section.courseId);
    row.instructor_id = section.instructorId ?? course.instructor_id ?? null;
    row.title = section.title;
    row.description = section.description;
    row.position = section.position;
    row.status = section.status;
    row.created_at = this.iso(row.created_at, section.createdAt);
    row.updated_at = this.iso(row.updated_at, section.updatedAt);
    row.course_name = row.course_name ?? course.title ?? null;
    row.lessons_count = row.lessons_count ?? lessons.filter((lesson) => String(lesson.sectionId) === String(section.id)).length;
    return row;
  }

  private mapLesson(lesson: LearningCourseLesson, course: Row, sections: Array<{ id: string; title: string }>): Row {
    const row = this.metadataRow(lesson.metadata);
    row.id = this.idValue(row.id ?? lesson.id);
    row.course_id = this.idValue(row.course_id ?? lesson.courseId);
    row.section_id = lesson.sectionId ? this.idValue(row.section_id ?? lesson.sectionId) : null;
    row.instructor_id = lesson.instructorId ?? course.instructor_id ?? null;
    row.title = lesson.title;
    row.description = lesson.description;
    row.type = lesson.lessonType ?? row.type ?? row.lesson_type ?? null;
    row.duration = lesson.duration;
    row.is_preview = Boolean(lesson.isPreview);
    row.position = lesson.position;
    row.status = lesson.status;
    row.created_at = this.iso(row.created_at, lesson.createdAt);
    row.updated_at = this.iso(row.updated_at, lesson.updatedAt);
    row.course_name = row.course_name ?? course.title ?? null;
    row.section_title = row.section_title ?? sections.find((section) => String(section.id) === String(lesson.sectionId))?.title ?? null;
    return row;
  }

  private mapReview(review: LearningCourseReview, course: Row): Row {
    const row = this.metadataRow(review.metadata);
    row.id = this.idValue(row.id ?? review.id);
    row.course_id = this.idValue(row.course_id ?? review.courseId);
    row.student_id = review.studentId;
    row.student_name = review.studentName;
    row.student_avatar = trimText(review.studentAvatar);
    row.rating = review.rating;
    row.comment = review.comment;
    row.status = review.status;
    row.created_at = this.iso(row.created_at, review.createdAt);
    row.updated_at = this.iso(row.updated_at, review.updatedAt);
    row.course_name = row.course_name ?? course.title ?? null;
    return row;
  }

  private mapVirtualClass(virtualClass: LearningVirtualClass, course: Row | null): Row {
    const row = this.metadataRow(virtualClass.metadata);
    row.id = this.idValue(row.id ?? virtualClass.id);
    row.course_id = this.idValue(row.course_id ?? virtualClass.courseId);
    row.title = virtualClass.title;
    row.course_name = virtualClass.courseName ?? course?.title ?? null;
    row.class_date = virtualClass.classDate;
    row.class_time = virtualClass.classTime;
    row.duration = virtualClass.duration;
    row.students_count = virtualClass.studentsCount;
    row.max_students = virtualClass.maxStudents;
    row.provider = virtualClass.provider;
    row.meeting_slug = virtualClass.meetingSlug;
    row.recording_enabled = virtualClass.recordingEnabled;
    row.recording_status = virtualClass.recordingStatus;
    row.status = virtualClass.status;
    row.recording_url = virtualClass.recordingUrl;
    row.room_link = virtualClass.roomLink;
    row.started_at = this.iso(row.started_at, virtualClass.startedAt);
    row.ended_at = this.iso(row.ended_at, virtualClass.endedAt);
    row.created_at = this.iso(row.created_at, virtualClass.createdAt);
    row.updated_at = this.iso(row.updated_at, virtualClass.updatedAt);
    return row;
  }

  private mapPublicVirtualClass(virtualClass: LearningVirtualClass, course: Row | null) {
    const row = this.mapVirtualClass(virtualClass, course);
    delete row.meeting_slug;
    delete row.room_link;
    delete row.recording_url;
    return row;
  }

  private hydrateCourse(row: Row, sections: Array<{ courseId: string }>, lessons: Array<{ courseId: string; isPreview?: boolean | null; status?: string | null }>, reviews: Array<{ courseId: string }>) {
    const basePrice = requireNumberOrFallback(row.price, 0);
    const promotionPercentage = requireNumberOrFallback(row.promotion_percentage, 0);
    const isFree = parseBoolean(row.is_free, basePrice <= 0);
    const instructor = findUserById(trimText(row.instructor_id) ?? '');
    row.instructor_name = row.instructor_name ?? (instructor ? `${instructor.firstName} ${instructor.lastName}`.trim() : null);
    row.is_free = isFree;
    row.access_type = row.access_type ?? (isFree ? 'free' : 'paid');
    row.promotion_percentage = Math.max(0, Math.min(100, promotionPercentage));
    row.trailer_url = trimText(row.trailer_url);
    row.price = isFree ? 0 : basePrice;
    row.current_price = isFree ? 0 : Math.max(0, Math.round(basePrice * (1 - ((toNumber(row.promotion_percentage) ?? 0) / 100))));
    row.views = row.views ?? Math.max((toNumber(row.students_count) ?? 0) * 6, 0);
    row.sections_count = row.sections_count ?? sections.filter((section) => String(section.courseId) === String(row.id)).length;
    row.lessons_count = row.lessons_count ?? lessons.filter((lesson) => String(lesson.courseId) === String(row.id)).length;
    row.preview_lessons_count = row.preview_lessons_count ?? lessons.filter((lesson) => String(lesson.courseId) === String(row.id) && Boolean(lesson.isPreview)).length;
    row.published_lessons_count = row.published_lessons_count ?? lessons.filter((lesson) => String(lesson.courseId) === String(row.id) && String(lesson.status ?? 'published') === 'published').length;
    row.reviews_count = row.reviews_count ?? reviews.filter((review) => String(review.courseId) === String(row.id)).length;
    row.reviews = row.reviews ?? row.reviews_count;
    return row;
  }

  private metadataRow(metadata: Prisma.JsonValue | null): Row {
    return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? structuredClone(metadata as Record<string, unknown>)
      : {};
  }

  private deliveryMode(value: unknown) {
    const mode = trimText(value) ?? 'online';
    return new Set(['online', 'onsite', 'hybrid']).has(mode) ? mode : 'online';
  }

  private idValue(value: unknown) {
    const numberValue = Number(value);
    return Number.isSafeInteger(numberValue) ? numberValue : String(value);
  }

  private iso(value: unknown, fallback?: Date | null) {
    if (typeof value === 'string' && value.trim()) return value;
    return fallback ? fallback.toISOString() : null;
  }

  private position(row: Row) {
    return toNumber(row.position) ?? 0;
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
