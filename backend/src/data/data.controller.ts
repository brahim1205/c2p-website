import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { AuthService } from '../auth/auth.service.js';
import { findUserById, type AuthUser } from '../auth/auth.store.js';
import type { AuthenticatedRequest } from '../common/http/request-context.js';
import { createInitialStore, type Row, type Store } from './mock-store.js';

const initialStore: Store = createInitialStore();
const store: Store = clone(initialStore);
const PUBLIC_READ_TABLES = new Set([
  'providers',
  'provider_services',
  'provider_reviews',
  'courses',
  'projects',
]);
const ADMIN_ONLY_TABLES = new Set([
  'admin_accreditations',
  'admin_content_items',
  'admin_campaigns',
  'admin_reports',
  'admin_platform_categories',
  'admin_platform_rules',
  'admin_integrations',
  'admin_backups',
  'admin_security_alerts',
  'admin_audit_logs',
  'auth_users',
  'auth_sessions',
]);

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function matches(row: Row, query: Record<string, string | string[] | undefined>) {
  return Object.entries(query).every(([key, value]) => {
    if (value === undefined) return true;

    const firstValue = Array.isArray(value) ? value[0] : value;
    if (key.startsWith('eq_')) {
      const field = key.slice(3);
      return String(row[field]) === firstValue;
    }

    if (key.startsWith('neq_')) {
      const field = key.slice(4);
      return String(row[field]) !== firstValue;
    }

    if (key.startsWith('in_')) {
      const field = key.slice(3);
      return firstValue.split(',').includes(String(row[field]));
    }

    return true;
  });
}

function withId(row: Row): Row {
  return {
    id: row.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    created_at: row.created_at ?? new Date().toISOString(),
    ...row,
  };
}

function ensureTable(table: string) {
  if (!store[table]) {
    store[table] = [];
  }
}

function toNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function compareValues(left: unknown, right: unknown) {
  const leftNumber = toNumber(left);
  const rightNumber = toNumber(right);
  if (leftNumber !== null && rightNumber !== null) {
    return leftNumber - rightNumber;
  }

  const leftDate = typeof left === 'string' ? Date.parse(left) : Number.NaN;
  const rightDate = typeof right === 'string' ? Date.parse(right) : Number.NaN;
  if (!Number.isNaN(leftDate) && !Number.isNaN(rightDate)) {
    return leftDate - rightDate;
  }

  return String(left ?? '').localeCompare(String(right ?? ''));
}

function getDaysSince(dateValue: unknown) {
  if (typeof dateValue !== 'string' || !dateValue) return null;
  const timestamp = Date.parse(dateValue);
  if (Number.isNaN(timestamp)) return null;
  return Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
}

function findRow(table: string, id: unknown) {
  return (store[table] ?? []).find((row) => String(row.id) === String(id));
}

function normalizeText(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function resetStore(nextStore: Store) {
  for (const key of Object.keys(store)) {
    delete store[key];
  }

  for (const [key, value] of Object.entries(nextStore)) {
    store[key] = clone(value);
  }
}

function buildAppRows() {
  return Object.entries(store).flatMap<Prisma.AppRowCreateManyInput>(([table, rows]) =>
    rows.map((row) => ({
      key: `${table}::${String(row.id)}`,
      table,
      rowId: String(row.id),
      data: row as Prisma.InputJsonValue,
    })),
  );
}

export async function syncAppStoreFromDatabase(prisma: PrismaService) {
  if (!prisma.isConnected) {
    recomputeDerivedData();
    return;
  }

  const knownTables = new Set(
    (await prisma.appRow.findMany({ distinct: ['table'], select: { table: true } })).map((entry) => entry.table),
  );

  const missingRows = Object.entries(initialStore)
    .filter(([table, rows]) => rows.length > 0 && !knownTables.has(table))
    .flatMap(([table, rows]) =>
      rows.map((row) => ({
        key: `${table}::${String(row.id)}`,
        table,
        rowId: String(row.id),
        data: row as Prisma.InputJsonValue,
      })),
    );

  if (missingRows.length > 0) {
    await prisma.appRow.createMany({
      data: missingRows,
      skipDuplicates: true,
    });
  }

  const records = await prisma.appRow.findMany();
  const nextStore: Store = {};
  for (const record of records) {
    if (!nextStore[record.table]) {
      nextStore[record.table] = [];
    }
    nextStore[record.table].push(clone(record.data as Row));
  }

  for (const table of Object.keys(initialStore)) {
    if (!nextStore[table]) {
      nextStore[table] = [];
    }
  }

  resetStore(nextStore);
  recomputeDerivedData();
}

export async function persistAppStoreToDatabase(prisma: PrismaService) {
  if (!prisma.isConnected) {
    return;
  }

  const records = buildAppRows();
  await prisma.$transaction(async (tx) => {
    await tx.appRow.deleteMany({});
    if (records.length > 0) {
      await tx.appRow.createMany({ data: records });
    }
  });
}

export function appendAppRows(table: string, rows: Row[]) {
  ensureTable(table);
  store[table] = [...(store[table] ?? []), ...rows];
  recomputeDerivedData();
  return rows.map((row) => hydrateRow(table, findRow(table, row.id) ?? row));
}

export function patchAppRows(
  table: string,
  predicate: (row: Row) => boolean,
  patch: Row | ((row: Row) => Row),
) {
  ensureTable(table);
  const rows = store[table] ?? [];
  const updated = rows.map((row) => {
    if (!predicate(row)) return row;
    const nextPatch = typeof patch === 'function' ? patch(row) : patch;
    return {
      ...row,
      ...nextPatch,
      updated_at: new Date().toISOString(),
    };
  });
  store[table] = updated;
  recomputeDerivedData();
  return hydrateRows(table, updated.filter(predicate));
}

export function listAppRows(table: string) {
  ensureTable(table);
  return clone(store[table] ?? []);
}

function hydrateRow(table: string, row: Row): Row {
  const hydrated = clone(row);

  if (table === 'providers') {
    hydrated.reviews = hydrated.reviews ?? hydrated.reviews_count ?? 0;
    hydrated.reviews_count = hydrated.reviews_count ?? hydrated.reviews ?? 0;
    return hydrated;
  }

  if (table === 'projects') {
    hydrated.sector = hydrated.sector ?? hydrated.category ?? null;
    hydrated.documents_count = hydrated.documents_count ?? 0;
    hydrated.reports_count = hydrated.reports_count ?? 0;
    hydrated.progress = hydrated.progress ?? 0;
    return hydrated;
  }

  if (table === 'bookings') {
    const provider = findRow('providers', hydrated.provider_id);
    if (provider) {
      hydrated.provider = {
        id: provider.id,
        name: provider.name,
        image: provider.image,
      };
    }
    return hydrated;
  }

  if (table === 'client_favorites') {
    const provider = findRow('providers', hydrated.provider_id);
    hydrated.provider = provider ? clone(provider) : null;
    return hydrated;
  }

  if (table === 'courses') {
    const basePrice = requireNumberOrFallback(hydrated.price, 0);
    const promotionPercentage = requireNumberOrFallback(hydrated.promotion_percentage, 0);
    const isFree = parseBoolean(hydrated.is_free, basePrice <= 0);
    hydrated.level = hydrated.level ?? 'intermediate';
    hydrated.is_free = isFree;
    hydrated.access_type = hydrated.access_type ?? (isFree ? 'free' : 'paid');
    hydrated.promotion_percentage = Math.max(0, Math.min(100, promotionPercentage));
    hydrated.trailer_url = trimText(hydrated.trailer_url);
    hydrated.price = isFree ? 0 : basePrice;
    hydrated.current_price = isFree
      ? 0
      : Math.max(0, Math.round(basePrice * (1 - ((toNumber(hydrated.promotion_percentage) ?? 0) / 100))));
    hydrated.views = hydrated.views ?? Math.max((toNumber(hydrated.students_count) ?? 0) * 6, 0);
    return hydrated;
  }

  if (table === 'course_enrollments') {
    const course = findRow('courses', hydrated.course_id);
    hydrated.course_name = hydrated.course_name ?? course?.title ?? null;
    hydrated.course_category = hydrated.course_category ?? course?.category ?? null;
    hydrated.course_sections_count = hydrated.course_sections_count ?? Math.max(toNumber(course?.modules) ?? 0, 0);
    hydrated.course_lessons_count = hydrated.course_lessons_count ?? 0;
    hydrated.completed_sections_estimate = hydrated.completed_sections_estimate ?? 0;
    hydrated.remaining_sections_estimate = hydrated.remaining_sections_estimate ?? 0;
    hydrated.completed_lessons_estimate = hydrated.completed_lessons_estimate ?? 0;
    hydrated.remaining_lessons_estimate = hydrated.remaining_lessons_estimate ?? 0;
    hydrated.days_since_active = hydrated.days_since_active ?? getDaysSince(hydrated.last_active) ?? 0;
    hydrated.submissions_count = hydrated.submissions_count ?? 0;
    hydrated.graded_submissions_count = hydrated.graded_submissions_count ?? 0;
    hydrated.pending_grading_count = hydrated.pending_grading_count ?? 0;
    hydrated.avg_submission_grade = hydrated.avg_submission_grade ?? null;
    hydrated.latest_submission_at = hydrated.latest_submission_at ?? null;
    hydrated.attention_level = hydrated.attention_level ?? 'watch';
    hydrated.certificate_status = hydrated.certificate_status ?? 'pending';
    hydrated.certificate_issued_at = hydrated.certificate_issued_at ?? null;
    hydrated.certificate_number = hydrated.certificate_number ?? null;
    hydrated.courses = course ? clone(course) : null;
    return hydrated;
  }

  if (table === 'course_sections') {
    const course = findRow('courses', hydrated.course_id);
    const lessons = (store.course_lessons ?? []).filter((lesson) => String(lesson.section_id) === String(hydrated.id));
    hydrated.course_name = hydrated.course_name ?? course?.title ?? null;
    hydrated.instructor_id = hydrated.instructor_id ?? course?.instructor_id ?? null;
    hydrated.lessons_count = hydrated.lessons_count ?? lessons.length;
    return hydrated;
  }

  if (table === 'course_lessons') {
    const course = findRow('courses', hydrated.course_id);
    const section = findRow('course_sections', hydrated.section_id);
    hydrated.course_name = hydrated.course_name ?? course?.title ?? null;
    hydrated.section_title = hydrated.section_title ?? section?.title ?? null;
    hydrated.instructor_id = hydrated.instructor_id ?? course?.instructor_id ?? null;
    hydrated.is_preview = Boolean(hydrated.is_preview);
    return hydrated;
  }

  if (table === 'lesson_assets') {
    const course = findRow('courses', hydrated.course_id);
    const section = findRow('course_sections', hydrated.section_id);
    const lesson = findRow('course_lessons', hydrated.lesson_id);
    hydrated.course_name = hydrated.course_name ?? course?.title ?? null;
    hydrated.section_title = hydrated.section_title ?? section?.title ?? null;
    hydrated.lesson_title = hydrated.lesson_title ?? lesson?.title ?? null;
    hydrated.instructor_id = hydrated.instructor_id ?? course?.instructor_id ?? null;
    return hydrated;
  }

  if (table === 'lesson_comments') {
    const course = findRow('courses', hydrated.course_id);
    const lesson = findRow('course_lessons', hydrated.lesson_id);
    hydrated.course_name = hydrated.course_name ?? course?.title ?? null;
    hydrated.lesson_title = hydrated.lesson_title ?? lesson?.title ?? null;
    hydrated.likes = hydrated.likes ?? 0;
    hydrated.pinned = Boolean(hydrated.pinned);
    hydrated.status = hydrated.status ?? 'visible';
    return hydrated;
  }

  if (table === 'course_faq_items') {
    const course = findRow('courses', hydrated.course_id);
    hydrated.course_name = hydrated.course_name ?? course?.title ?? null;
    hydrated.status = hydrated.status ?? 'draft';
    return hydrated;
  }

  if (table === 'payout_accounts') {
    hydrated.is_default = Boolean(hydrated.is_default);
    hydrated.status = hydrated.status ?? 'active';
    return hydrated;
  }

  if (table === 'payout_requests') {
    const account = findRow('payout_accounts', hydrated.account_id);
    hydrated.currency = hydrated.currency ?? 'XAF';
    hydrated.account_label = hydrated.account_label ?? account?.label ?? null;
    hydrated.account_identifier = hydrated.account_identifier ?? account?.account_identifier ?? null;
    hydrated.status = hydrated.status ?? 'pending';
    return hydrated;
  }

  if (table === 'virtual_classes') {
    const course = findRow('courses', hydrated.course_id);
    hydrated.course_name = hydrated.course_name ?? course?.title ?? null;
    hydrated.provider = hydrated.provider ?? getDefaultLiveProvider();
    hydrated.meeting_slug = hydrated.meeting_slug ?? normalizeMeetingSlug(
      hydrated.meeting_slug,
      [hydrated.course_name, hydrated.title, hydrated.class_date, hydrated.class_time],
    );
    hydrated.room_link = hydrated.room_link ?? (hydrated.provider === 'jitsi'
      ? buildJitsiRoomUrl(String(hydrated.meeting_slug))
      : null);
    hydrated.recording_enabled = parseBoolean(hydrated.recording_enabled, true);
    hydrated.allow_chat = parseBoolean(hydrated.allow_chat, true);
    hydrated.instructor_notes = trimText(hydrated.instructor_notes);
    hydrated.started_at = hydrated.started_at ?? null;
    hydrated.ended_at = hydrated.ended_at ?? null;
    hydrated.recording_status = hydrated.recording_url
      ? 'ready'
      : hydrated.recording_enabled
        ? (hydrated.status === 'ended' ? 'processing' : 'pending')
        : 'none';
    hydrated.replay_available = Boolean(hydrated.recording_url) || hydrated.recording_status === 'ready';
    return hydrated;
  }

  if (table === 'exams') {
    const course = findRow('courses', hydrated.course_id);
    hydrated.course_name = hydrated.course_name ?? course?.title ?? null;
    hydrated.instructor_id = hydrated.instructor_id ?? course?.instructor_id ?? null;
    hydrated.questions_count = hydrated.questions_count ?? (store.quiz_questions ?? []).filter((question) => String(question.exam_id) === String(hydrated.id)).length;
    hydrated.open_questions_count = hydrated.open_questions_count ?? (store.quiz_questions ?? []).filter(
      (question) => String(question.exam_id) === String(hydrated.id) && String(question.type) === 'open',
    ).length;
    hydrated.auto_gradable = hydrated.auto_gradable ?? (toNumber(hydrated.open_questions_count) ?? 0) === 0;
    return hydrated;
  }

  if (table === 'quiz_questions') {
    const exam = findRow('exams', hydrated.exam_id);
    const course = findRow('courses', hydrated.course_id ?? exam?.course_id);
    const choices = (store.quiz_choices ?? []).filter((choice) => String(choice.question_id) === String(hydrated.id));
    hydrated.exam_title = hydrated.exam_title ?? exam?.title ?? null;
    hydrated.course_id = hydrated.course_id ?? exam?.course_id ?? null;
    hydrated.course_name = hydrated.course_name ?? course?.title ?? null;
    hydrated.instructor_id = hydrated.instructor_id ?? exam?.instructor_id ?? course?.instructor_id ?? null;
    hydrated.required = hydrated.required ?? true;
    hydrated.choices_count = hydrated.choices_count ?? choices.length;
    hydrated.correct_choices_count = hydrated.correct_choices_count ?? choices.filter((choice) => Boolean(choice.is_correct)).length;
    return hydrated;
  }

  if (table === 'quiz_choices') {
    const question = findRow('quiz_questions', hydrated.question_id);
    const exam = findRow('exams', hydrated.exam_id ?? question?.exam_id);
    const course = findRow('courses', hydrated.course_id ?? question?.course_id ?? exam?.course_id);
    hydrated.question_prompt = hydrated.question_prompt ?? question?.prompt ?? null;
    hydrated.question_type = hydrated.question_type ?? question?.type ?? null;
    hydrated.exam_id = hydrated.exam_id ?? question?.exam_id ?? null;
    hydrated.exam_title = hydrated.exam_title ?? exam?.title ?? null;
    hydrated.course_id = hydrated.course_id ?? question?.course_id ?? exam?.course_id ?? null;
    hydrated.course_name = hydrated.course_name ?? course?.title ?? null;
    hydrated.instructor_id = hydrated.instructor_id ?? exam?.instructor_id ?? course?.instructor_id ?? null;
    return hydrated;
  }

  if (table === 'certificates') {
    const course = findRow('courses', hydrated.course_id);
    hydrated.course_name = hydrated.course_name ?? course?.title ?? null;
    hydrated.title = hydrated.title ?? hydrated.course_name ?? null;
    hydrated.grade = hydrated.grade ?? hydrated.final_grade ?? null;
    hydrated.final_grade = hydrated.final_grade ?? hydrated.grade ?? null;
    hydrated.certificate_number = hydrated.certificate_number ?? hydrated.certificate_id ?? null;
    return hydrated;
  }

  if (table === 'project_milestones') {
    const project = findRow('projects', hydrated.project_id);
    hydrated.project_title = hydrated.project_title ?? project?.title ?? null;
    return hydrated;
  }

  if (table === 'project_documents') {
    const project = findRow('projects', hydrated.project_id);
    hydrated.project_title = hydrated.project_title ?? project?.title ?? null;
    return hydrated;
  }

  if (table === 'project_history') {
    const project = findRow('projects', hydrated.project_id);
    hydrated.project_title = hydrated.project_title ?? project?.title ?? null;
    return hydrated;
  }

  if (table === 'project_partnerships') {
    const project = findRow('projects', hydrated.project_id);
    hydrated.project_title = hydrated.project_title ?? project?.title ?? null;
    return hydrated;
  }

  if (table === 'project_funding_rounds') {
    const project = findRow('projects', hydrated.project_id);
    hydrated.project_title = hydrated.project_title ?? project?.title ?? null;
    hydrated.project_name = hydrated.project_name ?? project?.title ?? null;
    return hydrated;
  }

  if (table === 'funding_investors') {
    const round = findRow('project_funding_rounds', hydrated.funding_round_id);
    hydrated.round = round ? clone(round) : null;
    return hydrated;
  }

  if (table === 'project_tracking') {
    const project = findRow('projects', hydrated.project_id);
    if (project) {
      hydrated.project = clone(project);
      hydrated.title = hydrated.title ?? project.title ?? null;
      hydrated.description = hydrated.description ?? project.description ?? null;
      hydrated.sector = hydrated.sector ?? project.sector ?? project.category ?? null;
      hydrated.progress = hydrated.progress ?? project.progress ?? 0;
      hydrated.documents = hydrated.documents ?? project.documents_count ?? 0;
      hydrated.reports = hydrated.reports ?? project.reports_count ?? 0;
      hydrated.location = hydrated.location ?? project.location ?? null;
      hydrated.impact = hydrated.impact ?? project.impact ?? null;
      hydrated.team_size = hydrated.team_size ?? project.team_size ?? null;
      hydrated.revenue = hydrated.revenue ?? project.revenue ?? 0;
      hydrated.valuation = hydrated.valuation ?? project.valuation ?? 0;
    }
    return hydrated;
  }

  if (table === 'project_collaborations') {
    const project = findRow('projects', hydrated.project_id);
    hydrated.project_title = hydrated.project_title ?? project?.title ?? null;
    hydrated.project = project ? clone(project) : null;
    return hydrated;
  }

  return hydrated;
}

function hydrateRows(table: string, rows: Row[]) {
  return rows.map((row) => hydrateRow(table, row));
}

function prepareInsert(table: string, row: Row): Row {
  const now = new Date().toISOString();

  if (table === 'course_enrollments') {
    return {
      progress: 0,
      status: 'active',
      enrolled_at: now,
      last_active: now,
      grade: null,
      ...row,
    };
  }

  if (table === 'provider_reviews') {
    return {
      helpful: 0,
      response: null,
      ...row,
    };
  }

  if (table === 'notifications') {
    return {
      is_read: false,
      metadata: {},
      ...row,
    };
  }

  if (table === 'messages') {
    return {
      read: false,
      attachments: [],
      ...row,
    };
  }

  if (table === 'projects') {
    return {
      status: 'pre-incubation',
      phase: 'idee',
      funding: 0,
      team_size: 1,
      mentors: 0,
      progress: 0,
      looking_for: [],
      ...row,
    };
  }

  if (table === 'project_funding_rounds') {
    return {
      raised_amount: 0,
      status: 'en_cours',
      pitch_deck: false,
      business_plan: false,
      ...row,
    };
  }

  if (table === 'project_collaborations') {
    return {
      meetings: 0,
      deliverables: [],
      status: 'en_negociation',
      ...row,
    };
  }

  if (table === 'project_tracking') {
    return {
      status: 'actif',
      invested_amount: 0,
      roi: 0,
      ...row,
    };
  }

  if (table === 'course_sections') {
    const existingPositions = (store.course_sections ?? [])
      .filter((section) => String(section.course_id) === String(row.course_id))
      .map((section) => toNumber(section.position) ?? 0);
    return {
      status: 'draft',
      position: existingPositions.length ? Math.max(...existingPositions) + 1 : 1,
      ...row,
    };
  }

  if (table === 'course_lessons') {
    const existingPositions = (store.course_lessons ?? [])
      .filter((lesson) => String(lesson.section_id) === String(row.section_id))
      .map((lesson) => toNumber(lesson.position) ?? 0);
    return {
      status: 'draft',
      is_preview: false,
      position: existingPositions.length ? Math.max(...existingPositions) + 1 : 1,
      ...row,
    };
  }

  if (table === 'lesson_assets') {
    const existingPositions = (store.lesson_assets ?? [])
      .filter((asset) => String(asset.lesson_id) === String(row.lesson_id))
      .map((asset) => toNumber(asset.position) ?? 0);
    return {
      status: 'ready',
      position: existingPositions.length ? Math.max(...existingPositions) + 1 : 1,
      size_bytes: null,
      thumbnail_url: null,
      mime_type: null,
      ...row,
    };
  }

  if (table === 'quiz_questions') {
    const existingPositions = (store.quiz_questions ?? [])
      .filter((question) => String(question.exam_id) === String(row.exam_id))
      .map((question) => toNumber(question.position) ?? 0);
    return {
      required: true,
      position: existingPositions.length ? Math.max(...existingPositions) + 1 : 1,
      explanation: '',
      ...row,
    };
  }

  if (table === 'quiz_choices') {
    const existingPositions = (store.quiz_choices ?? [])
      .filter((choice) => String(choice.question_id) === String(row.question_id))
      .map((choice) => toNumber(choice.position) ?? 0);
    return {
      is_correct: false,
      position: existingPositions.length ? Math.max(...existingPositions) + 1 : 1,
      ...row,
    };
  }

  if (table === 'lesson_comments') {
    return {
      status: 'visible',
      likes: 0,
      pinned: false,
      parent_id: null,
      ...row,
    };
  }

  if (table === 'course_faq_items') {
    const existingPositions = (store.course_faq_items ?? [])
      .filter((item) => String(item.course_id) === String(row.course_id))
      .map((item) => toNumber(item.position) ?? 0);
    return {
      status: 'draft',
      position: existingPositions.length ? Math.max(...existingPositions) + 1 : 1,
      ...row,
    };
  }

  if (table === 'payout_accounts') {
    return {
      status: 'active',
      is_default: false,
      ...row,
    };
  }

  if (table === 'payout_requests') {
    return {
      status: 'pending',
      currency: 'XAF',
      requested_at: now,
      processed_at: null,
      ...row,
    };
  }

  if (table === 'virtual_classes') {
    return {
      provider: getDefaultLiveProvider(),
      recording_enabled: true,
      allow_chat: true,
      recording_status: 'pending',
      started_at: null,
      ended_at: null,
      instructor_notes: null,
      ...row,
    };
  }

  return row;
}

function ensureConstraints(table: string, rows: Row[]) {
  for (const row of rows) {
    if (table === 'course_enrollments') {
      const duplicate = (store.course_enrollments ?? []).find(
        (existing) =>
          String(existing.course_id) === String(row.course_id) &&
          String(existing.student_id) === String(row.student_id),
      );

      if (duplicate) {
        throw new ConflictException('duplicate enrollment');
      }
    }

    if (table === 'project_tracking') {
      const duplicate = (store.project_tracking ?? []).find(
        (existing) =>
          String(existing.project_id) === String(row.project_id) &&
          String(existing.partner_id) === String(row.partner_id),
      );

      if (duplicate) {
        throw new ConflictException('duplicate tracking');
      }
    }

    if (table === 'client_favorites') {
      const duplicate = (store.client_favorites ?? []).find(
        (existing) =>
          String(existing.client_id) === String(row.client_id) &&
          String(existing.provider_id) === String(row.provider_id),
      );

      if (duplicate) {
        throw new ConflictException('duplicate favorite');
      }
    }

    if (table === 'submissions') {
      const duplicate = (store.submissions ?? []).find(
        (existing) =>
          String(existing.exam_id) === String(row.exam_id) &&
          String(existing.student_id) === String(row.student_id),
      );

      if (duplicate) {
        throw new ConflictException('duplicate submission');
      }
    }
  }
}

function recomputeDerivedData() {
  const courses = store.courses ?? [];
  const courseSections = store.course_sections ?? [];
  const courseLessons = store.course_lessons ?? [];
  const lessonAssets = store.lesson_assets ?? [];
  const enrollments = store.course_enrollments ?? [];
  const reviews = store.provider_reviews ?? [];
  const bookings = store.bookings ?? [];
  const providers = store.providers ?? [];
  const services = store.provider_services ?? [];
  const exams = store.exams ?? [];
  const quizQuestions = store.quiz_questions ?? [];
  const quizChoices = store.quiz_choices ?? [];
  const submissions = store.submissions ?? [];
  const certificates = store.certificates ?? [];
  const virtualClasses = store.virtual_classes ?? [];
  const conversations = store.conversations ?? [];
  const messages = store.messages ?? [];
  const projects = store.projects ?? [];
  const projectMilestones = store.project_milestones ?? [];
  const projectDocuments = store.project_documents ?? [];
  const projectHistory = store.project_history ?? [];
  const projectFundingRounds = store.project_funding_rounds ?? [];
  const projectPartnerships = store.project_partnerships ?? [];
  const projectTracking = store.project_tracking ?? [];
  const projectCollaborations = store.project_collaborations ?? [];
  const fundingInvestors = store.funding_investors ?? [];

  for (const course of courses) {
    const courseEnrollments = enrollments.filter((enrollment) => String(enrollment.course_id) === String(course.id));
    const courseStudents = new Set(courseEnrollments.map((enrollment) => String(enrollment.student_id)));
    const totalProgress = courseEnrollments.reduce((sum, enrollment) => sum + (toNumber(enrollment.progress) ?? 0), 0);
    const price = toNumber(course.price) ?? 0;
    const sections = courseSections.filter((section) => String(section.course_id) === String(course.id));
    const lessons = courseLessons.filter((lesson) => String(lesson.course_id) === String(course.id));
    const assets = lessonAssets.filter((asset) => String(asset.course_id) === String(course.id));

    course.students_count = courseStudents.size;
    course.completion_rate = courseEnrollments.length ? Math.round(totalProgress / courseEnrollments.length) : 0;
    course.revenue = courseStudents.size * price;
    course.modules = sections.length > 0 ? sections.length : Math.max(toNumber(course.modules) ?? 0, 1);
    course.lessons_count = lessons.length;
    course.preview_lessons_count = lessons.filter((lesson) => Boolean(lesson.is_preview)).length;
    course.published_lessons_count = lessons.filter((lesson) => String(lesson.status) === 'published').length;
    course.assets_count = assets.length;
  }

  for (const enrollment of enrollments) {
    const course = findRow('courses', enrollment.course_id);
    const courseSectionsForEnrollment = courseSections.filter((section) => String(section.course_id) === String(enrollment.course_id));
    const courseLessonsForEnrollment = courseLessons.filter((lesson) => String(lesson.course_id) === String(enrollment.course_id));
    const courseExamsForEnrollment = exams.filter((exam) => String(exam.course_id) === String(enrollment.course_id));
    const enrollmentSubmissions = submissions.filter((submission) => {
      if (String(submission.student_id) !== String(enrollment.student_id)) return false;
      return courseExamsForEnrollment.some((exam) => String(exam.id) === String(submission.exam_id));
    });
    const gradedSubmissions = enrollmentSubmissions.filter((submission) => submission.grade !== null && submission.grade !== undefined);
    const latestSubmission = clone(enrollmentSubmissions).sort((left, right) => compareValues(right.submitted_at ?? right.created_at, left.submitted_at ?? left.created_at))[0];
    const certificate = certificates.find(
      (item) =>
        String(item.student_id) === String(enrollment.student_id) &&
        String(item.course_id) === String(enrollment.course_id),
    );
    const normalizedProgress = Math.min(100, Math.max(0, toNumber(enrollment.progress) ?? 0));
    const sectionsCount = courseSectionsForEnrollment.length > 0 ? courseSectionsForEnrollment.length : Math.max(toNumber(course?.modules) ?? 0, 0);
    const lessonsCount = courseLessonsForEnrollment.length;
    const completedSectionsEstimate = sectionsCount > 0 ? Math.round((normalizedProgress / 100) * sectionsCount) : 0;
    const completedLessonsEstimate = lessonsCount > 0 ? Math.round((normalizedProgress / 100) * lessonsCount) : 0;
    const daysSinceActive = getDaysSince(enrollment.last_active) ?? 0;
    let attentionLevel = 'on_track';

    if (normalizedProgress >= 100 || String(enrollment.status) === 'completed') {
      attentionLevel = 'completed';
    } else if (String(enrollment.status) === 'inactive' || daysSinceActive >= 14 || (daysSinceActive >= 7 && normalizedProgress < 40)) {
      attentionLevel = 'at_risk';
    } else if (daysSinceActive >= 5 || normalizedProgress < 25) {
      attentionLevel = 'watch';
    }

    enrollment.course_name = enrollment.course_name ?? course?.title ?? null;
    enrollment.course_category = enrollment.course_category ?? course?.category ?? null;
    enrollment.course_sections_count = sectionsCount;
    enrollment.course_lessons_count = lessonsCount;
    enrollment.completed_sections_estimate = completedSectionsEstimate;
    enrollment.remaining_sections_estimate = Math.max(sectionsCount - completedSectionsEstimate, 0);
    enrollment.completed_lessons_estimate = completedLessonsEstimate;
    enrollment.remaining_lessons_estimate = Math.max(lessonsCount - completedLessonsEstimate, 0);
    enrollment.days_since_active = daysSinceActive;
    enrollment.submissions_count = enrollmentSubmissions.length;
    enrollment.graded_submissions_count = gradedSubmissions.length;
    enrollment.pending_grading_count = enrollmentSubmissions.filter((submission) => String(submission.status) === 'pending').length;
    enrollment.avg_submission_grade = gradedSubmissions.length
      ? Number((gradedSubmissions.reduce((sum, submission) => sum + (toNumber(submission.grade) ?? 0), 0) / gradedSubmissions.length).toFixed(1))
      : null;
    enrollment.latest_submission_at = latestSubmission?.submitted_at ?? latestSubmission?.created_at ?? null;
    enrollment.attention_level = attentionLevel;
    enrollment.certificate_status = certificate?.status ?? (normalizedProgress >= 100 ? 'ready' : 'pending');
    enrollment.certificate_issued_at = certificate?.issued_at ?? null;
    enrollment.certificate_number = certificate?.certificate_number ?? certificate?.certificate_id ?? null;
  }

  for (const section of courseSections) {
    const course = findRow('courses', section.course_id);
    const lessons = courseLessons.filter((lesson) => String(lesson.section_id) === String(section.id));
    section.course_name = section.course_name ?? course?.title ?? null;
    section.instructor_id = section.instructor_id ?? course?.instructor_id ?? null;
    section.lessons_count = lessons.length;
  }

  for (const lesson of courseLessons) {
    const course = findRow('courses', lesson.course_id);
    const section = findRow('course_sections', lesson.section_id);
    const assets = lessonAssets.filter((asset) => String(asset.lesson_id) === String(lesson.id));
    lesson.course_name = lesson.course_name ?? course?.title ?? null;
    lesson.section_title = lesson.section_title ?? section?.title ?? null;
    lesson.instructor_id = lesson.instructor_id ?? course?.instructor_id ?? null;
    lesson.assets_count = assets.length;
  }

  for (const asset of lessonAssets) {
    const course = findRow('courses', asset.course_id);
    const section = findRow('course_sections', asset.section_id);
    const lesson = findRow('course_lessons', asset.lesson_id);
    asset.course_name = asset.course_name ?? course?.title ?? null;
    asset.section_title = asset.section_title ?? section?.title ?? null;
    asset.lesson_title = asset.lesson_title ?? lesson?.title ?? null;
    asset.instructor_id = asset.instructor_id ?? course?.instructor_id ?? null;
  }

  syncCourseModerationItems();

  for (const provider of providers) {
    const providerReviews = reviews.filter((review) => String(review.provider_id) === String(provider.id));
    const providerBookings = bookings.filter((booking) => String(booking.provider_id) === String(provider.id));
    const completedBookings = providerBookings.filter((booking) => booking.status === 'completed').length;
    const avgRating = providerReviews.length
      ? providerReviews.reduce((sum, review) => sum + (toNumber(review.rating) ?? 0), 0) / providerReviews.length
      : toNumber(provider.rating) ?? 0;

    provider.rating = Number(avgRating.toFixed(1));
    provider.reviews = providerReviews.length;
    provider.reviews_count = providerReviews.length;
    provider.completed_jobs = Math.max(toNumber(provider.completed_jobs) ?? 0, completedBookings);
  }

  for (const service of services) {
    const matchingBookings = bookings.filter(
      (booking) =>
        String(booking.provider_id) === String(service.provider_id) &&
        (normalizeText(booking.service) === normalizeText(service.title) ||
          normalizeText(booking.service).includes(normalizeText(service.title)) ||
          normalizeText(service.title).includes(normalizeText(booking.service))),
    );
    const matchingReviews = reviews.filter(
      (review) =>
        String(review.provider_id) === String(service.provider_id) &&
        normalizeText(review.service) === normalizeText(service.title),
    );
    const avgRating = matchingReviews.length
      ? matchingReviews.reduce((sum, review) => sum + (toNumber(review.rating) ?? 0), 0) / matchingReviews.length
      : 0;

    service.bookings = matchingBookings.length;
    service.rating = Number(avgRating.toFixed(1));
  }

  for (const exam of exams) {
    const examSubmissions = submissions.filter((submission) => String(submission.exam_id) === String(exam.id));
    const questions = quizQuestions.filter((question) => String(question.exam_id) === String(exam.id));
    const graded = examSubmissions.filter((submission) => submission.grade !== null && submission.grade !== undefined);
    const avgGrade = graded.length
      ? graded.reduce((sum, submission) => sum + (toNumber(submission.grade) ?? 0), 0) / graded.length
      : null;
    const course = findRow('courses', exam.course_id);

    exam.course_name = exam.course_name ?? course?.title ?? null;
    exam.instructor_id = exam.instructor_id ?? course?.instructor_id ?? null;
    exam.submitted = examSubmissions.length;
    exam.participants = Math.max(toNumber(exam.participants) ?? 0, examSubmissions.length);
    exam.avg_grade = avgGrade === null ? null : Number(avgGrade.toFixed(1));
    exam.questions_count = questions.length;
    exam.open_questions_count = questions.filter((question) => String(question.type) === 'open').length;
    exam.auto_gradable = exam.open_questions_count === 0;

    if (String(exam.type) === 'quiz' && questions.length > 0) {
      exam.max_grade = questions.reduce((sum, question) => sum + (toNumber(question.points) ?? 0), 0);
    }
  }

  for (const question of quizQuestions) {
    const exam = findRow('exams', question.exam_id);
    const course = findRow('courses', question.course_id ?? exam?.course_id);
    const choices = quizChoices.filter((choice) => String(choice.question_id) === String(question.id));
    question.exam_title = question.exam_title ?? exam?.title ?? null;
    question.course_id = question.course_id ?? exam?.course_id ?? null;
    question.course_name = question.course_name ?? course?.title ?? null;
    question.instructor_id = question.instructor_id ?? exam?.instructor_id ?? course?.instructor_id ?? null;
    question.required = question.required ?? true;
    question.choices_count = choices.length;
    question.correct_choices_count = choices.filter((choice) => Boolean(choice.is_correct)).length;
  }

  for (const choice of quizChoices) {
    const question = findRow('quiz_questions', choice.question_id);
    const exam = findRow('exams', choice.exam_id ?? question?.exam_id);
    const course = findRow('courses', choice.course_id ?? question?.course_id ?? exam?.course_id);
    choice.question_prompt = choice.question_prompt ?? question?.prompt ?? null;
    choice.question_type = choice.question_type ?? question?.type ?? null;
    choice.exam_id = choice.exam_id ?? question?.exam_id ?? null;
    choice.exam_title = choice.exam_title ?? exam?.title ?? null;
    choice.course_id = choice.course_id ?? question?.course_id ?? exam?.course_id ?? null;
    choice.course_name = choice.course_name ?? course?.title ?? null;
    choice.instructor_id = choice.instructor_id ?? exam?.instructor_id ?? course?.instructor_id ?? null;
  }

  for (const certificate of certificates) {
    const course = findRow('courses', certificate.course_id);
    certificate.course_name = certificate.course_name ?? course?.title ?? null;
    certificate.title = certificate.title ?? certificate.course_name ?? null;
    certificate.grade = certificate.grade ?? certificate.final_grade ?? null;
    certificate.final_grade = certificate.final_grade ?? certificate.grade ?? null;
    certificate.certificate_number = certificate.certificate_number ?? certificate.certificate_id ?? null;
  }

  for (const vclass of virtualClasses) {
    const course = findRow('courses', vclass.course_id);
    const relatedEnrollments = enrollments.filter((enrollment) => String(enrollment.course_id) === String(vclass.course_id));
    vclass.course_name = vclass.course_name ?? course?.title ?? null;
    vclass.students_count = Math.max(toNumber(vclass.students_count) ?? 0, relatedEnrollments.length);
  }

  for (const conversation of conversations) {
    const conversationMessages = messages
      .filter((message) => String(message.conversation_id) === String(conversation.id))
      .sort((left, right) => compareValues(left.created_at, right.created_at));
    const lastMessage = conversationMessages[conversationMessages.length - 1];
    conversation.updated_at = lastMessage?.created_at ?? conversation.updated_at ?? conversation.created_at;
  }

  for (const project of projects) {
    const docs = projectDocuments.filter((document) => String(document.project_id) === String(project.id));
    const history = projectHistory.filter((entry) => String(entry.project_id) === String(project.id));
    const milestones = projectMilestones.filter((milestone) => String(milestone.project_id) === String(project.id));
    const partnerships = projectPartnerships.filter((partnership) => String(partnership.project_id) === String(project.id));
    const progressFromFunding = (toNumber(project.funding_goal) ?? 0) > 0
      ? Math.round(((toNumber(project.funding) ?? 0) / (toNumber(project.funding_goal) ?? 1)) * 100)
      : 0;
    const pendingMilestone = milestones
      .filter((milestone) => milestone.status !== 'completed')
      .sort((left, right) => compareValues(left.due_date, right.due_date))[0];
    const latestHistory = history.sort((left, right) => compareValues(right.date, left.date))[0];

    project.sector = project.sector ?? project.category ?? null;
    project.progress = Math.max(toNumber(project.progress) ?? 0, progressFromFunding);
    project.documents_count = docs.length;
    project.reports_count = docs.filter((document) => normalizeText(document.category) === 'report').length;
    project.partnerships_count = partnerships.length;
    project.last_update = project.last_update ?? latestHistory?.date ?? project.created_at;
    project.next_milestone = project.next_milestone ?? pendingMilestone?.title ?? null;
  }

  for (const round of projectFundingRounds) {
    const project = findRow('projects', round.project_id);
    const investors = fundingInvestors.filter((investor) => String(investor.funding_round_id) === String(round.id));
    round.project_title = round.project_title ?? project?.title ?? null;
    round.project_name = round.project_name ?? project?.title ?? null;
    round.investors = investors.length;
    round.progress_percent = (toNumber(round.target_amount) ?? 0) > 0
      ? Math.round(((toNumber(round.raised_amount) ?? 0) / (toNumber(round.target_amount) ?? 1)) * 100)
      : 0;
  }

  for (const tracking of projectTracking) {
    const project = findRow('projects', tracking.project_id);
    tracking.title = tracking.title ?? project?.title ?? null;
    tracking.description = tracking.description ?? project?.description ?? null;
    tracking.sector = tracking.sector ?? project?.sector ?? project?.category ?? null;
    tracking.progress = project?.progress ?? tracking.progress ?? 0;
    tracking.documents = project?.documents_count ?? tracking.documents ?? 0;
    tracking.reports = project?.reports_count ?? tracking.reports ?? 0;
    tracking.location = tracking.location ?? project?.location ?? null;
    tracking.impact = tracking.impact ?? project?.impact ?? null;
    tracking.team_size = tracking.team_size ?? project?.team_size ?? null;
    tracking.revenue = tracking.revenue ?? project?.revenue ?? 0;
    tracking.valuation = tracking.valuation ?? project?.valuation ?? 0;
    tracking.next_milestone = tracking.next_milestone ?? project?.next_milestone ?? null;
    tracking.last_update = tracking.last_update ?? project?.last_update ?? project?.created_at;
  }

  for (const collaboration of projectCollaborations) {
    const project = findRow('projects', collaboration.project_id);
    collaboration.project_title = collaboration.project_title ?? project?.title ?? null;
  }
}

recomputeDerivedData();

function getProviderIdsForUser(userId: string) {
  return (store.providers ?? [])
    .filter((provider) => String(provider.user_id) === String(userId))
    .map((provider) => String(provider.id));
}

function getInstructorCourseIds(userId: string) {
  return (store.courses ?? [])
    .filter((course) => String(course.instructor_id) === String(userId))
    .map((course) => String(course.id));
}

function getStudentCourseIds(userId: string) {
  return (store.course_enrollments ?? [])
    .filter((enrollment) => String(enrollment.student_id) === String(userId))
    .map((enrollment) => String(enrollment.course_id));
}

function getLessonIdsForCourses(courseIds: string[]) {
  const allowed = new Set(courseIds);
  return (store.course_lessons ?? [])
    .filter((lesson) => allowed.has(String(lesson.course_id)))
    .map((lesson) => String(lesson.id));
}

function getOwnerProjectIds(userId: string) {
  return (store.projects ?? [])
    .filter((project) => String(project.owner_id) === String(userId))
    .map((project) => String(project.id));
}

function getTrackedProjectIds(userId: string) {
  return (store.project_tracking ?? [])
    .filter((tracking) => String(tracking.partner_id) === String(userId))
    .map((tracking) => String(tracking.project_id));
}

function getConversationIdsForUser(userId: string) {
  return (store.conversations ?? [])
    .filter((conversation) => Array.isArray(conversation.participants) && conversation.participants.map(String).includes(String(userId)))
    .map((conversation) => String(conversation.id));
}

function canNotifyUser(actor: AuthUser, targetUserId: string) {
  if (String(targetUserId) === String(actor.id)) {
    return true;
  }

  const targetUser = findUserById(String(targetUserId));
  if (!targetUser) {
    return false;
  }

  if (targetUser.role === 'admin') {
    return true;
  }

  const sharesConversation = (store.conversations ?? []).some((conversation) => (
    Array.isArray(conversation.participants)
    && conversation.participants.map(String).includes(String(actor.id))
    && conversation.participants.map(String).includes(String(targetUserId))
  ));

  if (sharesConversation) {
    return true;
  }

  const allowedPairs = new Set([
    'client:prestataire',
    'prestataire:client',
    'formateur:apprenant',
    'apprenant:formateur',
    'porteur:partenaire',
    'partenaire:porteur',
  ]);

  return allowedPairs.has(`${actor.role}:${targetUser.role}`);
}

function buildVirtualClassNotificationRows(
  vclass: Row,
  eventType: 'live-scheduled' | 'live-updated' | 'live-started' | 'live-ended' | 'replay-ready',
) {
  const recipients = (store.course_enrollments ?? [])
    .filter((enrollment) => String(enrollment.course_id) === String(vclass.course_id))
    .map((enrollment) => ({
      user_id: String(enrollment.student_id),
      student_name: String(enrollment.student_name ?? 'Apprenant'),
    }));

  if (recipients.length === 0) {
    return [];
  }

  const title = String(vclass.title ?? 'Classe virtuelle');
  const scheduleLabel = `${String(vclass.class_date ?? '')} à ${String(vclass.class_time ?? '')}`.trim();
  const link = `/espace-numerique/classe-virtuelle/${String(vclass.id)}`;

  const template = {
    'live-scheduled': {
      notificationTitle: 'Nouveau live programme',
      notificationMessage: `Le live "${title}" est programme le ${scheduleLabel}.`,
    },
    'live-updated': {
      notificationTitle: 'Live mis a jour',
      notificationMessage: `Le live "${title}" a ete mis a jour. Verifiez l horaire et le lien de connexion.`,
    },
    'live-started': {
      notificationTitle: 'Live en cours',
      notificationMessage: `Le live "${title}" vient de demarrer. Rejoignez la session maintenant.`,
    },
    'live-ended': {
      notificationTitle: 'Replay en preparation',
      notificationMessage: `Le live "${title}" est termine. Le replay est en cours de preparation.`,
    },
    'replay-ready': {
      notificationTitle: 'Replay disponible',
      notificationMessage: `Le replay du live "${title}" est disponible.`,
    },
  }[eventType];

  return recipients.map((recipient) => ({
    id: `notif-live-${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${recipient.user_id}`,
    user_id: recipient.user_id,
    title: template.notificationTitle,
    message: template.notificationMessage,
    type: 'live',
    is_read: false,
    link,
    metadata: {
      class_id: vclass.id,
      course_id: vclass.course_id,
      course_name: vclass.course_name ?? null,
      channel: 'system',
      event: eventType,
    },
    created_at: new Date().toISOString(),
  }));
}

function canReadWithoutAuth(table: string) {
  return PUBLIC_READ_TABLES.has(table);
}

function assertAuthenticated(table: string, user: AuthUser | null) {
  if (!user && !canReadWithoutAuth(table)) {
    throw new UnauthorizedException('Authentification requise.');
  }
}

function filterRowsForActor(table: string, rows: Row[], user: AuthUser | null) {
  if (!user) {
    return canReadWithoutAuth(table) ? rows : [];
  }

  if (user.role === 'admin') {
    return rows;
  }

  const providerIds = getProviderIdsForUser(user.id);
  const courseIds = getInstructorCourseIds(user.id);
  const studentCourseIds = getStudentCourseIds(user.id);
  const lessonIds = getLessonIdsForCourses(user.role === 'formateur' ? courseIds : studentCourseIds);
  const ownerProjectIds = getOwnerProjectIds(user.id);
  const trackedProjectIds = getTrackedProjectIds(user.id);
  const conversationIds = getConversationIdsForUser(user.id);

  switch (table) {
    case 'providers':
      return rows;
    case 'projects':
      return rows;
    case 'courses':
      if (user.role === 'formateur') {
        return rows.filter((row) => String(row.instructor_id) === user.id);
      }
      return rows;
    case 'course_sections':
    case 'course_lessons':
      if (user.role === 'formateur') {
        return rows.filter((row) => courseIds.includes(String(row.course_id)));
      }
      if (user.role === 'apprenant') {
        return rows.filter((row) => studentCourseIds.includes(String(row.course_id)));
      }
      return [];
    case 'lesson_assets':
      if (user.role === 'formateur') {
        return rows.filter((row) => courseIds.includes(String(row.course_id)) || lessonIds.includes(String(row.lesson_id)));
      }
      if (user.role === 'apprenant') {
        return rows.filter((row) => studentCourseIds.includes(String(row.course_id)) || lessonIds.includes(String(row.lesson_id)));
      }
      return [];
    case 'lesson_comments':
      if (user.role === 'formateur') {
        return rows.filter((row) => courseIds.includes(String(row.course_id)));
      }
      if (user.role === 'apprenant') {
        return rows.filter((row) => studentCourseIds.includes(String(row.course_id)));
      }
      return [];
    case 'course_faq_items':
      if (user.role === 'formateur') {
        return rows.filter((row) => courseIds.includes(String(row.course_id)));
      }
      if (user.role === 'apprenant') {
        return rows.filter((row) => studentCourseIds.includes(String(row.course_id)));
      }
      return [];
    case 'virtual_classes':
      if (user.role === 'formateur') {
        return rows.filter((row) => String(row.instructor_id) === user.id || courseIds.includes(String(row.course_id)));
      }
      return rows;
    case 'notifications':
    case 'payment_transactions':
    case 'wallet_accounts':
    case 'invoices':
    case 'payout_accounts':
    case 'payout_requests':
      return rows.filter((row) => String(row.user_id) === user.id);
    case 'client_orders':
    case 'client_favorites':
      return rows.filter((row) => String(row.client_id) === user.id);
    case 'bookings':
      if (user.role === 'client') {
        return rows.filter((row) => String(row.client_id) === user.id);
      }
      if (user.role === 'prestataire') {
        return rows.filter((row) => providerIds.includes(String(row.provider_id)));
      }
      return [];
    case 'provider_services':
      if (user.role === 'prestataire') {
        return rows.filter((row) => providerIds.includes(String(row.provider_id)));
      }
      return rows;
    case 'provider_reviews':
      if (user.role === 'client') {
        return rows.filter((row) => String(row.client_id) === user.id);
      }
      if (user.role === 'prestataire') {
        return rows.filter((row) => providerIds.includes(String(row.provider_id)));
      }
      return rows;
    case 'course_enrollments':
      if (user.role === 'apprenant') {
        return rows.filter((row) => String(row.student_id) === user.id);
      }
      if (user.role === 'formateur') {
        return rows.filter((row) => courseIds.includes(String(row.course_id)));
      }
      return [];
    case 'exams':
      if (user.role === 'formateur') {
        return rows.filter((row) => String(row.instructor_id) === user.id || courseIds.includes(String(row.course_id)));
      }
      if (user.role === 'apprenant') {
        return rows.filter((row) => studentCourseIds.includes(String(row.course_id)));
      }
      return [];
    case 'quiz_questions':
      if (user.role === 'formateur') {
        return rows.filter((row) => {
          const exam = findRow('exams', row.exam_id);
          return exam ? (String(exam.instructor_id) === user.id || courseIds.includes(String(exam.course_id))) : false;
        });
      }
      if (user.role === 'apprenant') {
        return rows.filter((row) => {
          const exam = findRow('exams', row.exam_id);
          return exam ? studentCourseIds.includes(String(exam.course_id)) : false;
        });
      }
      return [];
    case 'quiz_choices':
      if (user.role === 'formateur') {
        return rows.filter((row) => {
          const question = findRow('quiz_questions', row.question_id);
          const exam = question ? findRow('exams', question.exam_id) : findRow('exams', row.exam_id);
          return exam ? (String(exam.instructor_id) === user.id || courseIds.includes(String(exam.course_id))) : false;
        });
      }
      if (user.role === 'apprenant') {
        return rows.filter((row) => {
          const question = findRow('quiz_questions', row.question_id);
          const exam = question ? findRow('exams', question.exam_id) : findRow('exams', row.exam_id);
          return exam ? studentCourseIds.includes(String(exam.course_id)) : false;
        });
      }
      return [];
    case 'submissions':
      if (user.role === 'apprenant') {
        return rows.filter((row) => String(row.student_id) === user.id);
      }
      if (user.role === 'formateur') {
        return rows.filter((row) => {
          const exam = findRow('exams', row.exam_id);
          return exam ? (String(exam.instructor_id) === user.id || courseIds.includes(String(exam.course_id))) : false;
        });
      }
      return [];
    case 'certificates':
      if (user.role === 'apprenant') {
        return rows.filter((row) => String(row.student_id) === user.id);
      }
      if (user.role === 'formateur') {
        return rows.filter((row) => courseIds.includes(String(row.course_id)));
      }
      return [];
    case 'conversations':
      return rows.filter((row) => Array.isArray(row.participants) && row.participants.map(String).includes(String(user.id)));
    case 'messages':
      return rows.filter((row) => conversationIds.includes(String(row.conversation_id)));
    case 'project_milestones':
    case 'project_documents':
    case 'project_history':
    case 'project_partnerships':
    case 'project_funding_rounds':
      if (user.role === 'porteur') {
        return rows.filter((row) => ownerProjectIds.includes(String(row.project_id)));
      }
      if (user.role === 'partenaire') {
        return rows.filter((row) => trackedProjectIds.includes(String(row.project_id)));
      }
      return [];
    case 'funding_investors':
      if (user.role === 'porteur' || user.role === 'partenaire') {
        return rows.filter((row) => {
          const round = findRow('project_funding_rounds', row.funding_round_id);
          return round
            ? (user.role === 'porteur'
              ? ownerProjectIds.includes(String(round.project_id))
              : trackedProjectIds.includes(String(round.project_id)))
            : false;
        });
      }
      return [];
    case 'project_tracking':
    case 'project_collaborations':
      if (user.role === 'partenaire') {
        return rows.filter((row) => String(row.partner_id) === user.id);
      }
      if (user.role === 'porteur') {
        return rows.filter((row) => ownerProjectIds.includes(String(row.project_id)));
      }
      return [];
    default:
      if (ADMIN_ONLY_TABLES.has(table)) return [];
      return rows;
  }
}

function assertTableAccess(table: string, user: AuthUser | null, method: 'GET' | 'POST' | 'PATCH' | 'DELETE') {
  assertAuthenticated(table, user);
  if (user?.role !== 'admin' && ADMIN_ONLY_TABLES.has(table)) {
    throw new UnauthorizedException('Acces refuse.');
  }
  if (!user && method !== 'GET') {
    throw new UnauthorizedException('Authentification requise.');
  }
}

function trimText(value: unknown) {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : null;
}

function requireText(value: unknown, message: string) {
  const text = trimText(value);
  if (!text) {
    throw new BadRequestException(message);
  }
  return text;
}

function requireInteger(value: unknown, min: number, max: number, message: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new BadRequestException(message);
  }
  return parsed;
}

function requireNumberInRange(value: unknown, min: number, max: number, message: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new BadRequestException(message);
  }
  return Number(parsed);
}

function requireNumberOrFallback(value: unknown, fallback: number) {
  const parsed = toNumber(value);
  return parsed === null ? fallback : parsed;
}

function requireIdentifier(value: unknown, message: string) {
  const identifier = String(value ?? '').trim();
  if (!identifier) {
    throw new BadRequestException(message);
  }
  return identifier;
}

function isValidAbsoluteUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function slugifyLiveSegment(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function getDefaultLiveProvider() {
  return process.env.LIVE_PROVIDER === 'custom' ? 'custom' : 'jitsi';
}

function getJitsiBaseUrl() {
  return String(process.env.LIVE_JITSI_BASE_URL || 'https://meet.jit.si').replace(/\/$/, '');
}

function buildJitsiRoomUrl(slug: string) {
  return `${getJitsiBaseUrl()}/${slug}`;
}

function normalizeLiveProvider(value: unknown) {
  const provider = trimText(value) ?? getDefaultLiveProvider();
  if (!new Set(['jitsi', 'custom']).has(provider)) {
    throw new BadRequestException('Le fournisseur live est invalide.');
  }
  return provider as 'jitsi' | 'custom';
}

function normalizeMeetingSlug(value: unknown, fallbackValues: unknown[]) {
  const provided = slugifyLiveSegment(value);
  if (provided) return provided;

  const fallback = fallbackValues
    .map((entry) => slugifyLiveSegment(entry))
    .filter(Boolean)
    .join('-')
    .slice(0, 80);

  if (!fallback) {
    throw new BadRequestException('Le slug de la salle virtuelle est invalide.');
  }

  return fallback;
}

function ensureFutureDateString(value: string, message: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime()) || parsed.getTime() < today.getTime()) {
    throw new BadRequestException(message);
  }
}

function ensureFutureDateTime(classDate: string, classTime: string, message: string) {
  const parsed = new Date(`${classDate}T${classTime}:00`);
  if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
    throw new BadRequestException(message);
  }
}

function parseBoolean(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value === 'true') return true;
    if (value === 'false') return false;
  }
  return fallback;
}

function getCourseReadinessIssues(course: Row) {
  const issues: string[] = [];
  if (!trimText(course.description)) {
    issues.push('une description');
  }
  if (!trimText(course.duration)) {
    issues.push('une duree');
  }
  if (!trimText(course.thumbnail)) {
    issues.push('une miniature');
  }

  if (course.id !== undefined && course.id !== null) {
    const courseId = String(course.id);
    const sections = (store.course_sections ?? []).filter((section) => String(section.course_id) === courseId);
    const lessons = (store.course_lessons ?? []).filter((lesson) => String(lesson.course_id) === courseId);

    if (sections.length === 0) {
      issues.push('au moins une section');
    }
    if (lessons.length === 0) {
      issues.push('au moins une lecon');
    }
  }

  return issues;
}

function assertCourseStatusChangeAllowed(currentStatus: string | null, nextStatus: string, user: AuthUser) {
  if (user.role === 'admin') {
    return;
  }

  if (currentStatus === null) {
    if (!new Set(['draft', 'review']).has(nextStatus)) {
      throw new UnauthorizedException('Le formateur ne peut creer une formation qu en brouillon ou en revision.');
    }
    return;
  }

  if (currentStatus === nextStatus) {
    return;
  }

  if (nextStatus === 'published' || nextStatus === 'rejected') {
    throw new UnauthorizedException('Seul un administrateur peut publier ou rejeter une formation.');
  }

  if (!new Set(['draft', 'review', 'archived']).has(nextStatus)) {
    throw new UnauthorizedException('Transition de statut invalide pour cette formation.');
  }
}

function mapCourseStatusToAdminContentStatus(status: string) {
  switch (status) {
    case 'review':
      return 'pending';
    case 'published':
      return 'published';
    case 'rejected':
      return 'rejected';
    case 'archived':
      return 'archived';
    case 'draft':
    default:
      return 'draft';
  }
}

function mapAdminContentStatusToCourseStatus(status: string) {
  switch (status) {
    case 'pending':
      return 'review';
    case 'published':
      return 'published';
    case 'rejected':
      return 'rejected';
    case 'archived':
      return 'archived';
    case 'draft':
    default:
      return 'draft';
  }
}

function syncCourseModerationItems() {
  const existingItems = store.admin_content_items ?? [];
  const existingCourseItems = new Map(
    existingItems
      .filter((item) => String(item.source_table) === 'courses')
      .map((item) => [String(item.source_id), item] as const),
  );
  const nonCourseItems = existingItems.filter((item) => String(item.source_table) !== 'courses');

  const courseItems = (store.courses ?? []).map((course) => {
    const existingItem = existingCourseItems.get(String(course.id));
    const instructor = findUserById(String(course.instructor_id));
    const updatedAt = String(course.updated_at ?? course.created_at ?? new Date().toISOString());
    return {
      id: `course-${String(course.id)}`,
      source_table: 'courses',
      source_id: course.id,
      title: String(course.title ?? 'Formation sans titre'),
      type: 'Formation',
      author: instructor ? `${instructor.firstName} ${instructor.lastName}`.trim() : 'Formateur inconnu',
      status: mapCourseStatusToAdminContentStatus(String(course.status ?? 'draft')),
      date: updatedAt.slice(0, 10),
      views: toNumber(existingItem?.views) ?? toNumber(course.students_count) ?? 0,
      category: String(course.category ?? 'General'),
      description: String(course.description ?? ''),
    };
  });

  store.admin_content_items = [...courseItems, ...nonCourseItems];
}

function sanitizeAdminContentItemRecord(row: Row, user: AuthUser) {
  if (user.role !== 'admin') {
    throw new UnauthorizedException('Acces refuse.');
  }

  const normalized = clone(row);
  const status = trimText(normalized.status) ?? 'pending';
  if (!new Set(['draft', 'pending', 'published', 'rejected', 'archived']).has(status)) {
    throw new BadRequestException('Le statut du contenu admin est invalide.');
  }
  normalized.status = status;

  if (String(normalized.source_table) === 'courses') {
    const course = findRow('courses', normalized.source_id);
    if (!course) {
      throw new BadRequestException('La formation associee est introuvable.');
    }

    const nextCourseStatus = mapAdminContentStatusToCourseStatus(status);
    const sanitizedCourse = sanitizeCourseRecord(
      {
        ...course,
        status: nextCourseStatus,
      },
      user,
    );

    Object.assign(course, sanitizedCourse, {
      updated_at: new Date().toISOString(),
      review_submitted_at:
        nextCourseStatus === 'review'
          ? String(course.review_submitted_at ?? new Date().toISOString())
          : course.review_submitted_at ?? null,
      published_at: nextCourseStatus === 'published' ? new Date().toISOString() : course.published_at ?? null,
      rejected_at: nextCourseStatus === 'rejected' ? new Date().toISOString() : course.rejected_at ?? null,
      archived_at: nextCourseStatus === 'archived' ? new Date().toISOString() : course.archived_at ?? null,
    });
  }

  return normalized;
}

function resolveInstructorCourse(courseId: unknown, user: AuthUser) {
  const parsedCourseId = requireIdentifier(courseId, 'La formation associee est invalide.');
  const course = findRow('courses', parsedCourseId);

  if (!course) {
    throw new BadRequestException('La formation associee est introuvable.');
  }

  if (user.role !== 'admin' && String(course.instructor_id) !== user.id) {
    throw new UnauthorizedException('Acces refuse.');
  }

  return { course, parsedCourseId };
}

function resolveInstructorSection(sectionId: unknown, user: AuthUser) {
  const parsedSectionId = requireIdentifier(sectionId, 'La section associee est invalide.');
  const section = findRow('course_sections', parsedSectionId);

  if (!section) {
    throw new BadRequestException('La section associee est introuvable.');
  }

  const { course, parsedCourseId } = resolveInstructorCourse(section.course_id, user);
  return { section, course, parsedSectionId, parsedCourseId };
}

function resolveInstructorLesson(lessonId: unknown, user: AuthUser) {
  const parsedLessonId = requireIdentifier(lessonId, 'La lecon associee est invalide.');
  const lesson = findRow('course_lessons', parsedLessonId);

  if (!lesson) {
    throw new BadRequestException('La lecon associee est introuvable.');
  }

  const { section, course, parsedSectionId, parsedCourseId } = resolveInstructorSection(lesson.section_id, user);
  return { lesson, section, course, parsedLessonId, parsedSectionId, parsedCourseId };
}

function resolveInstructorExam(examId: unknown, user: AuthUser) {
  const parsedExamId = requireIdentifier(examId, 'L examen associe est invalide.');
  const exam = findRow('exams', parsedExamId);

  if (!exam) {
    throw new BadRequestException('L examen associe est introuvable.');
  }

  const { course, parsedCourseId } = resolveInstructorCourse(exam.course_id, user);
  return { exam, course, parsedExamId, parsedCourseId };
}

function resolveQuizQuestion(questionId: unknown, user: AuthUser) {
  const parsedQuestionId = requireIdentifier(questionId, 'La question associee est invalide.');
  const question = findRow('quiz_questions', parsedQuestionId);

  if (!question) {
    throw new BadRequestException('La question associee est introuvable.');
  }

  const { exam, course, parsedExamId, parsedCourseId } = resolveInstructorExam(question.exam_id, user);
  return { question, exam, course, parsedQuestionId, parsedExamId, parsedCourseId };
}

function sanitizeCourseRecord(row: Row, user: AuthUser) {
  const normalized = clone(row);
  const existingCourse = normalized.id !== undefined && normalized.id !== null ? findRow('courses', normalized.id) : undefined;
  const currentStatus = trimText(existingCourse?.status);
  normalized.title = requireText(normalized.title, 'Le titre de la formation est obligatoire.');
  normalized.category = requireText(normalized.category, 'La categorie de la formation est obligatoire.');
  normalized.description = trimText(normalized.description) ?? '';
  normalized.duration = requireText(normalized.duration, 'La duree de la formation est obligatoire.');
  normalized.modules = requireInteger(normalized.modules, 1, 200, 'Le nombre de modules doit etre compris entre 1 et 200.');
  normalized.level = trimText(normalized.level) ?? 'intermediate';
  if (!new Set(['beginner', 'intermediate', 'advanced', 'all_levels']).has(String(normalized.level))) {
    throw new BadRequestException('Le niveau de la formation est invalide.');
  }
  normalized.price = requireNumberInRange(normalized.price ?? 0, 0, 1000000000, 'Le prix de la formation est invalide.');
  normalized.is_free = parseBoolean(normalized.is_free, (toNumber(normalized.price) ?? 0) <= 0);
  normalized.access_type = trimText(normalized.access_type) ?? (normalized.is_free ? 'free' : 'paid');
  if (!new Set(['free', 'paid']).has(String(normalized.access_type))) {
    throw new BadRequestException('Le mode d acces de la formation est invalide.');
  }
  normalized.promotion_percentage = requireNumberInRange(
    normalized.promotion_percentage ?? 0,
    0,
    100,
    'La promotion de la formation est invalide.',
  );
  normalized.trailer_url = trimText(normalized.trailer_url);
  if (normalized.trailer_url && !isValidAbsoluteUrl(String(normalized.trailer_url))) {
    throw new BadRequestException('La bande-annonce doit etre une URL valide.');
  }
  if (normalized.is_free) {
    normalized.price = 0;
    normalized.access_type = 'free';
  } else {
    normalized.access_type = 'paid';
  }

  const status = trimText(normalized.status) ?? 'draft';
  if (!new Set(['draft', 'review', 'published', 'rejected', 'archived']).has(status)) {
    throw new BadRequestException('Le statut de la formation est invalide.');
  }
  assertCourseStatusChangeAllowed(currentStatus, status, user);
  normalized.status = status;

  if (user.role !== 'admin') {
    normalized.instructor_id = user.id;
  }
  if (user.role !== 'admin' && String(normalized.instructor_id) !== user.id) {
    throw new UnauthorizedException('Acces refuse.');
  }

  if (status === 'review' || status === 'published') {
    const readinessIssues = getCourseReadinessIssues(normalized);
    if (readinessIssues.length > 0) {
      throw new BadRequestException(
        `La formation doit comporter ${readinessIssues.join(', ')} avant ${status === 'review' ? 'soumission en revision' : 'publication'}.`,
      );
    }
  }

  return normalized;
}

function sanitizeCourseSectionRecord(row: Row, user: AuthUser) {
  const normalized = clone(row);
  const { course, parsedCourseId } = resolveInstructorCourse(normalized.course_id, user);
  normalized.course_id = parsedCourseId;
  normalized.course_name = String(course.title);
  normalized.instructor_id = course.instructor_id;
  normalized.title = requireText(normalized.title, 'Le titre de la section est obligatoire.');
  normalized.description = trimText(normalized.description) ?? '';

  if (normalized.position === undefined || normalized.position === null || normalized.position === '') {
    normalized.position = (store.course_sections ?? []).filter((section) => String(section.course_id) === String(parsedCourseId)).length + 1;
  } else {
    normalized.position = requireInteger(normalized.position, 1, 999, 'La position de la section est invalide.');
  }

  const status = trimText(normalized.status) ?? 'draft';
  if (!new Set(['draft', 'published']).has(status)) {
    throw new BadRequestException('Le statut de la section est invalide.');
  }
  normalized.status = status;
  return normalized;
}

function sanitizeCourseLessonRecord(row: Row, user: AuthUser) {
  const normalized = clone(row);
  const { section, course, parsedSectionId, parsedCourseId } = resolveInstructorSection(normalized.section_id, user);
  normalized.section_id = parsedSectionId;
  normalized.course_id = parsedCourseId;
  normalized.section_title = String(section.title);
  normalized.course_name = String(course.title);
  normalized.instructor_id = course.instructor_id;
  normalized.title = requireText(normalized.title, 'Le titre de la lecon est obligatoire.');
  normalized.description = trimText(normalized.description) ?? '';
  normalized.duration = trimText(normalized.duration);

  if (normalized.position === undefined || normalized.position === null || normalized.position === '') {
    normalized.position = (store.course_lessons ?? []).filter((lesson) => String(lesson.section_id) === String(parsedSectionId)).length + 1;
  } else {
    normalized.position = requireInteger(normalized.position, 1, 9999, 'La position de la lecon est invalide.');
  }

  const type = trimText(normalized.type) ?? 'article';
  if (!new Set(['video', 'article', 'pdf', 'quiz', 'assignment', 'live', 'practice', 'coding']).has(type)) {
    throw new BadRequestException('Le type de lecon est invalide.');
  }
  normalized.type = type;
  normalized.content = trimText(normalized.content) ?? '';
  normalized.code_language = trimText(normalized.code_language) ?? 'text';
  normalized.code_sample = trimText(normalized.code_sample) ?? '';
  normalized.exercise_instructions = trimText(normalized.exercise_instructions) ?? '';

  const status = trimText(normalized.status) ?? 'draft';
  if (!new Set(['draft', 'published']).has(status)) {
    throw new BadRequestException('Le statut de la lecon est invalide.');
  }
  normalized.status = status;
  normalized.is_preview = parseBoolean(normalized.is_preview, false);
  return normalized;
}

function sanitizePayoutAccountRecord(row: Row, user: AuthUser) {
  const normalized = clone(row);
  const existing = normalized.id !== undefined && normalized.id !== null ? findRow('payout_accounts', normalized.id) : null;
  const targetUserId = user.role === 'admin'
    ? requireIdentifier(normalized.user_id ?? existing?.user_id, 'Le titulaire du compte de retrait est invalide.')
    : user.id;

  if (user.role !== 'admin' && existing && String(existing.user_id) !== user.id) {
    throw new UnauthorizedException('Acces refuse.');
  }

  normalized.user_id = targetUserId;
  normalized.method = trimText(normalized.method) ?? 'bank';
  if (!new Set(['bank', 'paypal', 'orange_money', 'wave', 'free_money', 'mtn_money']).has(String(normalized.method))) {
    throw new BadRequestException('La methode de retrait est invalide.');
  }

  normalized.account_name = requireText(normalized.account_name, 'Le nom du beneficiaire est obligatoire.');
  normalized.account_identifier = requireText(normalized.account_identifier, 'La reference du compte est obligatoire.');
  normalized.label = requireText(normalized.label, 'Le libelle du compte est obligatoire.');
  normalized.is_default = parseBoolean(normalized.is_default, false);
  normalized.status = trimText(normalized.status) ?? 'active';
  if (!new Set(['active', 'archived']).has(String(normalized.status))) {
    throw new BadRequestException('Le statut du compte de retrait est invalide.');
  }

  return normalized;
}

function sanitizePayoutRequestRecord(row: Row, user: AuthUser) {
  const normalized = clone(row);
  const existing = normalized.id !== undefined && normalized.id !== null ? findRow('payout_requests', normalized.id) : null;
  const targetUserId = user.role === 'admin'
    ? requireIdentifier(normalized.user_id ?? existing?.user_id, 'Le titulaire de la demande est invalide.')
    : user.id;

  if (user.role !== 'admin' && existing && String(existing.user_id) !== user.id) {
    throw new UnauthorizedException('Acces refuse.');
  }

  normalized.user_id = targetUserId;
  const accountId = requireIdentifier(normalized.account_id ?? existing?.account_id, 'Le compte de retrait est obligatoire.');
  const account = findRow('payout_accounts', accountId);
  if (!account || String(account.user_id) !== String(targetUserId)) {
    throw new BadRequestException('Le compte de retrait est introuvable.');
  }

  normalized.account_id = accountId;
  normalized.method = String(account.method);
  normalized.account_label = account.label ?? null;
  normalized.account_identifier = account.account_identifier ?? null;
  normalized.amount = requireNumberInRange(normalized.amount, 1000, 1000000000, 'Le montant du retrait est invalide.');
  normalized.currency = trimText(normalized.currency) ?? 'XAF';
  normalized.note = trimText(normalized.note) ?? '';
  const currentStatus = trimText(existing?.status) ?? 'pending';
  const nextStatus = trimText(normalized.status) ?? currentStatus;

  if (!new Set(['pending', 'approved', 'paid', 'rejected', 'cancelled']).has(nextStatus)) {
    throw new BadRequestException('Le statut de la demande de retrait est invalide.');
  }

  if (user.role !== 'admin') {
    if (!existing) {
      normalized.status = 'pending';
      normalized.processed_at = null;
    } else if (currentStatus === 'pending' && nextStatus === 'cancelled') {
      normalized.status = 'cancelled';
      normalized.processed_at = existing.processed_at ?? null;
    } else {
      normalized.status = currentStatus;
      normalized.processed_at = existing.processed_at ?? null;
    }
  } else {
    normalized.status = nextStatus;
    normalized.processed_at = nextStatus === 'paid' || nextStatus === 'rejected' ? new Date().toISOString() : (existing?.processed_at ?? null);
  }

  normalized.requested_at = existing?.requested_at ?? new Date().toISOString();
  return normalized;
}

function sanitizeLessonCommentRecord(row: Row, user: AuthUser) {
  const normalized = clone(row);
  const existing = normalized.id !== undefined && normalized.id !== null ? findRow('lesson_comments', normalized.id) : null;
  const parsedLessonId = requireIdentifier(normalized.lesson_id ?? existing?.lesson_id, 'La lecon associee est invalide.');
  const lesson = findRow('course_lessons', parsedLessonId);
  if (!lesson) {
    throw new BadRequestException('La lecon associee est introuvable.');
  }
  const parsedSectionId = requireIdentifier(lesson.section_id, 'La section associee est invalide.');
  const section = findRow('course_sections', parsedSectionId);
  if (!section) {
    throw new BadRequestException('La section associee est introuvable.');
  }
  const parsedCourseId = requireIdentifier(lesson.course_id, 'La formation associee est invalide.');
  const course = findRow('courses', parsedCourseId);
  if (!course) {
    throw new BadRequestException('La formation associee est introuvable.');
  }

  const isModerator = user.role === 'admin' || (user.role === 'formateur' && String(course.instructor_id) === user.id);
  const isStudentOnCourse = user.role === 'apprenant' && getStudentCourseIds(user.id).includes(String(parsedCourseId));
  if (!isModerator && !isStudentOnCourse && !(existing && String(existing.user_id) === user.id)) {
    throw new UnauthorizedException('Acces refuse.');
  }

  if (existing) {
    const isOwner = String(existing.user_id) === user.id;
    if (!isOwner && !isModerator) {
      throw new UnauthorizedException('Acces refuse.');
    }
  }

  normalized.course_id = parsedCourseId;
  normalized.section_id = parsedSectionId;
  normalized.lesson_id = parsedLessonId;
  normalized.course_name = String(course.title);
  normalized.lesson_title = String(lesson.title);
  normalized.user_id = existing?.user_id ?? user.id;
  normalized.user_name = existing?.user_name ?? `${user.firstName} ${user.lastName}`.trim();
  normalized.user_role = existing?.user_role ?? user.role;
  normalized.content = requireText(normalized.content, 'Le commentaire est obligatoire.');
  normalized.parent_id = trimText(normalized.parent_id);
  if (normalized.parent_id) {
    const parent = findRow('lesson_comments', normalized.parent_id);
    if (!parent || String(parent.lesson_id) !== String(parsedLessonId)) {
      throw new BadRequestException('Le commentaire parent est invalide.');
    }
  }

  normalized.status = trimText(normalized.status) ?? existing?.status ?? 'visible';
  if (!new Set(['visible', 'hidden']).has(String(normalized.status))) {
    throw new BadRequestException('Le statut du commentaire est invalide.');
  }
  if (!isModerator) {
    normalized.status = existing?.status ?? 'visible';
    normalized.pinned = existing?.pinned ?? false;
  } else {
    normalized.pinned = parseBoolean(normalized.pinned, Boolean(existing?.pinned));
  }
  normalized.likes = toNumber(existing?.likes) ?? 0;
  return normalized;
}

function sanitizeCourseFaqRecord(row: Row, user: AuthUser) {
  const normalized = clone(row);
  const { course, parsedCourseId } = resolveInstructorCourse(normalized.course_id, user);
  normalized.course_id = parsedCourseId;
  normalized.instructor_id = course.instructor_id;
  normalized.question = requireText(normalized.question, 'La question FAQ est obligatoire.');
  normalized.answer = requireText(normalized.answer, 'La reponse FAQ est obligatoire.');
  if (normalized.position === undefined || normalized.position === null || normalized.position === '') {
    normalized.position = (store.course_faq_items ?? []).filter((item) => String(item.course_id) === parsedCourseId).length + 1;
  } else {
    normalized.position = requireInteger(normalized.position, 1, 9999, 'La position FAQ est invalide.');
  }
  normalized.status = trimText(normalized.status) ?? 'draft';
  if (!new Set(['draft', 'published', 'archived']).has(String(normalized.status))) {
    throw new BadRequestException('Le statut FAQ est invalide.');
  }
  return normalized;
}

function sanitizeLessonAssetRecord(row: Row, user: AuthUser) {
  const normalized = clone(row);
  const { lesson, section, course, parsedLessonId, parsedSectionId, parsedCourseId } = resolveInstructorLesson(normalized.lesson_id, user);
  normalized.lesson_id = parsedLessonId;
  normalized.section_id = parsedSectionId;
  normalized.course_id = parsedCourseId;
  normalized.lesson_title = String(lesson.title);
  normalized.section_title = String(section.title);
  normalized.course_name = String(course.title);
  normalized.instructor_id = course.instructor_id;
  normalized.title = requireText(normalized.title, 'Le titre du contenu est obligatoire.');

  const assetType = trimText(normalized.asset_type) ?? 'link';
  if (!new Set(['video', 'pdf', 'audio', 'archive', 'slides', 'link', 'code']).has(assetType)) {
    throw new BadRequestException('Le type de contenu est invalide.');
  }
  normalized.asset_type = assetType;

  const url = requireText(normalized.url, 'L URL du contenu est obligatoire.');
  if (!isValidAbsoluteUrl(url)) {
    throw new BadRequestException('L URL du contenu doit etre valide.');
  }
  normalized.url = url;

  const thumbnailUrl = trimText(normalized.thumbnail_url);
  if (thumbnailUrl && !isValidAbsoluteUrl(thumbnailUrl)) {
    throw new BadRequestException('La miniature doit etre une URL valide.');
  }
  normalized.thumbnail_url = thumbnailUrl;
  normalized.mime_type = trimText(normalized.mime_type);

  if (normalized.size_bytes !== undefined && normalized.size_bytes !== null && normalized.size_bytes !== '') {
    normalized.size_bytes = requireInteger(normalized.size_bytes, 0, Number.MAX_SAFE_INTEGER, 'La taille du contenu est invalide.');
  } else {
    normalized.size_bytes = null;
  }

  if (normalized.position === undefined || normalized.position === null || normalized.position === '') {
    normalized.position = (store.lesson_assets ?? []).filter((asset) => String(asset.lesson_id) === String(parsedLessonId)).length + 1;
  } else {
    normalized.position = requireInteger(normalized.position, 1, 999, 'La position du contenu est invalide.');
  }

  const status = trimText(normalized.status) ?? 'ready';
  if (!new Set(['processing', 'ready']).has(status)) {
    throw new BadRequestException('Le statut du contenu est invalide.');
  }
  normalized.status = status;
  return normalized;
}

function sanitizeVirtualClassRecord(row: Row, user: AuthUser) {
  const normalized = clone(row);
  const { course, parsedCourseId } = resolveInstructorCourse(normalized.course_id, user);
  normalized.course_id = parsedCourseId;
  normalized.course_name = String(course.title);
  normalized.instructor_id = course.instructor_id;
  normalized.title = requireText(normalized.title, 'Le titre de la classe est obligatoire.');
  const classDate = requireText(normalized.class_date, 'La date de la classe est obligatoire.');
  const classTime = requireText(normalized.class_time, 'L heure de la classe est obligatoire.');
  normalized.class_date = classDate;
  normalized.class_time = classTime;
  normalized.duration = trimText(normalized.duration);
  normalized.provider = normalizeLiveProvider(normalized.provider);
  normalized.meeting_slug = normalizeMeetingSlug(normalized.meeting_slug, [course.title, normalized.title, classDate, classTime]);
  normalized.max_students = requireInteger(normalized.max_students ?? 30, 1, 500, 'Le nombre maximal de participants doit etre compris entre 1 et 500.');
  normalized.students_count = requireInteger(normalized.students_count ?? 0, 0, 500, 'Le nombre de participants est invalide.');
  let roomLink = trimText(normalized.room_link);
  const recordingUrl = trimText(normalized.recording_url);
  normalized.room_link = roomLink;
  normalized.recording_url = recordingUrl;
  normalized.recording_enabled = parseBoolean(normalized.recording_enabled, true);
  normalized.allow_chat = parseBoolean(normalized.allow_chat, true);
  normalized.instructor_notes = trimText(normalized.instructor_notes);
  normalized.started_at = trimText(normalized.started_at);
  normalized.ended_at = trimText(normalized.ended_at);

  if (normalized.instructor_notes && String(normalized.instructor_notes).length > 1200) {
    throw new BadRequestException('Les notes formateur sont trop longues.');
  }

  if (normalized.provider === 'jitsi') {
    roomLink = buildJitsiRoomUrl(String(normalized.meeting_slug));
    normalized.room_link = roomLink;
  }

  if (roomLink && !isValidAbsoluteUrl(roomLink)) {
    throw new BadRequestException('Le lien de la salle doit etre une URL valide.');
  }
  if (recordingUrl && !isValidAbsoluteUrl(recordingUrl)) {
    throw new BadRequestException('Le lien d enregistrement doit etre une URL valide.');
  }

  const status = trimText(normalized.status) ?? 'scheduled';
  if (!new Set(['scheduled', 'live', 'ended', 'cancelled']).has(status)) {
    throw new BadRequestException('Le statut de la classe virtuelle est invalide.');
  }
  normalized.status = status;

  if (!roomLink && normalized.provider === 'custom' && status !== 'cancelled') {
    throw new BadRequestException('Le lien de la salle est obligatoire pour un live personnalise.');
  }

  const recordingStatus = trimText(normalized.recording_status);
  if (recordingStatus && !new Set(['none', 'pending', 'processing', 'ready']).has(recordingStatus)) {
    throw new BadRequestException('Le statut de replay est invalide.');
  }

  if (status === 'scheduled') {
    ensureFutureDateTime(classDate, classTime, 'La classe doit etre programmee sur un horaire futur.');
    normalized.started_at = null;
    normalized.ended_at = null;
  }

  if (status === 'live') {
    normalized.started_at = normalized.started_at ?? new Date().toISOString();
    normalized.ended_at = null;
  }

  if (status === 'ended') {
    normalized.started_at = normalized.started_at ?? new Date(`${classDate}T${classTime}:00`).toISOString();
    normalized.ended_at = normalized.ended_at ?? new Date().toISOString();
  }

  if (status === 'cancelled') {
    normalized.recording_url = null;
    normalized.recording_status = 'none';
    return normalized;
  }

  normalized.recording_status = recordingUrl
    ? 'ready'
    : normalized.recording_enabled
      ? (status === 'ended' ? 'processing' : 'pending')
      : 'none';

  return normalized;
}

function sanitizeExamRecord(row: Row, user: AuthUser) {
  const normalized = clone(row);
  const { course, parsedCourseId } = resolveInstructorCourse(normalized.course_id, user);
  normalized.course_id = parsedCourseId;
  normalized.course_name = String(course.title);
  normalized.instructor_id = course.instructor_id;
  normalized.title = requireText(normalized.title, 'Le titre de l examen est obligatoire.');
  const examDate = requireText(normalized.exam_date, 'La date de l examen est obligatoire.');
  const participants = requireInteger(normalized.participants ?? 0, 0, 10000, 'Le nombre de participants est invalide.');
  const submitted = requireInteger(normalized.submitted ?? 0, 0, 10000, 'Le nombre de soumissions est invalide.');
  normalized.exam_date = examDate;
  normalized.participants = participants;
  normalized.submitted = submitted;
  normalized.max_grade = requireNumberInRange(normalized.max_grade ?? 20, 1, 100, 'La note maximale doit etre comprise entre 1 et 100.');

  const type = trimText(normalized.type) ?? 'quiz';
  if (!new Set(['quiz', 'assignment', 'project']).has(type)) {
    throw new BadRequestException('Le type d examen est invalide.');
  }
  normalized.type = type;

  const status = trimText(normalized.status) ?? 'upcoming';
  if (!new Set(['upcoming', 'ongoing', 'graded', 'closed']).has(status)) {
    throw new BadRequestException('Le statut de l examen est invalide.');
  }
  normalized.status = status;

  if (submitted > participants) {
    normalized.participants = submitted;
  }

  if (status === 'upcoming') {
    ensureFutureDateString(examDate, 'Un examen a venir doit avoir une date valide et non depassee.');
  }

  return normalized;
}

function sanitizeQuizQuestionRecord(row: Row, user: AuthUser) {
  const normalized = clone(row);
  const { exam, course, parsedExamId, parsedCourseId } = resolveInstructorExam(normalized.exam_id, user);

  if (String(exam.type) !== 'quiz') {
    throw new BadRequestException('Les questions structurees sont reservees aux examens de type quiz.');
  }

  normalized.exam_id = parsedExamId;
  normalized.exam_title = String(exam.title);
  normalized.course_id = parsedCourseId;
  normalized.course_name = String(course.title);
  normalized.instructor_id = course.instructor_id;
  normalized.prompt = requireText(normalized.prompt, 'L intitule de la question est obligatoire.');
  normalized.explanation = trimText(normalized.explanation) ?? '';
  normalized.points = requireInteger(normalized.points ?? 1, 1, 100, 'Le nombre de points de la question est invalide.');
  normalized.required = parseBoolean(normalized.required, true);

  const type = trimText(normalized.type) ?? 'single_choice';
  if (!new Set(['single_choice', 'multiple_choice', 'true_false', 'open']).has(type)) {
    throw new BadRequestException('Le type de question est invalide.');
  }
  normalized.type = type;

  if (normalized.position === undefined || normalized.position === null || normalized.position === '') {
    normalized.position = (store.quiz_questions ?? []).filter((question) => String(question.exam_id) === String(parsedExamId)).length + 1;
  } else {
    normalized.position = requireInteger(normalized.position, 1, 9999, 'La position de la question est invalide.');
  }

  return normalized;
}

function sanitizeQuizChoiceRecord(row: Row, user: AuthUser) {
  const normalized = clone(row);
  const { question, exam, course, parsedQuestionId, parsedExamId, parsedCourseId } = resolveQuizQuestion(normalized.question_id, user);

  if (String(question.type) === 'open') {
    throw new BadRequestException('Une question ouverte ne peut pas contenir de choix.');
  }

  normalized.question_id = parsedQuestionId;
  normalized.question_prompt = String(question.prompt);
  normalized.question_type = String(question.type);
  normalized.exam_id = parsedExamId;
  normalized.exam_title = String(exam.title);
  normalized.course_id = parsedCourseId;
  normalized.course_name = String(course.title);
  normalized.instructor_id = course.instructor_id;
  normalized.label = requireText(normalized.label, 'Le libelle du choix est obligatoire.');
  normalized.value = trimText(normalized.value) ?? normalized.label;
  normalized.is_correct = parseBoolean(normalized.is_correct, false);

  if (normalized.position === undefined || normalized.position === null || normalized.position === '') {
    normalized.position = (store.quiz_choices ?? []).filter((choice) => String(choice.question_id) === String(parsedQuestionId)).length + 1;
  } else {
    normalized.position = requireInteger(normalized.position, 1, 9999, 'La position du choix est invalide.');
  }

  const siblingChoices = (store.quiz_choices ?? []).filter((choice) => String(choice.question_id) === String(parsedQuestionId));
  const otherCorrectChoices = siblingChoices.filter(
    (choice) => String(choice.id) !== String(normalized.id) && Boolean(choice.is_correct),
  );

  if (normalized.is_correct && new Set(['single_choice', 'true_false']).has(String(question.type)) && otherCorrectChoices.length > 0) {
    throw new BadRequestException('Une seule bonne reponse est autorisee pour cette question.');
  }

  if (String(question.type) === 'true_false' && siblingChoices.filter((choice) => String(choice.id) !== String(normalized.id)).length >= 2) {
    throw new BadRequestException('Une question vrai/faux ne peut contenir que deux choix.');
  }

  return normalized;
}

function sanitizeSubmissionRecord(row: Row, user: AuthUser) {
  const normalized = clone(row);
  const examId = requireIdentifier(normalized.exam_id, 'L examen associe est invalide.');
  const exam = findRow('exams', examId);

  if (!exam) {
    throw new BadRequestException('L examen associe est introuvable.');
  }

  const enrolled = (store.course_enrollments ?? []).some(
    (enrollment) => String(enrollment.course_id) === String(exam.course_id) && String(enrollment.student_id) === String(user.id),
  );
  if (!enrolled) {
    throw new UnauthorizedException('Acces refuse.');
  }

  normalized.exam_id = examId;
  normalized.student_id = user.id;
  normalized.student_name = trimText(normalized.student_name) ?? normalized.student_name ?? user.id;
  normalized.student_avatar = trimText(normalized.student_avatar);
  normalized.feedback = trimText(normalized.feedback);
  normalized.submitted_at = normalized.submitted_at ?? new Date().toISOString();

  const status = trimText(normalized.status) ?? 'pending';
  if (!new Set(['pending', 'graded', 'late']).has(status)) {
    throw new BadRequestException('Le statut de la soumission est invalide.');
  }
  normalized.status = status;

  if (String(exam.type) === 'quiz') {
    const questions = (store.quiz_questions ?? [])
      .filter((question) => String(question.exam_id) === examId)
      .sort((left, right) => compareValues(left.position, right.position));

    if (questions.length === 0) {
      throw new BadRequestException('Ce quiz n a pas encore de questions configurees.');
    }

    const rawAnswers = Array.isArray(normalized.answers) ? normalized.answers : [];
    const sanitizedAnswers = questions.map((question) => {
      const rawAnswer = rawAnswers.find((answer) => String((answer as Row).question_id) === String(question.id)) as Row | undefined;
      const questionType = String(question.type);
      const required = Boolean(question.required ?? true);

      if (questionType === 'open') {
        const answerText = trimText(rawAnswer?.answer_text);
        if (required && !answerText) {
          throw new BadRequestException('Toutes les questions obligatoires du quiz doivent etre renseignees.');
        }
        return {
          question_id: question.id,
          question_prompt: question.prompt,
          question_type: question.type,
          answer_text: answerText,
          selected_choice_ids: [],
        };
      }

      const questionChoices = (store.quiz_choices ?? []).filter((choice) => String(choice.question_id) === String(question.id));
      const selectedChoiceIds = Array.isArray(rawAnswer?.selected_choice_ids)
        ? Array.from(new Set((rawAnswer?.selected_choice_ids as unknown[]).map(String)))
        : rawAnswer?.selected_choice_id
          ? [String(rawAnswer.selected_choice_id)]
          : [];

      if (required && selectedChoiceIds.length === 0) {
        throw new BadRequestException('Toutes les questions obligatoires du quiz doivent etre renseignees.');
      }

      const validChoiceIds = new Set(questionChoices.map((choice) => String(choice.id)));
      if (selectedChoiceIds.some((choiceId) => !validChoiceIds.has(choiceId))) {
        throw new BadRequestException('Une reponse de quiz est invalide.');
      }

      if (new Set(['single_choice', 'true_false']).has(questionType) && selectedChoiceIds.length > 1) {
        throw new BadRequestException('Une question a choix unique ne peut recevoir qu une reponse.');
      }

      return {
        question_id: question.id,
        question_prompt: question.prompt,
        question_type: question.type,
        answer_text: null,
        selected_choice_ids: selectedChoiceIds,
      };
    });

    normalized.answers = sanitizedAnswers;
    normalized.file_name = 'Quiz structure';
    normalized.file_url = null;
    normalized.grade = null;
  } else {
    normalized.file_name = trimText(normalized.file_name) ?? 'Reponse';
    normalized.file_url = requireText(normalized.file_url, 'La reponse de la soumission est obligatoire.');
  }

  return normalized;
}

function sanitizeUpdatePayload(table: string, existingRow: Row, payload: Row, user: AuthUser) {
  switch (table) {
    case 'courses':
      return sanitizeCourseRecord({ ...existingRow, ...payload }, user);
    case 'admin_content_items':
      return sanitizeAdminContentItemRecord({ ...existingRow, ...payload }, user);
    case 'course_sections':
      return sanitizeCourseSectionRecord({ ...existingRow, ...payload }, user);
    case 'course_lessons':
      return sanitizeCourseLessonRecord({ ...existingRow, ...payload }, user);
    case 'lesson_assets':
      return sanitizeLessonAssetRecord({ ...existingRow, ...payload }, user);
    case 'virtual_classes':
      return sanitizeVirtualClassRecord({ ...existingRow, ...payload }, user);
    case 'exams':
      return sanitizeExamRecord({ ...existingRow, ...payload }, user);
    case 'quiz_questions':
      return sanitizeQuizQuestionRecord({ ...existingRow, ...payload }, user);
    case 'quiz_choices':
      return sanitizeQuizChoiceRecord({ ...existingRow, ...payload }, user);
    case 'payout_accounts':
      return sanitizePayoutAccountRecord({ ...existingRow, ...payload }, user);
    case 'payout_requests':
      return sanitizePayoutRequestRecord({ ...existingRow, ...payload }, user);
    case 'lesson_comments':
      return sanitizeLessonCommentRecord({ ...existingRow, ...payload }, user);
    case 'course_faq_items':
      return sanitizeCourseFaqRecord({ ...existingRow, ...payload }, user);
    default:
      return payload;
  }
}

function sanitizeCreatePayload(table: string, row: Row, user: AuthUser) {
  const providerIds = getProviderIdsForUser(user.id);
  const ownerProjectIds = getOwnerProjectIds(user.id);
  const courseIds = getInstructorCourseIds(user.id);

  switch (table) {
    case 'courses':
      if (user.role !== 'admin' && user.role !== 'formateur') throw new UnauthorizedException('Acces refuse.');
      return sanitizeCourseRecord(row, user);
    case 'course_sections':
      if (user.role !== 'admin' && user.role !== 'formateur') throw new UnauthorizedException('Acces refuse.');
      return sanitizeCourseSectionRecord(row, user);
    case 'course_lessons':
      if (user.role !== 'admin' && user.role !== 'formateur') throw new UnauthorizedException('Acces refuse.');
      return sanitizeCourseLessonRecord(row, user);
    case 'lesson_assets':
      if (user.role !== 'admin' && user.role !== 'formateur') throw new UnauthorizedException('Acces refuse.');
      return sanitizeLessonAssetRecord(row, user);
    case 'virtual_classes':
      if (user.role !== 'admin' && user.role !== 'formateur') throw new UnauthorizedException('Acces refuse.');
      return sanitizeVirtualClassRecord(row, user);
    case 'exams':
      if (user.role !== 'admin' && user.role !== 'formateur') throw new UnauthorizedException('Acces refuse.');
      return sanitizeExamRecord(row, user);
    case 'quiz_questions':
      if (user.role !== 'admin' && user.role !== 'formateur') throw new UnauthorizedException('Acces refuse.');
      return sanitizeQuizQuestionRecord(row, user);
    case 'quiz_choices':
      if (user.role !== 'admin' && user.role !== 'formateur') throw new UnauthorizedException('Acces refuse.');
      return sanitizeQuizChoiceRecord(row, user);
    case 'payout_accounts':
      if (user.role !== 'admin' && user.role !== 'formateur') throw new UnauthorizedException('Acces refuse.');
      return sanitizePayoutAccountRecord(row, user);
    case 'payout_requests':
      if (user.role !== 'admin' && user.role !== 'formateur') throw new UnauthorizedException('Acces refuse.');
      return sanitizePayoutRequestRecord(row, user);
    case 'lesson_comments':
      if (!new Set(['admin', 'formateur', 'apprenant']).has(user.role)) throw new UnauthorizedException('Acces refuse.');
      return sanitizeLessonCommentRecord(row, user);
    case 'course_faq_items':
      if (user.role !== 'admin' && user.role !== 'formateur') throw new UnauthorizedException('Acces refuse.');
      return sanitizeCourseFaqRecord(row, user);
    case 'notifications': {
      const targetUserId = String(row.user_id ?? '');
      if (!canNotifyUser(user, targetUserId)) {
        throw new UnauthorizedException('Acces refuse.');
      }
      return {
        ...row,
        metadata: {
          ...(typeof row.metadata === 'object' && row.metadata !== null ? row.metadata : {}),
          actor_id: user.id,
          actor_role: user.role,
        },
      };
    }
    case 'payment_transactions':
    case 'wallet_accounts':
    case 'invoices':
      if (String(row.user_id) !== user.id) throw new UnauthorizedException('Acces refuse.');
      return row;
    case 'bookings':
      if (user.role !== 'client' || String(row.client_id) !== user.id) throw new UnauthorizedException('Acces refuse.');
      return row;
    case 'client_orders':
    case 'client_favorites':
      if (user.role !== 'client' || String(row.client_id) !== user.id) throw new UnauthorizedException('Acces refuse.');
      return row;
    case 'provider_reviews':
      if (user.role !== 'client' || String(row.client_id) !== user.id) throw new UnauthorizedException('Acces refuse.');
      return row;
    case 'provider_services':
      if (user.role !== 'prestataire' || !providerIds.includes(String(row.provider_id))) throw new UnauthorizedException('Acces refuse.');
      return row;
    case 'course_enrollments':
      if (user.role !== 'apprenant' || String(row.student_id) !== user.id) throw new UnauthorizedException('Acces refuse.');
      return row;
    case 'submissions':
      if (user.role !== 'apprenant' || String(row.student_id) !== user.id) throw new UnauthorizedException('Acces refuse.');
      return sanitizeSubmissionRecord(row, user);
    case 'certificates':
      if (user.role !== 'formateur' || !courseIds.includes(String(row.course_id))) throw new UnauthorizedException('Acces refuse.');
      return row;
    case 'conversations':
      if (!Array.isArray(row.participants) || !row.participants.map(String).includes(String(user.id))) {
        throw new UnauthorizedException('Acces refuse.');
      }
      return row;
    case 'messages':
      if (String(row.sender_id) !== user.id) throw new UnauthorizedException('Acces refuse.');
      if (!getConversationIdsForUser(user.id).includes(String(row.conversation_id))) throw new UnauthorizedException('Acces refuse.');
      return row;
    case 'projects':
      if (user.role !== 'porteur' || String(row.owner_id) !== user.id) throw new UnauthorizedException('Acces refuse.');
      return row;
    case 'project_milestones':
    case 'project_documents':
    case 'project_history':
    case 'project_partnerships':
    case 'project_funding_rounds':
      if (user.role !== 'porteur' || !ownerProjectIds.includes(String(row.project_id))) throw new UnauthorizedException('Acces refuse.');
      return row;
    case 'project_tracking':
    case 'project_collaborations':
      if (user.role !== 'partenaire' || String(row.partner_id) !== user.id) throw new UnauthorizedException('Acces refuse.');
      return row;
    case 'funding_investors': {
      if (user.role !== 'porteur') throw new UnauthorizedException('Acces refuse.');
      const round = findRow('project_funding_rounds', row.funding_round_id);
      if (!round || !ownerProjectIds.includes(String(round.project_id))) throw new UnauthorizedException('Acces refuse.');
      return row;
    }
    default:
      if (user.role === 'admin') {
        return row;
      }
      throw new UnauthorizedException('Acces refuse.');
  }
}

@Controller('data')
export class DataController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  @Get(':table')
  async findMany(
    @Req() request: AuthenticatedRequest,
    @Param('table') table: string,
    @Query() query: Record<string, string | string[] | undefined>,
  ) {
    await syncAppStoreFromDatabase(this.prisma);
    assertTableAccess(table, request.auth?.user ?? null, 'GET');
    ensureTable(table);
    let rows = filterRowsForActor(table, clone(store[table] ?? []), request.auth?.user ?? null).filter((row) => matches(row, query));

    if (typeof query.order === 'string') {
      const direction = query.ascending === 'true' ? 1 : -1;
      rows = rows.sort((left, right) => compareValues(left[query.order as string], right[query.order as string]) * direction);
    }

    if (typeof query.limit === 'string') {
      rows = rows.slice(0, Number(query.limit));
    }

    const hydrated = hydrateRows(table, rows);
    return query.single === 'true' ? (hydrated[0] ?? null) : hydrated;
  }

  @Post(':table')
  async create(
    @Req() request: AuthenticatedRequest,
    @Param('table') table: string,
    @Body() payload: Row | Row[],
  ) {
    await syncAppStoreFromDatabase(this.prisma);
    assertTableAccess(table, request.auth?.user ?? null, 'POST');
    ensureTable(table);
    const rawRows = Array.isArray(payload) ? payload : [payload];
    const user = request.auth?.user;
    const normalizedRows = user ? rawRows.map((row) => sanitizeCreatePayload(table, clone(row), user)) : rawRows;
    ensureConstraints(table, normalizedRows);

    const rows = normalizedRows.map((row) => withId(prepareInsert(table, row)));
    const response = appendAppRows(table, rows);
    if (table === 'virtual_classes') {
      const notifications = response.flatMap((row) => buildVirtualClassNotificationRows(row, 'live-scheduled'));
      if (notifications.length > 0) {
        appendAppRows('notifications', notifications);
      }
    }
    await persistAppStoreToDatabase(this.prisma);
    return Array.isArray(payload) ? response : response[0];
  }

  @Patch(':table')
  async update(
    @Req() request: AuthenticatedRequest,
    @Param('table') table: string,
    @Query() query: Record<string, string | string[] | undefined>,
    @Body() payload: Row,
  ) {
    await syncAppStoreFromDatabase(this.prisma);
    assertTableAccess(table, request.auth?.user ?? null, 'PATCH');
    ensureTable(table);
    const rows = store[table] ?? [];
    const actorRows = filterRowsForActor(table, rows, request.auth?.user ?? null);
    const actorRowIds = new Set(actorRows.map((row) => String(row.id)));
    const matchedIds = new Set(rows.filter((row) => matches(row, query)).map((row) => String(row.id)));
    const accessibleMatched = actorRows.filter((row) => matches(row, query));
    if (matchedIds.size > 0 && accessibleMatched.length === 0) {
      throw new UnauthorizedException('Acces refuse.');
    }
    const user = request.auth?.user;
    const previousRows = actorRows
      .filter((row) => matches(row, query))
      .map((row) => clone(row));
    const updated = rows.map((row) => (
      matchedIds.has(String(row.id)) && actorRowIds.has(String(row.id))
        ? { ...row, ...(user ? sanitizeUpdatePayload(table, row, clone(payload), user) : payload), updated_at: new Date().toISOString() }
        : row
    ));
    store[table] = updated;
    recomputeDerivedData();
    const updatedRows = updated.filter((row) => matches(row, query) && actorRowIds.has(String(row.id)));
    if (table === 'virtual_classes') {
      const previousById = new Map(previousRows.map((row) => [String(row.id), row] as const));
      const notifications = updatedRows.flatMap((row) => {
        const previous = previousById.get(String(row.id));
        if (!previous) return [];

        if (String(previous.status) !== String(row.status)) {
          if (String(row.status) === 'live') {
            return buildVirtualClassNotificationRows(row, 'live-started');
          }
          if (String(row.status) === 'ended') {
            return buildVirtualClassNotificationRows(row, row.recording_url ? 'replay-ready' : 'live-ended');
          }
        }

        const relevantKeys = ['title', 'class_date', 'class_time', 'room_link', 'recording_url', 'recording_status'];
        const changed = relevantKeys.some((key) => String(previous[key] ?? '') !== String(row[key] ?? ''));
        if (changed) {
          if (String(row.status) === 'ended' && row.recording_url && !previous.recording_url) {
            return buildVirtualClassNotificationRows(row, 'replay-ready');
          }
          if (String(row.status) === 'scheduled') {
            return buildVirtualClassNotificationRows(row, 'live-updated');
          }
        }

        return [];
      });

      if (notifications.length > 0) {
        appendAppRows('notifications', notifications);
      }
    }
    await persistAppStoreToDatabase(this.prisma);
    return hydrateRows(table, updatedRows);
  }

  @Delete(':table')
  async remove(
    @Req() request: AuthenticatedRequest,
    @Param('table') table: string,
    @Query() query: Record<string, string | string[] | undefined>,
  ) {
    await syncAppStoreFromDatabase(this.prisma);
    assertTableAccess(table, request.auth?.user ?? null, 'DELETE');
    ensureTable(table);
    const rows = store[table] ?? [];
    const actorRows = filterRowsForActor(table, rows, request.auth?.user ?? null);
    const actorRowIds = new Set(actorRows.map((row) => String(row.id)));
    const matchedIds = new Set(rows.filter((row) => matches(row, query)).map((row) => String(row.id)));
    const removed = rows.filter((row) => matches(row, query) && actorRowIds.has(String(row.id)));
    if (matchedIds.size > 0 && removed.length === 0) {
      throw new UnauthorizedException('Acces refuse.');
    }
    store[table] = rows.filter((row) => !(matches(row, query) && actorRowIds.has(String(row.id))));

    if (table === 'course_sections') {
      const removedSectionIds = new Set(removed.map((row) => String(row.id)));
      store.course_lessons = (store.course_lessons ?? []).filter((lesson) => !removedSectionIds.has(String(lesson.section_id)));
      const remainingLessonIds = new Set((store.course_lessons ?? []).map((lesson) => String(lesson.id)));
      store.lesson_assets = (store.lesson_assets ?? []).filter((asset) => remainingLessonIds.has(String(asset.lesson_id)));
      store.lesson_comments = (store.lesson_comments ?? []).filter((comment) => remainingLessonIds.has(String(comment.lesson_id)));
    }

    if (table === 'course_lessons') {
      const removedLessonIds = new Set(removed.map((row) => String(row.id)));
      store.lesson_assets = (store.lesson_assets ?? []).filter((asset) => !removedLessonIds.has(String(asset.lesson_id)));
      store.lesson_comments = (store.lesson_comments ?? []).filter((comment) => !removedLessonIds.has(String(comment.lesson_id)));
    }

    if (table === 'quiz_questions') {
      const removedQuestionIds = new Set(removed.map((row) => String(row.id)));
      store.quiz_choices = (store.quiz_choices ?? []).filter((choice) => !removedQuestionIds.has(String(choice.question_id)));
    }

    if (table === 'exams') {
      const removedExamIds = new Set(removed.map((row) => String(row.id)));
      store.submissions = (store.submissions ?? []).filter((submission) => !removedExamIds.has(String(submission.exam_id)));
      store.quiz_questions = (store.quiz_questions ?? []).filter((question) => !removedExamIds.has(String(question.exam_id)));
      const remainingQuestionIds = new Set((store.quiz_questions ?? []).map((question) => String(question.id)));
      store.quiz_choices = (store.quiz_choices ?? []).filter((choice) => remainingQuestionIds.has(String(choice.question_id)));
    }

    if (table === 'courses') {
      const removedCourseIds = new Set(removed.map((row) => String(row.id)));
      store.course_sections = (store.course_sections ?? []).filter((section) => !removedCourseIds.has(String(section.course_id)));
      store.course_lessons = (store.course_lessons ?? []).filter((lesson) => !removedCourseIds.has(String(lesson.course_id)));
      store.lesson_assets = (store.lesson_assets ?? []).filter((asset) => !removedCourseIds.has(String(asset.course_id)));
      store.lesson_comments = (store.lesson_comments ?? []).filter((comment) => !removedCourseIds.has(String(comment.course_id)));
      store.course_faq_items = (store.course_faq_items ?? []).filter((item) => !removedCourseIds.has(String(item.course_id)));
      store.virtual_classes = (store.virtual_classes ?? []).filter((vclass) => !removedCourseIds.has(String(vclass.course_id)));
      store.exams = (store.exams ?? []).filter((exam) => !removedCourseIds.has(String(exam.course_id)));
      const remainingExamIds = new Set((store.exams ?? []).map((exam) => String(exam.id)));
      store.submissions = (store.submissions ?? []).filter((submission) => remainingExamIds.has(String(submission.exam_id)));
      store.quiz_questions = (store.quiz_questions ?? []).filter((question) => remainingExamIds.has(String(question.exam_id)));
      const remainingQuestionIds = new Set((store.quiz_questions ?? []).map((question) => String(question.id)));
      store.quiz_choices = (store.quiz_choices ?? []).filter((choice) => remainingQuestionIds.has(String(choice.question_id)));
    }

    recomputeDerivedData();
    await persistAppStoreToDatabase(this.prisma);
    return hydrateRows(table, removed);
  }
}
