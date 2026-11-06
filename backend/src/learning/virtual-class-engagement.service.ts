import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { isAdminRole, listUsers, type AuthUser } from '../auth/auth.store.js';
import { PlatformPersistenceService } from '../database/platform-persistence.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { appendAppRows, clone, patchAppRows, store, syncAppStoreFromDatabase, withId } from '../data/data-app-store.js';
import { prepareInsert } from '../data/data-runtime.js';
import { buildVirtualClassNotificationRows } from '../data/data-virtual-class-events.js';
import type { Row } from '../data/mock-store.js';
import { LearningCertificationService } from './learning-certification.service.js';

const REMINDER_INTERVAL_MS = 5 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

/** Start of a session from its date (YYYY-MM-DD) and time (HH:mm), Dakar time = UTC. */
export function sessionStart(vclass: Row) {
  const date = String(vclass.class_date ?? '').trim();
  const time = String(vclass.class_time ?? '00:00').trim().slice(0, 5) || '00:00';
  const start = new Date(`${date}T${time}:00Z`);
  return Number.isNaN(start.getTime()) ? null : start;
}

/**
 * Live sessions engagement: attendance (self check-in when joining, or marked by the
 * instructor for on-site sessions) and reminders 24 h and 1 h before each scheduled session.
 */
@Injectable()
export class VirtualClassEngagementService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(VirtualClassEngagementService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly platformPersistenceService: PlatformPersistenceService,
    private readonly learningCertificationService: LearningCertificationService,
  ) {}

  onApplicationBootstrap() {
    const enabled = process.env.LEARNING_REMINDERS === 'true'
      || (process.env.LEARNING_REMINDERS !== 'false' && process.env.NODE_ENV === 'production');
    if (!enabled) return;
    this.timer = setInterval(() => void this.sendDueReminders(), REMINDER_INTERVAL_MS);
    this.timer.unref();
  }

  onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
  }

  /** Learner check-in, recorded when they open the room of a live (or about to start) session. */
  async checkIn(classId: string, user: AuthUser | null) {
    if (!user || user.role !== 'apprenant') throw new ForbiddenException('Seul un apprenant enregistre sa presence.');
    await syncAppStoreFromDatabase(this.prisma);
    const vclass = this.findClass(classId);
    const enrolled = (store.course_enrollments ?? []).some((row) =>
      String(row.course_id) === String(vclass.course_id) && String(row.student_id) === String(user.id));
    if (!enrolled) throw new ForbiddenException('Vous n etes pas inscrit a cette formation.');
    const start = sessionStart(vclass);
    const opensAt = start ? start.getTime() - 15 * 60 * 1000 : 0;
    if (String(vclass.status) !== 'live' && !(String(vclass.status) === 'scheduled' && Date.now() >= opensAt)) {
      return { recorded: false, reason: 'La presence est enregistree a partir de 15 minutes avant le debut.' };
    }
    return this.setAttendance(vclass, String(user.id), true, user, 'self');
  }

  /** Attendance sheet of a session: every enrolled learner with their presence. */
  async getAttendance(classId: string, user: AuthUser | null) {
    const actor = this.requireInstructor(user);
    await syncAppStoreFromDatabase(this.prisma);
    const vclass = this.findInstructorClass(classId, actor);
    const records = (store.class_attendance ?? []).filter((row) => String(row.class_id) === String(vclass.id));
    const names = new Map(listUsers().map((account) => [String(account.id), `${account.firstName} ${account.lastName}`.trim()]));
    const learners = (store.course_enrollments ?? [])
      .filter((row) => String(row.course_id) === String(vclass.course_id))
      .map((row) => {
        const record = records.find((entry) => String(entry.student_id) === String(row.student_id));
        return {
          student_id: String(row.student_id),
          student_name: names.get(String(row.student_id)) || String(row.student_name ?? 'Apprenant'),
          present: Boolean(record?.present),
          source: record?.source ?? null,
          checked_in_at: record?.checked_in_at ?? null,
        };
      });
    return { class_id: vclass.id, title: vclass.title, learners };
  }

  /** Instructor marks a learner present / absent (on-site sessions, corrections). */
  async markAttendance(classId: string, payload: unknown, user: AuthUser | null) {
    const actor = this.requireInstructor(user);
    const input = (payload && typeof payload === 'object' ? payload : {}) as Row;
    const studentId = String(input.student_id ?? '');
    if (!studentId || typeof input.present !== 'boolean') throw new BadRequestException('Apprenant et presence obligatoires.');
    await syncAppStoreFromDatabase(this.prisma);
    const vclass = this.findInstructorClass(classId, actor);
    const enrolled = (store.course_enrollments ?? []).some((row) => String(row.course_id) === String(vclass.course_id) && String(row.student_id) === studentId);
    if (!enrolled) throw new BadRequestException('Cet apprenant n est pas inscrit a cette formation.');
    return this.setAttendance(vclass, studentId, input.present, actor, 'instructor');
  }

  /** Sends the 24 h and 1 h reminders of upcoming sessions (idempotent: flags on the session). */
  async sendDueReminders(now = new Date()) {
    if (this.running) return { sent: 0 };
    this.running = true;
    try {
      await syncAppStoreFromDatabase(this.prisma);
      const notifications: Row[] = [];
      const updatedClasses: Row[] = [];
      const before: Row[] = [];
      for (const vclass of store.virtual_classes ?? []) {
        if (String(vclass.status) !== 'scheduled') continue;
        const start = sessionStart(vclass);
        if (!start) continue;
        const until = start.getTime() - now.getTime();
        const flag = until > 0 && until <= HOUR + 5 * 60 * 1000 && !vclass.reminder_1h_sent_at
          ? 'reminder_1h_sent_at'
          : until > HOUR && until <= 24 * HOUR && !vclass.reminder_24h_sent_at && !vclass.reminder_1h_sent_at ? 'reminder_24h_sent_at' : null;
        if (!flag) continue;
        const rows = buildVirtualClassNotificationRows(this.enrollmentsContext(), vclass, 'live-reminder');
        notifications.push(...rows.map((row) => withId(prepareInsert('notifications', row))));
        before.push(clone(vclass));
        updatedClasses.push(...patchAppRows('virtual_classes', (row) => String(row.id) === String(vclass.id), { [flag]: now.toISOString() }));
      }
      if (!updatedClasses.length) return { sent: 0 };
      const rowsByTable: Record<string, Row[]> = { virtual_classes: updatedClasses };
      if (notifications.length) rowsByTable.notifications = appendAppRows('notifications', notifications);
      await this.platformPersistenceService.persistRows(rowsByTable, {
        actorId: 'system',
        reason: 'learning:virtual-class:reminders',
        beforeRowsByTable: { virtual_classes: before },
        afterRowsByTable: rowsByTable,
      });
      return { sent: notifications.length };
    } catch (error) {
      this.logger.warn(`Virtual class reminders failed: ${error instanceof Error ? error.message : String(error)}`);
      return { sent: 0 };
    } finally {
      this.running = false;
    }
  }

  private async setAttendance(vclass: Row, studentId: string, present: boolean, actor: AuthUser, source: 'self' | 'instructor') {
    const now = new Date().toISOString();
    const existing = (store.class_attendance ?? []).find((row) => String(row.class_id) === String(vclass.id) && String(row.student_id) === studentId);
    let rows: Row[];
    const beforeRowsByTable: Record<string, Row[]> = {};
    if (existing) {
      if (Boolean(existing.present) === present && source === 'self') return { recorded: true, present };
      beforeRowsByTable.class_attendance = [clone(existing)];
      rows = patchAppRows('class_attendance', (row) => String(row.id) === String(existing.id), { present, source, updated_at: now, ...(present ? { checked_in_at: existing.checked_in_at ?? now } : {}) });
    } else {
      rows = appendAppRows('class_attendance', [withId(prepareInsert('class_attendance', {
        class_id: vclass.id,
        course_id: vclass.course_id,
        student_id: studentId,
        present,
        source,
        checked_in_at: present ? now : null,
        created_at: now,
        updated_at: now,
      }))]);
    }
    // Attendance can be a certificate requirement (hybrid / on-site courses).
    const certification = this.learningCertificationService.collect([{ courseId: vclass.course_id, studentId }]);
    await this.platformPersistenceService.persistRows({ class_attendance: rows, ...certification.rowsByTable }, {
      actorId: actor.id,
      reason: `learning:virtual-class:attendance:${source}`,
      beforeRowsByTable: { ...beforeRowsByTable, ...certification.beforeRowsByTable },
      afterRowsByTable: { class_attendance: rows, ...certification.rowsByTable },
    });
    return { recorded: true, present };
  }

  private enrollmentsContext() {
    return {
      getCourseEnrollments: (courseId: string) => (store.course_enrollments ?? [])
        .filter((enrollment) => String(enrollment.course_id) === String(courseId))
        .map((enrollment) => ({ user_id: String(enrollment.student_id), student_name: String(enrollment.student_name ?? 'Apprenant') })),
    };
  }

  private findClass(classId: string) {
    const vclass = (store.virtual_classes ?? []).find((row) => String(row.id) === String(classId));
    if (!vclass) throw new NotFoundException('Classe virtuelle introuvable.');
    return vclass;
  }

  private findInstructorClass(classId: string, user: AuthUser) {
    const vclass = this.findClass(classId);
    const course = (store.courses ?? []).find((row) => String(row.id) === String(vclass.course_id));
    if (!isAdminRole(user) && String(course?.instructor_id) !== String(user.id) && String(vclass.instructor_id) !== String(user.id)) {
      throw new NotFoundException('Classe virtuelle introuvable.');
    }
    return vclass;
  }

  private requireInstructor(user: AuthUser | null) {
    if (!user || (user.role !== 'formateur' && !isAdminRole(user))) throw new ForbiddenException('Reserve au formateur.');
    return user;
  }
}
