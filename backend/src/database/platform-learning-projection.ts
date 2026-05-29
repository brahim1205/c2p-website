import type { Prisma } from '@prisma/client';
import type { Row } from '../data/mock-store.js';

export type LearningRowsByTable = {
  courses: Row[];
  course_sections: Row[];
  course_lessons: Row[];
  course_reviews: Row[];
  virtual_classes: Row[];
};

export async function persistLearningProjection(tx: Prisma.TransactionClient, rowsByTable: LearningRowsByTable) {
  await persistCourses(tx, rowsByTable.courses);
  await persistCourseSections(tx, rowsByTable.course_sections);
  await persistCourseLessons(tx, rowsByTable.course_lessons);
  await persistCourseReviews(tx, rowsByTable.course_reviews);
  await persistVirtualClasses(tx, rowsByTable.virtual_classes);
}

export async function deleteLearningProjection(tx: Prisma.TransactionClient, removalsByTable: LearningRowsByTableRemovals) {
  if (removalsByTable.virtual_classes.length) {
    await tx.learningVirtualClass.deleteMany({ where: { id: { in: removalsByTable.virtual_classes } } });
  }
  if (removalsByTable.course_reviews.length) {
    await tx.learningCourseReview.deleteMany({ where: { id: { in: removalsByTable.course_reviews } } });
  }
  if (removalsByTable.course_lessons.length) {
    await tx.learningCourseLesson.deleteMany({ where: { id: { in: removalsByTable.course_lessons } } });
  }
  if (removalsByTable.course_sections.length) {
    await tx.learningCourseSection.deleteMany({ where: { id: { in: removalsByTable.course_sections } } });
  }
  if (removalsByTable.courses.length) {
    await tx.learningCourse.deleteMany({ where: { id: { in: removalsByTable.courses } } });
  }
}

type LearningRowsByTableRemovals = {
  courses: string[];
  course_sections: string[];
  course_lessons: string[];
  course_reviews: string[];
  virtual_classes: string[];
};

async function persistCourses(tx: Prisma.TransactionClient, rows: Row[]) {
  for (const row of rows) {
    const data: Prisma.LearningCourseCreateInput = {
      id: toString(row.id),
      title: toString(row.title, 'Formation'),
      category: toNullableString(row.category),
      programBranch: toNullableString(row.program_branch),
      level: toNullableString(row.level),
      description: toNullableString(row.description),
      instructorId: toNullableString(row.instructor_id),
      deliveryMode: toNullableString(row.delivery_mode),
      modules: toInt(row.modules),
      duration: toNullableString(row.duration),
      price: parseAmount(row.price),
      rating: toFloat(row.rating),
      studentsCount: toInt(row.students_count),
      completionRate: toFloat(row.completion_rate),
      revenue: parseAmount(row.revenue) ?? 0,
      thumbnail: toNullableString(row.thumbnail),
      status: toString(row.status, 'draft'),
      metadata: toJson(row),
      source: 'app_row',
      createdAt: toDate(row.created_at ?? row.updated_at) ?? new Date(),
      updatedAt: toDate(row.updated_at ?? row.created_at) ?? new Date(),
    };
    const { id, createdAt, source: _source, ...update } = data;
    await tx.learningCourse.upsert({ where: { id }, create: data, update });
  }
}

async function persistCourseSections(tx: Prisma.TransactionClient, rows: Row[]) {
  for (const row of rows) {
    const data: Prisma.LearningCourseSectionCreateInput = {
      id: toString(row.id),
      courseId: toString(row.course_id),
      instructorId: toNullableString(row.instructor_id),
      title: toString(row.title, 'Section'),
      description: toNullableString(row.description),
      position: toInt(row.position),
      status: toString(row.status, 'draft'),
      metadata: toJson(row),
      source: 'app_row',
      createdAt: toDate(row.created_at ?? row.updated_at) ?? new Date(),
      updatedAt: toDate(row.updated_at ?? row.created_at) ?? new Date(),
    };
    const { id, createdAt, source: _source, ...update } = data;
    await tx.learningCourseSection.upsert({ where: { id }, create: data, update });
  }
}

async function persistCourseLessons(tx: Prisma.TransactionClient, rows: Row[]) {
  for (const row of rows) {
    const data: Prisma.LearningCourseLessonCreateInput = {
      id: toString(row.id),
      courseId: toString(row.course_id),
      sectionId: toNullableString(row.section_id),
      instructorId: toNullableString(row.instructor_id),
      title: toString(row.title, 'Lecon'),
      description: toNullableString(row.description),
      lessonType: toNullableString(row.type ?? row.lesson_type),
      position: toInt(row.position),
      duration: toNullableString(row.duration),
      isPreview: toBool(row.is_preview),
      status: toString(row.status, 'draft'),
      metadata: toJson(row),
      source: 'app_row',
      createdAt: toDate(row.created_at ?? row.updated_at) ?? new Date(),
      updatedAt: toDate(row.updated_at ?? row.created_at) ?? new Date(),
    };
    const { id, createdAt, source: _source, ...update } = data;
    await tx.learningCourseLesson.upsert({ where: { id }, create: data, update });
  }
}

async function persistCourseReviews(tx: Prisma.TransactionClient, rows: Row[]) {
  for (const row of rows) {
    const data: Prisma.LearningCourseReviewCreateInput = {
      id: toString(row.id),
      courseId: toString(row.course_id),
      studentId: toNullableString(row.student_id),
      studentName: toNullableString(row.student_name),
      studentAvatar: toNullableString(row.student_avatar),
      rating: toInt(row.rating),
      comment: toNullableString(row.comment),
      status: toString(row.status, 'published'),
      metadata: toJson(row),
      source: 'app_row',
      createdAt: toDate(row.created_at ?? row.updated_at) ?? new Date(),
      updatedAt: toDate(row.updated_at ?? row.created_at) ?? new Date(),
    };
    const { id, createdAt, source: _source, ...update } = data;
    await tx.learningCourseReview.upsert({ where: { id }, create: data, update });
  }
}

async function persistVirtualClasses(tx: Prisma.TransactionClient, rows: Row[]) {
  for (const row of rows) {
    const data: Prisma.LearningVirtualClassCreateInput = {
      id: toString(row.id),
      courseId: toString(row.course_id),
      title: toString(row.title, 'Classe virtuelle'),
      courseName: toNullableString(row.course_name),
      classDate: toNullableString(row.class_date),
      classTime: toNullableString(row.class_time),
      duration: toNullableString(row.duration),
      studentsCount: toInt(row.students_count),
      maxStudents: parseAmount(row.max_students),
      provider: toNullableString(row.provider),
      meetingSlug: toNullableString(row.meeting_slug),
      recordingEnabled: toBool(row.recording_enabled),
      recordingStatus: toNullableString(row.recording_status),
      status: toString(row.status, 'scheduled'),
      recordingUrl: toNullableString(row.recording_url),
      roomLink: toNullableString(row.room_link),
      startedAt: toDate(row.started_at),
      endedAt: toDate(row.ended_at),
      metadata: toJson(row),
      source: 'app_row',
      createdAt: toDate(row.created_at ?? row.updated_at) ?? new Date(),
      updatedAt: toDate(row.updated_at ?? row.created_at) ?? new Date(),
    };
    const { id, createdAt, source: _source, ...update } = data;
    await tx.learningVirtualClass.upsert({ where: { id }, create: data, update });
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function toJson(value: unknown) {
  return clone(value) as Prisma.InputJsonValue;
}

function toString(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function toNullableString(value: unknown) {
  const normalized = toString(value).trim();
  return normalized ? normalized : undefined;
}

function toDate(value: unknown) {
  if (!value) return undefined;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toBool(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return fallback;
}

function toInt(value: unknown, fallback = 0) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? Math.round(normalized) : fallback;
}

function toFloat(value: unknown, fallback = 0) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

function parseAmount(value: unknown) {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? Math.round(value) : undefined;
  const normalized = String(value).replace(/[^\d.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed) : undefined;
}
