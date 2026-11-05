import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { isAdminRole, listUsers, type AuthUser } from '../auth/auth.store.js';
import { PlatformPersistenceService } from '../database/platform-persistence.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { appendAppRows, clone, patchAppRows, store, syncAppStoreFromDatabase, withId } from '../data/data-app-store.js';
import { filterRowsForActor } from '../data/data-actor-scope.js';
import { trimText } from '../data/data-normalizers.js';
import { hydrateRows } from '../data/data-row-hydration.js';
import type { Row } from '../data/mock-store.js';
import { NotificationsService } from '../notifications/notifications.service.js';

const RESPONSE_MAX = 1000;
const ANNOUNCEMENT_TITLE_MAX = 120;
const ANNOUNCEMENT_MESSAGE_MAX = 2000;

/**
 * Udemy-style instructor communication: public answers to course reviews and announcements
 * sent to every learner enrolled in a course.
 */
@Injectable()
export class FormateurEngagementService {
  private readonly logger = new Logger(FormateurEngagementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly platformPersistenceService: PlatformPersistenceService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getReviews(user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    await syncAppStoreFromDatabase(this.prisma);
    const courses = this.getInstructorCourses(actor);
    const courseIds = new Set(courses.map((course) => String(course.id)));
    const reviews = hydrateRows('course_reviews', this.accessibleRows('course_reviews', actor))
      .filter((review) => courseIds.has(String(review.course_id)))
      .sort((left, right) => this.compareDatesDesc(left.created_at, right.created_at));
    return {
      courses: courses.map((course) => ({ id: course.id, title: course.title })),
      reviews,
    };
  }

  /** Sets (or clears, with an empty text) the instructor's public answer to a review. */
  async respondToReview(reviewId: string, payload: unknown, user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    const input = this.requireObject(payload, 'Reponse a l avis invalide.');
    const response = trimText(input.response);
    if (response && response.length > RESPONSE_MAX) {
      throw new BadRequestException(`La reponse ne doit pas depasser ${RESPONSE_MAX} caracteres.`);
    }
    await syncAppStoreFromDatabase(this.prisma);
    const review = this.accessibleRows('course_reviews', actor).find((row) => String(row.id) === String(reviewId));
    if (!review || !this.ownsCourse(actor, review.course_id)) {
      throw new NotFoundException('Avis introuvable.');
    }
    const previous = clone(review);
    const now = new Date().toISOString();
    const updated = patchAppRows('course_reviews', (row) => String(row.id) === String(review.id), {
      instructor_response: response,
      instructor_response_at: response ? now : null,
      instructor_response_by: response ? `${actor.firstName} ${actor.lastName}`.trim() : null,
      updated_at: now,
    });
    await this.platformPersistenceService.persistRows({ course_reviews: updated }, {
      actorId: actor.id,
      reason: 'learning:formateur:review:respond',
      beforeRowsByTable: { course_reviews: [previous] },
      afterRowsByTable: { course_reviews: updated },
    });
    if (response && !previous.instructor_response && review.student_id) {
      await this.notify(actor, String(review.student_id), {
        title: 'Le formateur a répondu à votre avis',
        message: `${actor.firstName} ${actor.lastName} a répondu à votre avis sur « ${String(review.course_name ?? this.courseTitle(review.course_id))} ».`,
        link: `/espace-numerique/formation/${encodeURIComponent(String(review.course_id))}`,
        metadata: { course_id: review.course_id, review_id: review.id },
      });
    }
    return hydrateRows('course_reviews', updated)[0];
  }

  async getAnnouncements(user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    await syncAppStoreFromDatabase(this.prisma);
    const courses = this.getInstructorCourses(actor);
    const courseIds = new Set(courses.map((course) => String(course.id)));
    const announcements = this.accessibleRows('course_announcements', actor)
      .filter((row) => courseIds.has(String(row.course_id)))
      .sort((left, right) => this.compareDatesDesc(left.created_at, right.created_at));
    return {
      courses: courses.map((course) => ({ id: course.id, title: course.title, learners: this.recipientIds(course.id).length })),
      announcements,
    };
  }

  /** Stores the announcement and notifies every learner enrolled in the course. */
  async createAnnouncement(courseId: string, payload: unknown, user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    const input = this.requireObject(payload, 'Annonce invalide.');
    const title = trimText(input.title);
    const message = trimText(input.message);
    if (!title || !message) {
      throw new BadRequestException('Le titre et le message de l annonce sont obligatoires.');
    }
    if (title.length > ANNOUNCEMENT_TITLE_MAX || message.length > ANNOUNCEMENT_MESSAGE_MAX) {
      throw new BadRequestException(`Titre limite a ${ANNOUNCEMENT_TITLE_MAX} caracteres, message a ${ANNOUNCEMENT_MESSAGE_MAX}.`);
    }
    await syncAppStoreFromDatabase(this.prisma);
    const course = this.getInstructorCourses(actor).find((row) => String(row.id) === String(courseId));
    if (!course) {
      throw new NotFoundException('Formation introuvable.');
    }
    const recipients = this.recipientIds(course.id);
    if (!recipients.length) {
      throw new BadRequestException('Aucun apprenant n est encore inscrit a cette formation.');
    }
    const now = new Date().toISOString();
    const row = withId({
      course_id: course.id,
      course_name: course.title,
      instructor_id: actor.id,
      title,
      message,
      recipients_count: recipients.length,
      created_at: now,
      updated_at: now,
    });
    appendAppRows('course_announcements', [row]);
    try {
      await this.platformPersistenceService.persistRows({ course_announcements: [row] }, {
        actorId: actor.id,
        reason: 'learning:formateur:announcement:create',
        afterRowsByTable: { course_announcements: [row] },
      });
    } catch (error) {
      store.course_announcements = (store.course_announcements ?? []).filter((entry) => String(entry.id) !== String(row.id));
      throw error;
    }
    const results = await Promise.all(recipients.map((studentId) => this.notify(actor, studentId, {
      title: `Annonce · ${String(course.title)}`,
      message: `${title} — ${message.length > 240 ? `${message.slice(0, 237)}…` : message}`,
      link: `/dashboard/apprenant/cours/${encodeURIComponent(String(course.id))}`,
      metadata: { course_id: course.id, announcement_id: row.id },
    })));
    return { ...row, delivered_count: results.filter(Boolean).length };
  }

  /** Learners with an account currently enrolled (cancelled / refunded enrolments excluded), deduplicated. */
  private recipientIds(courseId: unknown) {
    const accounts = new Set(listUsers().map((account) => String(account.id)));
    const ids = (store.course_enrollments ?? [])
      .filter((enrollment) => String(enrollment.course_id) === String(courseId))
      .filter((enrollment) => !['cancelled', 'refunded', 'revoked'].includes(String(enrollment.status ?? 'active')))
      .map((enrollment) => String(enrollment.student_id ?? ''))
      .filter((studentId) => accounts.has(studentId));
    return [...new Set(ids)];
  }

  private async notify(actor: AuthUser, userId: string, payload: { title: string; message: string; link: string; metadata: Row }) {
    try {
      await this.notificationsService.create(actor, { userId, type: 'formation', ...payload });
      return true;
    } catch (error) {
      // One undeliverable learner must not cancel the announcement for the others.
      this.logger.warn(`Notification formateur non remise a ${userId}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  private courseTitle(courseId: unknown) {
    return String((store.courses ?? []).find((course) => String(course.id) === String(courseId))?.title ?? 'votre formation');
  }

  private ownsCourse(actor: AuthUser, courseId: unknown) {
    return this.getInstructorCourses(actor).some((course) => String(course.id) === String(courseId));
  }

  private accessibleRows(table: string, user: AuthUser) {
    return filterRowsForActor(table, store[table] ?? [], user);
  }

  private getInstructorCourses(user: AuthUser) {
    return this.accessibleRows('courses', user)
      .filter((course) => isAdminRole(user) || String(course.instructor_id) === String(user.id));
  }

  private requireFormateurActor(user: AuthUser | null) {
    if (!user) {
      throw new ForbiddenException('Authentification requise.');
    }
    if (user.role !== 'formateur' && !isAdminRole(user)) {
      throw new ForbiddenException('Seul un formateur peut acceder a ces donnees.');
    }
    return user;
  }

  private requireObject(payload: unknown, message: string): Row {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new BadRequestException(message);
    }
    return payload as Row;
  }

  private compareDatesDesc(left: unknown, right: unknown) {
    const leftDate = Date.parse(String(left ?? ''));
    const rightDate = Date.parse(String(right ?? ''));
    return (Number.isNaN(rightDate) ? 0 : rightDate) - (Number.isNaN(leftDate) ? 0 : leftDate);
  }
}
