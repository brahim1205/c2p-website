import {
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { isAdminRole, type AuthUser } from '../auth/auth.store.js';
import type { Row } from './mock-store.js';
import {
  clone,
  findRow,
  store,
} from './data-app-store.js';
import {
  assertCourseStatusChangeAllowed,
  getCourseReadinessIssues,
  mapAdminContentStatusToCourseStatus,
} from './data-course-moderation.js';
import {
  resolveInstructorCourse,
  resolveInstructorSection,
} from './data-instructor-resolvers.js';
import {
  isValidAbsoluteUrl,
  normalizeCourseBranch,
  normalizeCourseLevel,
  parseBoolean,
  requireInteger,
  requireNumberInRange,
  requireText,
  toNumber,
  trimText,
} from './data-normalizers.js';

export function sanitizeAdminContentItemRecord(row: Row, user: AuthUser) {
  if (!isAdminRole(user)) {
    throw new UnauthorizedException('Acces refuse.');
  }

  const normalized = clone(row);
  const status = trimText(normalized.status) ?? 'pending';
  if (!new Set(['draft', 'pending', 'published', 'rejected', 'archived']).has(status)) {
    throw new BadRequestException('Le statut du contenu admin est invalide.');
  }
  normalized.status = status;

  if (String(normalized.source_table) === 'courses') {
    const course = findRow('courses', normalized.source_id);
    if (!course) {
      throw new BadRequestException('La formation associee est introuvable.');
    }

    const nextCourseStatus = mapAdminContentStatusToCourseStatus(status);
    const sanitizedCourse = sanitizeCourseRecord(
      {
        ...course,
        status: nextCourseStatus,
      },
      user,
    );

    Object.assign(course, sanitizedCourse, {
      updated_at: new Date().toISOString(),
      review_submitted_at:
        nextCourseStatus === 'review'
          ? String(course.review_submitted_at ?? new Date().toISOString())
          : course.review_submitted_at ?? null,
      published_at: nextCourseStatus === 'published' ? new Date().toISOString() : course.published_at ?? null,
      rejected_at: nextCourseStatus === 'rejected' ? new Date().toISOString() : course.rejected_at ?? null,
      archived_at: nextCourseStatus === 'archived' ? new Date().toISOString() : course.archived_at ?? null,
    });
  }

  if (String(normalized.source_table) === 'provider_services') {
    const service = findRow('provider_services', normalized.source_id);
    if (!service) {
      throw new BadRequestException('Le service associe est introuvable.');
    }

    const serviceStatus = status === 'published'
      ? 'active'
      : status === 'rejected'
        ? 'rejected'
        : status === 'archived'
          ? 'archived'
          : 'pending';
    Object.assign(service, {
      status: serviceStatus,
      updated_at: new Date().toISOString(),
      published_at: serviceStatus === 'active' ? new Date().toISOString() : service.published_at ?? null,
      rejected_at: serviceStatus === 'rejected' ? new Date().toISOString() : service.rejected_at ?? null,
      archived_at: serviceStatus === 'archived' ? new Date().toISOString() : service.archived_at ?? null,
    });
  }

  return normalized;
}

export function sanitizeCourseRecord(row: Row, user: AuthUser) {
  const normalized = clone(row);
  const existingCourse = normalized.id !== undefined && normalized.id !== null ? findRow('courses', normalized.id) : undefined;
  const currentStatus = trimText(existingCourse?.status);
  normalized.title = requireText(normalized.title, 'Le titre de la formation est obligatoire.');
  normalized.category = requireText(normalized.category, 'La categorie de la formation est obligatoire.');
  normalized.description = trimText(normalized.description) ?? '';
  normalized.duration = requireText(normalized.duration, 'La duree de la formation est obligatoire.');
  normalized.modules = requireInteger(normalized.modules, 1, 200, 'Le nombre de modules doit etre compris entre 1 et 200.');
  normalized.level = normalizeCourseLevel(normalized.level);
  if (!normalized.level) {
    throw new BadRequestException('Le niveau de la formation est invalide.');
  }
  normalized.program_branch = normalizeCourseBranch(normalized.program_branch) ?? 'form_actions';
  normalized.delivery_mode = trimText(normalized.delivery_mode) ?? 'online';
  if (!new Set(['online', 'onsite', 'hybrid']).has(String(normalized.delivery_mode))) {
    throw new BadRequestException('La modalite de la formation est invalide.');
  }
  normalized.price = requireNumberInRange(normalized.price ?? 0, 0, 1000000000, 'Le prix de la formation est invalide.');
  normalized.is_free = parseBoolean(normalized.is_free, (toNumber(normalized.price) ?? 0) <= 0);
  normalized.access_type = trimText(normalized.access_type) ?? (normalized.is_free ? 'free' : 'paid');
  if (!new Set(['free', 'paid']).has(String(normalized.access_type))) {
    throw new BadRequestException('Le mode d acces de la formation est invalide.');
  }
  normalized.promotion_percentage = requireNumberInRange(
    normalized.promotion_percentage ?? 0,
    0,
    100,
    'La promotion de la formation est invalide.',
  );
  normalized.trailer_url = trimText(normalized.trailer_url);
  if (normalized.trailer_url && !isValidAbsoluteUrl(String(normalized.trailer_url))) {
    throw new BadRequestException('La bande-annonce doit etre une URL valide.');
  }
  if (normalized.is_free) {
    normalized.price = 0;
    normalized.access_type = 'free';
  } else {
    normalized.access_type = 'paid';
  }

  const status = trimText(normalized.status) ?? 'draft';
  if (!new Set(['draft', 'review', 'published', 'rejected', 'archived']).has(status)) {
    throw new BadRequestException('Le statut de la formation est invalide.');
  }
  assertCourseStatusChangeAllowed(currentStatus, status, user);
  normalized.status = status;

  if (!isAdminRole(user)) {
    const requestedInstructorId = trimText(normalized.instructor_id);
    if (requestedInstructorId && requestedInstructorId !== user.id) {
      throw new UnauthorizedException('Acces refuse.');
    }
    normalized.instructor_id = user.id;
  }

  if (status === 'review' || status === 'published') {
    const readinessIssues = getCourseReadinessIssues(normalized);
    if (readinessIssues.length > 0) {
      throw new BadRequestException(
        `La formation doit comporter ${readinessIssues.join(', ')} avant ${status === 'review' ? 'soumission en revision' : 'publication'}.`,
      );
    }
  }

  return normalized;
}

export function sanitizeCourseSectionRecord(row: Row, user: AuthUser) {
  const normalized = clone(row);
  const { course, parsedCourseId } = resolveInstructorCourse(normalized.course_id, user);
  normalized.course_id = parsedCourseId;
  normalized.course_name = String(course.title);
  normalized.instructor_id = course.instructor_id;
  normalized.title = requireText(normalized.title, 'Le titre de la section est obligatoire.');
  normalized.description = trimText(normalized.description) ?? '';

  if (normalized.position === undefined || normalized.position === null || normalized.position === '') {
    normalized.position = (store.course_sections ?? []).filter((section) => String(section.course_id) === String(parsedCourseId)).length + 1;
  } else {
    normalized.position = requireInteger(normalized.position, 1, 999, 'La position de la section est invalide.');
  }

  const status = trimText(normalized.status) ?? 'draft';
  if (!new Set(['draft', 'published']).has(status)) {
    throw new BadRequestException('Le statut de la section est invalide.');
  }
  normalized.status = status;
  return normalized;
}

export function sanitizeCourseLessonRecord(row: Row, user: AuthUser) {
  const normalized = clone(row);
  const { section, course, parsedSectionId, parsedCourseId } = resolveInstructorSection(normalized.section_id, user);
  normalized.section_id = parsedSectionId;
  normalized.course_id = parsedCourseId;
  normalized.section_title = String(section.title);
  normalized.course_name = String(course.title);
  normalized.instructor_id = course.instructor_id;
  normalized.title = requireText(normalized.title, 'Le titre de la lecon est obligatoire.');
  normalized.description = trimText(normalized.description) ?? '';
  normalized.duration = trimText(normalized.duration);

  if (normalized.position === undefined || normalized.position === null || normalized.position === '') {
    normalized.position = (store.course_lessons ?? []).filter((lesson) => String(lesson.section_id) === String(parsedSectionId)).length + 1;
  } else {
    normalized.position = requireInteger(normalized.position, 1, 9999, 'La position de la lecon est invalide.');
  }

  const type = trimText(normalized.type) ?? 'article';
  if (!new Set(['video', 'article', 'pdf', 'quiz', 'assignment', 'live', 'practice', 'coding']).has(type)) {
    throw new BadRequestException('Le type de lecon est invalide.');
  }
  normalized.type = type;
  normalized.content = trimText(normalized.content) ?? '';
  normalized.code_language = trimText(normalized.code_language) ?? 'text';
  normalized.code_sample = trimText(normalized.code_sample) ?? '';
  normalized.exercise_instructions = trimText(normalized.exercise_instructions) ?? '';

  const status = trimText(normalized.status) ?? 'draft';
  if (!new Set(['draft', 'published']).has(status)) {
    throw new BadRequestException('Le statut de la lecon est invalide.');
  }
  normalized.status = status;
  normalized.is_preview = parseBoolean(normalized.is_preview, false);
  return normalized;
}
