import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { isAdminRole, listUsers, type AuthUser } from '../auth/auth.store.js';
import { PlatformPersistenceService } from '../database/platform-persistence.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { appendAppRows, clone, patchAppRows, store, syncAppStoreFromDatabase, withId } from '../data/data-app-store.js';
import { filterRowsForActor } from '../data/data-actor-scope.js';
import { enrollmentPairsForCourses } from '../data/data-certification.js';
import { sanitizeExamRecord } from '../data/data-learning-sanitizers.js';
import { toNumber } from '../data/data-normalizers.js';
import { prepareInsert } from '../data/data-runtime.js';
import type { Row } from '../data/mock-store.js';
import { createAppNotificationRow } from '../notifications/notification-payloads.js';
import { LearningCertificationService } from './learning-certification.service.js';

/** Fields an instructor may change on an existing exam. */
const EDITABLE_FIELDS = ['title', 'instructions', 'exam_date', 'max_grade', 'passing_grade', 'max_attempts', 'timer_minutes', 'attachments'] as const;

/** Allowed status changes: open a planned exam, close it, reopen it, or unpublish it. */
const TRANSITIONS: Record<string, string[]> = {
  upcoming: ['ongoing'],
  ongoing: ['closed', 'upcoming'],
  closed: ['ongoing'],
  graded: ['ongoing', 'closed'],
};

/** Grace period after a quiz countdown before the attempt is flagged as over time. */
const TIMER_GRACE_MS = 2 * 60 * 1000;

/** End of the day of an exam's date (the deadline), or null when the date is not parseable. */
export function examDeadline(exam: Row) {
  const raw = String(exam.exam_date ?? '').trim();
  if (!raw) return null;
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T23:59:59` : raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

@Injectable()
export class ExamLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly platformPersistenceService: PlatformPersistenceService,
    private readonly learningCertificationService: LearningCertificationService,
  ) {}

  async updateExam(examId: string, payload: unknown, user: AuthUser | null) {
    const actor = this.requireFormateur(user);
    const input = this.requireObject(payload);
    await syncAppStoreFromDatabase(this.prisma);
    const exam = this.getInstructorExam(examId, actor);
    const changes: Row = {};
    for (const field of EDITABLE_FIELDS) {
      if (field in input) changes[field] = input[field];
    }
    const graded = (store.submissions ?? []).some((row) => String(row.exam_id) === String(exam.id) && String(row.status) === 'graded');
    if ('max_grade' in changes && Number(changes.max_grade) !== Number(exam.max_grade) && graded) {
      throw new BadRequestException('Le bareme ne peut plus changer : des copies sont deja notees sur cette base.');
    }
    const previous = clone(exam);
    const sanitized = sanitizeExamRecord({ ...exam, ...changes }, actor);
    const updated = patchAppRows('exams', (row) => String(row.id) === String(exam.id), { ...sanitized, updated_at: new Date().toISOString() });
    // Pass marks may have changed: refresh the learners' certificates of this course.
    const certification = this.learningCertificationService.collect(enrollmentPairsForCourses([String(exam.course_id)]));
    await this.platformPersistenceService.persistRows({ exams: updated, ...certification.rowsByTable }, {
      actorId: actor.id,
      reason: 'learning:formateur:exam:update',
      beforeRowsByTable: { exams: [previous], ...certification.beforeRowsByTable },
      afterRowsByTable: { exams: updated, ...certification.rowsByTable },
    });
    return updated[0];
  }

  /** Open / close / reopen / unpublish an exam. Opening notifies the enrolled learners. */
  async changeStatus(examId: string, payload: unknown, user: AuthUser | null) {
    const actor = this.requireFormateur(user);
    const status = String(this.requireObject(payload).status ?? '');
    await syncAppStoreFromDatabase(this.prisma);
    const exam = this.getInstructorExam(examId, actor);
    const current = String(exam.status ?? 'upcoming');
    if (!(TRANSITIONS[current] ?? []).includes(status)) {
      throw new BadRequestException(`Transition impossible : ${current} -> ${status || '?'}.`);
    }
    const hasSubmissions = (store.submissions ?? []).some((row) => String(row.exam_id) === String(exam.id));
    if (status === 'upcoming' && hasSubmissions) {
      throw new BadRequestException('Des apprenants ont deja rendu leur copie : fermez l evaluation plutot que de la depublier.');
    }
    if (status === 'ongoing' && String(exam.type) === 'quiz') {
      const questions = (store.quiz_questions ?? []).filter((row) => String(row.exam_id) === String(exam.id));
      if (!questions.length) throw new BadRequestException('Ajoutez au moins une question avant d ouvrir ce quiz.');
    }
    const previous = clone(exam);
    const now = new Date().toISOString();
    const updated = patchAppRows('exams', (row) => String(row.id) === String(exam.id), {
      status,
      updated_at: now,
      ...(status === 'ongoing' ? { opened_at: now, closed_at: null } : {}),
      ...(status === 'closed' ? { closed_at: now } : {}),
    });
    const rowsByTable: Record<string, Row[]> = { exams: updated };
    if (status === 'ongoing' && current !== 'closed') {
      const notifications = this.learnerIds(exam.course_id).map((studentId) => withId(prepareInsert('notifications', createAppNotificationRow({
        userId: studentId,
        title: 'Nouvelle evaluation disponible',
        message: `« ${String(exam.title)} » est ouverte pour ${String(exam.course_name ?? 'votre formation')}${examDeadline(exam) ? ` jusqu au ${examDeadline(exam)?.toLocaleDateString('fr-FR')}` : ''}.`,
        type: 'evaluation',
        link: '/dashboard/apprenant/examens',
        metadata: { exam_id: exam.id, course_id: exam.course_id },
      }))));
      if (notifications.length) rowsByTable.notifications = appendAppRows('notifications', notifications);
    }
    await this.platformPersistenceService.persistRows(rowsByTable, {
      actorId: actor.id,
      reason: `learning:formateur:exam:status:${status}`,
      beforeRowsByTable: { exams: [previous] },
      afterRowsByTable: rowsByTable,
    });
    return updated[0];
  }

  /**
   * Starts (or resumes) a timed quiz attempt. The deadline is fixed server-side at the first
   * opening, so reloading the page does not restart the countdown.
   */
  async startQuiz(examId: string, user: AuthUser | null) {
    if (!user || user.role !== 'apprenant') throw new ForbiddenException('Seul un apprenant peut demarrer un quiz.');
    await syncAppStoreFromDatabase(this.prisma);
    const exam = this.accessibleRows('exams', user).find((row) => String(row.id) === String(examId));
    if (!exam || String(exam.status) !== 'ongoing') throw new NotFoundException('Evaluation indisponible.');
    const timer = toNumber(exam.timer_minutes) ?? 0;
    const submission = (store.submissions ?? []).find((row) => String(row.exam_id) === String(exam.id) && String(row.student_id) === String(user.id));
    const attempt = (toNumber(submission?.attempt) ?? 0) + 1;
    if (timer <= 0) return { timer_minutes: 0, started_at: null, deadline: null, attempt };
    const existing = (store.exam_sessions ?? []).find((row) =>
      String(row.exam_id) === String(exam.id) && String(row.student_id) === String(user.id) && Number(row.attempt) === attempt);
    if (existing) return { timer_minutes: timer, started_at: existing.started_at, deadline: existing.deadline, attempt };
    const startedAt = new Date();
    const session = withId(prepareInsert('exam_sessions', {
      exam_id: exam.id,
      course_id: exam.course_id,
      student_id: user.id,
      attempt,
      started_at: startedAt.toISOString(),
      deadline: new Date(startedAt.getTime() + timer * 60_000).toISOString(),
      created_at: startedAt.toISOString(),
    }));
    appendAppRows('exam_sessions', [session]);
    await this.platformPersistenceService.persistRows({ exam_sessions: [session] }, {
      actorId: user.id,
      reason: 'learning:apprenant:exam:start',
      afterRowsByTable: { exam_sessions: [session] },
    });
    return { timer_minutes: timer, started_at: session.started_at, deadline: session.deadline, attempt };
  }

  /**
   * Flags a submission made after the exam date (late) or after the quiz countdown (over time).
   * Late work is still accepted and corrected, as on OpenClassrooms; the instructor sees the flag.
   */
  static submissionFlags(exam: Row, studentId: string, attempt: number, now = new Date()) {
    const deadline = examDeadline(exam);
    const late = Boolean(deadline && now.getTime() > deadline.getTime());
    const session = (store.exam_sessions ?? []).find((row) =>
      String(row.exam_id) === String(exam.id) && String(row.student_id) === studentId && Number(row.attempt) === attempt);
    const overTime = Boolean(session?.deadline && now.getTime() > Date.parse(String(session.deadline)) + TIMER_GRACE_MS);
    return { late, time_exceeded: overTime, started_at: session?.started_at ?? null };
  }

  private learnerIds(courseId: unknown) {
    const accounts = new Set(listUsers().map((account) => String(account.id)));
    return [...new Set((store.course_enrollments ?? [])
      .filter((row) => String(row.course_id) === String(courseId) && !['cancelled', 'refunded', 'revoked'].includes(String(row.status)))
      .map((row) => String(row.student_id))
      .filter((id) => accounts.has(id)))];
  }

  private getInstructorExam(examId: string, user: AuthUser) {
    const exam = this.accessibleRows('exams', user).find((row) => String(row.id) === String(examId));
    const course = exam ? (store.courses ?? []).find((row) => String(row.id) === String(exam.course_id)) : null;
    if (!exam || (!isAdminRole(user) && String(course?.instructor_id) !== String(user.id) && String(exam.instructor_id) !== String(user.id))) {
      throw new NotFoundException('Evaluation introuvable.');
    }
    return exam;
  }

  private accessibleRows(table: string, user: AuthUser) {
    return filterRowsForActor(table, store[table] ?? [], user);
  }

  private requireFormateur(user: AuthUser | null) {
    if (!user || (user.role !== 'formateur' && !isAdminRole(user))) {
      throw new ForbiddenException('Seul un formateur peut modifier une evaluation.');
    }
    return user;
  }

  private requireObject(payload: unknown): Row {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new BadRequestException('Donnees invalides.');
    return payload as Row;
  }
}
