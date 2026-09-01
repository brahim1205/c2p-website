import { BadRequestException, ForbiddenException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { isAdminRole, type AuthUser } from '../auth/auth.store.js';
import { PlatformPersistenceService } from '../database/platform-persistence.service.js';
import { PrismaService } from '../database/prisma.service.js';
import {
  appendAppRows,
  clone,
  listAppRows,
  patchAppRows,
  store,
  syncAppStoreFromDatabase,
  withId,
} from '../data/data-app-store.js';
import { toNumber } from '../data/data-normalizers.js';
import { prepareInsert } from '../data/data-runtime.js';
import { hydrateRows } from '../data/data-row-hydration.js';
import type { Row } from '../data/mock-store.js';
import { createAppNotificationRow } from '../notifications/notification-payloads.js';
import {
  accessibleRows,
  assertCanAccessLessonThread,
  buildCourseQuiz,
  canReadCourseDetail,
  countCompletedLessonProgress,
  getAccessibleCourse,
  getAccessibleEnrollment,
  groupBy,
  matchesCourse,
  parseProgressPayload,
  requireApprenantReadActor,
  requireLearningActor,
  requireObject,
  syncLessonProgressRows,
} from './learning-access-helpers.js';
import {
  buildContentBlocks,
  clampProgress,
  compareDatesDesc,
  findInstructor,
  formatAssetSize,
  getAssetIcon,
  mapLessonType,
  nonNegativeInteger,
  numberId,
  position,
  text,
  toQuizAttempt,
  truncate,
} from './learning-access-formatters.js';
import { LearningProgressReadService } from './learning-progress-read.service.js';
import { LearningPublicFallbackService } from './learning-public-fallback.service.js';
import { LearningPublicReadService } from './learning-public-read.service.js';
import { PaymentCommandsService } from '../payments/payment-commands.service.js';

@Injectable()
export class LearningAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly platformPersistenceService: PlatformPersistenceService,
    private readonly learningPublicReadService: LearningPublicReadService,
    private readonly learningProgressReadService: LearningProgressReadService,
    private readonly learningPublicFallbackService: LearningPublicFallbackService,
    private readonly paymentCommandsService: PaymentCommandsService,
  ) {}

  async getPublicCourses() {
    const prismaRows = await this.learningPublicReadService.getPublicCourses();
    if (prismaRows) return prismaRows;
    await syncAppStoreFromDatabase(this.prisma);
    return this.learningPublicFallbackService.getPublicCourses();
  }

  async getPublicInstructorCourses(instructorId: string) {
    const prismaRows = await this.learningPublicReadService.getPublicInstructorCourses(instructorId);
    if (prismaRows) return prismaRows;
    await syncAppStoreFromDatabase(this.prisma);
    return this.learningPublicFallbackService.getPublicInstructorCourses(instructorId);
  }

  async getPublicCourseDetail(courseId: string) {
    const prismaSnapshot = await this.learningPublicReadService.getPublicCourseDetail(courseId);
    if (prismaSnapshot) {
      if (!prismaSnapshot.course) throw new NotFoundException('Formation introuvable.');
      return prismaSnapshot;
    }
    await syncAppStoreFromDatabase(this.prisma);
    const course = this.learningPublicFallbackService.findPublishedCourse(courseId);
    if (!course) {
      throw new NotFoundException('Formation introuvable.');
    }
    const lessons = this.learningPublicFallbackService.getCourseLessons(courseId);
    return {
      course,
      sections: this.learningPublicFallbackService.getVisibleCourseSections(courseId, lessons),
      lessons,
      reviews: this.learningPublicFallbackService.getCourseReviews(courseId),
      virtualClasses: this.learningPublicFallbackService.getCourseVirtualClasses(courseId),
    };
  }

  async getPublicVirtualClassDetail(classId: string) {
    const prismaSnapshot = await this.learningPublicReadService.getPublicVirtualClassDetail(classId);
    if (prismaSnapshot) {
      if (!prismaSnapshot.virtualClass) throw new NotFoundException('Classe virtuelle introuvable.');
      return prismaSnapshot;
    }
    await syncAppStoreFromDatabase(this.prisma);
    const virtualClass = this.learningPublicFallbackService.findVisibleVirtualClass(classId);
    if (!virtualClass) {
      throw new NotFoundException('Classe virtuelle introuvable.');
    }
    const courseId = String(virtualClass.course_id ?? '');
    const course = courseId ? this.learningPublicFallbackService.findPublishedCourse(courseId) : null;
    const lessons = courseId ? this.learningPublicFallbackService.getCourseLessons(courseId) : [];
    return {
      virtualClass,
      course,
      sections: courseId ? this.learningPublicFallbackService.getVisibleCourseSections(courseId, lessons) : [],
      lessons,
    };
  }

  async getAuthorizedVirtualClassDetail(classId: string, user: AuthUser | null) {
    const actor = requireLearningActor(user);
    await syncAppStoreFromDatabase(this.prisma);
    const virtualClass = hydrateRows('virtual_classes', store.virtual_classes ?? [])
      .find((row) => String(row.id) === String(classId) && String(row.status ?? 'scheduled') !== 'archived');
    if (!virtualClass) {
      throw new NotFoundException('Classe virtuelle introuvable.');
    }

    const courseId = String(virtualClass.course_id ?? '');
    const course = getAccessibleCourse(courseId, actor);
    const enrollment = getAccessibleEnrollment(courseId, actor);
    if (!canReadCourseDetail(course, enrollment, actor)) {
      throw new ForbiddenException('Acces a la classe virtuelle refuse.');
    }

    return {
      virtualClass,
      course,
      sections: this.learningPublicFallbackService.getCourseSections(courseId),
      lessons: hydrateRows('course_lessons', store.course_lessons ?? [])
        .filter((lesson) =>
          String(lesson.course_id) === courseId
          && String(lesson.status ?? 'published') !== 'archived'
        )
        .sort((left, right) => position(left) - position(right)),
    };
  }

  async getApprenantCourseDetail(courseId: string, user: AuthUser | null) {
    const actor = requireLearningActor(user);
    await syncAppStoreFromDatabase(this.prisma);
    const course = getAccessibleCourse(courseId, actor);
    const prismaProgress = await this.learningProgressReadService.getCourseContext(courseId, actor);
    const enrollment = prismaProgress?.enrollment ?? getAccessibleEnrollment(courseId, actor);
    if (!canReadCourseDetail(course, enrollment, actor)) {
      throw new NotFoundException('Cours introuvable.');
    }
    const sections = accessibleRows('course_sections', actor)
      .filter((section) => matchesCourse(section, courseId) && String(section.status ?? 'published') !== 'archived')
      .sort((left, right) => position(left) - position(right));
    const lessons = accessibleRows('course_lessons', actor)
      .filter((lesson) => matchesCourse(lesson, courseId) && String(lesson.status ?? 'published') !== 'archived')
      .sort((left, right) => position(left) - position(right));
    const assets = accessibleRows('lesson_assets', actor)
      .filter((asset) => matchesCourse(asset, courseId))
      .sort((left, right) => position(left) - position(right));
    const assetsByLesson = groupBy(assets, 'lesson_id');
    const lessonsBySection = groupBy(lessons, 'section_id');
    const quiz = buildCourseQuiz(courseId, actor);
    const lessonProgressRows = prismaProgress?.lessonProgress ?? hydrateRows('lesson_progress', accessibleRows('lesson_progress', actor))
      .filter((row) => String(row.course_id) === String(courseId) && (isAdminRole(actor) || String(row.student_id) === String(actor.id)));
    const quizAttemptRows = hydrateRows('course_quiz_attempts', accessibleRows('course_quiz_attempts', actor))
      .filter((row) =>
        String(row.course_id) === String(courseId)
        && (isAdminRole(actor) || String(row.student_id) === String(actor.id))
      )
      .sort((left, right) => compareDatesDesc(left.submitted_at ?? left.created_at, right.submitted_at ?? right.created_at));
    const completedLessonIds = new Set(
      lessonProgressRows
        .filter((row) => Boolean(row.completed) || clampProgress(row.progress) >= 100)
        .map((row) => String(row.lesson_id)),
    );
    const progressByLessonId = new Map(lessonProgressRows.map((row) => [String(row.lesson_id), row]));
    const modules = sections.map((section) => ({
      id: numberId(section.id),
      title: text(section.title, 'Chapitre'),
      lessons: (lessonsBySection.get(String(section.id)) ?? []).map((lesson) => ({
        id: numberId(lesson.id),
        title: text(lesson.title, 'Leçon'),
        duration: text(lesson.duration, '0 min'),
        type: mapLessonType(lesson.type),
        completed: completedLessonIds.has(String(lesson.id)),
        bookmarked: Boolean(progressByLessonId.get(String(lesson.id))?.bookmarked),
        note: text(progressByLessonId.get(String(lesson.id))?.note),
        videoPositionSeconds: nonNegativeInteger(progressByLessonId.get(String(lesson.id))?.video_position_seconds),
        lastViewedAt: text(progressByLessonId.get(String(lesson.id))?.last_viewed_at),
        description: text(lesson.description),
        exerciseInstructions: text(lesson.exercise_instructions),
        codeSample: text(lesson.code_sample),
        codeLanguage: text(lesson.code_language, 'markdown'),
        contentBlocks: buildContentBlocks(lesson),
        videoUrl: text(
          (assetsByLesson.get(String(lesson.id)) ?? []).find((asset) => String(asset.asset_type) === 'video')?.url,
        ),
        resources: (assetsByLesson.get(String(lesson.id)) ?? []).map((asset) => ({
          id: numberId(asset.id),
          title: text(asset.title, 'Ressource'),
          type: text(asset.asset_type, 'Fichier').toUpperCase(),
          size: formatAssetSize(asset.size_bytes),
          icon: getAssetIcon(asset.asset_type),
          url: text(asset.url),
          thumbnailUrl: text(asset.thumbnail_url),
          mimeType: text(asset.mime_type),
        })),
      })),
    }));
    const totalLessons = modules.reduce((sum, module) => sum + module.lessons.length, 0);
    const enrollmentProgress = clampProgress(enrollment?.progress ?? course.completion_rate ?? 0);
    const completedLessons = completedLessonIds.size > 0
      ? Math.min(completedLessonIds.size, totalLessons)
      : Math.max(0, Math.round((enrollmentProgress / 100) * totalLessons));
    const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : enrollmentProgress;
    const instructor = findInstructor(course.instructor_id);
    return {
      id: numberId(course.id),
      title: text(course.title, 'Formation'),
      instructor: instructor.name,
      instructorAvatar: instructor.avatar,
      category: text(course.category, 'Formation'),
      level: text(course.level, 'Tous niveaux'),
      duration: text(course.duration, '0h'),
      thumbnail: text(course.thumbnail, '/images/home/academy.jpg'),
      description: text(course.description),
      progress,
      totalLessons,
      completedLessons,
      modules,
      quiz,
      quizAttempts: quizAttemptRows.map((row) => toQuizAttempt(row)),
      resources: [],
      comments: [],
    };
  }

  async submitApprenantCourseQuizAttempt(courseId: string, payload: unknown, user: AuthUser | null) {
    const actor = requireLearningActor(user);
    if (actor.role !== 'apprenant' && !isAdminRole(actor)) {
      throw new ForbiddenException('Seul un apprenant peut soumettre ce quiz.');
    }
    const input = requireObject(payload, 'Tentative de quiz invalide.');
    const rawAnswers = input.answers && typeof input.answers === 'object' && !Array.isArray(input.answers)
      ? input.answers as Record<string, unknown>
      : null;
    if (!rawAnswers) {
      throw new BadRequestException('Les reponses du quiz sont obligatoires.');
    }

    await syncAppStoreFromDatabase(this.prisma);
    const course = getAccessibleCourse(courseId, actor);
    const enrollment = getAccessibleEnrollment(courseId, actor);
    if (!canReadCourseDetail(course, enrollment, actor)) {
      throw new NotFoundException('Cours introuvable.');
    }

    const quiz = buildCourseQuiz(courseId, actor);
    if (quiz.length === 0) {
      throw new BadRequestException('Aucune question publiee pour ce quiz.');
    }

    const answers = Object.fromEntries(
      Object.entries(rawAnswers)
        .map(([questionId, answerIndex]) => [String(questionId), nonNegativeInteger(answerIndex)] as const)
        .filter(([questionId]) => quiz.some((question) => String(question.id) === questionId)),
    );
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < quiz.length) {
      throw new BadRequestException('Toutes les questions doivent etre renseignees.');
    }

    const score = quiz.filter((question) => answers[String(question.id)] === question.correctIndex).length;
    const now = new Date().toISOString();
    const created = withId(prepareInsert('course_quiz_attempts', {
      course_id: courseId,
      course_name: text(course.title, 'Formation'),
      student_id: actor.id,
      student_name: `${actor.firstName} ${actor.lastName}`.trim(),
      score,
      total: quiz.length,
      answers,
      submitted_at: now,
      status: 'completed',
      created_at: now,
    }));
    const persisted = appendAppRows('course_quiz_attempts', [created])[0] ?? created;

    const certificate = this.ensureCompletionCertificate(course, actor);
    await this.platformPersistenceService.persistRows({
      course_quiz_attempts: [persisted],
      ...(certificate ? { certificates: [certificate] } : {}),
    }, {
      actorId: actor.id,
      reason: 'learning:apprenant:course-quiz-attempt:create',
      afterRowsByTable: {
        course_quiz_attempts: [persisted],
        ...(certificate ? { certificates: [certificate] } : {}),
      },
    });

    return toQuizAttempt(persisted);
  }

  async getApprenantCourseContext(courseId: string, user: AuthUser | null) {
    const actor = requireApprenantReadActor(user);
    const prismaContext = await this.learningProgressReadService.getCourseContext(courseId, actor);
    if (prismaContext) return prismaContext;
    await syncAppStoreFromDatabase(this.prisma);
    const enrollment = getAccessibleEnrollment(courseId, actor);
    const progress = hydrateRows('lesson_progress', accessibleRows('lesson_progress', actor))
      .filter((row) => String(row.course_id) === String(courseId) && String(row.student_id) === String(actor.id))
      .sort((left, right) => compareDatesDesc(left.last_viewed_at ?? left.created_at, right.last_viewed_at ?? right.created_at));
    return { enrollment, lessonProgress: progress };
  }

  async enrollApprenantCourse(courseId: string, user: AuthUser | null) {
    const actor = requireLearningActor(user);
    if (actor.role !== 'apprenant' && !isAdminRole(actor)) {
      throw new ForbiddenException('Seul un apprenant peut s inscrire a cette formation.');
    }
    await syncAppStoreFromDatabase(this.prisma);
    const course = hydrateRows('courses', store.courses ?? []).find((row) =>
      String(row.id) === String(courseId)
      && String(row.status ?? '').toLowerCase() === 'published'
    );
    if (!course) {
      throw new NotFoundException('Formation introuvable.');
    }
    const existing = getAccessibleEnrollment(courseId, actor);
    if (existing) return existing;
    if (this.getCoursePrice(course) > 0) {
      throw new HttpException(
        'Cette formation est payante. Le paiement doit être confirmé avant l inscription.',
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
    return this.createEnrollment(course, actor);
  }

  async purchaseApprenantCourse(courseId: string, user: AuthUser | null) {
    const actor = requireLearningActor(user);
    if (actor.role !== 'apprenant' && !isAdminRole(actor)) {
      throw new ForbiddenException('Seul un apprenant peut acheter cette formation.');
    }
    await syncAppStoreFromDatabase(this.prisma);
    const course = hydrateRows('courses', store.courses ?? []).find((row) =>
      String(row.id) === String(courseId)
      && String(row.status ?? '').toLowerCase() === 'published'
    );
    if (!course) {
      throw new NotFoundException('Formation introuvable.');
    }
    const price = this.getCoursePrice(course);
    if (price <= 0) {
      return this.createEnrollment(course, actor);
    }

    const existing = getAccessibleEnrollment(courseId, actor);
    if (existing?.payment_transaction_id) {
      return existing;
    }
    const charge = await this.paymentCommandsService.withdrawWallet(actor, {
      amount: price,
      method: 'wallet',
      description: `Achat formation - ${text(course.title, 'Formation C2P')}`,
    }, `course_purchase:${actor.id}:${course.id}`);

    if (existing) {
      const previous = clone(existing);
      const updated = patchAppRows('course_enrollments', (row) => String(row.id) === String(existing.id), {
        payment_transaction_id: charge.transaction.id,
        financial_operation_id: charge.financialOperationId,
        amount_paid: price,
        payment_status: 'completed',
        payment_method: 'wallet',
        paid_at: new Date().toISOString(),
      });
      await this.platformPersistenceService.persistRows({ course_enrollments: updated }, {
        actorId: actor.id,
        reason: 'learning:apprenant:course:purchase-existing',
        beforeRowsByTable: { course_enrollments: [previous] },
        afterRowsByTable: { course_enrollments: updated },
      });
      return updated[0] ?? existing;
    }

    return this.createEnrollment(course, actor, {
      transactionId: String(charge.transaction.id),
      financialOperationId: charge.financialOperationId,
      amount: price,
    });
  }

  async purchaseApprenantCourseWithExternalPayment(courseId: string, payload: unknown, user: AuthUser | null) {
    const actor = requireLearningActor(user);
    if (actor.role !== 'apprenant' && !isAdminRole(actor)) {
      throw new ForbiddenException('Seul un apprenant peut acheter cette formation.');
    }
    const input = requireObject(payload, 'Paiement invalide.');
    const transactionId = text(input.transaction_id ?? input.transactionId, '');
    if (!transactionId) {
      throw new BadRequestException('Transaction de paiement requise.');
    }
    await syncAppStoreFromDatabase(this.prisma);
    const course = hydrateRows('courses', store.courses ?? []).find((row) =>
      String(row.id) === String(courseId)
      && String(row.status ?? '').toLowerCase() === 'published'
    );
    if (!course) {
      throw new NotFoundException('Formation introuvable.');
    }
    const price = this.getCoursePrice(course);
    if (price <= 0) {
      return this.createEnrollment(course, actor);
    }
    const transaction = listAppRows('payment_transactions').find((row) => (
      String(row.id) === String(transactionId)
      && String(row.user_id) === String(actor.id)
      && String(row.status) === 'completed'
      && Number(row.amount ?? 0) >= price
    ));
    if (!transaction) {
      throw new HttpException('Paiement Wave non confirmé.', HttpStatus.PAYMENT_REQUIRED);
    }

    const existing = getAccessibleEnrollment(courseId, actor);
    if (existing?.payment_transaction_id) {
      return existing;
    }
    if (existing) {
      const previous = clone(existing);
      const updated = patchAppRows('course_enrollments', (row) => String(row.id) === String(existing.id), {
        payment_transaction_id: transaction.id,
        financial_operation_id: transaction.financial_operation_id ?? null,
        amount_paid: price,
        payment_status: 'completed',
        payment_method: String(transaction.method ?? 'wave'),
        paid_at: new Date().toISOString(),
      });
      await this.platformPersistenceService.persistRows({ course_enrollments: updated }, {
        actorId: actor.id,
        reason: 'learning:apprenant:course:purchase-external-existing',
        beforeRowsByTable: { course_enrollments: [previous] },
        afterRowsByTable: { course_enrollments: updated },
      });
      return updated[0] ?? existing;
    }

    return this.createEnrollment(course, actor, {
      transactionId: String(transaction.id),
      financialOperationId: String(transaction.financial_operation_id ?? ''),
      amount: price,
      method: String(transaction.method ?? 'wave'),
    });
  }

  private getCoursePrice(course: Row) {
    if (course.is_free === true || String(course.access_type ?? '') === 'free') return 0;
    return Math.max(0, Number(course.current_price ?? course.price ?? 0));
  }

  private async createEnrollment(
    course: Row,
    actor: AuthUser,
    payment?: { transactionId: string; financialOperationId: string; amount: number; method?: string },
  ) {
    const existing = getAccessibleEnrollment(String(course.id), actor);
    if (existing) return existing;
    const now = new Date().toISOString();
    const enrollment = withId(prepareInsert('course_enrollments', {
      course_id: course.id,
      course_name: course.title,
      course_category: course.category,
      course_lessons_count: this.learningPublicFallbackService.getCourseLessons(String(course.id)).length,
      student_id: actor.id,
      student_name: `${actor.firstName} ${actor.lastName}`.trim() || actor.id,
      student_email: actor.email ?? null,
      progress: 0,
      grade: null,
      status: 'active',
      payment_transaction_id: payment?.transactionId ?? null,
      financial_operation_id: payment?.financialOperationId ?? null,
      amount_paid: payment?.amount ?? 0,
      payment_status: payment ? 'completed' : 'not_required',
      payment_method: payment ? (payment.method ?? 'wallet') : null,
      paid_at: payment ? now : null,
      enrolled_at: now,
      last_active: now,
      created_at: now,
    }));
    const createdRows = appendAppRows('course_enrollments', [enrollment]);
    const rowsToPersist: Record<string, Row[]> = { course_enrollments: [enrollment] };
    if (course.instructor_id) {
      const notification = withId(prepareInsert('notifications', createAppNotificationRow({
        userId: String(course.instructor_id),
        title: 'Nouvelle inscription',
        message: `${`${actor.firstName} ${actor.lastName}`.trim() || actor.email || 'Un apprenant'} s est inscrit a "${text(course.title, 'Formation')}".`,
        type: 'learning',
        link: '/dashboard/formateur/apprenants',
        metadata: { course_id: course.id, student_id: actor.id },
      })));
      rowsToPersist.notifications = appendAppRows('notifications', [notification]);
    }
    await this.platformPersistenceService.persistRows(rowsToPersist, {
      actorId: actor.id,
      reason: 'learning:apprenant:course:enroll',
      afterRowsByTable: rowsToPersist,
    });
    return createdRows[0] ?? enrollment;
  }

  async publishApprenantCourseReview(courseId: string, payload: unknown, user: AuthUser | null) {
    const actor = requireLearningActor(user);
    if (actor.role !== 'apprenant' && !isAdminRole(actor)) {
      throw new ForbiddenException('Seul un apprenant peut publier un avis.');
    }
    const input = requireObject(payload, 'Avis invalide.');
    const rating = toNumber(input.rating);
    const comment = text(input.comment);
    if (rating === null || rating < 1 || rating > 5) {
      throw new BadRequestException('Note invalide.');
    }
    if (!comment) {
      throw new BadRequestException('Commentaire requis.');
    }
    await syncAppStoreFromDatabase(this.prisma);
    const enrollment = getAccessibleEnrollment(courseId, actor);
    if (!enrollment) {
      throw new ForbiddenException('Inscription requise pour publier un avis.');
    }
    if (clampProgress(enrollment.progress) <= 0 && String(enrollment.status) !== 'completed') {
      throw new ForbiddenException('Suivez au moins une lecon avant de publier un avis.');
    }
    const course = getAccessibleCourse(courseId, actor);
    const now = new Date().toISOString();
    const existing = (store.course_reviews ?? []).find((row) =>
      String(row.course_id) === String(courseId) && String(row.student_id) === String(actor.id)
    );
    const patch = {
      course_id: course.id,
      student_id: actor.id,
      student_name: `${actor.firstName} ${actor.lastName}`.trim() || actor.id,
      student_avatar: actor.avatar ?? null,
      rating: Math.round(rating),
      comment,
      status: 'published',
      updated_at: now,
    };
    if (existing) {
      const previous = clone(existing);
      const updated = patchAppRows('course_reviews', (row) => String(row.id) === String(existing.id), patch);
      await this.platformPersistenceService.persistRows({ course_reviews: updated }, {
        actorId: actor.id,
        reason: 'learning:apprenant:course-review:update',
        beforeRowsByTable: { course_reviews: [previous] },
        afterRowsByTable: { course_reviews: updated },
      });
      return updated[0] ?? { ...previous, ...patch };
    }
    const review = withId(prepareInsert('course_reviews', { ...patch, created_at: now }));
    const created = appendAppRows('course_reviews', [review]);
    await this.platformPersistenceService.persistRows({ course_reviews: [review] }, {
      actorId: actor.id,
      reason: 'learning:apprenant:course-review:create',
      afterRowsByTable: { course_reviews: [review] },
    });
    return created[0] ?? review;
  }

  async updateApprenantCourseProgress(courseId: string, payload: unknown, user: AuthUser | null) {
    const actor = requireLearningActor(user);
    if (actor.role !== 'apprenant' && !isAdminRole(actor)) {
      throw new ForbiddenException('Seul un apprenant peut mettre a jour cette progression.');
    }
    await syncAppStoreFromDatabase(this.prisma);
    const input = parseProgressPayload(payload);
    const enrollment = getAccessibleEnrollment(courseId, actor);
    if (!enrollment) {
      throw new NotFoundException('Inscription introuvable.');
    }
    const previous = clone(enrollment);
    const lessonProgressMutation = syncLessonProgressRows(courseId, actor, input.completedLessonIds);
    const progress = lessonProgressMutation.totalLessons > 0
      ? Math.round((lessonProgressMutation.completedLessons / lessonProgressMutation.totalLessons) * 100)
      : clampProgress(input.progress);
    const completedLessons = Math.max(0, Math.round(Number(input.completedLessons ?? 0)));
    const updatedRows = patchAppRows('course_enrollments', (row) => String(row.id) === String(enrollment.id), {
      progress,
      completed_lessons_estimate: lessonProgressMutation.totalLessons > 0 ? lessonProgressMutation.completedLessons : completedLessons,
      status: progress >= 100 ? 'completed' : 'active',
      last_active: new Date().toISOString(),
    });
    const updated = updatedRows[0];
    if (!updated) {
      throw new NotFoundException('Inscription introuvable.');
    }
    const rowsToPersist: Record<string, Row[]> = { course_enrollments: [updated] };
    if (lessonProgressMutation.afterRows.length > 0) {
      rowsToPersist.lesson_progress = lessonProgressMutation.afterRows;
    }
    const certificate = this.ensureCompletionCertificate(getAccessibleCourse(courseId, actor), actor);
    if (certificate) {
      rowsToPersist.certificates = [certificate];
    }
    await this.platformPersistenceService.persistRows(rowsToPersist, {
      actorId: actor.id,
      reason: 'learning:apprenant:progress:update',
      beforeRowsByTable: {
        course_enrollments: [previous],
        ...(lessonProgressMutation.beforeRows.length > 0 ? { lesson_progress: lessonProgressMutation.beforeRows } : {}),
      },
      afterRowsByTable: rowsToPersist,
    });
    return updated;
  }

  async updateApprenantCourseActivity(courseId: string, payload: unknown, user: AuthUser | null) {
    const actor = requireLearningActor(user);
    if (actor.role !== 'apprenant' && !isAdminRole(actor)) {
      throw new ForbiddenException('Seul un apprenant peut mettre a jour cette activite.');
    }
    const input = requireObject(payload, 'Activite invalide.');
    const deltaSeconds = nonNegativeInteger(input.learningTimeSecondsDelta ?? input.deltaSeconds);
    if (deltaSeconds <= 0) {
      throw new BadRequestException('Duree d activite invalide.');
    }
    await syncAppStoreFromDatabase(this.prisma);
    const enrollment = getAccessibleEnrollment(courseId, actor);
    if (!enrollment) {
      throw new NotFoundException('Inscription introuvable.');
    }
    const previous = clone(enrollment);
    const currentSeconds = nonNegativeInteger(enrollment.learning_time_seconds);
    const updatedRows = patchAppRows('course_enrollments', (row) => String(row.id) === String(enrollment.id), {
      learning_time_seconds: currentSeconds + deltaSeconds,
      last_active: new Date().toISOString(),
    });
    const updated = updatedRows[0];
    if (!updated) {
      throw new NotFoundException('Inscription introuvable.');
    }
    await this.platformPersistenceService.persistRows({ course_enrollments: [updated] }, {
      actorId: actor.id,
      reason: 'learning:apprenant:course-activity:update',
      beforeRowsByTable: { course_enrollments: [previous] },
      afterRowsByTable: { course_enrollments: [updated] },
    });
    return updated;
  }

  async updateApprenantLessonProgress(courseId: string, lessonId: string, payload: unknown, user: AuthUser | null) {
    const actor = requireLearningActor(user);
    if (actor.role !== 'apprenant' && !isAdminRole(actor)) {
      throw new ForbiddenException('Seul un apprenant peut mettre a jour cette progression.');
    }
    const input = requireObject(payload, 'Progression invalide.');
    await syncAppStoreFromDatabase(this.prisma);
    const enrollment = getAccessibleEnrollment(courseId, actor);
    if (!enrollment) {
      throw new NotFoundException('Inscription introuvable.');
    }
    const lesson = (store.course_lessons ?? []).find((row) =>
      String(row.id) === String(lessonId) && String(row.course_id) === String(courseId)
    );
    if (!lesson) {
      throw new NotFoundException('Lecon introuvable.');
    }
    const existing = (store.lesson_progress ?? []).find((row) =>
      String(row.course_id) === String(courseId)
      && String(row.lesson_id) === String(lessonId)
      && String(row.student_id) === String(actor.id)
    );
    const now = new Date().toISOString();
    const hasProgress = Object.prototype.hasOwnProperty.call(input, 'progress');
    const progress = hasProgress ? clampProgress(input.progress) : clampProgress(existing?.progress ?? 0);
    const completed = Object.prototype.hasOwnProperty.call(input, 'completed')
      ? Boolean(input.completed)
      : Boolean(existing?.completed) || progress >= 100;
    const note = Object.prototype.hasOwnProperty.call(input, 'note')
      ? truncate(text(input.note), 1000)
      : text(existing?.note);
    const patch = {
      course_id: courseId,
      section_id: lesson.section_id ?? input.section_id ?? null,
      lesson_id: lessonId,
      student_id: actor.id,
      progress,
      completed,
      bookmarked: Object.prototype.hasOwnProperty.call(input, 'bookmarked')
        ? Boolean(input.bookmarked)
        : Boolean(existing?.bookmarked),
      note: note || null,
      video_position_seconds: nonNegativeInteger(
        input.video_position_seconds ?? input.videoPositionSeconds,
        nonNegativeInteger(existing?.video_position_seconds),
      ),
      status: completed ? 'completed' : (progress > 0 ? 'in_progress' : 'not_started'),
      last_viewed_at: now,
      completed_at: completed ? (existing?.completed_at ?? now) : null,
    };
    const beforeRows: Row[] = [];
    let persistedProgress: Row;
    if (existing) {
      beforeRows.push(clone(existing));
      const updated = patchAppRows('lesson_progress', (row) => String(row.id) === String(existing.id), patch);
      persistedProgress = updated[0] ?? { ...existing, ...patch };
    } else {
      const created = withId(prepareInsert('lesson_progress', { ...patch, first_viewed_at: now, created_at: now }));
      persistedProgress = appendAppRows('lesson_progress', [created])[0] ?? created;
    }
    const lessons = this.learningPublicFallbackService.getCourseLessons(courseId);
    const lessonIds = new Set(lessons.map((row) => String(row.id)));
    const completedCount = countCompletedLessonProgress(courseId, actor, lessonIds);
    const enrollmentProgress = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : progress;
    const previousEnrollment = clone(enrollment);
    const updatedEnrollments = patchAppRows('course_enrollments', (row) => String(row.id) === String(enrollment.id), {
      progress: enrollmentProgress,
      completed_lessons_estimate: completedCount,
      status: enrollmentProgress >= 100 ? 'completed' : 'active',
      last_active: now,
    });
    const certificate = this.ensureCompletionCertificate(getAccessibleCourse(courseId, actor), actor);
    await this.platformPersistenceService.persistRows({
      lesson_progress: [persistedProgress],
      course_enrollments: updatedEnrollments,
      ...(certificate ? { certificates: [certificate] } : {}),
    }, {
      actorId: actor.id,
      reason: 'learning:apprenant:lesson-progress:update',
      beforeRowsByTable: {
        ...(beforeRows.length > 0 ? { lesson_progress: beforeRows } : {}),
        course_enrollments: [previousEnrollment],
      },
      afterRowsByTable: {
        lesson_progress: [persistedProgress],
        course_enrollments: updatedEnrollments,
        ...(certificate ? { certificates: [certificate] } : {}),
      },
    });
    return persistedProgress;
  }

  async getApprenantLessonComments(lessonId: string, user: AuthUser | null) {
    const actor = requireLearningActor(user);
    await syncAppStoreFromDatabase(this.prisma);
    assertCanAccessLessonThread(lessonId, actor);
    return hydrateRows('lesson_comments', accessibleRows('lesson_comments', actor))
      .filter((comment) => String(comment.lesson_id) === String(lessonId))
      .sort((left, right) => compareDatesDesc(left.created_at, right.created_at));
  }

  async createApprenantLessonComment(lessonId: string, payload: unknown, user: AuthUser | null) {
    const actor = requireLearningActor(user);
    const input = requireObject(payload, 'Commentaire invalide.');
    const content = text(input.content);
    if (!content) {
      throw new BadRequestException('Commentaire requis.');
    }
    await syncAppStoreFromDatabase(this.prisma);
    assertCanAccessLessonThread(lessonId, actor);
    const now = new Date().toISOString();
    const comment = withId(prepareInsert('lesson_comments', {
      lesson_id: lessonId,
      user_id: actor.id,
      user_name: `${actor.firstName} ${actor.lastName}`.trim() || actor.id,
      user_role: actor.role,
      content,
      pinned: false,
      created_at: now,
    }));
    const created = appendAppRows('lesson_comments', [comment]);
    await this.platformPersistenceService.persistRows({ lesson_comments: [comment] }, {
      actorId: actor.id,
      reason: 'learning:apprenant:lesson-comment:create',
      afterRowsByTable: { lesson_comments: [comment] },
    });
    return created[0] ?? comment;
  }

  private ensureCompletionCertificate(course: Row, actor: AuthUser) {
    if (actor.role !== 'apprenant' && !isAdminRole(actor)) return null;
    const courseId = String(course.id);
    const enrollment = getAccessibleEnrollment(courseId, actor);
    if (!enrollment) return null;
    if (String(enrollment.status) !== 'completed' && clampProgress(enrollment.progress) < 100) return null;

    const quiz = buildCourseQuiz(courseId, actor);
    if (quiz.length > 0 && !this.hasPassingQuizAttempt(courseId, actor, quiz.length)) return null;

    const existing = (store.certificates ?? []).find((row) =>
      String(row.course_id) === courseId && String(row.student_id) === String(actor.id)
    );
    if (existing) return null;

    const now = new Date().toISOString();
    const certificateNumber = this.buildAutoCertificateNumber(course, actor, now);
    const finalGrade = this.getBestQuizGrade(courseId, actor, quiz.length);
    const certificate = withId(prepareInsert('certificates', {
      student_id: actor.id,
      student_name: `${actor.firstName} ${actor.lastName}`.trim() || actor.email || actor.id,
      student_avatar: actor.avatar ?? null,
      course_id: course.id,
      course_name: text(course.title, 'Formation C2P'),
      title: text(course.title, 'Formation C2P'),
      completion_date: now,
      final_grade: finalGrade,
      grade: finalGrade,
      status: 'issued',
      certificate_id: certificateNumber,
      certificate_number: certificateNumber,
      issued_at: now,
      created_at: now,
      updated_at: now,
    }));
    return appendAppRows('certificates', [certificate])[0] ?? certificate;
  }

  private hasPassingQuizAttempt(courseId: string, actor: AuthUser, totalQuestions: number) {
    const bestScore = this.getBestQuizScorePercent(courseId, actor, totalQuestions);
    return bestScore >= 70;
  }

  private getBestQuizGrade(courseId: string, actor: AuthUser, totalQuestions: number) {
    if (totalQuestions <= 0) return null;
    const bestScore = this.getBestQuizScorePercent(courseId, actor, totalQuestions);
    if (bestScore < 0) return null;
    return Math.round((bestScore / 100) * 20);
  }

  private getBestQuizScorePercent(courseId: string, actor: AuthUser, totalQuestions: number) {
    const attempts = hydrateRows('course_quiz_attempts', store.course_quiz_attempts ?? []).filter((row) =>
      String(row.course_id) === String(courseId) && String(row.student_id) === String(actor.id)
    );
    return attempts.reduce((best, attempt) => {
      const score = toNumber(attempt.score) ?? 0;
      const total = toNumber(attempt.total) ?? totalQuestions;
      if (total <= 0) return best;
      return Math.max(best, (score / total) * 100);
    }, -1);
  }

  private buildAutoCertificateNumber(course: Row, actor: AuthUser, issuedAt: string) {
    const year = new Date(issuedAt).getUTCFullYear();
    const coursePart = String(course.id).replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase() || 'COURSE';
    const studentPart = String(actor.id).replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || 'USER';
    return `C2P-${year}-${coursePart}-${studentPart}`;
  }

}
