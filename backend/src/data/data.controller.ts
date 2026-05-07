import {
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
import type { AuthUser } from '../auth/auth.store.js';
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
  'virtual_classes',
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

  if (table === 'course_enrollments') {
    const course = findRow('courses', hydrated.course_id);
    hydrated.course_name = hydrated.course_name ?? course?.title ?? null;
    hydrated.courses = course ? clone(course) : null;
    return hydrated;
  }

  if (table === 'virtual_classes') {
    const course = findRow('courses', hydrated.course_id);
    hydrated.course_name = hydrated.course_name ?? course?.title ?? null;
    return hydrated;
  }

  if (table === 'exams') {
    const course = findRow('courses', hydrated.course_id);
    hydrated.course_name = hydrated.course_name ?? course?.title ?? null;
    hydrated.instructor_id = hydrated.instructor_id ?? course?.instructor_id ?? null;
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
  }
}

function recomputeDerivedData() {
  const courses = store.courses ?? [];
  const enrollments = store.course_enrollments ?? [];
  const reviews = store.provider_reviews ?? [];
  const bookings = store.bookings ?? [];
  const providers = store.providers ?? [];
  const services = store.provider_services ?? [];
  const exams = store.exams ?? [];
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

    course.students_count = courseStudents.size;
    course.completion_rate = courseEnrollments.length ? Math.round(totalProgress / courseEnrollments.length) : 0;
    course.revenue = courseStudents.size * price;
  }

  for (const enrollment of enrollments) {
    const course = findRow('courses', enrollment.course_id);
    enrollment.course_name = enrollment.course_name ?? course?.title ?? null;
  }

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
    const graded = examSubmissions.filter((submission) => submission.grade !== null && submission.grade !== undefined);
    const avgGrade = graded.length
      ? graded.reduce((sum, submission) => sum + (toNumber(submission.grade) ?? 0), 0) / graded.length
      : null;
    const course = findRow('courses', exam.course_id);

    exam.course_name = exam.course_name ?? course?.title ?? null;
    exam.submitted = examSubmissions.length;
    exam.participants = Math.max(toNumber(exam.participants) ?? 0, examSubmissions.length);
    exam.avg_grade = avgGrade === null ? null : Number(avgGrade.toFixed(1));
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
  const ownerProjectIds = getOwnerProjectIds(user.id);
  const trackedProjectIds = getTrackedProjectIds(user.id);
  const conversationIds = getConversationIdsForUser(user.id);

  switch (table) {
    case 'providers':
    case 'provider_services':
    case 'provider_reviews':
    case 'courses':
    case 'projects':
    case 'virtual_classes':
      return rows;
    case 'notifications':
    case 'payment_transactions':
    case 'wallet_accounts':
    case 'invoices':
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
      return rows.filter((row) => user.role === 'prestataire' ? providerIds.includes(String(row.provider_id)) : true);
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
        return rows.filter((row) => {
          const courseId = String(row.course_id);
          return (store.course_enrollments ?? []).some((enrollment) => String(enrollment.student_id) === user.id && String(enrollment.course_id) === courseId);
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

function sanitizeCreatePayload(table: string, row: Row, user: AuthUser) {
  const providerIds = getProviderIdsForUser(user.id);
  const ownerProjectIds = getOwnerProjectIds(user.id);
  const courseIds = getInstructorCourseIds(user.id);
  const trackedProjectIds = getTrackedProjectIds(user.id);

  if (user.role === 'admin') {
    return row;
  }

  switch (table) {
    case 'notifications':
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
    case 'courses':
    case 'virtual_classes':
    case 'exams':
      if (user.role !== 'formateur') throw new UnauthorizedException('Acces refuse.');
      if (table === 'courses' && String(row.instructor_id) !== user.id) throw new UnauthorizedException('Acces refuse.');
      if (table !== 'courses' && row.course_id && !courseIds.includes(String(row.course_id))) throw new UnauthorizedException('Acces refuse.');
      return row;
    case 'course_enrollments':
      if (user.role !== 'apprenant' || String(row.student_id) !== user.id) throw new UnauthorizedException('Acces refuse.');
      return row;
    case 'submissions':
      if (user.role !== 'apprenant' || String(row.student_id) !== user.id) throw new UnauthorizedException('Acces refuse.');
      return row;
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
    const updated = rows.map((row) => (
      matchedIds.has(String(row.id)) && actorRowIds.has(String(row.id))
        ? { ...row, ...payload, updated_at: new Date().toISOString() }
        : row
    ));
    store[table] = updated;
    recomputeDerivedData();
    await persistAppStoreToDatabase(this.prisma);
    return hydrateRows(table, updated.filter((row) => matches(row, query) && actorRowIds.has(String(row.id))));
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
    recomputeDerivedData();
    await persistAppStoreToDatabase(this.prisma);
    return hydrateRows(table, removed);
  }
}
