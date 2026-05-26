import type { Row } from './mock-store.js';
import { store } from './data-app-store.js';

function appendDeleted(target: Record<string, string[]>, table: string, rowIds: string[]) {
  if (rowIds.length === 0) return;
  target[table] = [
    ...(target[table] ?? []),
    ...rowIds,
  ];
}

function removeByField(table: string, field: string, allowedValues: Set<string>) {
  const rows = store[table] ?? [];
  const removedIds = rows
    .filter((row) => allowedValues.has(String(row[field])))
    .map((row) => String(row.id));
  store[table] = rows.filter((row) => !allowedValues.has(String(row[field])));
  return removedIds;
}

export function applyDataDeleteCascade(table: string, removed: Row[]) {
  const deletedRowIdsByTable: Record<string, string[]> = {
    [table]: removed.map((row) => String(row.id)),
  };

  if (table === 'course_sections') {
    const removedSectionIds = new Set(removed.map((row) => String(row.id)));
    const removedLessonIds = removeByField('course_lessons', 'section_id', removedSectionIds);
    appendDeleted(deletedRowIdsByTable, 'course_lessons', removedLessonIds);

    const removedLessonIdSet = new Set(removedLessonIds);
    appendDeleted(deletedRowIdsByTable, 'lesson_assets', removeByField('lesson_assets', 'lesson_id', removedLessonIdSet));
    appendDeleted(deletedRowIdsByTable, 'lesson_comments', removeByField('lesson_comments', 'lesson_id', removedLessonIdSet));
    appendDeleted(deletedRowIdsByTable, 'lesson_progress', removeByField('lesson_progress', 'lesson_id', removedLessonIdSet));
  }

  if (table === 'course_lessons') {
    const removedLessonIds = new Set(removed.map((row) => String(row.id)));
    appendDeleted(deletedRowIdsByTable, 'lesson_assets', removeByField('lesson_assets', 'lesson_id', removedLessonIds));
    appendDeleted(deletedRowIdsByTable, 'lesson_comments', removeByField('lesson_comments', 'lesson_id', removedLessonIds));
    appendDeleted(deletedRowIdsByTable, 'lesson_progress', removeByField('lesson_progress', 'lesson_id', removedLessonIds));
  }

  if (table === 'quiz_questions') {
    const removedQuestionIds = new Set(removed.map((row) => String(row.id)));
    appendDeleted(deletedRowIdsByTable, 'quiz_choices', removeByField('quiz_choices', 'question_id', removedQuestionIds));
  }

  if (table === 'exams') {
    const removedExamIds = new Set(removed.map((row) => String(row.id)));
    appendDeleted(deletedRowIdsByTable, 'submissions', removeByField('submissions', 'exam_id', removedExamIds));
    const removedQuestionIds = removeByField('quiz_questions', 'exam_id', removedExamIds);
    appendDeleted(deletedRowIdsByTable, 'quiz_questions', removedQuestionIds);
    appendDeleted(deletedRowIdsByTable, 'quiz_choices', removeByField('quiz_choices', 'question_id', new Set(removedQuestionIds)));
  }

  if (table === 'courses') {
    const removedCourseIds = new Set(removed.map((row) => String(row.id)));
    appendDeleted(deletedRowIdsByTable, 'course_sections', removeByField('course_sections', 'course_id', removedCourseIds));
    appendDeleted(deletedRowIdsByTable, 'course_lessons', removeByField('course_lessons', 'course_id', removedCourseIds));
    appendDeleted(deletedRowIdsByTable, 'lesson_assets', removeByField('lesson_assets', 'course_id', removedCourseIds));
    appendDeleted(deletedRowIdsByTable, 'lesson_comments', removeByField('lesson_comments', 'course_id', removedCourseIds));
    appendDeleted(deletedRowIdsByTable, 'lesson_progress', removeByField('lesson_progress', 'course_id', removedCourseIds));
    appendDeleted(deletedRowIdsByTable, 'course_reviews', removeByField('course_reviews', 'course_id', removedCourseIds));
    appendDeleted(deletedRowIdsByTable, 'course_faq_items', removeByField('course_faq_items', 'course_id', removedCourseIds));
    appendDeleted(deletedRowIdsByTable, 'virtual_classes', removeByField('virtual_classes', 'course_id', removedCourseIds));
    const removedExamIds = removeByField('exams', 'course_id', removedCourseIds);
    appendDeleted(deletedRowIdsByTable, 'exams', removedExamIds);
    appendDeleted(deletedRowIdsByTable, 'submissions', removeByField('submissions', 'exam_id', new Set(removedExamIds)));
    const removedQuestionIds = removeByField('quiz_questions', 'exam_id', new Set(removedExamIds));
    appendDeleted(deletedRowIdsByTable, 'quiz_questions', removedQuestionIds);
    appendDeleted(deletedRowIdsByTable, 'quiz_choices', removeByField('quiz_choices', 'question_id', new Set(removedQuestionIds)));
  }

  return deletedRowIdsByTable;
}
