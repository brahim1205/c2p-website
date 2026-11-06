import { findRow, store } from '../data/data-app-store.js';
import { examPassGrade } from '../data/data-certification.js';
import { toNumber } from '../data/data-normalizers.js';
import type { Row } from '../data/mock-store.js';

/** Exam attempt rules shared by the learner and instructor assessment endpoints. */

/** A new attempt is allowed after a "new version" request, or for a failed quiz with attempts left. */
export function canRetry(submission: Row, exam: Row) {
  if (String(submission.status) === 'resubmit') return true;
  if (String(exam.type) !== 'quiz' || String(submission.status) !== 'graded') return false;
  const course = findRow('courses', exam.course_id);
  const passed = (toNumber(submission.grade) ?? 0) >= examPassGrade(exam, course);
  const attempts = toNumber(submission.attempt) ?? 1;
  return !passed && attempts < (toNumber(exam.max_attempts) ?? 3);
}

/** Adds each exam's pass mark and whether the learner may submit again (new version / quiz retry). */
export function withAttemptRules(snapshot: { exams: Row[]; submissions: Row[] }) {
  const examById = new Map((store.exams ?? []).map((exam) => [String(exam.id), exam]));
  const passGrade = (exam: Row) => examPassGrade(exam, findRow('courses', exam.course_id));
  return {
    exams: snapshot.exams.map((exam) => {
      const source = examById.get(String(exam.id)) ?? exam;
      return { ...exam, pass_grade: passGrade(source), max_attempts: toNumber(source.max_attempts) ?? 3, timer_minutes: toNumber(source.timer_minutes) ?? 0 };
    }),
    submissions: snapshot.submissions.map((submission) => {
      const exam = examById.get(String(submission.exam_id));
      return {
        ...submission,
        attempt: toNumber(submission.attempt) ?? 1,
        pass_grade: exam ? passGrade(exam) : null,
        can_retry: exam ? canRetry(submission, exam) : false,
      };
    }),
  };
}

/** Effective pass mark of each exam (its own, or the course certificate percentage). */
export function withPassGrades<T extends { exams: Row[] }>(snapshot: T): T {
  const examById = new Map((store.exams ?? []).map((exam) => [String(exam.id), exam]));
  return {
    ...snapshot,
    exams: snapshot.exams.map((exam) => {
      const source = examById.get(String(exam.id)) ?? exam;
      return { ...exam, pass_grade: examPassGrade(source, findRow('courses', source.course_id)), passing_grade: source.passing_grade ?? null, max_attempts: toNumber(source.max_attempts) ?? 3 };
    }),
  };
}

/** Concatenates rows per table (e.g. notifications produced by two different steps). */
export function mergeRows(target: Record<string, Row[]>, extra: Record<string, Row[]>) {
  const merged: Record<string, Row[]> = {};
  for (const [table, rows] of Object.entries(extra)) {
    merged[table] = [...(target[table] ?? []), ...rows];
  }
  return merged;
}
