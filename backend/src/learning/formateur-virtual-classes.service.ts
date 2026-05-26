import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { isAdminRole, type AuthUser } from '../auth/auth.store.js';
import { PlatformPersistenceService } from '../database/platform-persistence.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { appendVirtualClassCreateEvents, appendVirtualClassUpdateEvents } from '../data/data-virtual-class-events.js';
import {
  appendAppRows,
  clone,
  patchAppRows,
  store,
  syncAppStoreFromDatabase,
  withId,
} from '../data/data-app-store.js';
import { filterRowsForActor } from '../data/data-actor-scope.js';
import { sanitizeVirtualClassRecord } from '../data/data-learning-sanitizers.js';
import { ensureConstraints, prepareInsert, recomputeDerivedData } from '../data/data-runtime.js';
import { hydrateRows } from '../data/data-row-hydration.js';
import type { Row } from '../data/mock-store.js';
import type { OutboxEventInput } from '../outbox/outbox.types.js';

@Injectable()
export class FormateurVirtualClassesService {
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
    const classes = hydrateRows('virtual_classes', this.accessibleRows('virtual_classes', actor))
      .filter((virtualClass) => courseIds.has(String(virtualClass.course_id)))
      .sort((left, right) => this.compareDatesAsc(left.class_date ?? left.created_at, right.class_date ?? right.created_at));
    return {
      classes: classes.map((virtualClass) => ({
        class_time: '',
        duration: null,
        max_students: 30,
        provider: 'jitsi',
        meeting_slug: null,
        recording_enabled: true,
        recording_status: 'pending',
        recording_url: null,
        room_link: null,
        started_at: null,
        ended_at: null,
        instructor_notes: null,
        allow_chat: true,
        status: 'scheduled',
        students_count: 0,
        ...virtualClass,
      })),
      courses: courses.map((course) => ({
        id: course.id,
        title: course.title,
        delivery_mode: course.delivery_mode,
      })),
    };
  }

  async create(payload: unknown, user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    const input = this.requireObject(payload, 'Classe virtuelle invalide.');
    await syncAppStoreFromDatabase(this.prisma);
    const sanitized = sanitizeVirtualClassRecord({ ...input, status: input.status ?? 'scheduled' }, actor);
    ensureConstraints('virtual_classes', [sanitized]);
    const virtualClass = withId(prepareInsert('virtual_classes', sanitized));
    const created = appendAppRows('virtual_classes', [virtualClass]);
    const outboxEvents: OutboxEventInput[] = [];
    appendVirtualClassCreateEvents(this.eventsContext(), created, outboxEvents, actor.id);
    await this.platformPersistenceService.persistRows({ virtual_classes: [virtualClass] }, {
      actorId: actor.id,
      reason: 'learning:formateur:virtual-class:create',
      afterRowsByTable: { virtual_classes: [virtualClass] },
      outboxEvents,
    });
    return created[0] ?? virtualClass;
  }

  async update(classId: string, payload: unknown, user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    const input = this.requireObject(payload, 'Classe virtuelle invalide.');
    await syncAppStoreFromDatabase(this.prisma);
    const virtualClass = this.getInstructorVirtualClass(classId, actor);
    const previous = clone(virtualClass);
    const sanitized = sanitizeVirtualClassRecord({ ...virtualClass, ...input }, actor);
    const updated = patchAppRows('virtual_classes', (row) => String(row.id) === String(virtualClass.id), sanitized);
    const outboxEvents: OutboxEventInput[] = [];
    appendVirtualClassUpdateEvents(this.eventsContext(), [previous], updated, outboxEvents, actor.id);
    await this.platformPersistenceService.persistRows({ virtual_classes: updated }, {
      actorId: actor.id,
      reason: 'learning:formateur:virtual-class:update',
      beforeRowsByTable: { virtual_classes: [previous] },
      afterRowsByTable: { virtual_classes: updated },
      outboxEvents,
    });
    return updated[0] ?? sanitized;
  }

  async updateStatus(classId: string, payload: unknown, user: AuthUser | null) {
    const input = this.requireObject(payload, 'Statut de classe virtuelle invalide.');
    const status = typeof input.status === 'string' ? input.status : null;
    if (!status) {
      throw new BadRequestException('Le statut de la classe virtuelle est obligatoire.');
    }
    return this.update(classId, { status }, user);
  }

  async delete(classId: string, user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    await syncAppStoreFromDatabase(this.prisma);
    const virtualClass = this.getInstructorVirtualClass(classId, actor);
    store.virtual_classes = (store.virtual_classes ?? []).filter((row) => String(row.id) !== String(virtualClass.id));
    recomputeDerivedData();
    await this.platformPersistenceService.deleteRows({ virtual_classes: [String(virtualClass.id)] }, {
      actorId: actor.id,
      reason: 'learning:formateur:virtual-class:delete',
      beforeRowsByTable: { virtual_classes: [virtualClass] },
    });
    return virtualClass;
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

  private getInstructorVirtualClass(classId: string, user: AuthUser) {
    const virtualClass = this.accessibleRows('virtual_classes', user).find((row) => String(row.id) === String(classId));
    if (!virtualClass) {
      throw new NotFoundException('Classe virtuelle introuvable.');
    }
    const course = this.getInstructorCourses(user).find((row) => String(row.id) === String(virtualClass.course_id));
    if (!course) {
      throw new NotFoundException('Classe virtuelle introuvable.');
    }
    return virtualClass;
  }

  private eventsContext() {
    return {
      getCourseEnrollments: (courseId: string) => (store.course_enrollments ?? [])
        .filter((enrollment) => String(enrollment.course_id) === String(courseId))
        .map((enrollment) => ({
          user_id: String(enrollment.student_id),
          student_name: String(enrollment.student_name ?? 'Apprenant'),
        })),
    };
  }

  private compareDatesAsc(left: unknown, right: unknown) {
    const leftDate = Date.parse(String(left ?? ''));
    const rightDate = Date.parse(String(right ?? ''));
    const normalizedLeft = Number.isNaN(leftDate) ? 0 : leftDate;
    const normalizedRight = Number.isNaN(rightDate) ? 0 : rightDate;
    return normalizedLeft - normalizedRight;
  }

  private compareDatesDesc(left: unknown, right: unknown) {
    return this.compareDatesAsc(right, left);
  }
}
