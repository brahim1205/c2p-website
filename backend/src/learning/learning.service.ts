import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { findUserById, isAdminRole, type AuthUser } from '../auth/auth.store.js';
import { PlatformPersistenceService } from '../database/platform-persistence.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { createAppNotificationRow } from '../notifications/notification-payloads.js';
import {
  appendAppRows,
  clone,
  findRow,
  patchAppRows,
  store,
  syncAppStoreFromDatabase,
  withId,
} from '../data/data-app-store.js';
import { filterRowsForActor } from '../data/data-actor-scope.js';
import { applyDataDeleteCascade } from '../data/data-delete-cascade.js';
import {
  sanitizeQuizChoiceRecord,
  sanitizeQuizQuestionRecord,
  sanitizeSubmissionRecord,
  sanitizeSubmissionUpdateRecord,
} from '../data/data-learning-sanitizers.js';
import { toNumber } from '../data/data-normalizers.js';
import { ensureConstraints, prepareInsert, recomputeDerivedData } from '../data/data-runtime.js';
import { hydrateRows } from '../data/data-row-hydration.js';
import type { Row } from '../data/mock-store.js';
import { LearningAssessmentsCommandService } from './learning-assessments-command.service.js';
import { LearningAssessmentsReadService } from './learning-assessments-read.service.js';
type ProgressPayload = { progress?: unknown; completedLessons?: unknown; completedLessonIds?: unknown };
@Injectable()
export class LearningService {
  constructor(private readonly prisma: PrismaService, private readonly platformPersistenceService: PlatformPersistenceService, private readonly learningAssessmentsReadService: LearningAssessmentsReadService, private readonly learningAssessmentsCommandService: LearningAssessmentsCommandService) {}

  async getApprenantExamsSnapshot(user: AuthUser | null) {
    const actor = this.requireLearningActor(user);
    if (actor.role !== 'apprenant' && !isAdminRole(actor)) {
      throw new ForbiddenException('Seul un apprenant peut consulter ses examens.');
    }
    const prismaSnapshot = await this.learningAssessmentsReadService.getApprenantExamsSnapshot(actor);
    if (prismaSnapshot) return prismaSnapshot;
    await syncAppStoreFromDatabase(this.prisma);
    const enrollments = this.accessibleRows('course_enrollments', actor);
    const courseIds = new Set(enrollments.map((enrollment) => String(enrollment.course_id)));
    const exams = this.accessibleRows('exams', actor)
      .filter((exam) => courseIds.has(String(exam.course_id)) && String(exam.status ?? 'ongoing') === 'ongoing')
      .sort((left, right) => this.compareDatesDesc(left.exam_date ?? left.created_at, right.exam_date ?? right.created_at));
    const submissions = this.accessibleRows('submissions', actor)
      .sort((left, right) => this.compareDatesDesc(left.submitted_at ?? left.created_at, right.submitted_at ?? right.created_at));
    return {
      exams: exams.map((exam) => this.toApprenantExam(exam)),
      submissions,
    };
  }
  async getApprenantEnrollments(user: AuthUser | null, options: { limit?: unknown } = {}) {
    const actor = this.requireApprenantReadActor(user);
    await syncAppStoreFromDatabase(this.prisma);
    const limit = this.parseOptionalLimit(options.limit);
    const rows = hydrateRows('course_enrollments', this.accessibleRows('course_enrollments', actor))
      .sort((left, right) => this.compareDatesDesc(left.last_active ?? left.enrolled_at, right.last_active ?? right.enrolled_at));
    return typeof limit === 'number' ? rows.slice(0, limit) : rows;
  }
  async getApprenantCertificates(user: AuthUser | null, options: { limit?: unknown; status?: unknown } = {}) {
    const actor = this.requireApprenantReadActor(user);
    await syncAppStoreFromDatabase(this.prisma);
    const limit = this.parseOptionalLimit(options.limit);
    const status = this.text(options.status);
    const prismaRows = await this.learningAssessmentsReadService.getApprenantCertificates(actor, { limit, status });
    if (prismaRows) return prismaRows;
    let rows = hydrateRows('certificates', this.accessibleRows('certificates', actor))
      .sort((left, right) => this.compareDatesDesc(left.created_at ?? left.issued_at, right.created_at ?? right.issued_at));
    if (status) {
      rows = rows.filter((row) => String(row.status) === status);
    }
    return typeof limit === 'number' ? rows.slice(0, limit) : rows;
  }
  async getApprenantDashboardSnapshot(user: AuthUser | null) {
    const [enrollments, certificates] = await Promise.all([
      this.getApprenantEnrollments(user, { limit: 5 }),
      this.getApprenantCertificates(user, { limit: 5, status: 'issued' }),
    ]);
    return { enrollments, certificates };
  }
  async getApprenantProgressionSnapshot(user: AuthUser | null) {
    const actor = this.requireApprenantReadActor(user);
    await syncAppStoreFromDatabase(this.prisma);
    const [enrollments, certificates] = await Promise.all([
      this.getApprenantEnrollments(actor),
      this.getApprenantCertificates(actor),
    ]);
    const submissions = (await this.learningAssessmentsReadService.getApprenantSubmissions(actor)) ?? hydrateRows('submissions', this.accessibleRows('submissions', actor))
      .sort((left, right) => this.compareDatesDesc(left.submitted_at ?? left.created_at, right.submitted_at ?? right.created_at));
    return { enrollments, certificates, submissions };
  }
  async getParentDashboardSnapshot(user: AuthUser | null) {
    const actor = this.requireParentActor(user);
    await syncAppStoreFromDatabase(this.prisma);
    const links = hydrateRows('student_guardians', this.accessibleRows('student_guardians', actor))
      .filter((link) => String(link.status ?? 'active') === 'active')
      .sort((left, right) => this.compareDatesAsc(left.created_at, right.created_at));
    const studentIds = new Set(links.map((link) => String(link.student_id)).filter(Boolean));
    if (studentIds.size === 0) {
      return { links, enrollments: [], certificates: [] };
    }
    const enrollments = hydrateRows('course_enrollments', this.accessibleRows('course_enrollments', actor))
      .filter((enrollment) => studentIds.has(String(enrollment.student_id)))
      .sort((left, right) => this.compareDatesDesc(left.last_active ?? left.enrolled_at, right.last_active ?? right.enrolled_at));
    const certificates = (await this.learningAssessmentsReadService.getCertificatesForStudents([...studentIds])) ?? hydrateRows('certificates', this.accessibleRows('certificates', actor))
      .filter((certificate) => studentIds.has(String(certificate.student_id)))
      .sort((left, right) => this.compareDatesDesc(left.issued_at ?? left.completion_date, right.issued_at ?? right.completion_date));
    return { links, enrollments, certificates };
  }
  async getApprenantQuizStructure(examId: string, user: AuthUser | null) {
    const actor = this.requireLearningActor(user);
    if (actor.role !== 'apprenant' && !isAdminRole(actor)) {
      throw new ForbiddenException('Seul un apprenant peut consulter ce quiz.');
    }
    const prismaQuiz = await this.learningAssessmentsReadService.getQuizStructure(examId, actor, { includeCorrect: false });
    if (prismaQuiz) return prismaQuiz;
    await syncAppStoreFromDatabase(this.prisma);
    this.getAccessibleExam(examId, actor);
    const questions = this.accessibleRows('quiz_questions', actor)
      .filter((question) => String(question.exam_id) === String(examId))
      .sort((left, right) => this.position(left) - this.position(right));
    const questionIds = new Set(questions.map((question) => String(question.id)));
    const choices = this.accessibleRows('quiz_choices', actor)
      .filter((choice) => String(choice.exam_id) === String(examId) || questionIds.has(String(choice.question_id)))
      .sort((left, right) => this.position(left) - this.position(right))
      .map((choice) => {
        const safeChoice = clone(choice);
        delete safeChoice.is_correct;
        return safeChoice;
      });
    return { questions, choices };
  }
  async submitApprenantExam(examId: string, payload: unknown, user: AuthUser | null) {
    const actor = this.requireLearningActor(user);
    if (actor.role !== 'apprenant') {
      throw new ForbiddenException('Seul un apprenant peut soumettre une evaluation.');
    }
    await syncAppStoreFromDatabase(this.prisma);
    const exam = this.getAccessibleExam(examId, actor);
    if (String(exam.status ?? 'ongoing') !== 'ongoing') {
      throw new BadRequestException('Cette evaluation n est pas ouverte.');
    }
    if ((store.submissions ?? []).some((submission) =>
      String(submission.exam_id) === String(exam.id) && String(submission.student_id) === String(actor.id),
    )) {
      throw new ConflictException('Cette evaluation a deja ete soumise.');
    }
    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException('Soumission invalide.');
    }
    const raw = payload as Row;
    const sanitized = sanitizeSubmissionRecord({
      ...raw,
      exam_id: exam.id,
      student_id: actor.id,
      student_name: `${actor.firstName} ${actor.lastName}`.trim() || actor.id,
    }, actor);
    ensureConstraints('submissions', [sanitized]);
    const submission = withId(prepareInsert('submissions', sanitized));
    const createdSubmissions = appendAppRows('submissions', [submission]);
    const rowsToPersist: Record<string, Row[]> = {
      submissions: [submission],
    };
    if (String(submission.status) !== 'graded' && exam.instructor_id) {
      const notification = withId(prepareInsert('notifications', createAppNotificationRow({
        userId: String(exam.instructor_id),
        title: 'Nouvelle soumission a corriger',
        message: `Un apprenant a soumis sa reponse pour "${this.text(exam.title, 'Evaluation')}"`,
        type: 'evaluation',
        link: '/dashboard/formateur/evaluations',
        metadata: {
          exam_id: exam.id,
          course_id: exam.course_id ?? null,
          student_id: actor.id,
        },
      })));
      rowsToPersist.notifications = appendAppRows('notifications', [notification]);
    }
    await this.platformPersistenceService.persistRows(rowsToPersist, {
      actorId: actor.id,
      reason: 'learning:apprenant:exam:submit',
      afterRowsByTable: rowsToPersist,
    });
    return await this.learningAssessmentsReadService.getSubmissionById(String(submission.id), actor) ?? createdSubmissions[0] ?? submission;
  }
  async getFormateurEvaluationsSnapshot(user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    const prismaSnapshot = await this.learningAssessmentsReadService.getFormateurEvaluationsSnapshot(actor);
    if (prismaSnapshot) return prismaSnapshot;
    await syncAppStoreFromDatabase(this.prisma);
    const courses = this.getInstructorCourses(actor)
      .sort((left, right) => this.compareDatesDesc(left.updated_at ?? left.created_at, right.updated_at ?? right.created_at));
    const courseIds = new Set(courses.map((course) => String(course.id)));
    const exams = hydrateRows('exams', this.accessibleRows('exams', actor))
      .filter((exam) => courseIds.has(String(exam.course_id)))
      .sort((left, right) => this.compareDatesDesc(left.exam_date ?? left.created_at, right.exam_date ?? right.created_at));
    const examIds = new Set(exams.map((exam) => String(exam.id)));
    const submissions = hydrateRows('submissions', this.accessibleRows('submissions', actor))
      .filter((submission) => examIds.has(String(submission.exam_id)))
      .sort((left, right) => this.compareDatesDesc(left.submitted_at ?? left.created_at, right.submitted_at ?? right.created_at));
    return {
      exams,
      submissions,
      courses: courses.map((course) => ({
        id: course.id,
        title: course.title,
        delivery_mode: course.delivery_mode,
      })),
    };
  }
  async createFormateurExam(payload: unknown, user: AuthUser | null) {
    return this.learningAssessmentsCommandService.createFormateurExam(payload, user);
  }
  async deleteFormateurExam(examId: string, user: AuthUser | null) {
    return this.learningAssessmentsCommandService.deleteFormateurExam(examId, user);
  }
  async getFormateurQuizStructure(examId: string, user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    const prismaQuiz = await this.learningAssessmentsReadService.getQuizStructure(examId, actor, { includeCorrect: true });
    if (prismaQuiz) return prismaQuiz;
    await syncAppStoreFromDatabase(this.prisma);
    this.getInstructorExam(examId, actor);
    const questions = hydrateRows('quiz_questions', this.accessibleRows('quiz_questions', actor))
      .filter((question) => String(question.exam_id) === String(examId))
      .sort((left, right) => this.position(left) - this.position(right));
    const questionIds = new Set(questions.map((question) => String(question.id)));
    const choices = hydrateRows('quiz_choices', this.accessibleRows('quiz_choices', actor))
      .filter((choice) => String(choice.exam_id) === String(examId) || questionIds.has(String(choice.question_id)))
      .sort((left, right) => this.position(left) - this.position(right));
    return { questions, choices };
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
    await this.learningAssessmentsReadService.assertQuestionDeleted(String(question.id)); return question;
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
    await this.learningAssessmentsReadService.assertChoiceDeleted(String(choice.id)); return choice;
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
  async gradeFormateurSubmission(submissionId: string, payload: unknown, user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    const input = this.requireObject(payload, 'Correction invalide.');
    await syncAppStoreFromDatabase(this.prisma);
    const submission = this.accessibleRows('submissions', actor).find((row) => String(row.id) === String(submissionId));
    if (!submission) {
      throw new NotFoundException('Soumission introuvable.');
    }
    this.getInstructorExam(String(submission.exam_id), actor);
    const previous = clone(submission);
    const sanitized = sanitizeSubmissionUpdateRecord(submission, input, actor);
    const updated = patchAppRows('submissions', (row) => String(row.id) === String(submission.id), sanitized);
    const rowsToPersist: Record<string, Row[]> = { submissions: updated };
    if (submission.student_id) {
      const notification = withId(prepareInsert('notifications', createAppNotificationRow({
        userId: String(submission.student_id),
        title: 'Note publiee',
        message: `Votre evaluation "${this.text(input.examTitle, 'Evaluation')}" a ete corrigee.`,
        type: 'evaluation',
        link: '/dashboard/apprenant/examens',
        metadata: {
          exam_id: submission.exam_id ?? null,
          submission_id: submission.id,
          grade: sanitized.grade,
          max_grade: input.maxGrade ?? null,
        },
      })));
      rowsToPersist.notifications = appendAppRows('notifications', [notification]);
    }
    await this.platformPersistenceService.persistRows(rowsToPersist, {
      actorId: actor.id,
      reason: 'learning:formateur:submission:grade',
      beforeRowsByTable: { submissions: [previous] },
      afterRowsByTable: rowsToPersist,
    });
    return await this.learningAssessmentsReadService.getSubmissionById(String(submission.id), actor) ?? updated[0] ?? sanitized;
  }
  private requireLearningActor(user: AuthUser | null) {
    if (!user) {
      throw new ForbiddenException('Authentification requise.');
    }
    return user;
  }
  private requireFormateurActor(user: AuthUser | null) {
    const actor = this.requireLearningActor(user);
    if (actor.role !== 'formateur' && !isAdminRole(actor)) {
      throw new ForbiddenException('Seul un formateur peut acceder a ces donnees.');
    }
    return actor;
  }
  private requireApprenantReadActor(user: AuthUser | null) {
    const actor = this.requireLearningActor(user);
    if (actor.role !== 'apprenant' && !isAdminRole(actor)) {
      throw new ForbiddenException('Seul un apprenant peut consulter ces donnees.');
    }
    return actor;
  }
  private requireParentActor(user: AuthUser | null) {
    const actor = this.requireLearningActor(user);
    if (actor.role !== 'parent' && !isAdminRole(actor)) {
      throw new ForbiddenException('Seul un parent peut consulter ces donnees.');
    }
    return actor;
  }
  private accessibleRows(table: string, user: AuthUser) {
    return filterRowsForActor(table, clone(store[table] ?? []), user);
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
    if (currentId === undefined || currentId === null || targetId === undefined || targetId === null) {
      throw new BadRequestException('Deplacement invalide.');
    }
    return { currentId: String(currentId), targetId: String(targetId) };
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
  private getAccessibleCourse(courseId: string, user: AuthUser) {
    const course = this.accessibleRows('courses', user).find((row) => String(row.id) === String(courseId));
    if (!course) {
      throw new NotFoundException('Cours introuvable.');
    }
    return course;
  }
  private getAccessibleEnrollment(courseId: string, user: AuthUser) {
    return this.accessibleRows('course_enrollments', user).find((row) =>
      String(row.course_id) === String(courseId)
      && (isAdminRole(user) || String(row.student_id) === String(user.id))
    ) ?? null;
  }
  private getAccessibleExam(examId: string, user: AuthUser) {
    const exam = this.accessibleRows('exams', user).find((row) => String(row.id) === String(examId));
    if (!exam) {
      throw new NotFoundException('Evaluation introuvable.');
    }
    if (user.role === 'apprenant') {
      const hasEnrollment = (store.course_enrollments ?? []).some((enrollment) =>
        String(enrollment.course_id) === String(exam.course_id)
        && String(enrollment.student_id) === String(user.id),
      );
      if (!hasEnrollment) {
        throw new NotFoundException('Evaluation introuvable.');
      }
    }
    return exam;
  }
  private canReadCourseDetail(course: Row, enrollment: Row | null, user: AuthUser) {
    if (isAdminRole(user)) return true;
    if (user.role === 'apprenant') return Boolean(enrollment);
    if (user.role === 'formateur') return String(course.instructor_id) === String(user.id);
    return false;
  }
  private parseProgressPayload(payload: unknown): ProgressPayload {
    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException('Payload progression invalide.');
    }
    const input = payload as ProgressPayload;
    const progress = toNumber(input.progress);
    const completedLessons = toNumber(input.completedLessons);
    if (progress === null || completedLessons === null) {
      throw new BadRequestException('Progression invalide.');
    }
    return {
      progress,
      completedLessons,
      completedLessonIds: Array.isArray(input.completedLessonIds) ? input.completedLessonIds : undefined,
    };
  }
  private syncLessonProgressRows(courseId: string, user: AuthUser, rawCompletedLessonIds: unknown) {
    const completedLessonIds = Array.isArray(rawCompletedLessonIds)
      ? new Set(rawCompletedLessonIds.map(String))
      : null;
    if (!completedLessonIds || user.role !== 'apprenant') {
      return { beforeRows: [], afterRows: [], totalLessons: 0, completedLessons: 0 };
    }
    const lessons = (store.course_lessons ?? [])
      .filter((lesson) => String(lesson.course_id) === String(courseId) && String(lesson.status ?? 'published') !== 'archived')
      .sort((left, right) => this.position(left) - this.position(right));
    const lessonIds = new Set(lessons.map((lesson) => String(lesson.id)));
    const existing = (store.lesson_progress ?? []).filter((row) =>
      String(row.course_id) === String(courseId)
      && String(row.student_id) === String(user.id)
      && lessonIds.has(String(row.lesson_id))
    );
    const beforeRows = existing.map((row) => clone(row));
    const now = new Date().toISOString();
    const updated = patchAppRows('lesson_progress', (row) =>
      String(row.course_id) === String(courseId)
      && String(row.student_id) === String(user.id)
      && lessonIds.has(String(row.lesson_id)),
    (row) => {
      const completed = completedLessonIds.has(String(row.lesson_id));
      return {
        completed,
        progress: completed ? 100 : 0,
        status: completed ? 'completed' : 'not_started',
        last_viewed_at: now,
        completed_at: completed ? (row.completed_at ?? now) : null,
      };
    });
    const existingLessonIds = new Set(existing.map((row) => String(row.lesson_id)));
    const created = lessons
      .filter((lesson) => !existingLessonIds.has(String(lesson.id)))
      .map((lesson) => {
        const completed = completedLessonIds.has(String(lesson.id));
        return withId({
          student_id: user.id,
          course_id: courseId,
          section_id: lesson.section_id,
          lesson_id: lesson.id,
          completed,
          progress: completed ? 100 : 0,
          status: completed ? 'completed' : 'not_started',
          first_viewed_at: now,
          last_viewed_at: now,
          completed_at: completed ? now : null,
          created_at: now,
        });
      });
    const createdRows = created.length > 0 ? appendAppRows('lesson_progress', created) : [];
    return {
      beforeRows,
      afterRows: [...updated, ...createdRows],
      totalLessons: lessons.length,
      completedLessons: lessons.filter((lesson) => completedLessonIds.has(String(lesson.id))).length,
    };
  }
  private getPublicCourseSections(courseId: string) {
    return hydrateRows('course_sections', store.course_sections ?? [])
      .filter((section) =>
        String(section.course_id) === String(courseId)
        && String(section.status ?? 'published') !== 'archived'
      )
      .sort((left, right) => this.position(left) - this.position(right));
  }
  private getPublicCourseLessons(courseId: string) {
    return hydrateRows('course_lessons', store.course_lessons ?? [])
      .filter((lesson) =>
        String(lesson.course_id) === String(courseId)
        && String(lesson.status ?? 'published') !== 'archived'
      )
      .sort((left, right) => this.position(left) - this.position(right));
  }
  private getPublicCourseReviews(courseId: string) {
    return hydrateRows('course_reviews', store.course_reviews ?? [])
      .filter((review) =>
        String(review.course_id) === String(courseId)
        && String(review.status ?? 'published') === 'published'
      )
      .sort((left, right) => this.compareDatesDesc(left.created_at, right.created_at));
  }
  private getPublicCourseVirtualClasses(courseId: string) {
    return hydrateRows('virtual_classes', store.virtual_classes ?? [])
      .filter((virtualClass) =>
        String(virtualClass.course_id) === String(courseId)
        && String(virtualClass.status ?? 'scheduled') !== 'archived'
      )
      .sort((left, right) => this.compareDatesDesc(left.class_date ?? left.created_at, right.class_date ?? right.created_at));
  }
  private assertCanAccessLessonThread(lessonId: string, user: AuthUser) {
    const lesson = (store.course_lessons ?? []).find((row) => String(row.id) === String(lessonId));
    if (!lesson) {
      throw new NotFoundException('Lecon introuvable.');
    }
    if (isAdminRole(user)) return;
    if (user.role === 'formateur') {
      const course = (store.courses ?? []).find((row) => String(row.id) === String(lesson.course_id));
      if (course && String(course.instructor_id) === String(user.id)) return;
    }
    if (user.role === 'apprenant') {
      const hasEnrollment = (store.course_enrollments ?? []).some((enrollment) =>
        String(enrollment.course_id) === String(lesson.course_id)
        && String(enrollment.student_id) === String(user.id),
      );
      if (hasEnrollment) return;
    }
    throw new ForbiddenException('Acces a la discussion refuse.');
  }
  private matchesCourse(row: Row, courseId: string) {
    return String(row.course_id) === String(courseId);
  }
  private groupBy(rows: Row[], field: string) {
    const grouped = new Map<string, Row[]>();
    for (const row of rows) {
      const key = String(row[field]);
      grouped.set(key, [...(grouped.get(key) ?? []), row]);
    }
    return grouped;
  }
  private position(row: Row) {
    return toNumber(row.position) ?? 0;
  }
  private numberId(value: unknown) {
    return toNumber(value) ?? 0;
  }
  private text(value: unknown, fallback = '') {
    const normalized = String(value ?? '').trim();
    return normalized || fallback;
  }
  private clampProgress(value: unknown) {
    return Math.max(0, Math.min(100, Math.round(toNumber(value) ?? 0)));
  }
  private parseOptionalLimit(value: unknown) {
    if (value === undefined || value === null || value === '') return undefined;
    const limit = toNumber(value);
    if (limit === null || limit < 1) {
      throw new BadRequestException('Limite invalide.');
    }
    return Math.min(100, Math.round(limit));
  }
  private mapLessonType(value: unknown) {
    const type = String(value ?? '').toLowerCase();
    if (type === 'video') return 'video';
    if (type === 'quiz') return 'quiz';
    if (type === 'assignment' || type === 'coding') return 'exercise';
    return 'reading';
  }
  private buildContentBlocks(lesson: Row) {
    const description = this.text(lesson.description);
    return description ? [{ type: 'paragraph', text: description }] : [];
  }
  private formatAssetSize(value: unknown) {
    const bytes = toNumber(value);
    if (!bytes || bytes <= 0) return 'Fichier';
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  private getAssetIcon(value: unknown) {
    const type = String(value ?? '').toLowerCase();
    if (type === 'video') return 'ri-video-line';
    if (type === 'pdf') return 'ri-file-pdf-line';
    if (type === 'slides') return 'ri-slideshow-line';
    if (type === 'link') return 'ri-link';
    return 'ri-attachment-2';
  }
  private findInstructor(instructorId: unknown) {
    const fallback = { name: 'Formateur C2P', avatar: '' };
    const id = String(instructorId ?? '').trim();
    if (!id) return fallback;
    const user = findUserById(id) ?? findRow('auth_users', id);
    if (!user) return fallback;
    return {
      name: `${this.text(user.firstName)} ${this.text(user.lastName)}`.trim() || fallback.name,
      avatar: this.text(user.avatar),
    };
  }
  private toApprenantExam(exam: Row) {
    return {
      ...exam,
      questions_count: (store.quiz_questions ?? []).filter((question) => String(question.exam_id) === String(exam.id)).length,
    };
  }
  private compareDatesDesc(left: unknown, right: unknown) {
    const leftDate = Date.parse(String(left ?? ''));
    const rightDate = Date.parse(String(right ?? ''));
    const normalizedLeft = Number.isNaN(leftDate) ? 0 : leftDate;
    const normalizedRight = Number.isNaN(rightDate) ? 0 : rightDate;
    return normalizedRight - normalizedLeft;
  }
  private compareDatesAsc(left: unknown, right: unknown) {
    return -this.compareDatesDesc(left, right);
  }
}
