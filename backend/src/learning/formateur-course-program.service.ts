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
  sanitizeCourseLessonRecord,
  sanitizeCourseRecord,
  sanitizeCourseSectionRecord,
} from '../data/data-course-sanitizers.js';
import { applyDataDeleteCascade } from '../data/data-delete-cascade.js';
import {
  sanitizeExamRecord,
  sanitizeLessonAssetRecord,
  sanitizeQuizChoiceRecord,
  sanitizeQuizQuestionRecord,
} from '../data/data-learning-sanitizers.js';
import { ensureConstraints, prepareInsert, recomputeDerivedData } from '../data/data-runtime.js';
import { hydrateRows } from '../data/data-row-hydration.js';
import type { Row } from '../data/mock-store.js';

@Injectable()
export class FormateurCourseProgramService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly platformPersistenceService: PlatformPersistenceService,
  ) {}

  async getCourses(user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    await syncAppStoreFromDatabase(this.prisma);
    return hydrateRows('courses', this.getInstructorCourses(actor))
      .sort((left, right) => this.compareDatesDesc(left.updated_at ?? left.created_at, right.updated_at ?? right.created_at));
  }

  async getWizardDraft(user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    await syncAppStoreFromDatabase(this.prisma);
    const draft = this.getWizardDraftRow(actor);
    return {
      draft: draft?.draft ?? null,
      savedAt: draft?.saved_at ?? draft?.updated_at ?? draft?.created_at ?? null,
    };
  }

  async saveWizardDraft(payload: unknown, user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    const input = this.requireObject(payload, 'Brouillon invalide.');
    const draft = input.draft;
    if (!draft || typeof draft !== 'object' || Array.isArray(draft)) {
      throw new BadRequestException('Le contenu du brouillon est obligatoire.');
    }
    const serialized = JSON.stringify(draft);
    if (serialized.length > 1_500_000) {
      throw new BadRequestException('Le brouillon est trop volumineux.');
    }

    await syncAppStoreFromDatabase(this.prisma);
    const now = new Date().toISOString();
    const existing = this.getWizardDraftRow(actor);
    const row = {
      id: `course-wizard-draft-${actor.id}`,
      user_id: actor.id,
      draft,
      saved_at: now,
      updated_at: now,
      created_at: existing?.created_at ?? now,
    };
    const beforeRows = existing ? [clone(existing)] : [];
    const persisted = existing
      ? patchAppRows('course_wizard_drafts', (entry) => String(entry.id) === String(existing.id), row)
      : appendAppRows('course_wizard_drafts', [row]);

    await this.platformPersistenceService.persistRows({ course_wizard_drafts: persisted }, {
      actorId: actor.id,
      reason: 'learning:formateur:course-wizard-draft:save',
      beforeRowsByTable: beforeRows.length ? { course_wizard_drafts: beforeRows } : {},
      afterRowsByTable: { course_wizard_drafts: persisted },
    });

    return {
      draft,
      savedAt: now,
    };
  }

  async clearWizardDraft(user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    await syncAppStoreFromDatabase(this.prisma);
    const existing = this.getWizardDraftRow(actor);
    if (!existing) {
      return { cleared: true };
    }

    store.course_wizard_drafts = (store.course_wizard_drafts ?? []).filter((row) => String(row.id) !== String(existing.id));
    await this.platformPersistenceService.deleteRows({ course_wizard_drafts: [String(existing.id)] }, {
      actorId: actor.id,
      reason: 'learning:formateur:course-wizard-draft:clear',
      beforeRowsByTable: { course_wizard_drafts: [existing] },
    });
    return { cleared: true };
  }

  async createBundle(payload: unknown, user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    const input = this.requireObject(payload, 'Formation invalide.');
    const courseInput = this.requireObject(input.course, 'Fiche formation invalide.');
    const sectionsInput = Array.isArray(input.sections) ? input.sections as Row[] : [];
    const assetsInput = Array.isArray(input.assets) ? input.assets as Row[] : [];
    const examsInput = Array.isArray(input.exams) ? input.exams as Row[] : [];

    await syncAppStoreFromDatabase(this.prisma);
    const now = new Date().toISOString();
    const course = this.createCourseRow({
      ...courseInput,
      instructor_id: actor.id,
      status: 'draft',
      modules: sectionsInput.length || courseInput.modules || 1,
      created_at: now,
      updated_at: now,
    }, actor);

    const rowsByTable: Record<string, Row[]> = { courses: [course] };
    const sectionIdMap = new Map<string, string | number>();
    const lessonIdMap = new Map<string, string | number>();
    const lessonSectionMap = new Map<string, string>();

    for (const sectionInput of sectionsInput) {
      const section = this.createSectionRow({ ...sectionInput, course_id: course.id }, actor);
      rowsByTable.course_sections = [...(rowsByTable.course_sections ?? []), section];
      sectionIdMap.set(String(sectionInput.id ?? section.id), this.requireCreatedId(section.id));

      const lessonsInput = Array.isArray(sectionInput.lessons) ? sectionInput.lessons as Row[] : [];
      for (const lessonInput of lessonsInput) {
        const lesson = this.createLessonRow({
          ...lessonInput,
          course_id: course.id,
          section_id: section.id,
        }, actor);
        rowsByTable.course_lessons = [...(rowsByTable.course_lessons ?? []), lesson];
        lessonIdMap.set(String(lessonInput.id ?? lesson.id), this.requireCreatedId(lesson.id));
        lessonSectionMap.set(String(lessonInput.id ?? lesson.id), String(sectionInput.id ?? section.id));
      }
    }

    for (const assetInput of assetsInput.filter((entry) => String(entry.url ?? '').trim())) {
      const draftLessonId = String(assetInput.lessonId ?? assetInput.lesson_id ?? '');
      const lessonId = lessonIdMap.get(draftLessonId);
      const draftSectionId = lessonSectionMap.get(draftLessonId);
      const sectionId = draftSectionId ? sectionIdMap.get(draftSectionId) : null;
      if (!lessonId || !sectionId) continue;

      const asset = this.createAssetRow({
        ...assetInput,
        lesson_id: lessonId,
        section_id: sectionId,
        course_id: course.id,
        title: assetInput.title || assetInput.lessonTitle,
        status: assetInput.status ?? (String(assetInput.asset_type) === 'video' ? 'processing' : 'ready'),
      }, actor);
      rowsByTable.lesson_assets = [...(rowsByTable.lesson_assets ?? []), asset];
    }

    for (const examInput of examsInput) {
      const exam = this.createExamRow({
        ...examInput,
        instructor_id: actor.id,
        course_id: course.id,
        status: examInput.status ?? 'upcoming',
        submitted: 0,
        avg_grade: null,
      }, actor);
      rowsByTable.exams = [...(rowsByTable.exams ?? []), exam];

      if (String(exam.type) !== 'quiz') continue;
      const questionsInput = Array.isArray(examInput.questions) ? examInput.questions as Row[] : [];
      for (let questionIndex = 0; questionIndex < questionsInput.length; questionIndex += 1) {
        const questionInput = questionsInput[questionIndex];
        const question = this.createQuestionRow({
          ...questionInput,
          exam_id: exam.id,
          position: questionInput.position ?? questionIndex + 1,
        }, actor);
        rowsByTable.quiz_questions = [...(rowsByTable.quiz_questions ?? []), question];

        const choicesInput = Array.isArray(questionInput.choices) ? questionInput.choices as Row[] : [];
        for (let choiceIndex = 0; choiceIndex < choicesInput.length; choiceIndex += 1) {
          const choiceInput = choicesInput[choiceIndex];
          if (!String(choiceInput.label ?? '').trim()) continue;
          const choice = this.createChoiceRow({
            ...choiceInput,
            question_id: question.id,
            position: choiceInput.position ?? choiceIndex + 1,
          }, actor);
          rowsByTable.quiz_choices = [...(rowsByTable.quiz_choices ?? []), choice];
        }
      }
    }

    await this.platformPersistenceService.persistRows(rowsByTable, {
      actorId: actor.id,
      reason: 'learning:formateur:course-bundle:create',
      afterRowsByTable: rowsByTable,
    });

    return course;
  }

  async updateCourse(courseId: string, payload: unknown, user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    const input = this.requireObject(payload, 'Formation invalide.');
    await syncAppStoreFromDatabase(this.prisma);
    const course = this.getInstructorCourse(courseId, actor);
    const previous = clone(course);
    const sanitized = sanitizeCourseRecord({ ...course, ...input, updated_at: new Date().toISOString() }, actor);
    const updated = patchAppRows('courses', (row) => String(row.id) === String(course.id), sanitized);
    await this.platformPersistenceService.persistRows({ courses: updated }, {
      actorId: actor.id,
      reason: 'learning:formateur:course:update',
      beforeRowsByTable: { courses: [previous] },
      afterRowsByTable: { courses: updated },
    });
    return updated[0] ?? sanitized;
  }

  async updateWorkflow(courseId: string, payload: unknown, user: AuthUser | null) {
    const input = this.requireObject(payload, 'Statut formation invalide.');
    const status = typeof input.status === 'string' ? input.status : null;
    if (!status) {
      throw new BadRequestException('Le statut de la formation est obligatoire.');
    }
    return this.updateCourse(courseId, { status }, user);
  }

  async deleteCourse(courseId: string, user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    await syncAppStoreFromDatabase(this.prisma);
    const course = this.getInstructorCourse(courseId, actor);
    store.courses = (store.courses ?? []).filter((row) => String(row.id) !== String(course.id));
    const deletedRowIdsByTable = applyDataDeleteCascade('courses', [course]);
    recomputeDerivedData();
    await this.platformPersistenceService.deleteRows(deletedRowIdsByTable, {
      actorId: actor.id,
      reason: 'learning:formateur:course:delete',
      beforeRowsByTable: { courses: [course] },
    });
    return course;
  }

  async getProgram(courseId: string, user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    await syncAppStoreFromDatabase(this.prisma);
    const course = this.getInstructorCourse(courseId, actor);
    const sections = hydrateRows('course_sections', this.accessibleRows('course_sections', actor))
      .filter((section) => String(section.course_id) === String(course.id))
      .sort((left, right) => this.position(left) - this.position(right));
    const lessons = hydrateRows('course_lessons', this.accessibleRows('course_lessons', actor))
      .filter((lesson) => String(lesson.course_id) === String(course.id))
      .sort((left, right) => this.position(left) - this.position(right));
    const assets = hydrateRows('lesson_assets', this.accessibleRows('lesson_assets', actor))
      .filter((asset) => String(asset.course_id) === String(course.id))
      .sort((left, right) => this.position(left) - this.position(right));
    return {
      course,
      sections,
      lessons: lessons.map((lesson) => ({ ...lesson, is_preview: Boolean(lesson.is_preview) })),
      assets,
    };
  }

  async saveSection(courseId: string, payload: unknown, user: AuthUser | null, sectionId?: string) {
    const actor = this.requireFormateurActor(user);
    const input = this.requireObject(payload, 'Chapitre invalide.');
    await syncAppStoreFromDatabase(this.prisma);
    this.getInstructorCourse(courseId, actor);
    if (sectionId) {
      const section = this.getInstructorSection(courseId, sectionId, actor);
      const previous = clone(section);
      const sanitized = sanitizeCourseSectionRecord({ ...section, ...input, course_id: courseId }, actor);
      const updated = patchAppRows('course_sections', (row) => String(row.id) === String(section.id), sanitized);
      await this.platformPersistenceService.persistRows({ course_sections: updated }, {
        actorId: actor.id,
        reason: 'learning:formateur:course-section:update',
        beforeRowsByTable: { course_sections: [previous] },
        afterRowsByTable: { course_sections: updated },
      });
      return updated[0] ?? sanitized;
    }
    const section = this.createSectionRow({ ...input, course_id: courseId }, actor);
    await this.platformPersistenceService.persistRows({ course_sections: [section] }, {
      actorId: actor.id,
      reason: 'learning:formateur:course-section:create',
      afterRowsByTable: { course_sections: [section] },
    });
    return section;
  }

  async saveLesson(courseId: string, payload: unknown, user: AuthUser | null, lessonId?: string) {
    const actor = this.requireFormateurActor(user);
    const input = this.requireObject(payload, 'Lecon invalide.');
    await syncAppStoreFromDatabase(this.prisma);
    this.getInstructorCourse(courseId, actor);
    if (lessonId) {
      const lesson = this.getInstructorLesson(courseId, lessonId, actor);
      const previous = clone(lesson);
      const sanitized = sanitizeCourseLessonRecord({ ...lesson, ...input, course_id: courseId }, actor);
      const updated = patchAppRows('course_lessons', (row) => String(row.id) === String(lesson.id), sanitized);
      await this.platformPersistenceService.persistRows({ course_lessons: updated }, {
        actorId: actor.id,
        reason: 'learning:formateur:course-lesson:update',
        beforeRowsByTable: { course_lessons: [previous] },
        afterRowsByTable: { course_lessons: updated },
      });
      return updated[0] ?? sanitized;
    }
    const lesson = this.createLessonRow({ ...input, course_id: courseId }, actor);
    await this.platformPersistenceService.persistRows({ course_lessons: [lesson] }, {
      actorId: actor.id,
      reason: 'learning:formateur:course-lesson:create',
      afterRowsByTable: { course_lessons: [lesson] },
    });
    return lesson;
  }

  async saveAsset(courseId: string, payload: unknown, user: AuthUser | null, assetId?: string) {
    const actor = this.requireFormateurActor(user);
    const input = this.requireObject(payload, 'Contenu invalide.');
    await syncAppStoreFromDatabase(this.prisma);
    this.getInstructorCourse(courseId, actor);
    if (assetId) {
      const asset = this.getInstructorAsset(courseId, assetId, actor);
      const previous = clone(asset);
      const sanitized = sanitizeLessonAssetRecord({ ...asset, ...input, course_id: courseId }, actor);
      const updated = patchAppRows('lesson_assets', (row) => String(row.id) === String(asset.id), sanitized);
      await this.platformPersistenceService.persistRows({ lesson_assets: updated }, {
        actorId: actor.id,
        reason: 'learning:formateur:lesson-asset:update',
        beforeRowsByTable: { lesson_assets: [previous] },
        afterRowsByTable: { lesson_assets: updated },
      });
      return updated[0] ?? sanitized;
    }
    const asset = this.createAssetRow({ ...input, course_id: courseId }, actor);
    await this.platformPersistenceService.persistRows({ lesson_assets: [asset] }, {
      actorId: actor.id,
      reason: 'learning:formateur:lesson-asset:create',
      afterRowsByTable: { lesson_assets: [asset] },
    });
    return asset;
  }

  async deleteSection(courseId: string, sectionId: string, user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    await syncAppStoreFromDatabase(this.prisma);
    const section = this.getInstructorSection(courseId, sectionId, actor);
    store.course_sections = (store.course_sections ?? []).filter((row) => String(row.id) !== String(section.id));
    const deletedRowIdsByTable = applyDataDeleteCascade('course_sections', [section]);
    recomputeDerivedData();
    await this.platformPersistenceService.deleteRows(deletedRowIdsByTable, {
      actorId: actor.id,
      reason: 'learning:formateur:course-section:delete',
      beforeRowsByTable: { course_sections: [section] },
    });
    return section;
  }

  async deleteLesson(courseId: string, lessonId: string, user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    await syncAppStoreFromDatabase(this.prisma);
    const lesson = this.getInstructorLesson(courseId, lessonId, actor);
    store.course_lessons = (store.course_lessons ?? []).filter((row) => String(row.id) !== String(lesson.id));
    const deletedRowIdsByTable = applyDataDeleteCascade('course_lessons', [lesson]);
    recomputeDerivedData();
    await this.platformPersistenceService.deleteRows(deletedRowIdsByTable, {
      actorId: actor.id,
      reason: 'learning:formateur:course-lesson:delete',
      beforeRowsByTable: { course_lessons: [lesson] },
    });
    return lesson;
  }

  async deleteAsset(courseId: string, assetId: string, user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    await syncAppStoreFromDatabase(this.prisma);
    const asset = this.getInstructorAsset(courseId, assetId, actor);
    store.lesson_assets = (store.lesson_assets ?? []).filter((row) => String(row.id) !== String(asset.id));
    recomputeDerivedData();
    await this.platformPersistenceService.deleteRows({ lesson_assets: [String(asset.id)] }, {
      actorId: actor.id,
      reason: 'learning:formateur:lesson-asset:delete',
      beforeRowsByTable: { lesson_assets: [asset] },
    });
    return asset;
  }

  async reorderSections(courseId: string, payload: unknown, user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    const input = this.requireObject(payload, 'Ordre des chapitres invalide.');
    await syncAppStoreFromDatabase(this.prisma);
    const current = this.getInstructorSection(courseId, this.getPayloadId(input, 'current'), actor);
    const target = this.getInstructorSection(courseId, this.getPayloadId(input, 'target'), actor);
    return this.swapPositions('course_sections', current, target, actor, 'learning:formateur:course-section:reorder');
  }

  async reorderLessons(courseId: string, payload: unknown, user: AuthUser | null) {
    const actor = this.requireFormateurActor(user);
    const input = this.requireObject(payload, 'Ordre des lecons invalide.');
    await syncAppStoreFromDatabase(this.prisma);
    const current = this.getInstructorLesson(courseId, this.getPayloadId(input, 'current'), actor);
    const target = this.getInstructorLesson(courseId, this.getPayloadId(input, 'target'), actor);
    return this.swapPositions('course_lessons', current, target, actor, 'learning:formateur:course-lesson:reorder');
  }

  private createCourseRow(input: Row, actor: AuthUser) {
    const sanitized = sanitizeCourseRecord(input, actor);
    ensureConstraints('courses', [sanitized]);
    const row = withId(prepareInsert('courses', sanitized));
    appendAppRows('courses', [row]);
    return row;
  }

  private createSectionRow(input: Row, actor: AuthUser) {
    const sanitized = sanitizeCourseSectionRecord(input, actor);
    ensureConstraints('course_sections', [sanitized]);
    const row = withId(prepareInsert('course_sections', sanitized));
    appendAppRows('course_sections', [row]);
    return row;
  }

  private createLessonRow(input: Row, actor: AuthUser) {
    const sanitized = sanitizeCourseLessonRecord(input, actor);
    ensureConstraints('course_lessons', [sanitized]);
    const row = withId(prepareInsert('course_lessons', sanitized));
    appendAppRows('course_lessons', [row]);
    return row;
  }

  private createAssetRow(input: Row, actor: AuthUser) {
    const sanitized = sanitizeLessonAssetRecord(input, actor);
    ensureConstraints('lesson_assets', [sanitized]);
    const row = withId(prepareInsert('lesson_assets', sanitized));
    appendAppRows('lesson_assets', [row]);
    return row;
  }

  private createExamRow(input: Row, actor: AuthUser) {
    const sanitized = sanitizeExamRecord(input, actor);
    ensureConstraints('exams', [sanitized]);
    const row = withId(prepareInsert('exams', sanitized));
    appendAppRows('exams', [row]);
    return row;
  }

  private createQuestionRow(input: Row, actor: AuthUser) {
    const sanitized = sanitizeQuizQuestionRecord(input, actor);
    ensureConstraints('quiz_questions', [sanitized]);
    const row = withId(prepareInsert('quiz_questions', sanitized));
    appendAppRows('quiz_questions', [row]);
    return row;
  }

  private createChoiceRow(input: Row, actor: AuthUser) {
    const sanitized = sanitizeQuizChoiceRecord(input, actor);
    ensureConstraints('quiz_choices', [sanitized]);
    const row = withId(prepareInsert('quiz_choices', sanitized));
    appendAppRows('quiz_choices', [row]);
    return row;
  }

  private async swapPositions(table: 'course_sections' | 'course_lessons', current: Row, target: Row, actor: AuthUser, reason: string) {
    const beforeRows = [clone(current), clone(target)];
    const updated = patchAppRows(table, (row) => String(row.id) === String(current.id), { position: target.position });
    const updatedTarget = patchAppRows(table, (row) => String(row.id) === String(target.id), { position: current.position });
    const afterRows = [...updated, ...updatedTarget];
    await this.platformPersistenceService.persistRows({ [table]: afterRows }, {
      actorId: actor.id,
      reason,
      beforeRowsByTable: { [table]: beforeRows },
      afterRowsByTable: { [table]: afterRows },
    });
    return afterRows;
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

  private requireCreatedId(id: unknown): string | number {
    if (typeof id === 'string' || typeof id === 'number') {
      return id;
    }
    throw new BadRequestException('Identifiant de creation invalide.');
  }

  private getPayloadId(input: Row, key: 'current' | 'target') {
    const direct = input[`${key}_id`];
    const nested = input[key];
    if (direct !== undefined && direct !== null && direct !== '') {
      return String(direct);
    }
    if (nested && typeof nested === 'object' && !Array.isArray(nested) && 'id' in nested) {
      return String((nested as Row).id ?? '');
    }
    return '';
  }

  private accessibleRows(table: string, user: AuthUser) {
    return filterRowsForActor(table, store[table] ?? [], user);
  }

  private getInstructorCourses(user: AuthUser) {
    return this.accessibleRows('courses', user)
      .filter((course) => isAdminRole(user) || String(course.instructor_id) === String(user.id));
  }

  private getWizardDraftRow(user: AuthUser) {
    return this.accessibleRows('course_wizard_drafts', user)
      .find((row) => String(row.user_id) === String(user.id));
  }

  private getInstructorCourse(courseId: string, user: AuthUser) {
    const course = this.getInstructorCourses(user).find((row) => String(row.id) === String(courseId));
    if (!course) {
      throw new NotFoundException('Formation introuvable.');
    }
    return course;
  }

  private getInstructorSection(courseId: string, sectionId: string, user: AuthUser) {
    this.getInstructorCourse(courseId, user);
    const section = this.accessibleRows('course_sections', user)
      .find((row) => String(row.id) === String(sectionId) && String(row.course_id) === String(courseId));
    if (!section) {
      throw new NotFoundException('Chapitre introuvable.');
    }
    return section;
  }

  private getInstructorLesson(courseId: string, lessonId: string, user: AuthUser) {
    this.getInstructorCourse(courseId, user);
    const lesson = this.accessibleRows('course_lessons', user)
      .find((row) => String(row.id) === String(lessonId) && String(row.course_id) === String(courseId));
    if (!lesson) {
      throw new NotFoundException('Lecon introuvable.');
    }
    return lesson;
  }

  private getInstructorAsset(courseId: string, assetId: string, user: AuthUser) {
    this.getInstructorCourse(courseId, user);
    const asset = this.accessibleRows('lesson_assets', user)
      .find((row) => String(row.id) === String(assetId) && String(row.course_id) === String(courseId));
    if (!asset) {
      throw new NotFoundException('Contenu introuvable.');
    }
    return asset;
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
