import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { isAdminRole, type AuthUser } from '../auth/auth.store.js';
import {
  appendAppRows,
  clone,
  patchAppRows,
  store,
  withId,
} from '../data/data-app-store.js';
import { filterRowsForActor } from '../data/data-actor-scope.js';
import { toNumber } from '../data/data-normalizers.js';
import type { Row } from '../data/mock-store.js';
import {
  clampProgress,
  nonNegativeInteger,
  numberId,
  position,
  text,
} from './learning-access-formatters.js';

type ProgressPayload = {
  progress?: unknown;
  completedLessons?: unknown;
  completedLessonIds?: unknown;
};

export function requireLearningActor(user: AuthUser | null) {
  if (!user) {
    throw new ForbiddenException('Authentification requise.');
  }
  return user;
}

export function requireApprenantReadActor(user: AuthUser | null) {
  const actor = requireLearningActor(user);
  if (actor.role !== 'apprenant' && !isAdminRole(actor)) {
    throw new ForbiddenException('Seul un apprenant peut consulter ces donnees.');
  }
  return actor;
}

export function accessibleRows(table: string, user: AuthUser) {
  return filterRowsForActor(table, clone(store[table] ?? []), user);
}

export function requireObject(payload: unknown, message: string): Row {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new BadRequestException(message);
  }
  return payload as Row;
}

export function getAccessibleCourse(courseId: string, user: AuthUser) {
  const course = accessibleRows('courses', user).find((row) => String(row.id) === String(courseId));
  if (!course) {
    throw new NotFoundException('Cours introuvable.');
  }
  return course;
}

export function getAccessibleEnrollment(courseId: string, user: AuthUser) {
  return accessibleRows('course_enrollments', user).find((row) =>
    String(row.course_id) === String(courseId)
    && (isAdminRole(user) || String(row.student_id) === String(user.id))
  ) ?? null;
}

export function canReadCourseDetail(course: Row, enrollment: Row | null, user: AuthUser) {
  if (isAdminRole(user)) return true;
  if (user.role === 'apprenant') return Boolean(enrollment);
  if (user.role === 'formateur') return String(course.instructor_id) === String(user.id);
  return false;
}

export function parseProgressPayload(payload: unknown): Required<ProgressPayload> {
  if (!payload || typeof payload !== 'object') {
    throw new BadRequestException('Payload progression invalide.');
  }
  const input = payload as ProgressPayload;
  const progress = toNumber(input.progress);
  const completedLessons = toNumber(input.completedLessons);
  if (progress === null || completedLessons === null) {
    throw new BadRequestException('Progression invalide.');
  }
  return {
    progress,
    completedLessons,
    completedLessonIds: Array.isArray(input.completedLessonIds) ? input.completedLessonIds : undefined,
  };
}

export function syncLessonProgressRows(courseId: string, user: AuthUser, rawCompletedLessonIds: unknown) {
  const completedLessonIds = Array.isArray(rawCompletedLessonIds)
    ? new Set(rawCompletedLessonIds.map(String))
    : null;
  if (!completedLessonIds || user.role !== 'apprenant') {
    return { beforeRows: [], afterRows: [], totalLessons: 0, completedLessons: 0 };
  }
  const lessons = (store.course_lessons ?? [])
    .filter((lesson) => String(lesson.course_id) === String(courseId) && String(lesson.status ?? 'published') !== 'archived')
    .sort((left, right) => position(left) - position(right));
  const lessonIds = new Set(lessons.map((lesson) => String(lesson.id)));
  const existing = (store.lesson_progress ?? []).filter((row) =>
    String(row.course_id) === String(courseId)
    && String(row.student_id) === String(user.id)
    && lessonIds.has(String(row.lesson_id))
  );
  const beforeRows = existing.map((row) => clone(row));
  const now = new Date().toISOString();
  const updated = patchAppRows('lesson_progress', (row) =>
    String(row.course_id) === String(courseId)
    && String(row.student_id) === String(user.id)
    && lessonIds.has(String(row.lesson_id)),
  (row) => {
    const completed = completedLessonIds.has(String(row.lesson_id));
    return {
      completed,
      progress: completed ? 100 : 0,
      status: completed ? 'completed' : 'not_started',
      last_viewed_at: now,
      completed_at: completed ? (row.completed_at ?? now) : null,
    };
  });
  const existingLessonIds = new Set(existing.map((row) => String(row.lesson_id)));
  const created = lessons
    .filter((lesson) => !existingLessonIds.has(String(lesson.id)))
    .map((lesson) => {
      const completed = completedLessonIds.has(String(lesson.id));
      return withId({
        student_id: user.id,
        course_id: courseId,
        section_id: lesson.section_id,
        lesson_id: lesson.id,
        completed,
        progress: completed ? 100 : 0,
        status: completed ? 'completed' : 'not_started',
        first_viewed_at: now,
        last_viewed_at: now,
        completed_at: completed ? now : null,
        created_at: now,
      });
    });
  const createdRows = created.length > 0 ? appendAppRows('lesson_progress', created) : [];
  return {
    beforeRows,
    afterRows: [...updated, ...createdRows],
    totalLessons: lessons.length,
    completedLessons: lessons.filter((lesson) => completedLessonIds.has(String(lesson.id))).length,
  };
}

export function assertCanAccessLessonThread(lessonId: string, user: AuthUser) {
  const lesson = (store.course_lessons ?? []).find((row) => String(row.id) === String(lessonId));
  if (!lesson) {
    throw new NotFoundException('Lecon introuvable.');
  }
  if (isAdminRole(user)) return;
  if (user.role === 'formateur') {
    const course = (store.courses ?? []).find((row) => String(row.id) === String(lesson.course_id));
    if (course && String(course.instructor_id) === String(user.id)) return;
  }
  if (user.role === 'apprenant') {
    const hasEnrollment = (store.course_enrollments ?? []).some((enrollment) =>
      String(enrollment.course_id) === String(lesson.course_id)
      && String(enrollment.student_id) === String(user.id)
    );
    if (hasEnrollment) return;
  }
  throw new ForbiddenException('Acces a la discussion refuse.');
}

export function matchesCourse(row: Row, courseId: string) {
  return String(row.course_id) === String(courseId);
}

export function groupBy(rows: Row[], field: string) {
  const grouped = new Map<string, Row[]>();
  for (const row of rows) {
    const key = String(row[field]);
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  }
  return grouped;
}

export function buildCourseQuiz(courseId: string, actor: AuthUser) {
  const questions = accessibleRows('quiz_questions', actor)
    .filter((question) => String(question.course_id) === String(courseId))
    .sort((left, right) => position(left) - position(right));
  const choices = accessibleRows('quiz_choices', actor)
    .filter((choice) => String(choice.course_id) === String(courseId))
    .sort((left, right) => position(left) - position(right));
  const choicesByQuestion = groupBy(choices, 'question_id');

  return questions
    .map((question) => {
      const questionChoices = choicesByQuestion.get(String(question.id)) ?? [];
      const correctIndex = questionChoices.findIndex((choice) =>
        String(choice.is_correct ?? '').toLowerCase() === 'true'
      );

      return {
        id: numberId(question.id),
        question: text(question.prompt, 'Question'),
        options: questionChoices.map((choice) => text(choice.label, 'Option')),
        correctIndex: correctIndex >= 0 ? correctIndex : 0,
        explanation: text(question.explanation),
      };
    })
    .filter((question) => question.options.length > 0);
}

export function countCompletedLessonProgress(courseId: string, user: AuthUser, lessonIds: Set<string>) {
  return (store.lesson_progress ?? []).filter((row) =>
    String(row.course_id) === String(courseId)
    && String(row.student_id) === String(user.id)
    && lessonIds.has(String(row.lesson_id))
    && (Boolean(row.completed) || clampProgress(row.progress) >= 100)
  ).length;
}
