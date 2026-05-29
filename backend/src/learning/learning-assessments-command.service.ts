import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { isAdminRole, type AuthUser } from '../auth/auth.store.js';
import { PlatformPersistenceService } from '../database/platform-persistence.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { appendAppRows, clone, patchAppRows, store, syncAppStoreFromDatabase, withId } from '../data/data-app-store.js';
import { filterRowsForActor } from '../data/data-actor-scope.js';
import { applyDataDeleteCascade } from '../data/data-delete-cascade.js';
import { sanitizeExamRecord, sanitizeQuizChoiceRecord, sanitizeQuizQuestionRecord } from '../data/data-learning-sanitizers.js';
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

  async createFormateurQuizQuestion(examId: string, payload: unknown, user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    const input = this.requireObject(payload, 'Question invalide.');
    await syncAppStoreFromDatabase(this.prisma);
    this.getInstructorExam(examId, actor);
    const sanitized = sanitizeQuizQuestionRecord({ ...input, exam_id: examId }, actor);
    ensureConstraints('quiz_questions', [sanitized]);
    const question = withId(prepareInsert('quiz_questions', sanitized));
    const createdQuestions = appendAppRows('quiz_questions', [question]);
    const rowsToPersist: Record<string, Row[]> = { quiz_questions: [question] };
    if (String(question.type) === 'true_false') {
      const choices = [
        sanitizeQuizChoiceRecord({ question_id: question.id, exam_id: examId, label: 'Vrai', value: 'true', is_correct: false }, actor),
        sanitizeQuizChoiceRecord({ question_id: question.id, exam_id: examId, label: 'Faux', value: 'false', is_correct: false }, actor),
      ].map((choice) => withId(prepareInsert('quiz_choices', choice)));
      ensureConstraints('quiz_choices', choices);
      appendAppRows('quiz_choices', choices);
      rowsToPersist.quiz_choices = choices;
    }
    await this.platformPersistenceService.persistRows(rowsToPersist, {
      actorId: actor.id,
      reason: 'learning:formateur:quiz-question:create',
      afterRowsByTable: rowsToPersist,
    });
    return await this.learningAssessmentsReadService.getQuestionById(String(question.id), actor) ?? createdQuestions[0] ?? question;
  }

  async updateFormateurQuizQuestion(questionId: string, payload: unknown, user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    const input = this.requireObject(payload, 'Question invalide.');
    await syncAppStoreFromDatabase(this.prisma);
    const question = this.getInstructorQuestion(questionId, actor);
    const previousQuestion = clone(question);
    const existingChoices = (store.quiz_choices ?? []).filter((choice) => String(choice.question_id) === String(question.id));
    const sanitized = sanitizeQuizQuestionRecord({ ...question, ...input, exam_id: question.exam_id }, actor);
    const updatedQuestions = patchAppRows('quiz_questions', (row) => String(row.id) === String(question.id), sanitized);
    const rowsToPersist: Record<string, Row[]> = { quiz_questions: updatedQuestions };
    const beforeRowsByTable: Record<string, Row[]> = { quiz_questions: [previousQuestion] };
    let deletedRowIdsByTable: Record<string, string[]> = {};
    if (String(sanitized.type) === 'open' && existingChoices.length > 0) {
      store.quiz_choices = (store.quiz_choices ?? []).filter((choice) => String(choice.question_id) !== String(question.id));
      deletedRowIdsByTable = { quiz_choices: existingChoices.map((choice) => String(choice.id)) };
      beforeRowsByTable.quiz_choices = existingChoices;
      recomputeDerivedData();
    }
    if (String(sanitized.type) === 'true_false' && existingChoices.length === 0) {
      const choices = [
        sanitizeQuizChoiceRecord({ question_id: question.id, exam_id: question.exam_id, label: 'Vrai', value: 'true', is_correct: false }, actor),
        sanitizeQuizChoiceRecord({ question_id: question.id, exam_id: question.exam_id, label: 'Faux', value: 'false', is_correct: false }, actor),
      ].map((choice) => withId(prepareInsert('quiz_choices', choice)));
      appendAppRows('quiz_choices', choices);
      rowsToPersist.quiz_choices = choices;
    }
    await this.platformPersistenceService.persistRows(rowsToPersist, {
      actorId: actor.id,
      reason: 'learning:formateur:quiz-question:update',
      beforeRowsByTable,
      afterRowsByTable: rowsToPersist,
    });
    await this.platformPersistenceService.deleteRows(deletedRowIdsByTable, {
      actorId: actor.id,
      reason: 'learning:formateur:quiz-question:update:choices-delete',
      beforeRowsByTable,
    });
    return await this.learningAssessmentsReadService.getQuestionById(String(question.id), actor) ?? updatedQuestions[0] ?? sanitized;
  }

  async deleteFormateurQuizQuestion(questionId: string, user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    await syncAppStoreFromDatabase(this.prisma);
    const question = this.getInstructorQuestion(questionId, actor);
    store.quiz_questions = (store.quiz_questions ?? []).filter((row) => String(row.id) !== String(question.id));
    const deletedRowIdsByTable = applyDataDeleteCascade('quiz_questions', [question]);
    recomputeDerivedData();
    await this.platformPersistenceService.deleteRows(deletedRowIdsByTable, {
      actorId: actor.id,
      reason: 'learning:formateur:quiz-question:delete',
      beforeRowsByTable: { quiz_questions: [question] },
    });
    await this.learningAssessmentsReadService.assertQuestionDeleted(String(question.id));
    return question;
  }

  async reorderFormateurQuizQuestion(examId: string, payload: unknown, user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    const input = this.parseReorderPayload(payload);
    await syncAppStoreFromDatabase(this.prisma);
    this.getInstructorExam(examId, actor);
    const current = this.getInstructorQuestion(input.currentId, actor);
    const target = this.getInstructorQuestion(input.targetId, actor);
    if (String(current.exam_id) !== String(examId) || String(target.exam_id) !== String(examId)) {
      throw new BadRequestException('Deplacement de question invalide.');
    }
    const previous = [clone(current), clone(target)];
    const updated = [
      ...patchAppRows('quiz_questions', (row) => String(row.id) === String(current.id), { position: target.position }),
      ...patchAppRows('quiz_questions', (row) => String(row.id) === String(target.id), { position: current.position }),
    ];
    await this.platformPersistenceService.persistRows({ quiz_questions: updated }, {
      actorId: actor.id,
      reason: 'learning:formateur:quiz-question:reorder',
      beforeRowsByTable: { quiz_questions: previous },
      afterRowsByTable: { quiz_questions: updated },
    });
    return await this.learningAssessmentsReadService.getQuestionsByIds(updated.map((row) => String(row.id)), actor) ?? updated;
  }

  async createFormateurQuizChoice(examId: string, payload: unknown, user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    const input = this.requireObject(payload, 'Choix invalide.');
    await syncAppStoreFromDatabase(this.prisma);
    this.getInstructorExam(examId, actor);
    const rowsToPersist = this.resetCorrectChoices(input, actor);
    const questionId = input.question_id ?? input.questionId;
    const sanitized = sanitizeQuizChoiceRecord({ ...input, question_id: questionId, exam_id: examId }, actor);
    const choice = withId(prepareInsert('quiz_choices', sanitized));
    appendAppRows('quiz_choices', [choice]);
    rowsToPersist.quiz_choices = [...(rowsToPersist.quiz_choices ?? []), choice];
    await this.platformPersistenceService.persistRows(rowsToPersist, {
      actorId: actor.id,
      reason: 'learning:formateur:quiz-choice:create',
      afterRowsByTable: rowsToPersist,
    });
    return await this.learningAssessmentsReadService.getChoiceById(String(choice.id), actor) ?? choice;
  }

  async updateFormateurQuizChoice(choiceId: string, payload: unknown, user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    const input = this.requireObject(payload, 'Choix invalide.');
    await syncAppStoreFromDatabase(this.prisma);
    const choice = this.getInstructorChoice(choiceId, actor);
    const previous = clone(choice);
    const rowsToPersist = this.resetCorrectChoices(input, actor);
    const sanitized = sanitizeQuizChoiceRecord({ ...choice, ...input, question_id: choice.question_id, exam_id: choice.exam_id }, actor);
    const updated = patchAppRows('quiz_choices', (row) => String(row.id) === String(choice.id), sanitized);
    rowsToPersist.quiz_choices = [...(rowsToPersist.quiz_choices ?? []), ...updated];
    await this.platformPersistenceService.persistRows(rowsToPersist, {
      actorId: actor.id,
      reason: 'learning:formateur:quiz-choice:update',
      beforeRowsByTable: { quiz_choices: [previous] },
      afterRowsByTable: rowsToPersist,
    });
    return await this.learningAssessmentsReadService.getChoiceById(String(choice.id), actor) ?? updated[0] ?? sanitized;
  }

  async deleteFormateurQuizChoice(examId: string, choiceId: string, user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    await syncAppStoreFromDatabase(this.prisma);
    this.getInstructorExam(examId, actor);
    const choice = this.getInstructorChoice(choiceId, actor);
    if (String(choice.exam_id) !== String(examId)) {
      throw new BadRequestException('Choix invalide.');
    }
    store.quiz_choices = (store.quiz_choices ?? []).filter((row) => String(row.id) !== String(choice.id));
    recomputeDerivedData();
    await this.platformPersistenceService.deleteRows({ quiz_choices: [String(choice.id)] }, {
      actorId: actor.id,
      reason: 'learning:formateur:quiz-choice:delete',
      beforeRowsByTable: { quiz_choices: [choice] },
    });
    await this.learningAssessmentsReadService.assertChoiceDeleted(String(choice.id));
    return choice;
  }

  async reorderFormateurQuizChoice(examId: string, payload: unknown, user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    const input = this.parseReorderPayload(payload);
    await syncAppStoreFromDatabase(this.prisma);
    this.getInstructorExam(examId, actor);
    const current = this.getInstructorChoice(input.currentId, actor);
    const target = this.getInstructorChoice(input.targetId, actor);
    if (String(current.exam_id) !== String(examId) || String(target.exam_id) !== String(examId)) {
      throw new BadRequestException('Deplacement de choix invalide.');
    }
    const previous = [clone(current), clone(target)];
    const updated = [
      ...patchAppRows('quiz_choices', (row) => String(row.id) === String(current.id), { position: target.position }),
      ...patchAppRows('quiz_choices', (row) => String(row.id) === String(target.id), { position: current.position }),
    ];
    await this.platformPersistenceService.persistRows({ quiz_choices: updated }, {
      actorId: actor.id,
      reason: 'learning:formateur:quiz-choice:reorder',
      beforeRowsByTable: { quiz_choices: previous },
      afterRowsByTable: { quiz_choices: updated },
    });
    return await this.learningAssessmentsReadService.getChoicesByIds(updated.map((row) => String(row.id)), actor) ?? updated;
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

  private parseReorderPayload(payload: unknown) {
    const input = this.requireObject(payload, 'Deplacement invalide.');
    const currentId = input.currentId ?? input.current_id;
    const targetId = input.targetId ?? input.target_id;
    if (!this.isScalarId(currentId) || !this.isScalarId(targetId)) {
      throw new BadRequestException('Deplacement invalide.');
    }
    return { currentId: String(currentId), targetId: String(targetId) };
  }

  private isScalarId(value: unknown): value is string | number | boolean {
    return ['string', 'number', 'boolean'].includes(typeof value);
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

  private getInstructorQuestion(questionId: string, user: AuthUser) {
    const question = this.accessibleRows('quiz_questions', user).find((row) => String(row.id) === String(questionId));
    if (!question) {
      throw new NotFoundException('Question introuvable.');
    }
    this.getInstructorExam(String(question.exam_id), user);
    return question;
  }

  private getInstructorChoice(choiceId: string, user: AuthUser) {
    const choice = this.accessibleRows('quiz_choices', user).find((row) => String(row.id) === String(choiceId));
    if (!choice) {
      throw new NotFoundException('Choix introuvable.');
    }
    this.getInstructorExam(String(choice.exam_id), user);
    return choice;
  }

  private resetCorrectChoices(input: Row, user: AuthUser) {
    const resetIds = Array.isArray(input.resetOtherCorrectChoices)
      ? input.resetOtherCorrectChoices.map(String)
      : [];
    if (resetIds.length === 0) {
      return {} as Record<string, Row[]>;
    }
    const allowed = new Set(resetIds);
    const candidates = this.accessibleRows('quiz_choices', user)
      .filter((choice) => allowed.has(String(choice.id)));
    const updated = patchAppRows('quiz_choices', (choice) => allowed.has(String(choice.id)), { is_correct: false });
    return candidates.length > 0 ? { quiz_choices: updated } : {};
  }
}
