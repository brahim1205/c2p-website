import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { isAdminRole, type AuthUser } from '../auth/auth.store.js';
import { PlatformPersistenceService } from '../database/platform-persistence.service.js';
import { PrismaService } from '../database/prisma.service.js';
import {
  appendAppRows,
  clone,
  patchAppRows,
  store,
  syncAppStoreFromDatabase,
  withId,
} from '../data/data-app-store.js';
import { filterRowsForActor } from '../data/data-actor-scope.js';
import {
  sanitizeCourseFaqRecord,
  sanitizeLessonCommentRecord,
} from '../data/data-learning-sanitizers.js';
import { ensureConstraints, prepareInsert, recomputeDerivedData } from '../data/data-runtime.js';
import { hydrateRows } from '../data/data-row-hydration.js';
import type { Row } from '../data/mock-store.js';

@Injectable()
export class FormateurCommunityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly platformPersistenceService: PlatformPersistenceService,
  ) {}

  async getSnapshot(user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    await syncAppStoreFromDatabase(this.prisma);
    const courses = this.getInstructorCourses(actor)
      .sort((left, right) => this.compareDatesDesc(left.updated_at ?? left.created_at, right.updated_at ?? right.created_at));
    const courseIds = new Set(courses.map((course) => String(course.id)));
    const comments = hydrateRows('lesson_comments', this.accessibleRows('lesson_comments', actor))
      .filter((comment) => courseIds.has(String(comment.course_id)))
      .sort((left, right) => this.compareDatesDesc(left.created_at, right.created_at));
    const faqs = hydrateRows('course_faq_items', this.accessibleRows('course_faq_items', actor))
      .filter((faq) => courseIds.has(String(faq.course_id)))
      .sort((left, right) => this.position(left) - this.position(right));
    return {
      courses: courses.map((course) => ({
        id: course.id,
        title: course.title,
        delivery_mode: course.delivery_mode,
      })),
      comments,
      faqs,
    };
  }

  async moderateComment(commentId: string, payload: unknown, user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    const input = this.requireObject(payload, 'Moderation de commentaire invalide.');
    await syncAppStoreFromDatabase(this.prisma);
    const comment = this.getInstructorComment(commentId, actor);
    const previous = clone(comment);
    const sanitized = sanitizeLessonCommentRecord({ ...comment, ...input }, actor);
    const updated = patchAppRows('lesson_comments', (row) => String(row.id) === String(comment.id), sanitized);
    await this.platformPersistenceService.persistRows({ lesson_comments: updated }, {
      actorId: actor.id,
      reason: 'learning:formateur:community-comment:moderate',
      beforeRowsByTable: { lesson_comments: [previous] },
      afterRowsByTable: { lesson_comments: updated },
    });
    return updated[0] ?? sanitized;
  }

  async replyToComment(commentId: string, payload: unknown, user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    const input = this.requireObject(payload, 'Reponse de commentaire invalide.');
    await syncAppStoreFromDatabase(this.prisma);
    const parent = this.getInstructorComment(commentId, actor);
    const sanitized = sanitizeLessonCommentRecord({
      course_id: parent.course_id,
      section_id: parent.section_id,
      lesson_id: parent.lesson_id,
      parent_id: parent.id,
      content: input.content,
      status: 'visible',
      pinned: false,
      likes: 0,
    }, actor);
    ensureConstraints('lesson_comments', [sanitized]);
    const reply = withId(prepareInsert('lesson_comments', sanitized));
    const created = appendAppRows('lesson_comments', [reply]);
    await this.platformPersistenceService.persistRows({ lesson_comments: [reply] }, {
      actorId: actor.id,
      reason: 'learning:formateur:community-comment:reply',
      afterRowsByTable: { lesson_comments: [reply] },
    });
    return created[0] ?? reply;
  }

  async deleteComment(commentId: string, user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    await syncAppStoreFromDatabase(this.prisma);
    const comment = this.getInstructorComment(commentId, actor);
    const removedIds = new Set([String(comment.id)]);
    const replies = (store.lesson_comments ?? []).filter((row) => String(row.parent_id) === String(comment.id));
    for (const reply of replies) {
      removedIds.add(String(reply.id));
    }
    store.lesson_comments = (store.lesson_comments ?? []).filter((row) => !removedIds.has(String(row.id)));
    recomputeDerivedData();
    await this.platformPersistenceService.deleteRows({ lesson_comments: [...removedIds] }, {
      actorId: actor.id,
      reason: 'learning:formateur:community-comment:delete',
      beforeRowsByTable: { lesson_comments: [comment, ...replies] },
    });
    return comment;
  }

  async createFaq(payload: unknown, user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    const input = this.requireObject(payload, 'FAQ invalide.');
    await syncAppStoreFromDatabase(this.prisma);
    const sanitized = sanitizeCourseFaqRecord(input, actor);
    ensureConstraints('course_faq_items', [sanitized]);
    const faq = withId(prepareInsert('course_faq_items', sanitized));
    const created = appendAppRows('course_faq_items', [faq]);
    await this.platformPersistenceService.persistRows({ course_faq_items: [faq] }, {
      actorId: actor.id,
      reason: 'learning:formateur:community-faq:create',
      afterRowsByTable: { course_faq_items: [faq] },
    });
    return created[0] ?? faq;
  }

  async updateFaq(faqId: string, payload: unknown, user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    const input = this.requireObject(payload, 'FAQ invalide.');
    await syncAppStoreFromDatabase(this.prisma);
    const faq = this.getInstructorFaq(faqId, actor);
    const previous = clone(faq);
    const sanitized = sanitizeCourseFaqRecord({ ...faq, ...input }, actor);
    const updated = patchAppRows('course_faq_items', (row) => String(row.id) === String(faq.id), sanitized);
    await this.platformPersistenceService.persistRows({ course_faq_items: updated }, {
      actorId: actor.id,
      reason: 'learning:formateur:community-faq:update',
      beforeRowsByTable: { course_faq_items: [previous] },
      afterRowsByTable: { course_faq_items: updated },
    });
    return updated[0] ?? sanitized;
  }

  async deleteFaq(faqId: string, user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    await syncAppStoreFromDatabase(this.prisma);
    const faq = this.getInstructorFaq(faqId, actor);
    store.course_faq_items = (store.course_faq_items ?? []).filter((row) => String(row.id) !== String(faq.id));
    recomputeDerivedData();
    await this.platformPersistenceService.deleteRows({ course_faq_items: [String(faq.id)] }, {
      actorId: actor.id,
      reason: 'learning:formateur:community-faq:delete',
      beforeRowsByTable: { course_faq_items: [faq] },
    });
    return faq;
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

  private accessibleRows(table: string, user: AuthUser) {
    return filterRowsForActor(table, store[table] ?? [], user);
  }

  private getInstructorCourses(user: AuthUser) {
    return this.accessibleRows('courses', user)
      .filter((course) => isAdminRole(user) || String(course.instructor_id) === String(user.id));
  }

  private getInstructorComment(commentId: string, user: AuthUser) {
    const comment = this.accessibleRows('lesson_comments', user).find((row) => String(row.id) === String(commentId));
    if (!comment) {
      throw new NotFoundException('Commentaire introuvable.');
    }
    this.requireInstructorCourse(comment.course_id, user);
    return comment;
  }

  private getInstructorFaq(faqId: string, user: AuthUser) {
    const faq = this.accessibleRows('course_faq_items', user).find((row) => String(row.id) === String(faqId));
    if (!faq) {
      throw new NotFoundException('FAQ introuvable.');
    }
    this.requireInstructorCourse(faq.course_id, user);
    return faq;
  }

  private requireInstructorCourse(courseId: unknown, user: AuthUser) {
    const course = this.getInstructorCourses(user).find((row) => String(row.id) === String(courseId));
    if (!course) {
      throw new NotFoundException('Formation introuvable.');
    }
    return course;
  }

  private position(row: Row) {
    return Number(row.position ?? 0);
  }

  private compareDatesDesc(left: unknown, right: unknown) {
    const leftDate = Date.parse(String(left ?? ''));
    const rightDate = Date.parse(String(right ?? ''));
    const normalizedLeft = Number.isNaN(leftDate) ? 0 : leftDate;
    const normalizedRight = Number.isNaN(rightDate) ? 0 : rightDate;
    return normalizedRight - normalizedLeft;
  }
}
