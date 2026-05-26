import { UnauthorizedException } from '@nestjs/common';
import { findUserById, isAdminRole, type AuthUser } from '../auth/auth.store.js';
import { store } from './data-app-store.js';
import { toNumber, trimText } from './data-normalizers.js';
import type { Row } from './mock-store.js';

export function getCourseReadinessIssues(course: Row) {
  const issues: string[] = [];
  if (!trimText(course.description)) {
    issues.push('une description');
  }
  if (!trimText(course.duration)) {
    issues.push('une duree');
  }
  if (!trimText(course.thumbnail)) {
    issues.push('une miniature');
  }

  if (course.id !== undefined && course.id !== null) {
    const courseId = String(course.id);
    const sections = (store.course_sections ?? []).filter((section) => String(section.course_id) === courseId);
    const lessons = (store.course_lessons ?? []).filter((lesson) => String(lesson.course_id) === courseId);

    if (sections.length === 0) {
      issues.push('au moins une section');
    }
    if (lessons.length === 0) {
      issues.push('au moins une lecon');
    }
  }

  return issues;
}

export function assertCourseStatusChangeAllowed(currentStatus: string | null, nextStatus: string, user: AuthUser) {
  if (isAdminRole(user)) {
    return;
  }

  if (currentStatus === null) {
    if (!new Set(['draft', 'review']).has(nextStatus)) {
      throw new UnauthorizedException('Le formateur ne peut creer une formation qu en brouillon ou en revision.');
    }
    return;
  }

  if (currentStatus === nextStatus) {
    return;
  }

  if (nextStatus === 'published' || nextStatus === 'rejected') {
    throw new UnauthorizedException('Seul un administrateur peut publier ou rejeter une formation.');
  }

  if (!new Set(['draft', 'review', 'archived']).has(nextStatus)) {
    throw new UnauthorizedException('Transition de statut invalide pour cette formation.');
  }
}

export function mapCourseStatusToAdminContentStatus(status: string) {
  switch (status) {
    case 'review':
      return 'pending';
    case 'published':
      return 'published';
    case 'rejected':
      return 'rejected';
    case 'archived':
      return 'archived';
    case 'draft':
    default:
      return 'draft';
  }
}

export function mapAdminContentStatusToCourseStatus(status: string) {
  switch (status) {
    case 'pending':
      return 'review';
    case 'published':
      return 'published';
    case 'rejected':
      return 'rejected';
    case 'archived':
      return 'archived';
    case 'draft':
    default:
      return 'draft';
  }
}

export function syncCourseModerationItems() {
  const existingItems = store.admin_content_items ?? [];
  const existingCourseItems = new Map(
    existingItems
      .filter((item) => String(item.source_table) === 'courses')
      .map((item) => [String(item.source_id), item] as const),
  );
  const nonCourseItems = existingItems.filter((item) => String(item.source_table) !== 'courses');

  const courseItems = (store.courses ?? []).map((course) => {
    const existingItem = existingCourseItems.get(String(course.id));
    const instructor = findUserById(String(course.instructor_id));
    const updatedAt = String(course.updated_at ?? course.created_at ?? new Date().toISOString());
    return {
      id: `course-${String(course.id)}`,
      source_table: 'courses',
      source_id: course.id,
      title: String(course.title ?? 'Formation sans titre'),
      type: 'Formation',
      author: instructor ? `${instructor.firstName} ${instructor.lastName}`.trim() : 'Formateur inconnu',
      status: mapCourseStatusToAdminContentStatus(String(course.status ?? 'draft')),
      date: updatedAt.slice(0, 10),
      views: toNumber(existingItem?.views) ?? toNumber(course.students_count) ?? 0,
      category: String(course.category ?? 'General'),
      description: String(course.description ?? ''),
    };
  });

  store.admin_content_items = [...courseItems, ...nonCourseItems];
}
