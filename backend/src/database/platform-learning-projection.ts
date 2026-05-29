import type { Prisma } from '@prisma/client';
import type { Row } from '../data/mock-store.js';

export type LearningRowsByTable = {
  courses: Row[];
  course_sections: Row[];
  course_lessons: Row[];
  course_reviews: Row[];
  virtual_classes: Row[];
  course_enrollments: Row[];
  lesson_progress: Row[];
  exams: Row[];
  quiz_questions: Row[];
  quiz_choices: Row[];
  submissions: Row[];
  certificates: Row[];
};

export async function persistLearningProjection(tx: Prisma.TransactionClient, rowsByTable: LearningRowsByTable) {
  await persistCourses(tx, rowsByTable.courses);
  await persistCourseSections(tx, rowsByTable.course_sections);
  await persistCourseLessons(tx, rowsByTable.course_lessons);
  await persistCourseReviews(tx, rowsByTable.course_reviews);
  await persistVirtualClasses(tx, rowsByTable.virtual_classes);
  await persistCourseEnrollments(tx, rowsByTable.course_enrollments);
  await persistLessonProgress(tx, rowsByTable.lesson_progress);
  await persistExams(tx, rowsByTable.exams);
  await persistQuizQuestions(tx, rowsByTable.quiz_questions);
  await persistQuizChoices(tx, rowsByTable.quiz_choices);
  await persistSubmissions(tx, rowsByTable.submissions);
  await persistCertificates(tx, rowsByTable.certificates);
}

export async function deleteLearningProjection(tx: Prisma.TransactionClient, removalsByTable: LearningRowsByTableRemovals) {
  if (removalsByTable.certificates.length) {
    await tx.learningCertificate.deleteMany({ where: { id: { in: removalsByTable.certificates } } });
  }
  if (removalsByTable.submissions.length) {
    await tx.learningSubmission.deleteMany({ where: { id: { in: removalsByTable.submissions } } });
  }
  if (removalsByTable.quiz_choices.length) {
    await tx.learningQuizChoice.deleteMany({ where: { id: { in: removalsByTable.quiz_choices } } });
  }
  if (removalsByTable.quiz_questions.length) {
    await tx.learningQuizQuestion.deleteMany({ where: { id: { in: removalsByTable.quiz_questions } } });
  }
  if (removalsByTable.exams.length) {
    await tx.learningExam.deleteMany({ where: { id: { in: removalsByTable.exams } } });
  }
  if (removalsByTable.lesson_progress.length) {
    await tx.learningLessonProgress.deleteMany({ where: { id: { in: removalsByTable.lesson_progress } } });
  }
  if (removalsByTable.course_enrollments.length) {
    await tx.learningCourseEnrollment.deleteMany({ where: { id: { in: removalsByTable.course_enrollments } } });
  }
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
  course_enrollments: string[];
  lesson_progress: string[];
  exams: string[];
  quiz_questions: string[];
  quiz_choices: string[];
  submissions: string[];
  certificates: string[];
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

async function persistCourseEnrollments(tx: Prisma.TransactionClient, rows: Row[]) {
  for (const row of rows) {
    const data: Prisma.LearningCourseEnrollmentCreateInput = {
      id: toString(row.id),
      courseId: toString(row.course_id),
      courseName: toNullableString(row.course_name),
      courseCategory: toNullableString(row.course_category),
      courseLessonsCount: toInt(row.course_lessons_count),
      studentId: toString(row.student_id),
      studentName: toNullableString(row.student_name),
      studentEmail: toNullableString(row.student_email),
      studentAvatar: toNullableString(row.student_avatar),
      progress: toFloat(row.progress),
      grade: toNullableFloat(row.grade),
      status: toString(row.status, 'active'),
      lastActiveAt: toDate(row.last_active),
      enrolledAt: toDate(row.enrolled_at),
      metadata: toJson(row),
      source: 'app_row',
      createdAt: toDate(row.created_at ?? row.enrolled_at ?? row.updated_at) ?? new Date(),
      updatedAt: toDate(row.updated_at ?? row.last_active ?? row.enrolled_at ?? row.created_at) ?? new Date(),
    };
    const { id, createdAt, source: _source, ...update } = data;
    await tx.learningCourseEnrollment.upsert({ where: { id }, create: data, update });
  }
}

async function persistLessonProgress(tx: Prisma.TransactionClient, rows: Row[]) {
  for (const row of rows) {
    const data: Prisma.LearningLessonProgressCreateInput = {
      id: toString(row.id),
      courseId: toString(row.course_id),
      sectionId: toNullableString(row.section_id),
      lessonId: toString(row.lesson_id),
      studentId: toString(row.student_id),
      studentName: toNullableString(row.student_name),
      progress: toFloat(row.progress),
      completed: toBool(row.completed),
      bookmarked: toBool(row.bookmarked),
      note: toNullableString(row.note),
      videoPositionSeconds: toInt(row.video_position_seconds),
      status: toString(row.status, 'in_progress'),
      firstViewedAt: toDate(row.first_viewed_at),
      lastViewedAt: toDate(row.last_viewed_at),
      completedAt: toDate(row.completed_at),
      metadata: toJson(row),
      source: 'app_row',
      createdAt: toDate(row.created_at ?? row.first_viewed_at ?? row.last_viewed_at) ?? new Date(),
      updatedAt: toDate(row.updated_at ?? row.last_viewed_at ?? row.completed_at ?? row.first_viewed_at ?? row.created_at) ?? new Date(),
    };
    const { id, createdAt, source: _source, ...update } = data;
    await tx.learningLessonProgress.upsert({ where: { id }, create: data, update });
  }
}

async function persistExams(tx: Prisma.TransactionClient, rows: Row[]) {
  for (const row of rows) {
    const data: Prisma.LearningExamCreateInput = {
      id: toString(row.id),
      courseId: toString(row.course_id),
      courseName: toNullableString(row.course_name),
      instructorId: toNullableString(row.instructor_id),
      title: toString(row.title, 'Evaluation'),
      examType: toString(row.type, 'quiz'),
      examDate: toDate(row.exam_date),
      participants: toInt(row.participants),
      submitted: toInt(row.submitted),
      avgGrade: toNullableFloat(row.avg_grade),
      status: toString(row.status, 'upcoming'),
      maxGrade: toFloat(row.max_grade, 20),
      instructions: toNullableString(row.instructions),
      attachments: toOptionalJson(row.attachments),
      metadata: toJson(row),
      source: 'app_row',
      createdAt: toDate(row.created_at ?? row.exam_date) ?? new Date(),
      updatedAt: toDate(row.updated_at ?? row.created_at ?? row.exam_date) ?? new Date(),
    };
    const { id, createdAt, source: _source, ...update } = data;
    await tx.learningExam.upsert({ where: { id }, create: data, update });
  }
}

async function persistQuizQuestions(tx: Prisma.TransactionClient, rows: Row[]) {
  for (const row of rows) {
    const data: Prisma.LearningQuizQuestionCreateInput = {
      id: toString(row.id),
      examId: toString(row.exam_id),
      courseId: toNullableString(row.course_id),
      instructorId: toNullableString(row.instructor_id),
      prompt: toString(row.prompt, 'Question'),
      questionType: toString(row.type, 'single_choice'),
      points: toInt(row.points, 1),
      explanation: toNullableString(row.explanation),
      required: toBool(row.required, true),
      position: toInt(row.position),
      metadata: toJson(row),
      source: 'app_row',
      createdAt: toDate(row.created_at) ?? new Date(),
      updatedAt: toDate(row.updated_at ?? row.created_at) ?? new Date(),
    };
    const { id, createdAt, source: _source, ...update } = data;
    await tx.learningQuizQuestion.upsert({ where: { id }, create: data, update });
  }
}

async function persistQuizChoices(tx: Prisma.TransactionClient, rows: Row[]) {
  for (const row of rows) {
    const data: Prisma.LearningQuizChoiceCreateInput = {
      id: toString(row.id),
      questionId: toString(row.question_id),
      examId: toString(row.exam_id),
      courseId: toNullableString(row.course_id),
      instructorId: toNullableString(row.instructor_id),
      label: toString(row.label, 'Choix'),
      value: toNullableString(row.value),
      isCorrect: toBool(row.is_correct),
      position: toInt(row.position),
      metadata: toJson(row),
      source: 'app_row',
      createdAt: toDate(row.created_at) ?? new Date(),
      updatedAt: toDate(row.updated_at ?? row.created_at) ?? new Date(),
    };
    const { id, createdAt, source: _source, ...update } = data;
    await tx.learningQuizChoice.upsert({ where: { id }, create: data, update });
  }
}

async function persistSubmissions(tx: Prisma.TransactionClient, rows: Row[]) {
  for (const row of rows) {
    const data: Prisma.LearningSubmissionCreateInput = {
      id: toString(row.id),
      examId: toString(row.exam_id),
      courseId: toNullableString(row.course_id),
      studentId: toString(row.student_id),
      studentName: toNullableString(row.student_name),
      studentAvatar: toNullableString(row.student_avatar),
      submittedAt: toDate(row.submitted_at),
      grade: toNullableFloat(row.grade),
      feedback: toNullableString(row.feedback),
      status: toString(row.status, 'pending'),
      fileName: toNullableString(row.file_name),
      fileUrl: toNullableString(row.file_url),
      answers: toOptionalJson(row.answers),
      gradedAt: toDate(row.graded_at),
      metadata: toJson(row),
      source: 'app_row',
      createdAt: toDate(row.created_at ?? row.submitted_at) ?? new Date(),
      updatedAt: toDate(row.updated_at ?? row.graded_at ?? row.submitted_at ?? row.created_at) ?? new Date(),
    };
    const { id, createdAt, source: _source, ...update } = data;
    await tx.learningSubmission.upsert({ where: { id }, create: data, update });
  }
}

async function persistCertificates(tx: Prisma.TransactionClient, rows: Row[]) {
  for (const row of rows) {
    const data: Prisma.LearningCertificateCreateInput = {
      id: toString(row.id),
      studentId: toString(row.student_id),
      studentName: toNullableString(row.student_name),
      studentAvatar: toNullableString(row.student_avatar),
      courseId: toString(row.course_id),
      courseName: toNullableString(row.course_name),
      title: toNullableString(row.title),
      completionDate: toDate(row.completion_date),
      finalGrade: toNullableFloat(row.final_grade),
      grade: toNullableFloat(row.grade),
      status: toString(row.status, 'pending'),
      certificateId: toNullableString(row.certificate_id),
      certificateNumber: toNullableString(row.certificate_number),
      issuedAt: toDate(row.issued_at),
      metadata: toJson(row),
      source: 'app_row',
      createdAt: toDate(row.created_at ?? row.issued_at ?? row.completion_date) ?? new Date(),
      updatedAt: toDate(row.updated_at ?? row.issued_at ?? row.completion_date ?? row.created_at) ?? new Date(),
    };
    const { id, createdAt, source: _source, ...update } = data;
    await tx.learningCertificate.upsert({ where: { id }, create: data, update });
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function toJson(value: unknown) {
  return clone(value) as Prisma.InputJsonValue;
}

function toOptionalJson(value: unknown) {
  return value === null || value === undefined ? undefined : toJson(value);
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

function toNullableFloat(value: unknown) {
  if (value === null || value === undefined || value === '') return undefined;
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : undefined;
}

function parseAmount(value: unknown) {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? Math.round(value) : undefined;
  const normalized = String(value).replace(/[^\d.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed) : undefined;
}
