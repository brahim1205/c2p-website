import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { findUserById, isAdminRole, type AuthUser } from '../auth/auth.store.js';
import { PlatformPersistenceService } from '../database/platform-persistence.service.js';
import { PrismaService } from '../database/prisma.service.js';
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
import { toNumber, trimText } from '../data/data-normalizers.js';
import { prepareInsert } from '../data/data-runtime.js';
import { hydrateRows } from '../data/data-row-hydration.js';
import type { Row } from '../data/mock-store.js';
import { createAppNotificationRow } from '../notifications/notification-payloads.js';
import { LearningProgressReadService } from './learning-progress-read.service.js';
import { LearningPublicReadService } from './learning-public-read.service.js';

type ProgressPayload = {
  progress?: unknown;
  completedLessons?: unknown;
  completedLessonIds?: unknown;
};

@Injectable()
export class LearningAccessService {
  constructor(private readonly prisma: PrismaService, private readonly platformPersistenceService: PlatformPersistenceService, private readonly learningPublicReadService: LearningPublicReadService, private readonly learningProgressReadService: LearningProgressReadService) {}

  async getPublicCourses() {
    const prismaRows = await this.learningPublicReadService.getPublicCourses();
    if (prismaRows) return prismaRows;
    await syncAppStoreFromDatabase(this.prisma);
    return hydrateRows('courses', store.courses ?? [])
      .filter((course) => String(course.status ?? '').toLowerCase() === 'published')
      .sort((left, right) => {
        const studentDelta = (toNumber(right.students_count) ?? 0) - (toNumber(left.students_count) ?? 0);
        return studentDelta !== 0
          ? studentDelta
          : this.compareDatesDesc(left.updated_at ?? left.created_at, right.updated_at ?? right.created_at);
      });
  }

  async getPublicInstructorCourses(instructorId: string) {
    const prismaRows = await this.learningPublicReadService.getPublicInstructorCourses(instructorId);
    if (prismaRows) return prismaRows;
    await syncAppStoreFromDatabase(this.prisma);
    return hydrateRows('courses', store.courses ?? [])
      .filter((course) => String(course.instructor_id) === String(instructorId) && String(course.status ?? '').toLowerCase() === 'published')
      .sort((left, right) => this.compareDatesDesc(left.updated_at ?? left.created_at, right.updated_at ?? right.created_at));
  }

  async getPublicCourseDetail(courseId: string) {
    const prismaSnapshot = await this.learningPublicReadService.getPublicCourseDetail(courseId);
    if (prismaSnapshot) {
      if (!prismaSnapshot.course) throw new NotFoundException('Formation introuvable.');
      return prismaSnapshot;
    }
    await syncAppStoreFromDatabase(this.prisma);
    const course = hydrateRows('courses', store.courses ?? []).find((row) => String(row.id) === String(courseId) && (trimText(row.status) ?? '').toLowerCase() === 'published');
    if (!course) {
      throw new NotFoundException('Formation introuvable.');
    }
    return {
      course,
      sections: this.getPublicCourseSections(courseId),
      lessons: this.getPublicCourseLessons(courseId),
      reviews: this.getPublicCourseReviews(courseId),
      virtualClasses: this.getPublicCourseVirtualClasses(courseId),
    };
  }

  async getPublicVirtualClassDetail(classId: string) {
    const prismaSnapshot = await this.learningPublicReadService.getPublicVirtualClassDetail(classId);
    if (prismaSnapshot) {
      if (!prismaSnapshot.virtualClass) throw new NotFoundException('Classe virtuelle introuvable.');
      return prismaSnapshot;
    }
    await syncAppStoreFromDatabase(this.prisma);
    const virtualClass = hydrateRows('virtual_classes', store.virtual_classes ?? []).find((row) => String(row.id) === String(classId) && (trimText(row.status) ?? 'scheduled') !== 'archived');
    if (!virtualClass) {
      throw new NotFoundException('Classe virtuelle introuvable.');
    }
    const courseId = String(virtualClass.course_id ?? '');
    const course = courseId
      ? hydrateRows('courses', store.courses ?? []).find((row) => String(row.id) === courseId)
      : null;
    return {
      virtualClass,
      course,
      sections: courseId ? this.getPublicCourseSections(courseId) : [],
      lessons: courseId ? this.getPublicCourseLessons(courseId) : [],
    };
  }

  async getApprenantCourseDetail(courseId: string, user: AuthUser | null) {
    const actor = this.requireLearningActor(user);
    await syncAppStoreFromDatabase(this.prisma);
    const course = this.getAccessibleCourse(courseId, actor);
    const prismaProgress = await this.learningProgressReadService.getCourseContext(courseId, actor);
    const enrollment = prismaProgress?.enrollment ?? this.getAccessibleEnrollment(courseId, actor);
    if (!this.canReadCourseDetail(course, enrollment, actor)) {
      throw new NotFoundException('Cours introuvable.');
    }
    const sections = this.accessibleRows('course_sections', actor)
      .filter((section) => this.matchesCourse(section, courseId) && String(section.status ?? 'published') !== 'archived')
      .sort((left, right) => this.position(left) - this.position(right));
    const lessons = this.accessibleRows('course_lessons', actor)
      .filter((lesson) => this.matchesCourse(lesson, courseId) && String(lesson.status ?? 'published') !== 'archived')
      .sort((left, right) => this.position(left) - this.position(right));
    const assets = this.accessibleRows('lesson_assets', actor)
      .filter((asset) => this.matchesCourse(asset, courseId))
      .sort((left, right) => this.position(left) - this.position(right));
    const assetsByLesson = this.groupBy(assets, 'lesson_id');
    const lessonsBySection = this.groupBy(lessons, 'section_id');
    const quiz = this.buildCourseQuiz(courseId, actor);
    const lessonProgressRows = prismaProgress?.lessonProgress ?? hydrateRows('lesson_progress', this.accessibleRows('lesson_progress', actor))
      .filter((row) => String(row.course_id) === String(courseId) && (isAdminRole(actor) || String(row.student_id) === String(actor.id)));
    const quizAttemptRows = hydrateRows('course_quiz_attempts', this.accessibleRows('course_quiz_attempts', actor))
      .filter((row) =>
        String(row.course_id) === String(courseId)
        && (isAdminRole(actor) || String(row.student_id) === String(actor.id))
      )
      .sort((left, right) => this.compareDatesDesc(left.submitted_at ?? left.created_at, right.submitted_at ?? right.created_at));
    const completedLessonIds = new Set(
      lessonProgressRows
        .filter((row) => Boolean(row.completed) || this.clampProgress(row.progress) >= 100)
        .map((row) => String(row.lesson_id)),
    );
    const progressByLessonId = new Map(lessonProgressRows.map((row) => [String(row.lesson_id), row]));
    const modules = sections.map((section) => ({
      id: this.numberId(section.id),
      title: this.text(section.title, 'Chapitre'),
      lessons: (lessonsBySection.get(String(section.id)) ?? []).map((lesson) => ({
        id: this.numberId(lesson.id),
        title: this.text(lesson.title, 'Leçon'),
        duration: this.text(lesson.duration, '0 min'),
        type: this.mapLessonType(lesson.type),
        completed: completedLessonIds.has(String(lesson.id)),
        bookmarked: Boolean(progressByLessonId.get(String(lesson.id))?.bookmarked),
        note: this.text(progressByLessonId.get(String(lesson.id))?.note),
        videoPositionSeconds: this.nonNegativeInteger(progressByLessonId.get(String(lesson.id))?.video_position_seconds),
        lastViewedAt: this.text(progressByLessonId.get(String(lesson.id))?.last_viewed_at),
        description: this.text(lesson.description),
        contentBlocks: this.buildContentBlocks(lesson),
        resources: (assetsByLesson.get(String(lesson.id)) ?? []).map((asset) => ({
          id: this.numberId(asset.id),
          title: this.text(asset.title, 'Ressource'),
          type: this.text(asset.asset_type, 'Fichier').toUpperCase(),
          size: this.formatAssetSize(asset.size_bytes),
          icon: this.getAssetIcon(asset.asset_type),
        })),
      })),
    }));
    const totalLessons = modules.reduce((sum, module) => sum + module.lessons.length, 0);
    const enrollmentProgress = this.clampProgress(enrollment?.progress ?? course.completion_rate ?? 0);
    const completedLessons = completedLessonIds.size > 0
      ? Math.min(completedLessonIds.size, totalLessons)
      : Math.max(0, Math.round((enrollmentProgress / 100) * totalLessons));
    const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : enrollmentProgress;
    const instructor = this.findInstructor(course.instructor_id);
    return {
      id: this.numberId(course.id),
      title: this.text(course.title, 'Formation'),
      instructor: instructor.name,
      instructorAvatar: instructor.avatar,
      category: this.text(course.category, 'Formation'),
      level: this.text(course.level, 'Tous niveaux'),
      duration: this.text(course.duration, '0h'),
      thumbnail: this.text(course.thumbnail, '/images/home/academy.jpg'),
      description: this.text(course.description),
      progress,
      totalLessons,
      completedLessons,
      modules,
      quiz,
      quizAttempts: quizAttemptRows.map((row) => this.toQuizAttempt(row)),
      resources: [],
      comments: [],
    };
  }

  async submitApprenantCourseQuizAttempt(courseId: string, payload: unknown, user: AuthUser | null) {
    const actor = this.requireLearningActor(user);
    if (actor.role !== 'apprenant' && !isAdminRole(actor)) {
      throw new ForbiddenException('Seul un apprenant peut soumettre ce quiz.');
    }
    const input = this.requireObject(payload, 'Tentative de quiz invalide.');
    const rawAnswers = input.answers && typeof input.answers === 'object' && !Array.isArray(input.answers)
      ? input.answers as Record<string, unknown>
      : null;
    if (!rawAnswers) {
      throw new BadRequestException('Les reponses du quiz sont obligatoires.');
    }

    await syncAppStoreFromDatabase(this.prisma);
    const course = this.getAccessibleCourse(courseId, actor);
    const enrollment = this.getAccessibleEnrollment(courseId, actor);
    if (!this.canReadCourseDetail(course, enrollment, actor)) {
      throw new NotFoundException('Cours introuvable.');
    }

    const quiz = this.buildCourseQuiz(courseId, actor);
    if (quiz.length === 0) {
      throw new BadRequestException('Aucune question publiee pour ce quiz.');
    }

    const answers = Object.fromEntries(
      Object.entries(rawAnswers)
        .map(([questionId, answerIndex]) => [String(questionId), this.nonNegativeInteger(answerIndex)] as const)
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
      course_name: this.text(course.title, 'Formation'),
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

    await this.platformPersistenceService.persistRows({ course_quiz_attempts: [persisted] }, {
      actorId: actor.id,
      reason: 'learning:apprenant:course-quiz-attempt:create',
      afterRowsByTable: { course_quiz_attempts: [persisted] },
    });

    return this.toQuizAttempt(persisted);
  }

  async getApprenantCourseContext(courseId: string, user: AuthUser | null) {
    const actor = this.requireApprenantReadActor(user);
    const prismaContext = await this.learningProgressReadService.getCourseContext(courseId, actor);
    if (prismaContext) return prismaContext;
    await syncAppStoreFromDatabase(this.prisma);
    const enrollment = this.getAccessibleEnrollment(courseId, actor);
    const progress = hydrateRows('lesson_progress', this.accessibleRows('lesson_progress', actor))
      .filter((row) => String(row.course_id) === String(courseId) && String(row.student_id) === String(actor.id))
      .sort((left, right) => this.compareDatesDesc(left.last_viewed_at ?? left.created_at, right.last_viewed_at ?? right.created_at));
    return { enrollment, lessonProgress: progress };
  }

  async enrollApprenantCourse(courseId: string, user: AuthUser | null) {
    const actor = this.requireLearningActor(user);
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
    const existing = this.getAccessibleEnrollment(courseId, actor);
    if (existing) {
      return existing;
    }
    const now = new Date().toISOString();
    const enrollment = withId(prepareInsert('course_enrollments', {
      course_id: course.id,
      course_name: course.title,
      course_category: course.category,
      course_lessons_count: this.getPublicCourseLessons(courseId).length,
      student_id: actor.id,
      student_name: `${actor.firstName} ${actor.lastName}`.trim() || actor.id,
      student_email: actor.email ?? null,
      progress: 0,
      grade: null,
      status: 'active',
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
        message: `${`${actor.firstName} ${actor.lastName}`.trim() || actor.email || 'Un apprenant'} s est inscrit a "${this.text(course.title, 'Formation')}".`,
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
    const actor = this.requireLearningActor(user);
    if (actor.role !== 'apprenant' && !isAdminRole(actor)) {
      throw new ForbiddenException('Seul un apprenant peut publier un avis.');
    }
    const input = this.requireObject(payload, 'Avis invalide.');
    const rating = toNumber(input.rating);
    const comment = this.text(input.comment);
    if (rating === null || rating < 1 || rating > 5) {
      throw new BadRequestException('Note invalide.');
    }
    if (!comment) {
      throw new BadRequestException('Commentaire requis.');
    }
    await syncAppStoreFromDatabase(this.prisma);
    const enrollment = this.getAccessibleEnrollment(courseId, actor);
    if (!enrollment) {
      throw new ForbiddenException('Inscription requise pour publier un avis.');
    }
    if (this.clampProgress(enrollment.progress) <= 0 && String(enrollment.status) !== 'completed') {
      throw new ForbiddenException('Suivez au moins une lecon avant de publier un avis.');
    }
    const course = this.getAccessibleCourse(courseId, actor);
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
    const actor = this.requireLearningActor(user);
    if (actor.role !== 'apprenant' && !isAdminRole(actor)) {
      throw new ForbiddenException('Seul un apprenant peut mettre a jour cette progression.');
    }
    await syncAppStoreFromDatabase(this.prisma);
    const input = this.parseProgressPayload(payload);
    const enrollment = this.getAccessibleEnrollment(courseId, actor);
    if (!enrollment) {
      throw new NotFoundException('Inscription introuvable.');
    }
    const previous = clone(enrollment);
    const lessonProgressMutation = this.syncLessonProgressRows(courseId, actor, input.completedLessonIds);
    const progress = lessonProgressMutation.totalLessons > 0
      ? Math.round((lessonProgressMutation.completedLessons / lessonProgressMutation.totalLessons) * 100)
      : this.clampProgress(input.progress);
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
    const actor = this.requireLearningActor(user);
    if (actor.role !== 'apprenant' && !isAdminRole(actor)) {
      throw new ForbiddenException('Seul un apprenant peut mettre a jour cette activite.');
    }
    const input = this.requireObject(payload, 'Activite invalide.');
    const deltaSeconds = this.nonNegativeInteger(input.learningTimeSecondsDelta ?? input.deltaSeconds);
    if (deltaSeconds <= 0) {
      throw new BadRequestException('Duree d activite invalide.');
    }
    await syncAppStoreFromDatabase(this.prisma);
    const enrollment = this.getAccessibleEnrollment(courseId, actor);
    if (!enrollment) {
      throw new NotFoundException('Inscription introuvable.');
    }
    const previous = clone(enrollment);
    const currentSeconds = this.nonNegativeInteger(enrollment.learning_time_seconds);
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
    const actor = this.requireLearningActor(user);
    if (actor.role !== 'apprenant' && !isAdminRole(actor)) {
      throw new ForbiddenException('Seul un apprenant peut mettre a jour cette progression.');
    }
    const input = this.requireObject(payload, 'Progression invalide.');
    await syncAppStoreFromDatabase(this.prisma);
    const enrollment = this.getAccessibleEnrollment(courseId, actor);
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
    const progress = hasProgress ? this.clampProgress(input.progress) : this.clampProgress(existing?.progress ?? 0);
    const completed = Object.prototype.hasOwnProperty.call(input, 'completed')
      ? Boolean(input.completed)
      : Boolean(existing?.completed) || progress >= 100;
    const note = Object.prototype.hasOwnProperty.call(input, 'note')
      ? this.truncate(this.text(input.note), 1000)
      : this.text(existing?.note);
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
      video_position_seconds: this.nonNegativeInteger(
        input.video_position_seconds ?? input.videoPositionSeconds,
        this.nonNegativeInteger(existing?.video_position_seconds),
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
    const lessons = this.getPublicCourseLessons(courseId);
    const lessonIds = new Set(lessons.map((row) => String(row.id)));
    const completedCount = (store.lesson_progress ?? []).filter((row) =>
      String(row.course_id) === String(courseId)
      && String(row.student_id) === String(actor.id)
      && lessonIds.has(String(row.lesson_id))
      && (Boolean(row.completed) || this.clampProgress(row.progress) >= 100)
    ).length;
    const enrollmentProgress = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : progress;
    const previousEnrollment = clone(enrollment);
    const updatedEnrollments = patchAppRows('course_enrollments', (row) => String(row.id) === String(enrollment.id), {
      progress: enrollmentProgress,
      completed_lessons_estimate: completedCount,
      status: enrollmentProgress >= 100 ? 'completed' : 'active',
      last_active: now,
    });
    await this.platformPersistenceService.persistRows({
      lesson_progress: [persistedProgress],
      course_enrollments: updatedEnrollments,
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
      },
    });
    return persistedProgress;
  }

  async getApprenantLessonComments(lessonId: string, user: AuthUser | null) {
    const actor = this.requireLearningActor(user);
    await syncAppStoreFromDatabase(this.prisma);
    this.assertCanAccessLessonThread(lessonId, actor);
    return hydrateRows('lesson_comments', this.accessibleRows('lesson_comments', actor))
      .filter((comment) => String(comment.lesson_id) === String(lessonId))
      .sort((left, right) => this.compareDatesDesc(left.created_at, right.created_at));
  }

  async createApprenantLessonComment(lessonId: string, payload: unknown, user: AuthUser | null) {
    const actor = this.requireLearningActor(user);
    const input = this.requireObject(payload, 'Commentaire invalide.');
    const content = this.text(input.content);
    if (!content) {
      throw new BadRequestException('Commentaire requis.');
    }
    await syncAppStoreFromDatabase(this.prisma);
    this.assertCanAccessLessonThread(lessonId, actor);
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

  private requireLearningActor(user: AuthUser | null) {
    if (!user) {
      throw new ForbiddenException('Authentification requise.');
    }
    return user;
  }

  private requireApprenantReadActor(user: AuthUser | null) {
    const actor = this.requireLearningActor(user);
    if (actor.role !== 'apprenant' && !isAdminRole(actor)) {
      throw new ForbiddenException('Seul un apprenant peut consulter ces donnees.');
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
        && String(enrollment.student_id) === String(user.id)
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

  private buildCourseQuiz(courseId: string, actor: AuthUser) {
    const questions = this.accessibleRows('quiz_questions', actor)
      .filter((question) => String(question.course_id) === String(courseId))
      .sort((left, right) => this.position(left) - this.position(right));
    const choices = this.accessibleRows('quiz_choices', actor)
      .filter((choice) => String(choice.course_id) === String(courseId))
      .sort((left, right) => this.position(left) - this.position(right));
    const choicesByQuestion = this.groupBy(choices, 'question_id');

    return questions
      .map((question) => {
        const questionChoices = choicesByQuestion.get(String(question.id)) ?? [];
        const correctIndex = questionChoices.findIndex((choice) =>
          String(choice.is_correct ?? '').toLowerCase() === 'true'
        );

        return {
          id: this.numberId(question.id),
          question: this.text(question.prompt, 'Question'),
          options: questionChoices.map((choice) => this.text(choice.label, 'Option')),
          correctIndex: correctIndex >= 0 ? correctIndex : 0,
          explanation: this.text(question.explanation),
        };
      })
      .filter((question) => question.options.length > 0);
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

  private truncate(value: string, maxLength: number) {
    return value.length > maxLength ? value.slice(0, maxLength) : value;
  }

  private nonNegativeInteger(value: unknown, fallback = 0) {
    const parsed = toNumber(value);
    if (parsed === null || !Number.isFinite(parsed)) {
      return Math.max(0, Math.floor(fallback));
    }
    return Math.max(0, Math.floor(parsed));
  }

  private clampProgress(value: unknown) {
    return Math.max(0, Math.min(100, Math.round(toNumber(value) ?? 0)));
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

  private toQuizAttempt(row: Row) {
    const rawAnswers = row.answers && typeof row.answers === 'object' && !Array.isArray(row.answers)
      ? row.answers as Record<string, unknown>
      : {};
    return {
      id: row.id,
      date: this.text(row.submitted_at ?? row.created_at, new Date().toISOString()),
      score: this.nonNegativeInteger(row.score),
      total: this.nonNegativeInteger(row.total),
      answers: Object.fromEntries(
        Object.entries(rawAnswers).map(([questionId, answerIndex]) => [
          questionId,
          this.nonNegativeInteger(answerIndex),
        ]),
      ),
    };
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

  private compareDatesDesc(left: unknown, right: unknown) {
    const leftDate = Date.parse(String(left ?? ''));
    const rightDate = Date.parse(String(right ?? ''));
    const normalizedLeft = Number.isNaN(leftDate) ? 0 : leftDate;
    const normalizedRight = Number.isNaN(rightDate) ? 0 : rightDate;
    return normalizedRight - normalizedLeft;
  }
}
