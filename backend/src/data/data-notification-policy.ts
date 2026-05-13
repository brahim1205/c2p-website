import type { AuthUser } from '../auth/auth.store.js';
import type { Store } from './mock-store.js';
import { canMessageRole } from './data-messaging-policy.js';

function normalizeUserId(value: unknown) {
  return String(value ?? '').trim();
}

function findProviderIdsByUserId(store: Store, userId: string) {
  return new Set(
    (store.providers ?? [])
      .filter((provider) => normalizeUserId(provider.user_id) === userId)
      .map((provider) => String(provider.id)),
  );
}

function hasClientProviderBookingRelation(store: Store, clientId: string, providerUserId: string) {
  const providerIds = findProviderIdsByUserId(store, providerUserId);
  if (providerIds.size === 0) {
    return false;
  }

  return (store.bookings ?? []).some((booking) => (
    normalizeUserId(booking.client_id) === clientId
    && providerIds.has(String(booking.provider_id ?? ''))
  ));
}

function hasClientProviderReviewRelation(store: Store, clientId: string, providerUserId: string) {
  const providerIds = findProviderIdsByUserId(store, providerUserId);
  if (providerIds.size === 0) {
    return false;
  }

  return (store.provider_reviews ?? []).some((review) => (
    normalizeUserId(review.client_id) === clientId
    && providerIds.has(String(review.provider_id ?? ''))
  ));
}

function hasClientPrestataireRelationship(store: Store, firstUserId: string, secondUserId: string) {
  return hasClientProviderBookingRelation(store, firstUserId, secondUserId)
    || hasClientProviderBookingRelation(store, secondUserId, firstUserId)
    || hasClientProviderReviewRelation(store, firstUserId, secondUserId)
    || hasClientProviderReviewRelation(store, secondUserId, firstUserId);
}

function getCourseIdsForInstructor(store: Store, instructorId: string) {
  return new Set(
    (store.courses ?? [])
      .filter((course) => normalizeUserId(course.instructor_id) === instructorId)
      .map((course) => String(course.id)),
  );
}

function hasInstructorLearnerRelationship(store: Store, firstUserId: string, secondUserId: string) {
  const firstCourseIds = getCourseIdsForInstructor(store, firstUserId);
  const secondCourseIds = getCourseIdsForInstructor(store, secondUserId);

  return (store.course_enrollments ?? []).some((enrollment) => {
    const studentId = normalizeUserId(enrollment.student_id);
    const courseId = String(enrollment.course_id ?? '');
    return (
      (studentId === secondUserId && firstCourseIds.has(courseId))
      || (studentId === firstUserId && secondCourseIds.has(courseId))
    );
  });
}

export function normalizeNotificationType(type: unknown) {
  return String(type ?? 'system').trim().toLowerCase() || 'system';
}

export function canCreateUserNotification(
  actor: AuthUser,
  targetUser: AuthUser,
  notificationType: string,
  store: Store,
) {
  if (String(targetUser.id) === String(actor.id)) {
    return true;
  }

  if (actor.role === 'admin' || targetUser.role === 'admin') {
    return true;
  }

  switch (normalizeNotificationType(notificationType)) {
    case 'message':
      return canMessageRole(actor.role, targetUser.role)
        && hasInstructorLearnerRelationship(store, String(actor.id), String(targetUser.id));
    case 'formation':
    case 'evaluation':
      return canMessageRole(actor.role, targetUser.role)
        && hasInstructorLearnerRelationship(store, String(actor.id), String(targetUser.id));
    case 'booking':
    case 'prestation':
    case 'review':
      return (
        ((actor.role === 'client' && targetUser.role === 'prestataire')
          || (actor.role === 'prestataire' && targetUser.role === 'client'))
        && hasClientPrestataireRelationship(store, String(actor.id), String(targetUser.id))
      );
    case 'system':
    case 'projet':
    case 'collaboration':
    case 'paiement':
    case 'rendezvous':
    case 'finance':
    default:
      return false;
  }
}
