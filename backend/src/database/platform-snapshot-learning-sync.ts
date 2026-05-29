import type { Prisma } from '@prisma/client';
import type { Row } from '../data/mock-store.js';
import { persistLearningProjection, type LearningRowsByTable } from './platform-learning-projection.js';

export type LearningSnapshotSyncSummary = {
  learningCourses: number;
  learningCourseSections: number;
  learningCourseLessons: number;
  learningCourseReviews: number;
  learningVirtualClasses: number;
  learningCourseEnrollments: number;
  learningLessonProgress: number;
};

export function buildLearningRows(groupedRows: Partial<Record<string, Row[]>>): LearningRowsByTable {
  return {
    courses: groupedRows.courses ?? [],
    course_sections: groupedRows.course_sections ?? [],
    course_lessons: groupedRows.course_lessons ?? [],
    course_reviews: groupedRows.course_reviews ?? [],
    virtual_classes: groupedRows.virtual_classes ?? [],
    course_enrollments: groupedRows.course_enrollments ?? [],
    lesson_progress: groupedRows.lesson_progress ?? [],
  };
}

export async function syncLearningSnapshot(
  tx: Prisma.TransactionClient,
  rowsByTable: LearningRowsByTable,
) {
  await tx.learningVirtualClass.deleteMany({ where: { source: 'app_row' } });
  await tx.learningLessonProgress.deleteMany({ where: { source: 'app_row' } });
  await tx.learningCourseEnrollment.deleteMany({ where: { source: 'app_row' } });
  await tx.learningCourseReview.deleteMany({ where: { source: 'app_row' } });
  await tx.learningCourseLesson.deleteMany({ where: { source: 'app_row' } });
  await tx.learningCourseSection.deleteMany({ where: { source: 'app_row' } });
  await tx.learningCourse.deleteMany({ where: { source: 'app_row' } });
  await persistLearningProjection(tx, rowsByTable);
}

export function summarizeLearningRows(rowsByTable: LearningRowsByTable): LearningSnapshotSyncSummary {
  return {
    learningCourses: rowsByTable.courses.length,
    learningCourseSections: rowsByTable.course_sections.length,
    learningCourseLessons: rowsByTable.course_lessons.length,
    learningCourseReviews: rowsByTable.course_reviews.length,
    learningVirtualClasses: rowsByTable.virtual_classes.length,
    learningCourseEnrollments: rowsByTable.course_enrollments.length,
    learningLessonProgress: rowsByTable.lesson_progress.length,
  };
}

export function buildEmptyLearningSummary(): LearningSnapshotSyncSummary {
  return {
    learningCourses: 0,
    learningCourseSections: 0,
    learningCourseLessons: 0,
    learningCourseReviews: 0,
    learningVirtualClasses: 0,
    learningCourseEnrollments: 0,
    learningLessonProgress: 0,
  };
}
