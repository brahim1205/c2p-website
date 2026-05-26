import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { isAdminRole, type AuthUser } from '../auth/auth.store.js';
import { findRow } from './data-app-store.js';
import { requireIdentifier } from './data-normalizers.js';

export function resolveInstructorCourse(courseId: unknown, user: AuthUser) {
  const parsedCourseId = requireIdentifier(courseId, 'La formation associee est invalide.');
  const course = findRow('courses', parsedCourseId);

  if (!course) {
    throw new BadRequestException('La formation associee est introuvable.');
  }

  if (!isAdminRole(user) && String(course.instructor_id) !== user.id) {
    throw new UnauthorizedException('Acces refuse.');
  }

  return { course, parsedCourseId };
}

export function resolveInstructorSection(sectionId: unknown, user: AuthUser) {
  const parsedSectionId = requireIdentifier(sectionId, 'La section associee est invalide.');
  const section = findRow('course_sections', parsedSectionId);

  if (!section) {
    throw new BadRequestException('La section associee est introuvable.');
  }

  const { course, parsedCourseId } = resolveInstructorCourse(section.course_id, user);
  return { section, course, parsedSectionId, parsedCourseId };
}

export function resolveInstructorLesson(lessonId: unknown, user: AuthUser) {
  const parsedLessonId = requireIdentifier(lessonId, 'La lecon associee est invalide.');
  const lesson = findRow('course_lessons', parsedLessonId);

  if (!lesson) {
    throw new BadRequestException('La lecon associee est introuvable.');
  }

  const { section, course, parsedSectionId, parsedCourseId } = resolveInstructorSection(lesson.section_id, user);
  return { lesson, section, course, parsedLessonId, parsedSectionId, parsedCourseId };
}

export function resolveInstructorExam(examId: unknown, user: AuthUser) {
  const parsedExamId = requireIdentifier(examId, 'L examen associe est invalide.');
  const exam = findRow('exams', parsedExamId);

  if (!exam) {
    throw new BadRequestException('L examen associe est introuvable.');
  }

  const { course, parsedCourseId } = resolveInstructorCourse(exam.course_id, user);
  return { exam, course, parsedExamId, parsedCourseId };
}

export function resolveQuizQuestion(questionId: unknown, user: AuthUser) {
  const parsedQuestionId = requireIdentifier(questionId, 'La question associee est invalide.');
  const question = findRow('quiz_questions', parsedQuestionId);

  if (!question) {
    throw new BadRequestException('La question associee est introuvable.');
  }

  const { exam, course, parsedExamId, parsedCourseId } = resolveInstructorExam(question.exam_id, user);
  return { question, exam, course, parsedQuestionId, parsedExamId, parsedCourseId };
}
