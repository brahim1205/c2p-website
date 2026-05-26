import { findUserById } from '../auth/auth.store.js';
import { clone, findRow, getDaysSince, store } from './data-app-store.js';
import {
  normalizeCourseBranch,
  normalizeCourseLevel,
  parseBoolean,
  requireNumberOrFallback,
  toNumber,
  trimText,
} from './data-normalizers.js';
import type { Row } from './mock-store.js';

export function hydrateLearningRow(table: string, hydrated: Row) {
  if (table === 'courses') {
    const basePrice = requireNumberOrFallback(hydrated.price, 0);
    const promotionPercentage = requireNumberOrFallback(hydrated.promotion_percentage, 0);
    const isFree = parseBoolean(hydrated.is_free, basePrice <= 0);
    const instructor = findUserById(String(hydrated.instructor_id ?? ''));
    hydrated.level = normalizeCourseLevel(hydrated.level) ?? 'intermediate';
    hydrated.program_branch = normalizeCourseBranch(hydrated.program_branch) ?? 'form_actions';
    hydrated.delivery_mode = trimText(hydrated.delivery_mode) ?? 'online';
    if (!new Set(['online', 'onsite', 'hybrid']).has(String(hydrated.delivery_mode))) {
      hydrated.delivery_mode = 'online';
    }
    hydrated.instructor_name = hydrated.instructor_name ?? (instructor ? `${instructor.firstName} ${instructor.lastName}`.trim() : null);
    hydrated.is_free = isFree;
    hydrated.access_type = hydrated.access_type ?? (isFree ? 'free' : 'paid');
    hydrated.promotion_percentage = Math.max(0, Math.min(100, promotionPercentage));
    hydrated.trailer_url = trimText(hydrated.trailer_url);
    hydrated.price = isFree ? 0 : basePrice;
    hydrated.current_price = isFree
      ? 0
      : Math.max(0, Math.round(basePrice * (1 - ((toNumber(hydrated.promotion_percentage) ?? 0) / 100))));
    hydrated.views = hydrated.views ?? Math.max((toNumber(hydrated.students_count) ?? 0) * 6, 0);
    return hydrated;
  }

  if (table === 'student_guardians') {
    const student = findUserById(String(hydrated.student_id ?? ''));
    hydrated.student_name = hydrated.student_name ?? (student ? `${student.firstName} ${student.lastName}`.trim() : null);
    hydrated.student_avatar = hydrated.student_avatar ?? student?.avatar ?? null;
    hydrated.relationship = trimText(hydrated.relationship) ?? 'Parent';
    hydrated.status = trimText(hydrated.status) ?? 'active';
    hydrated.alert_channel = trimText(hydrated.alert_channel) ?? 'dashboard';
    return hydrated;
  }

  if (table === 'course_enrollments') {
    const course = findRow('courses', hydrated.course_id);
    hydrated.course_name = hydrated.course_name ?? course?.title ?? null;
    hydrated.course_category = hydrated.course_category ?? course?.category ?? null;
    hydrated.course_sections_count = hydrated.course_sections_count ?? Math.max(toNumber(course?.modules) ?? 0, 0);
    hydrated.course_lessons_count = hydrated.course_lessons_count ?? 0;
    hydrated.completed_sections_estimate = hydrated.completed_sections_estimate ?? 0;
    hydrated.remaining_sections_estimate = hydrated.remaining_sections_estimate ?? 0;
    hydrated.completed_lessons_estimate = hydrated.completed_lessons_estimate ?? 0;
    hydrated.remaining_lessons_estimate = hydrated.remaining_lessons_estimate ?? 0;
    hydrated.days_since_active = hydrated.days_since_active ?? getDaysSince(hydrated.last_active) ?? 0;
    hydrated.submissions_count = hydrated.submissions_count ?? 0;
    hydrated.graded_submissions_count = hydrated.graded_submissions_count ?? 0;
    hydrated.pending_grading_count = hydrated.pending_grading_count ?? 0;
    hydrated.avg_submission_grade = hydrated.avg_submission_grade ?? null;
    hydrated.latest_submission_at = hydrated.latest_submission_at ?? null;
    hydrated.attention_level = hydrated.attention_level ?? 'watch';
    hydrated.certificate_status = hydrated.certificate_status ?? 'pending';
    hydrated.certificate_issued_at = hydrated.certificate_issued_at ?? null;
    hydrated.certificate_number = hydrated.certificate_number ?? null;
    hydrated.courses = course ? clone(course) : null;
    return hydrated;
  }

  if (table === 'lesson_progress') {
    const course = findRow('courses', hydrated.course_id);
    const section = findRow('course_sections', hydrated.section_id);
    const lesson = findRow('course_lessons', hydrated.lesson_id);
    hydrated.course_name = hydrated.course_name ?? course?.title ?? null;
    hydrated.section_title = hydrated.section_title ?? section?.title ?? null;
    hydrated.lesson_title = hydrated.lesson_title ?? lesson?.title ?? null;
    hydrated.progress = Math.max(0, Math.min(100, requireNumberOrFallback(hydrated.progress, 0)));
    hydrated.completed = parseBoolean(hydrated.completed, (toNumber(hydrated.progress) ?? 0) >= 100);
    hydrated.status = hydrated.status ?? (hydrated.completed ? 'completed' : ((toNumber(hydrated.progress) ?? 0) > 0 ? 'in_progress' : 'not_started'));
    hydrated.last_viewed_at = hydrated.last_viewed_at ?? hydrated.updated_at ?? hydrated.created_at ?? null;
    hydrated.first_viewed_at = hydrated.first_viewed_at ?? hydrated.last_viewed_at ?? null;
    hydrated.completed_at = hydrated.completed_at ?? null;
    return hydrated;
  }

  if (table === 'course_reviews') {
    const course = findRow('courses', hydrated.course_id);
    hydrated.course_name = hydrated.course_name ?? course?.title ?? null;
    hydrated.rating = requireNumberOrFallback(hydrated.rating, 0);
    hydrated.status = hydrated.status ?? 'published';
    hydrated.student_avatar = trimText(hydrated.student_avatar);
    return hydrated;
  }

  if (table === 'course_sections') {
    const course = findRow('courses', hydrated.course_id);
    const lessons = (store.course_lessons ?? []).filter((lesson) => String(lesson.section_id) === String(hydrated.id));
    hydrated.course_name = hydrated.course_name ?? course?.title ?? null;
    hydrated.instructor_id = hydrated.instructor_id ?? course?.instructor_id ?? null;
    hydrated.lessons_count = hydrated.lessons_count ?? lessons.length;
    return hydrated;
  }

  if (table === 'course_lessons') {
    const course = findRow('courses', hydrated.course_id);
    const section = findRow('course_sections', hydrated.section_id);
    hydrated.course_name = hydrated.course_name ?? course?.title ?? null;
    hydrated.section_title = hydrated.section_title ?? section?.title ?? null;
    hydrated.instructor_id = hydrated.instructor_id ?? course?.instructor_id ?? null;
    hydrated.is_preview = Boolean(hydrated.is_preview);
    return hydrated;
  }

  if (table === 'lesson_assets') {
    const course = findRow('courses', hydrated.course_id);
    const section = findRow('course_sections', hydrated.section_id);
    const lesson = findRow('course_lessons', hydrated.lesson_id);
    hydrated.course_name = hydrated.course_name ?? course?.title ?? null;
    hydrated.section_title = hydrated.section_title ?? section?.title ?? null;
    hydrated.lesson_title = hydrated.lesson_title ?? lesson?.title ?? null;
    hydrated.instructor_id = hydrated.instructor_id ?? course?.instructor_id ?? null;
    return hydrated;
  }

  if (table === 'lesson_comments') {
    const course = findRow('courses', hydrated.course_id);
    const lesson = findRow('course_lessons', hydrated.lesson_id);
    hydrated.course_name = hydrated.course_name ?? course?.title ?? null;
    hydrated.lesson_title = hydrated.lesson_title ?? lesson?.title ?? null;
    hydrated.likes = hydrated.likes ?? 0;
    hydrated.pinned = Boolean(hydrated.pinned);
    hydrated.status = hydrated.status ?? 'visible';
    return hydrated;
  }

  if (table === 'course_faq_items') {
    const course = findRow('courses', hydrated.course_id);
    hydrated.course_name = hydrated.course_name ?? course?.title ?? null;
    hydrated.status = hydrated.status ?? 'draft';
    return hydrated;
  }

  if (table === 'exams') {
    const course = findRow('courses', hydrated.course_id);
    hydrated.course_name = hydrated.course_name ?? course?.title ?? null;
    hydrated.instructor_id = hydrated.instructor_id ?? course?.instructor_id ?? null;
    hydrated.questions_count = hydrated.questions_count ?? (store.quiz_questions ?? []).filter((question) => String(question.exam_id) === String(hydrated.id)).length;
    hydrated.open_questions_count = hydrated.open_questions_count ?? (store.quiz_questions ?? []).filter(
      (question) => String(question.exam_id) === String(hydrated.id) && String(question.type) === 'open',
    ).length;
    hydrated.auto_gradable = hydrated.auto_gradable ?? (toNumber(hydrated.open_questions_count) ?? 0) === 0;
    return hydrated;
  }

  if (table === 'quiz_questions') {
    const exam = findRow('exams', hydrated.exam_id);
    const course = findRow('courses', hydrated.course_id ?? exam?.course_id);
    const choices = (store.quiz_choices ?? []).filter((choice) => String(choice.question_id) === String(hydrated.id));
    hydrated.exam_title = hydrated.exam_title ?? exam?.title ?? null;
    hydrated.course_id = hydrated.course_id ?? exam?.course_id ?? null;
    hydrated.course_name = hydrated.course_name ?? course?.title ?? null;
    hydrated.instructor_id = hydrated.instructor_id ?? exam?.instructor_id ?? course?.instructor_id ?? null;
    hydrated.required = hydrated.required ?? true;
    hydrated.choices_count = hydrated.choices_count ?? choices.length;
    hydrated.correct_choices_count = hydrated.correct_choices_count ?? choices.filter((choice) => Boolean(choice.is_correct)).length;
    return hydrated;
  }

  if (table === 'quiz_choices') {
    const question = findRow('quiz_questions', hydrated.question_id);
    const exam = findRow('exams', hydrated.exam_id ?? question?.exam_id);
    const course = findRow('courses', hydrated.course_id ?? question?.course_id ?? exam?.course_id);
    hydrated.question_prompt = hydrated.question_prompt ?? question?.prompt ?? null;
    hydrated.question_type = hydrated.question_type ?? question?.type ?? null;
    hydrated.exam_id = hydrated.exam_id ?? question?.exam_id ?? null;
    hydrated.exam_title = hydrated.exam_title ?? exam?.title ?? null;
    hydrated.course_id = hydrated.course_id ?? question?.course_id ?? exam?.course_id ?? null;
    hydrated.course_name = hydrated.course_name ?? course?.title ?? null;
    hydrated.instructor_id = hydrated.instructor_id ?? exam?.instructor_id ?? course?.instructor_id ?? null;
    return hydrated;
  }

  if (table === 'certificates') {
    const course = findRow('courses', hydrated.course_id);
    hydrated.course_name = hydrated.course_name ?? course?.title ?? null;
    hydrated.title = hydrated.title ?? hydrated.course_name ?? null;
    hydrated.grade = hydrated.grade ?? hydrated.final_grade ?? null;
    hydrated.final_grade = hydrated.final_grade ?? hydrated.grade ?? null;
    hydrated.certificate_number = hydrated.certificate_number ?? hydrated.certificate_id ?? null;
    return hydrated;
  }

  return null;
}
