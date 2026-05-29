import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { isAdminRole, type AuthUser } from '../auth/auth.store.js';
import { PlatformPersistenceService } from '../database/platform-persistence.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { appendAppRows, clone, store, syncAppStoreFromDatabase, withId } from '../data/data-app-store.js';
import { filterRowsForActor } from '../data/data-actor-scope.js';
import { applyDataDeleteCascade } from '../data/data-delete-cascade.js';
import { sanitizeExamRecord } from '../data/data-learning-sanitizers.js';
import { ensureConstraints, prepareInsert, recomputeDerivedData } from '../data/data-runtime.js';
import type { Row } from '../data/mock-store.js';
import { LearningAssessmentsReadService } from './learning-assessments-read.service.js';

@Injectable()
export class LearningAssessmentsCommandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly platformPersistenceService: PlatformPersistenceService,
    private readonly learningAssessmentsReadService: LearningAssessmentsReadService,
  ) {}

  async createFormateurExam(payload: unknown, user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    const input = this.requireObject(payload, 'Evaluation invalide.');
    await syncAppStoreFromDatabase(this.prisma);
    const sanitized = sanitizeExamRecord(input, actor);
    ensureConstraints('exams', [sanitized]);
    const exam = withId(prepareInsert('exams', sanitized));
    const created = appendAppRows('exams', [exam]);
    await this.platformPersistenceService.persistRows({ exams: [exam] }, {
      actorId: actor.id,
      reason: 'learning:formateur:exam:create',
      afterRowsByTable: { exams: [exam] },
    });
    return await this.learningAssessmentsReadService.getExamById(String(exam.id), actor) ?? created[0] ?? exam;
  }

  async deleteFormateurExam(examId: string, user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    await syncAppStoreFromDatabase(this.prisma);
    const exam = this.getInstructorExam(examId, actor);
    store.exams = (store.exams ?? []).filter((row) => String(row.id) !== String(exam.id));
    const deletedRowIdsByTable = applyDataDeleteCascade('exams', [exam]);
    recomputeDerivedData();
    await this.platformPersistenceService.deleteRows(deletedRowIdsByTable, {
      actorId: actor.id,
      reason: 'learning:formateur:exam:delete',
      beforeRowsByTable: { exams: [exam] },
    });
    await this.learningAssessmentsReadService.assertExamDeleted(String(exam.id));
    return exam;
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
    return filterRowsForActor(table, clone(store[table] ?? []), user);
  }

  private getInstructorCourses(user: AuthUser) {
    return this.accessibleRows('courses', user).filter((course) =>
      isAdminRole(user) || String(course.instructor_id) === String(user.id)
    );
  }

  private getInstructorExam(examId: string, user: AuthUser) {
    const courseIds = new Set(this.getInstructorCourses(user).map((course) => String(course.id)));
    const exam = this.accessibleRows('exams', user).find((row) =>
      String(row.id) === String(examId)
      && (isAdminRole(user) || courseIds.has(String(row.course_id)) || String(row.instructor_id) === String(user.id))
    );
    if (!exam) {
      throw new NotFoundException('Evaluation introuvable.');
    }
    return exam;
  }
}
