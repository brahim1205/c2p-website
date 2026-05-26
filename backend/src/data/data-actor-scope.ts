import { findUserById, isAdminRole, type AuthUser } from '../auth/auth.store.js';
import { findRow, store } from './data-app-store.js';
import { filterRowsForActor as filterRowsForActorByPolicy } from './data-row-access.js';
import {
  canCreateUserNotification,
  normalizeNotificationType,
} from './data-notification-policy.js';
import type { Row } from './mock-store.js';

export function getProviderIdsForUser(userId: string) {
  return (store.providers ?? [])
    .filter((provider) => String(provider.user_id) === String(userId))
    .map((provider) => String(provider.id));
}

export function getInstructorCourseIds(userId: string) {
  return (store.courses ?? [])
    .filter((course) => String(course.instructor_id) === String(userId))
    .map((course) => String(course.id));
}

export function getStudentCourseIds(userId: string) {
  return (store.course_enrollments ?? [])
    .filter((enrollment) => String(enrollment.student_id) === String(userId))
    .map((enrollment) => String(enrollment.course_id));
}

export function getLinkedStudentIdsForParent(userId: string) {
  return (store.student_guardians ?? [])
    .filter((link) => String(link.parent_id) === String(userId) && String(link.status ?? 'active') === 'active')
    .map((link) => String(link.student_id));
}

export function getLessonIdsForCourses(courseIds: string[]) {
  const allowed = new Set(courseIds);
  return (store.course_lessons ?? [])
    .filter((lesson) => allowed.has(String(lesson.course_id)))
    .map((lesson) => String(lesson.id));
}

export function getOwnerProjectIds(userId: string) {
  return (store.projects ?? [])
    .filter((project) => String(project.owner_id) === String(userId))
    .map((project) => String(project.id));
}

export function getTrackedProjectIds(userId: string) {
  return (store.project_tracking ?? [])
    .filter((tracking) => String(tracking.partner_id) === String(userId))
    .map((tracking) => String(tracking.project_id));
}

export function getConversationIdsForUser(userId: string) {
  return (store.conversations ?? [])
    .filter((conversation) => Array.isArray(conversation.participants) && conversation.participants.map(String).includes(String(userId)))
    .map((conversation) => String(conversation.id));
}

export function canNotifyUser(actor: AuthUser, targetUserId: string, notificationType?: string) {
  if (String(targetUserId) === String(actor.id)) {
    return true;
  }

  const targetUser = findUserById(String(targetUserId));
  if (!targetUser) {
    return false;
  }

  if (isAdminRole(targetUser)) {
    return true;
  }

  return canCreateUserNotification(actor, targetUser, normalizeNotificationType(notificationType), store);
}

export function filterRowsForActor(table: string, rows: Row[], user: AuthUser | null) {
  return filterRowsForActorByPolicy(table, rows, user, {
    findRow,
    findUserById,
    getProviderIdsForUser,
    getInstructorCourseIds,
    getStudentCourseIds,
    getLinkedStudentIdsForParent,
    getLessonIdsForCourses,
    getOwnerProjectIds,
    getTrackedProjectIds,
    getConversationIdsForUser,
  });
}
