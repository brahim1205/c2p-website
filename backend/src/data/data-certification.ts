import { findUserById } from '../auth/auth.store.js';
import { appendAppRows, clone, findRow, patchAppRows, store, withId } from './data-app-store.js';
import { toNumber, trimText } from './data-normalizers.js';
import { prepareInsert } from './data-runtime.js';
import type { Row } from './mock-store.js';

/**
 * Course certification, Udemy / OpenClassrooms style:
 * - a certifying course (`certificate_enabled`, on by default) gives every enrolled learner a
 *   certificate record as soon as they enrol (status `in_progress`, not verifiable, not
 *   downloadable);
 * - it is delivered automatically (`issued`) only when the learner has completed every lesson
 *   and passed every exam of the course (grade >= pass mark);
 * - an issued certificate is never taken back by a later recomputation.
 */

export const DEFAULT_PASS_PERCENTAGE = 50;
const OPEN_EXAM_STATUSES = new Set(['upcoming', 'ongoing', 'graded', 'closed']);

export type ExamRequirementStatus = 'passed' | 'failed' | 'pending_review' | 'resubmit' | 'not_submitted';

export interface CertificationRequirements {
  lessons: { completed: boolean; progress: number };
  exams: Array<{
    exam_id: string;
    title: string;
    status: ExamRequirementStatus;
    grade: number | null;
    max_grade: number;
    pass_grade: number;
  }>;
  /** Live / on-site sessions attendance (only when the course requires a minimum). */
  attendance: { required_percent: number; attended: number; total: number; met: boolean } | null;
  pass_percentage: number;
  ready: boolean;
}

export function isCertifyingCourse(course: Row | undefined | null) {
  return Boolean(course) && course?.certificate_enabled !== false && String(course?.certificate_enabled) !== 'false';
}

export function coursePassPercentage(course: Row | undefined | null) {
  const value = toNumber(course?.certificate_pass_percentage);
  return value !== null && value > 0 && value <= 100 ? value : DEFAULT_PASS_PERCENTAGE;
}

/** Pass mark of an exam: its own `passing_grade` when set, otherwise the course percentage. */
export function examPassGrade(exam: Row, course: Row | undefined | null) {
  const maxGrade = toNumber(exam.max_grade) ?? 20;
  const explicit = toNumber(exam.passing_grade);
  if (explicit !== null && explicit > 0 && explicit <= maxGrade) return explicit;
  return Math.round(((coursePassPercentage(course) / 100) * maxGrade) * 100) / 100;
}

function courseQuizBestPercent(courseId: string, studentId: string) {
  return (store.course_quiz_attempts ?? [])
    .filter((attempt) => String(attempt.course_id) === courseId && String(attempt.student_id) === studentId)
    .reduce((best, attempt) => {
      const total = toNumber(attempt.total) ?? 0;
      return total > 0 ? Math.max(best, ((toNumber(attempt.score) ?? 0) / total) * 100) : best;
    }, -1);
}

/** Minimum share of the course's held sessions (status "ended") the learner attended. */
function attendanceRequirement(course: Row, studentId: string) {
  const required = toNumber(course.certificate_min_attendance) ?? 0;
  if (required <= 0) return null;
  const sessions = (store.virtual_classes ?? []).filter((row) => String(row.course_id) === String(course.id) && String(row.status) === 'ended');
  const attended = sessions.filter((session) => (store.class_attendance ?? []).some((row) =>
    String(row.class_id) === String(session.id) && String(row.student_id) === studentId && Boolean(row.present))).length;
  const met = sessions.length === 0 ? false : (attended / sessions.length) * 100 >= required;
  return { required_percent: required, attended, total: sessions.length, met };
}

export function computeCertificationRequirements(course: Row, studentId: string): CertificationRequirements {
  const courseId = String(course.id);
  const passPercentage = coursePassPercentage(course);
  const enrollment = (store.course_enrollments ?? []).find((row) =>
    String(row.course_id) === courseId && String(row.student_id) === studentId);
  const progress = Math.max(0, Math.min(100, Math.round(toNumber(enrollment?.progress) ?? 0)));
  const lessonsCompleted = progress >= 100 || String(enrollment?.status) === 'completed';

  const exams = (store.exams ?? [])
    .filter((exam) => String(exam.course_id) === courseId && OPEN_EXAM_STATUSES.has(String(exam.status ?? 'upcoming')))
    .map((exam) => {
      const maxGrade = toNumber(exam.max_grade) ?? 20;
      const passGrade = examPassGrade(exam, course);
      const submissions = (store.submissions ?? []).filter((row) =>
        String(row.exam_id) === String(exam.id) && String(row.student_id) === studentId);
      const graded = submissions.filter((row) => String(row.status) === 'graded' && toNumber(row.grade) !== null);
      const best = graded.reduce<number | null>((value, row) => Math.max(value ?? 0, toNumber(row.grade) ?? 0), null);
      let status: ExamRequirementStatus = 'not_submitted';
      if (best !== null && best >= passGrade) status = 'passed';
      else if (submissions.some((row) => String(row.status) === 'resubmit')) status = 'resubmit';
      else if (submissions.some((row) => String(row.status) === 'pending' || String(row.status) === 'late')) status = 'pending_review';
      else if (best !== null) status = 'failed';
      // A quiz exam can also be passed in the course player, which uses the same question bank.
      if (status !== 'passed' && String(exam.type) === 'quiz') {
        const quizPercent = courseQuizBestPercent(courseId, studentId);
        if (quizPercent >= (passGrade / maxGrade) * 100) status = 'passed';
      }
      return { exam_id: String(exam.id), title: String(exam.title ?? 'Évaluation'), status, grade: best, max_grade: maxGrade, pass_grade: passGrade };
    });

  const attendance = attendanceRequirement(course, studentId);
  return {
    lessons: { completed: lessonsCompleted, progress },
    exams,
    attendance,
    pass_percentage: passPercentage,
    ready: lessonsCompleted && exams.every((exam) => exam.status === 'passed') && (attendance?.met ?? true),
  };
}

function finalGradeOutOf20(requirements: CertificationRequirements) {
  const graded = requirements.exams.filter((exam) => exam.grade !== null && exam.max_grade > 0);
  if (!graded.length) return null;
  const average = graded.reduce((total, exam) => total + (exam.grade ?? 0) / exam.max_grade, 0) / graded.length;
  return Math.round(average * 20 * 10) / 10;
}

export function buildCertificateNumber(courseId: unknown, studentId: unknown, issuedAt: string) {
  const year = new Date(issuedAt).getUTCFullYear();
  const coursePart = String(courseId).replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase() || 'COURSE';
  const studentPart = String(studentId).replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || 'USER';
  return `C2P-${year}-${coursePart}-${studentPart}`;
}

function instructorName(course: Row) {
  const instructor = findUserById(String(course.instructor_id ?? ''));
  return instructor ? `${instructor.firstName} ${instructor.lastName}`.trim() : trimText(course.instructor_name);
}

function studentName(studentId: string, enrollment: Row | undefined) {
  const student = findUserById(studentId);
  return (student ? `${student.firstName} ${student.lastName}`.trim() : '') || trimText(enrollment?.student_name) || studentId;
}

export interface CertificationSyncResult {
  /** Certificate rows created or updated (to persist). */
  rows: Row[];
  /** Rows as they were before the update (audit trail). */
  before: Row[];
  /** Set when this call delivered the certificate. */
  issued: Row | null;
}

/**
 * Creates the learner's certificate record for a certifying course if missing, refreshes its
 * requirement snapshot, and delivers it once every requirement is met.
 */
export function syncCourseCertificate(courseId: unknown, studentId: unknown): CertificationSyncResult {
  const empty: CertificationSyncResult = { rows: [], before: [], issued: null };
  const course = findRow('courses', courseId);
  const student = String(studentId ?? '');
  if (!course || !student || !isCertifyingCourse(course)) return empty;
  const enrollment = (store.course_enrollments ?? []).find((row) =>
    String(row.course_id) === String(course.id) && String(row.student_id) === student);
  if (!enrollment || ['cancelled', 'refunded', 'revoked'].includes(String(enrollment.status))) return empty;

  const now = new Date().toISOString();
  const requirements = computeCertificationRequirements(course, student);
  const identity = {
    student_name: studentName(student, enrollment),
    course_name: String(course.title ?? 'Formation C2P'),
    title: String(course.title ?? 'Formation C2P'),
    instructor_id: course.instructor_id ?? null,
    instructor_name: instructorName(course),
    instructor_signature_url: trimText(course.instructor_signature_url),
    course_duration: trimText(course.duration),
  };
  const existing = (store.certificates ?? []).find((row) =>
    String(row.course_id) === String(course.id) && String(row.student_id) === student);

  if (!existing) {
    const created = withId(prepareInsert('certificates', {
      ...identity,
      student_id: student,
      student_avatar: findUserById(student)?.avatar ?? null,
      course_id: course.id,
      status: 'in_progress',
      requirements,
      progress_percent: requirements.lessons.progress,
      certificate_id: null,
      certificate_number: null,
      issued_at: null,
      completion_date: null,
      created_at: now,
      updated_at: now,
    }));
    appendAppRows('certificates', [created]);
    return requirements.ready ? syncCourseCertificate(course.id, student) : { rows: [created], before: [], issued: null };
  }

  // Delivered or revoked certificates are final: only an explicit instructor action changes them.
  if (String(existing.status) === 'issued' || String(existing.status) === 'revoked') return empty;
  const before = clone(existing);
  // Legacy statuses ("pending", "ready") join the single in-progress state until delivered.
  const patch: Row = { requirements, progress_percent: requirements.lessons.progress, status: 'in_progress', updated_at: now };
  // Name/course/instructor stay as they are once delivered; refresh them while in progress.
  Object.assign(patch, identity);
  let issued: Row | null = null;
  if (requirements.ready) {
    const number = buildCertificateNumber(course.id, student, now);
    const finalGrade = finalGradeOutOf20(requirements);
    Object.assign(patch, {
      status: 'issued',
      certificate_id: number,
      certificate_number: number,
      issued_at: now,
      completion_date: now,
      final_grade: finalGrade,
      grade: finalGrade,
    });
  }
  const unchanged = !requirements.ready
    && String(existing.status) === 'in_progress'
    && JSON.stringify(existing.requirements ?? null) === JSON.stringify(requirements)
    && String(existing.student_name ?? '') === String(identity.student_name);
  if (unchanged) return empty;
  const updated = patchAppRows('certificates', (row) => String(row.id) === String(existing.id), patch);
  if (requirements.ready) issued = updated[0] ?? null;
  return { rows: updated, before: [before], issued };
}

/** Syncs the certificates of several (course, student) pairs and merges the results. */
export function syncCertificates(pairs: Array<{ courseId: unknown; studentId: unknown }>): CertificationSyncResult {
  const seen = new Set<string>();
  const merged: CertificationSyncResult & { issuedRows: Row[] } = { rows: [], before: [], issued: null, issuedRows: [] };
  for (const pair of pairs) {
    const key = `${String(pair.courseId)}::${String(pair.studentId)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const result = syncCourseCertificate(pair.courseId, pair.studentId);
    merged.rows.push(...result.rows);
    merged.before.push(...result.before);
    if (result.issued) merged.issuedRows.push(result.issued);
  }
  merged.issued = merged.issuedRows[0] ?? null;
  return merged;
}

/** Every enrolment of the given courses (used to backfill certificates of existing learners). */
export function enrollmentPairsForCourses(courseIds: Iterable<string>) {
  const ids = new Set([...courseIds].map(String));
  return (store.course_enrollments ?? [])
    .filter((row) => ids.has(String(row.course_id)))
    .map((row) => ({ courseId: row.course_id, studentId: row.student_id }));
}
