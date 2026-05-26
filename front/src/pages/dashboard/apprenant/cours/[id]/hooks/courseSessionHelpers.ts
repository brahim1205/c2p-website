import { XP_REWARDS } from '../storage';
import type { Course, Lesson } from '../types';

export function getCourseLessons(course: Course) {
  return course.modules.flatMap((module) => module.lessons);
}

export function findResumeLesson(course: Course, completedLessons: Set<number>) {
  const lessons = getCourseLessons(course);
  const lastViewedLesson = lessons
    .filter((lesson) => lesson.lastViewedAt)
    .sort((left, right) => Date.parse(String(right.lastViewedAt)) - Date.parse(String(left.lastViewedAt)))[0];
  const lastViewedIndex = lastViewedLesson ? lessons.findIndex((lesson) => lesson.id === lastViewedLesson.id) : -1;

  if (lastViewedIndex >= 0 && !completedLessons.has(lessons[lastViewedIndex].id)) {
    return lessons[lastViewedIndex];
  }

  if (lastViewedIndex >= 0) {
    const nextIncomplete = lessons.slice(lastViewedIndex + 1).find((lesson) => !completedLessons.has(lesson.id));
    if (nextIncomplete) return nextIncomplete;
  }

  return lessons.find((lesson) => !completedLessons.has(lesson.id)) ?? (lastViewedIndex >= 0 ? lessons[lastViewedIndex] : lessons[0] ?? null);
}

export function getCompletedLessonIds(course: Course) {
  return new Set(getCourseLessons(course).filter((lesson) => lesson.completed).map((lesson) => lesson.id));
}

export function getBookmarkedLessonIds(course: Course) {
  return new Set(getCourseLessons(course).filter((lesson) => lesson.bookmarked).map((lesson) => lesson.id));
}

export function getLessonNotes(course: Course) {
  return Object.fromEntries(
    getCourseLessons(course)
      .filter((lesson) => lesson.note?.trim())
      .map((lesson) => [lesson.id, lesson.note ?? '']),
  );
}

export function getLessonCompletionReward(lesson?: Lesson) {
  if (lesson?.type === 'reading') return XP_REWARDS.readingComplete;
  if (lesson?.type === 'exercise') return XP_REWARDS.exerciseComplete;
  if (lesson?.type === 'quiz') return XP_REWARDS.quizComplete;
  return XP_REWARDS.lessonComplete;
}

export function getInitialVideoTime(course: Course | null, lessonId: number) {
  if (!course) return 0;
  const lesson = getCourseLessons(course).find((item) => item.id === lessonId);
  return Math.max(0, Math.floor(lesson?.videoPositionSeconds ?? 0));
}

export function getCourseProgress(course: Course | null, completedLessons: Set<number>) {
  if (!course || course.totalLessons <= 0) return 0;
  return Math.round((completedLessons.size / course.totalLessons) * 100);
}
