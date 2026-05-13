import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PlatformPersistenceService } from '../database/platform-persistence.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { WalletService } from '../database/wallet.service.js';
import { AuthService } from '../auth/auth.service.js';
import { findUserById, type AuthUser } from '../auth/auth.store.js';
import type { AuthenticatedRequest } from '../common/http/request-context.js';
import type { OutboxEventInput } from '../outbox/outbox.types.js';
import { createInitialStore, type Row, type Store } from './mock-store.js';
import {
  ADMIN_ONLY_TABLES,
  APPEND_ONLY_TABLES,
  canReadWithoutAuth,
  getRequiredPermissionForTable,
} from './data-access-policy.js';
import { filterRowsForActor as filterRowsForActorByPolicy } from './data-row-access.js';
import {
  ensureConstraints as ensureInsertConstraints,
  prepareInsert as prepareInsertByPolicy,
} from './data-write-policy.js';
import {
  recomputeDerivedData as recomputeDerivedDataByPolicy,
} from './data-derived-data.js';
import {
  applyBookingCreateSideEffects as applyBookingCreateSideEffectsByPolicy,
  applyBookingUpdateSideEffects as applyBookingUpdateSideEffectsByPolicy,
  applyEscrowUpdateSideEffects as applyEscrowUpdateSideEffectsByPolicy,
  applyPayoutRequestUpdateSideEffects as applyPayoutRequestUpdateSideEffectsByPolicy,
  applySubscriptionMutationSideEffects as applySubscriptionMutationSideEffectsByPolicy,
  type FinanceSideEffectsContext,
} from './data-finance-side-effects.js';
import {
  isConversationAllowedForActor,
  sanitizeConversationParticipants,
} from './data-messaging-policy.js';
import {
  canCreateUserNotification,
  normalizeNotificationType,
} from './data-notification-policy.js';
import {
  appendVirtualClassCreateEvents,
  appendVirtualClassUpdateEvents,
} from './data-virtual-class-events.js';
import {
  applyProviderVerificationDecision,
  issueProviderVisibilityPass,
  syncProviderStateFromSubscription,
} from './data-provider-visibility.js';

const initialStore: Store = createInitialStore();
const store: Store = clone(initialStore);
let appStoreHydrated = false;
let appStoreHydratedAt = 0;
let syncAppStorePromise: Promise<void> | null = null;
const APP_STORE_SYNC_TTL_MS = 60_000;

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

export function withId(row: Row): Row {
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

function buildAppRowRecord(table: string, row: Row): Prisma.AppRowCreateManyInput {
  return {
    key: `${table}::${String(row.id)}`,
    table,
    rowId: String(row.id),
    data: clone(row) as Prisma.InputJsonValue,
  };
}

export async function syncAppStoreFromDatabase(prisma: PrismaService, options: { force?: boolean } = {}) {
  if (!prisma.isConnected) {
    recomputeDerivedData();
    appStoreHydrated = true;
    return;
  }

  if (appStoreHydrated && !options.force && (Date.now() - appStoreHydratedAt) < APP_STORE_SYNC_TTL_MS) {
    return;
  }

  if (syncAppStorePromise) {
    return syncAppStorePromise;
  }

  syncAppStorePromise = (async () => {
    const knownTables = new Set(
      (await prisma.appRow.findMany({ distinct: ['table'], select: { table: true } })).map((entry) => entry.table),
    );

    const missingRows = Object.entries(initialStore)
      .filter(([table, rows]) => rows.length > 0 && !knownTables.has(table))
      .flatMap(([table, rows]) => rows.map((row) => buildAppRowRecord(table, row)));

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
    appStoreHydrated = true;
    appStoreHydratedAt = Date.now();
  })().finally(() => {
    syncAppStorePromise = null;
  });

  return syncAppStorePromise;
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
  appStoreHydratedAt = Date.now();
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
    const activeSubscription = hydrated.user_id
      ? (store.user_subscriptions ?? []).find(
          (entry) => String(entry.user_id) === String(hydrated.user_id) && String(entry.status) === 'active',
        )
      : null;
    const activePlan = activeSubscription ? findRow('subscription_plans', activeSubscription.plan_id) : null;
    hydrated.reviews = hydrated.reviews ?? hydrated.reviews_count ?? 0;
    hydrated.reviews_count = hydrated.reviews_count ?? hydrated.reviews ?? 0;
    hydrated.public_alias = trimText(hydrated.public_alias) ?? `Profil C2P #${String(hydrated.id ?? '').trim() || 'senprest'}`;
    hydrated.public_profile_level = trimText(hydrated.public_profile_level)
      ?? (parseBoolean(activePlan?.verified_badge) || parseBoolean(hydrated.verified) ? 'verified' : activeSubscription ? 'subscriber' : 'visitor');
    hydrated.identity_mode = trimText(hydrated.identity_mode) ?? (parseBoolean(hydrated.verified) ? 'full_profile' : 'alias_only');
    hydrated.visibility_tier = trimText(hydrated.visibility_tier)
      ?? (trimText(activePlan?.priority_matching) === 'high' ? 'premium' : trimText(activePlan?.priority_matching) === 'medium' ? 'priority' : 'standard');
    hydrated.operations_managed = parseBoolean(hydrated.operations_managed, true);
    hydrated.alerts_enabled = parseBoolean(hydrated.alerts_enabled, Boolean(activeSubscription));
    hydrated.plan_name = hydrated.plan_name ?? activeSubscription?.plan_name ?? activePlan?.name ?? null;
    hydrated.subscription_status = hydrated.subscription_status ?? activeSubscription?.status ?? null;
    hydrated.verified_badge_enabled = parseBoolean(hydrated.verified_badge_enabled, parseBoolean(activePlan?.verified_badge));
    hydrated.verified = parseBoolean(hydrated.verified, false) || parseBoolean(activePlan?.verified_badge);
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
    const requestedProvider = findRow('providers', hydrated.requested_provider_id);
    if (requestedProvider) {
      hydrated.requested_provider = {
        id: requestedProvider.id,
        name: requestedProvider.name,
        image: requestedProvider.image,
      };
      hydrated.requested_provider_name = hydrated.requested_provider_name ?? requestedProvider.name;
    }
    hydrated.request_channel = hydrated.request_channel ?? 'c2p_managed';
    hydrated.assignment_status = hydrated.assignment_status ?? (hydrated.provider_id ? 'assigned' : 'pending_review');
    hydrated.wallet_flow = hydrated.wallet_flow ?? 'escrow';
    hydrated.matching_candidates = buildMatchingCandidates(hydrated);
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
    const instructor = findUserById(String(hydrated.instructor_id ?? ''));
    hydrated.level = normalizeCourseLevel(hydrated.level) ?? 'intermediate';
    hydrated.program_branch = normalizeCourseBranch(hydrated.program_branch) ?? 'form_actions';
    hydrated.delivery_mode = trimText(hydrated.delivery_mode) ?? 'online';
    if (!new Set(['online', 'onsite', 'hybrid']).has(String(hydrated.delivery_mode))) {
      hydrated.delivery_mode = 'online';
    }
    hydrated.instructor_name = hydrated.instructor_name ?? (instructor ? `${instructor.firstName} ${instructor.lastName}`.trim() : null);
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

  if (table === 'student_guardians') {
    const student = findUserById(String(hydrated.student_id ?? ''));
    hydrated.student_name = hydrated.student_name ?? (student ? `${student.firstName} ${student.lastName}`.trim() : null);
    hydrated.student_avatar = hydrated.student_avatar ?? student?.avatar ?? null;
    hydrated.relationship = trimText(hydrated.relationship) ?? 'Parent';
    hydrated.status = trimText(hydrated.status) ?? 'active';
    hydrated.alert_channel = trimText(hydrated.alert_channel) ?? 'dashboard';
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

  if (table === 'lesson_progress') {
    const course = findRow('courses', hydrated.course_id);
    const section = findRow('course_sections', hydrated.section_id);
    const lesson = findRow('course_lessons', hydrated.lesson_id);
    hydrated.course_name = hydrated.course_name ?? course?.title ?? null;
    hydrated.section_title = hydrated.section_title ?? section?.title ?? null;
    hydrated.lesson_title = hydrated.lesson_title ?? lesson?.title ?? null;
    hydrated.progress = Math.max(0, Math.min(100, requireNumberOrFallback(hydrated.progress, 0)));
    hydrated.completed = parseBoolean(hydrated.completed, (toNumber(hydrated.progress) ?? 0) >= 100);
    hydrated.status = hydrated.status ?? (hydrated.completed ? 'completed' : ((toNumber(hydrated.progress) ?? 0) > 0 ? 'in_progress' : 'not_started'));
    hydrated.last_viewed_at = hydrated.last_viewed_at ?? hydrated.updated_at ?? hydrated.created_at ?? null;
    hydrated.first_viewed_at = hydrated.first_viewed_at ?? hydrated.last_viewed_at ?? null;
    hydrated.completed_at = hydrated.completed_at ?? null;
    return hydrated;
  }

  if (table === 'course_reviews') {
    const course = findRow('courses', hydrated.course_id);
    hydrated.course_name = hydrated.course_name ?? course?.title ?? null;
    hydrated.rating = requireNumberOrFallback(hydrated.rating, 0);
    hydrated.status = hydrated.status ?? 'published';
    hydrated.student_avatar = trimText(hydrated.student_avatar);
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

  if (table === 'wallet_accounts') {
    const userId = String(hydrated.user_id ?? '');
    const escrowOutgoing = (store.escrow_cases ?? [])
      .filter((entry) => String(entry.client_id) === userId && new Set(['funded', 'assigned', 'in_progress', 'delivery_review']).has(String(entry.status)))
      .reduce((sum, entry) => sum + requireNumberOrFallback(entry.amount_total, 0), 0);
    const escrowIncoming = (store.escrow_cases ?? [])
      .filter((entry) => String(entry.provider_user_id) === userId && new Set(['assigned', 'in_progress', 'delivery_review']).has(String(entry.status)))
      .reduce((sum, entry) => sum + requireNumberOrFallback(entry.provider_amount, 0), 0);
    const pendingPayoutAmount = getPendingPayoutReservations(userId);
    const subscription = (store.user_subscriptions ?? []).find((entry) => String(entry.user_id) === userId && String(entry.status) === 'active');
    hydrated.currency = hydrated.currency ?? 'XAF';
    hydrated.held_balance = escrowOutgoing;
    hydrated.pending_release_balance = escrowIncoming;
    hydrated.pending_payout_amount = pendingPayoutAmount;
    hydrated.available_balance = Math.max(0, requireNumberOrFallback(hydrated.balance, 0) - pendingPayoutAmount);
    hydrated.subscription_status = subscription?.status ?? null;
    hydrated.subscription_plan_name = subscription?.plan_name ?? null;
    return hydrated;
  }

  if (table === 'subscription_plans') {
    hydrated.currency = hydrated.currency ?? 'XAF';
    hydrated.price_monthly = requireNumberOrFallback(hydrated.price_monthly, 0);
    hydrated.commission_rate = requireNumberOrFallback(hydrated.commission_rate, 0);
    hydrated.active = Boolean(hydrated.active ?? true);
    hydrated.features = Array.isArray(hydrated.features) ? hydrated.features : [];
    return hydrated;
  }

  if (table === 'user_subscriptions') {
    const plan = findRow('subscription_plans', hydrated.plan_id);
    const renewsAt = typeof hydrated.renews_at === 'string' ? Date.parse(hydrated.renews_at) : Number.NaN;
    hydrated.role = hydrated.role ?? plan?.role ?? null;
    hydrated.plan_name = hydrated.plan_name ?? plan?.name ?? null;
    hydrated.currency = hydrated.currency ?? plan?.currency ?? 'XAF';
    hydrated.amount = requireNumberOrFallback(hydrated.amount, requireNumberOrFallback(plan?.price_monthly, 0));
    hydrated.commission_rate = requireNumberOrFallback(hydrated.commission_rate, requireNumberOrFallback(plan?.commission_rate, 0));
    hydrated.status = hydrated.status ?? 'pending';
    hydrated.auto_renew = parseBoolean(hydrated.auto_renew, true);
    hydrated.plan = plan ? clone(plan) : null;
    hydrated.days_remaining = Number.isNaN(renewsAt) ? null : Math.max(0, Math.ceil((renewsAt - Date.now()) / 86_400_000));
    hydrated.is_expiring_soon = typeof hydrated.days_remaining === 'number' ? hydrated.days_remaining <= 7 : false;
    return hydrated;
  }

  if (table === 'provider_visibility_products') {
    hydrated.role = hydrated.role ?? 'prestataire';
    hydrated.tier = hydrated.tier ?? 'priority';
    hydrated.currency = hydrated.currency ?? 'XAF';
    hydrated.price = requireNumberOrFallback(hydrated.price, 0);
    hydrated.duration_days = requireNumberOrFallback(hydrated.duration_days, 30);
    hydrated.alerts_enabled = parseBoolean(hydrated.alerts_enabled, true);
    hydrated.verification_eligible = parseBoolean(hydrated.verification_eligible, false);
    hydrated.matching_priority = trimText(hydrated.matching_priority) ?? 'low';
    hydrated.features = Array.isArray(hydrated.features) ? hydrated.features : [];
    hydrated.active = parseBoolean(hydrated.active, true);
    return hydrated;
  }

  if (table === 'provider_visibility_passes') {
    const provider = findRow('providers', hydrated.provider_id);
    const plan = findRow('subscription_plans', hydrated.plan_id);
    const product = findRow('provider_visibility_products', hydrated.product_id ?? hydrated.plan_id);
    const expiresAt = typeof hydrated.expires_at === 'string' ? Date.parse(hydrated.expires_at) : Number.NaN;
    hydrated.provider_name = hydrated.provider_name ?? provider?.name ?? provider?.public_alias ?? null;
    hydrated.plan_name = hydrated.plan_name ?? plan?.name ?? product?.name ?? null;
    hydrated.product_name = hydrated.product_name ?? product?.name ?? null;
    hydrated.pass_label = hydrated.pass_label ?? 'Billet standard';
    hydrated.pass_tier = hydrated.pass_tier ?? 'standard';
    hydrated.status = hydrated.status ?? 'active';
    hydrated.alerts_enabled = parseBoolean(hydrated.alerts_enabled, false);
    hydrated.verification_eligible = parseBoolean(hydrated.verification_eligible, false);
    hydrated.matching_priority = trimText(hydrated.matching_priority) ?? 'low';
    hydrated.is_expired = Number.isNaN(expiresAt) ? false : expiresAt < Date.now();
    return hydrated;
  }

  if (table === 'provider_visibility_orders') {
    const product = findRow('provider_visibility_products', hydrated.product_id);
    const pass = findRow('provider_visibility_passes', hydrated.pass_id);
    hydrated.product_name = hydrated.product_name ?? product?.name ?? null;
    hydrated.currency = hydrated.currency ?? product?.currency ?? 'XAF';
    hydrated.amount = requireNumberOrFallback(hydrated.amount, requireNumberOrFallback(product?.price, 0));
    hydrated.status = hydrated.status ?? 'pending';
    hydrated.pass_tier = hydrated.pass_tier ?? product?.tier ?? pass?.pass_tier ?? 'standard';
    hydrated.pass_code = hydrated.pass_code ?? pass?.code ?? null;
    hydrated.pass_label = hydrated.pass_label ?? pass?.pass_label ?? null;
    hydrated.expires_at = hydrated.expires_at ?? pass?.expires_at ?? null;
    return hydrated;
  }

  if (table === 'provider_verification_requests') {
    const provider = findRow('providers', hydrated.provider_id);
    const reviewer = findUserById(String(hydrated.reviewed_by ?? ''));
    hydrated.provider_name = hydrated.provider_name ?? provider?.name ?? provider?.public_alias ?? null;
    hydrated.requested_level = hydrated.requested_level ?? 'verified';
    hydrated.status = hydrated.status ?? 'pending';
    hydrated.source = hydrated.source ?? 'self_service';
    hydrated.note = trimText(hydrated.note) ?? '';
    hydrated.admin_notes = trimText(hydrated.admin_notes);
    hydrated.reviewed_by_name = reviewer ? `${reviewer.firstName} ${reviewer.lastName}`.trim() : null;
    return hydrated;
  }

  if (table === 'escrow_cases') {
    const booking = findRow('bookings', hydrated.booking_id);
    const provider = findRow('providers', hydrated.provider_id);
    const client = findUserById(String(hydrated.client_id ?? booking?.client_id ?? ''));
    hydrated.currency = hydrated.currency ?? 'XAF';
    hydrated.booking = booking ? clone(booking) : null;
    hydrated.booking_title = hydrated.booking_title ?? booking?.service ?? hydrated.service ?? null;
    hydrated.client_name = hydrated.client_name ?? booking?.client_name ?? (client ? `${client.firstName} ${client.lastName}`.trim() : null);
    hydrated.provider_name = hydrated.provider_name ?? provider?.name ?? null;
    hydrated.provider_user_id = hydrated.provider_user_id ?? provider?.user_id ?? null;
    hydrated.status = normalizeEscrowStatus(hydrated.status, 'awaiting_funding');
    hydrated.last_event_at = hydrated.released_at ?? hydrated.refunded_at ?? hydrated.funded_at ?? booking?.updated_at ?? booking?.created_at ?? null;
    return hydrated;
  }

  if (table === 'commission_ledger') {
    const actor = findUserById(String(hydrated.user_id ?? ''));
    const beneficiary = findUserById(String(hydrated.beneficiary_user_id ?? ''));
    hydrated.currency = hydrated.currency ?? 'XAF';
    hydrated.status = hydrated.status ?? 'recognized';
    hydrated.actor_name = actor ? `${actor.firstName} ${actor.lastName}`.trim() : hydrated.actor_name ?? null;
    hydrated.beneficiary_name = beneficiary ? `${beneficiary.firstName} ${beneficiary.lastName}`.trim() : hydrated.beneficiary_name ?? null;
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

export function prepareInsert(table: string, row: Row): Row {
  return prepareInsertByPolicy(table, row, {
    store,
    getDefaultLiveProvider,
    getPlatformRuleNumber,
  });
}

function ensureConstraints(table: string, rows: Row[]) {
  ensureInsertConstraints(table, rows, store);
}

function recomputeDerivedData() {
  recomputeDerivedDataByPolicy(store, {
    clone,
    compareValues,
    computeBookingFinancials,
    findRow,
    getDaysSince,
    normalizeEscrowStatus,
    normalizeText,
    parseBoolean,
    requireNumberOrFallback,
    syncCourseModerationItems,
    toNumber,
  });
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

function getLinkedStudentIdsForParent(userId: string) {
  return (store.student_guardians ?? [])
    .filter((link) => String(link.parent_id) === String(userId) && String(link.status ?? 'active') === 'active')
    .map((link) => String(link.student_id));
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

function canNotifyUser(actor: AuthUser, targetUserId: string, notificationType?: string) {
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

  return canCreateUserNotification(actor, targetUser, normalizeNotificationType(notificationType), store);
}

function assertAuthenticated(table: string, user: AuthUser | null) {
  if (!user && !canReadWithoutAuth(table)) {
    throw new UnauthorizedException('Authentification requise.');
  }
}

function filterRowsForActor(table: string, rows: Row[], user: AuthUser | null) {
  return filterRowsForActorByPolicy(table, rows, user, {
    findRow,
    findUserById,
    getProviderIdsForUser,
    getInstructorCourseIds,
    getStudentCourseIds,
    getLinkedStudentIdsForParent,
    getLessonIdsForCourses,
    getOwnerProjectIds,
    getTrackedProjectIds,
    getConversationIdsForUser,
  });
}

async function assertTableAccess(
  table: string,
  user: AuthUser | null,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  authService: AuthService,
) {
  assertAuthenticated(table, user);
  const permissionContext = {
    targetType: 'data_table',
    targetId: table,
    httpMethod: method,
    route: `/data/${table}`,
    reason: `data:${table}:${method.toLowerCase()}`,
  } as const;
  if (table === 'admin_reports' && method === 'POST' && user?.role === 'client') {
    await authService.assertPermissionForActor(user, 'support.request', permissionContext);
    return;
  }
  if (user?.role !== 'admin' && ADMIN_ONLY_TABLES.has(table)) {
    throw new UnauthorizedException('Acces refuse.');
  }
  if (!user && method !== 'GET') {
    throw new UnauthorizedException('Authentification requise.');
  }
  if (!user) {
    return;
  }
  const requiredPermission = getRequiredPermissionForTable(table, method);
  if (requiredPermission) {
    await authService.assertPermissionForActor(user, requiredPermission, permissionContext);
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

function normalizeCourseLevel(value: unknown) {
  const normalized = (trimText(value) ?? 'intermediate')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const mapping: Record<string, 'beginner' | 'intermediate' | 'advanced' | 'all_levels'> = {
    beginner: 'beginner',
    debutant: 'beginner',
    debutants: 'beginner',
    intermediate: 'intermediate',
    intermediaire: 'intermediate',
    intermediaires: 'intermediate',
    advanced: 'advanced',
    avance: 'advanced',
    avances: 'advanced',
    all_levels: 'all_levels',
    alllevel: 'all_levels',
    tous_niveaux: 'all_levels',
    tousniveaux: 'all_levels',
  };

  return mapping[normalized] ?? null;
}

function normalizeCourseBranch(value: unknown) {
  const normalized = (trimText(value) ?? 'form_actions')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const mapping: Record<string, 'form_actions' | 'end'> = {
    form_actions: 'form_actions',
    formactions: 'form_actions',
    'form-action': 'form_actions',
    'form actions': 'form_actions',
    postformation: 'form_actions',
    end: 'end',
    ecole_numerique_de_dakar: 'end',
    ecolenumeriquededakar: 'end',
    ecole_numerique: 'end',
    'ecole numerique': 'end',
  };

  return mapping[normalized] ?? null;
}

function getPlatformRuleNumber(ruleId: string, fallback: number) {
  const rule = (store.admin_platform_rules ?? []).find((entry) => String(entry.id) === ruleId);
  return requireNumberOrFallback(rule?.value, fallback);
}

function normalizeBookingRequestType(value: unknown) {
  const requestType = trimText(value) ?? 'booking';
  if (!new Set(['booking', 'quote', 'appointment']).has(requestType)) {
    throw new BadRequestException('Le type de demande est invalide.');
  }
  return requestType as 'booking' | 'quote' | 'appointment';
}

function normalizeBookingStatus(value: unknown, fallback: string) {
  const status = trimText(value) ?? fallback;
  if (!new Set(['pending', 'confirmed', 'in_progress', 'completed', 'declined', 'cancelled']).has(status)) {
    throw new BadRequestException('Le statut de la demande est invalide.');
  }
  return status as 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'declined' | 'cancelled';
}

function getUserActiveSubscription(userId: string) {
  return (store.user_subscriptions ?? []).find(
    (entry) => String(entry.user_id) === String(userId) && String(entry.status) === 'active',
  ) ?? null;
}

const SUBSCRIPTION_REQUIRED_WRITE_TABLES: Record<string, ReadonlySet<string>> = {
  prestataire: new Set(['provider_services']),
  formateur: new Set([
    'courses',
    'course_sections',
    'course_lessons',
    'lesson_assets',
    'virtual_classes',
    'exams',
    'quiz_questions',
    'quiz_choices',
    'course_faq_items',
  ]),
  porteur: new Set([
    'projects',
    'project_milestones',
    'project_documents',
    'project_history',
    'project_funding_rounds',
  ]),
};

function assertSubscriptionRequiredForWrite(table: string, user: AuthUser) {
  if (user.role === 'admin') {
    return;
  }

  if (user.role === 'formateur' && (table === 'lesson_comments' || table === 'submissions')) {
    const activeSubscription = getUserActiveSubscription(user.id);
    if (activeSubscription) {
      return;
    }

    throw new ForbiddenException(
      'Un abonnement formateur actif est requis pour gérer la communauté et corriger les évaluations.',
    );
  }

  const restrictedTables = SUBSCRIPTION_REQUIRED_WRITE_TABLES[user.role];
  if (!restrictedTables || !restrictedTables.has(table)) {
    return;
  }

  const activeSubscription = getUserActiveSubscription(user.id);
  if (activeSubscription) {
    return;
  }

  const defaultPlan = getDefaultPlanForRole(user.role);
  const actionLabel = user.role === 'prestataire'
    ? 'publier ou gérer vos services'
    : user.role === 'formateur'
      ? 'gérer vos formations et classes'
      : 'gérer vos projets et levées';

  throw new ForbiddenException(
    defaultPlan
      ? `Un abonnement actif est requis pour ${actionLabel}. Activez au moins le plan ${String(defaultPlan.name ?? 'de base')}.`
      : `Un abonnement actif est requis pour ${actionLabel}.`,
  );
}

function computeBookingFinancials(price: number | null, providerUserId?: string | null) {
  const subscriptionCommissionRate = providerUserId
    ? requireNumberOrFallback(getUserActiveSubscription(String(providerUserId))?.commission_rate, Number.NaN)
    : Number.NaN;
  const commissionRate = Math.max(
    0,
    Math.min(
      100,
      Number.isFinite(subscriptionCommissionRate)
        ? subscriptionCommissionRate
        : getPlatformRuleNumber('commission_rate', 15),
    ),
  );
  if (price === null) {
    return {
      commissionRate,
      platformFeeAmount: null,
      providerPayoutAmount: null,
    };
  }

  const sanitizedPrice = Math.max(0, Math.round(price));
  const platformFeeAmount = Math.round(sanitizedPrice * (commissionRate / 100));
  const providerPayoutAmount = Math.max(0, sanitizedPrice - platformFeeAmount);
  return {
    commissionRate,
    platformFeeAmount,
    providerPayoutAmount,
  };
}

function addDaysIso(base: string | Date | number, days: number) {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function createSyntheticId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createReference(prefix: string) {
  return `${prefix}-${Date.now()}`;
}

function normalizeEscrowStatus(value: unknown, fallback: string) {
  const status = trimText(value) ?? fallback;
  if (!new Set(['awaiting_quote', 'awaiting_funding', 'funded', 'assigned', 'in_progress', 'delivery_review', 'released', 'refunded', 'cancelled']).has(status)) {
    throw new BadRequestException('Le statut du sequestre est invalide.');
  }
  return status as
    | 'awaiting_quote'
    | 'awaiting_funding'
    | 'funded'
    | 'assigned'
    | 'in_progress'
    | 'delivery_review'
    | 'released'
    | 'refunded'
    | 'cancelled';
}

function getWalletAccountRow(userId: string) {
  return (store.wallet_accounts ?? []).find((row) => String(row.user_id) === String(userId)) ?? null;
}

function getPendingPayoutReservations(userId: string) {
  return (store.payout_requests ?? [])
    .filter((request) => (
      String(request.user_id) === String(userId)
      && new Set(['pending', 'approved']).has(String(request.status))
    ))
    .reduce((sum, request) => sum + Math.max(0, requireNumberOrFallback(request.amount, 0)), 0);
}

function getWalletAvailableBalance(userId: string) {
  const wallet = getWalletAccountRow(userId);
  const balance = requireNumberOrFallback(wallet?.balance, 0);
  return Math.max(0, balance - getPendingPayoutReservations(userId));
}

function findSubscriptionPlan(planId: unknown) {
  const parsedPlanId = requireIdentifier(planId, 'Le plan d abonnement est invalide.');
  const plan = findRow('subscription_plans', parsedPlanId);
  if (!plan) {
    throw new BadRequestException('Le plan d abonnement est introuvable.');
  }
  return { plan, parsedPlanId };
}

function getDefaultPlanForRole(role: string) {
  return (store.subscription_plans ?? []).find(
    (plan) => String(plan.role) === role && requireNumberOrFallback(plan.price_monthly, 0) === 0,
  ) ?? null;
}

function findEscrowByBookingId(bookingId: unknown) {
  return (store.escrow_cases ?? []).find((row) => String(row.booking_id) === String(bookingId)) ?? null;
}

function buildMatchingCandidates(booking: Row) {
  const requestedCategory = normalizeText(booking.requested_category);
  const requestedProviderId = trimText(booking.requested_provider_id);
  const requestedService = normalizeText(booking.service);

  return (store.providers ?? [])
    .map((provider) => {
      let score = 0;
      const reasons: string[] = [];

      if (requestedProviderId && String(provider.id) === requestedProviderId) {
        score += 40;
        reasons.push('Prestataire prefere par le client');
      }
      if (requestedCategory && normalizeText(provider.category) === requestedCategory) {
        score += 25;
        reasons.push('Categorie parfaitement alignee');
      }
      const services = Array.isArray(provider.services) ? provider.services.map((entry) => normalizeText(entry)) : [];
      if (requestedService && services.some((entry) => entry.includes(requestedService) || requestedService.includes(entry))) {
        score += 22;
        reasons.push('Service deja maitrise');
      }
      if (Boolean(provider.verified)) {
        score += 8;
        reasons.push('Profil verifie');
      }
      const rating = requireNumberOrFallback(provider.rating, 0);
      score += Math.round(rating * 3);
      if (rating >= 4.6) {
        reasons.push('Tres bonne note client');
      }
      const completedJobs = requireNumberOrFallback(provider.completed_jobs, 0);
      score += Math.min(15, Math.round(completedJobs / 15));
      const distanceKm = requireNumberOrFallback(provider.distance_km, 99);
      score += Math.max(0, 10 - Math.round(distanceKm));
      if (distanceKm <= 5) {
        reasons.push('Proximite logistique');
      }
      const availability = String(provider.availability_status ?? '');
      if (availability === 'today') {
        score += 8;
        reasons.push('Disponible rapidement');
      } else if (availability === 'tomorrow') {
        score += 4;
      }

      return {
        id: provider.id,
        user_id: provider.user_id ?? null,
        name: provider.name,
        category: provider.category ?? null,
        verified: Boolean(provider.verified),
        rating,
        distance_km: distanceKm,
        availability_status: availability || null,
        completed_jobs: completedJobs,
        score,
        reasons: reasons.slice(0, 3),
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 3);
}

function sanitizeBookingCreateRecord(row: Row, user: AuthUser) {
  if (user.role !== 'client' || String(row.client_id ?? user.id) !== user.id) {
    throw new UnauthorizedException('Acces refuse.');
  }

  const bookingDate = requireText(row.booking_date, 'La date souhaitee est obligatoire.');
  ensureFutureDateString(bookingDate, 'La date souhaitee doit etre dans le futur.');
  const bookingTime = trimText(row.booking_time) ?? '09:00';
  const price = row.price === null || row.price === undefined ? null : requireNumberInRange(row.price, 0, 100_000_000, 'Le budget est invalide.');
  const requestedProviderId = trimText(row.requested_provider_id ?? row.provider_id);
  const requestedProvider = requestedProviderId ? findRow('providers', requestedProviderId) : null;
  const financials = computeBookingFinancials(price, trimText(requestedProvider?.user_id));

  return {
    ...row,
    client_id: user.id,
    client_name: `${user.firstName} ${user.lastName}`.trim(),
    client_email: user.email ?? trimText(row.client_email),
    provider_id: null,
    requested_provider_id: requestedProvider ? requestedProvider.id : requestedProviderId,
    requested_provider_name: requestedProvider?.name ?? null,
    requested_category: trimText(row.requested_category) ?? trimText(requestedProvider?.category),
    service: requireText(row.service, 'Le service souhaite est obligatoire.'),
    description: requireText(row.description, 'La description du besoin est obligatoire.'),
    address: requireText(row.address, 'L adresse ou le lieu d intervention est obligatoire.'),
    booking_date: bookingDate,
    booking_time: bookingTime,
    request_type: normalizeBookingRequestType(row.request_type),
    payment_method: trimText(row.payment_method) ?? 'wallet',
    status: 'pending',
    request_channel: 'c2p_managed',
    assignment_status: 'pending_review',
    assigned_by_c2p: null,
    assigned_at: null,
    wallet_flow: 'escrow',
    price,
    commission_rate: financials.commissionRate,
    platform_fee_amount: financials.platformFeeAmount,
    provider_payout_amount: financials.providerPayoutAmount,
  };
}

function sanitizeBookingUpdateRecord(existingRow: Row, payload: Row, user: AuthUser) {
  const currentStatus = normalizeBookingStatus(existingRow.status, 'pending');
  const nextStatus = normalizeBookingStatus(payload.status, currentStatus);

  if (user.role === 'client') {
    if (String(existingRow.client_id) !== user.id) {
      throw new UnauthorizedException('Acces refuse.');
    }
    if (nextStatus !== 'cancelled') {
      throw new UnauthorizedException('Le client ne peut qu annuler sa demande.');
    }
    if (!new Set(['pending', 'confirmed']).has(currentStatus)) {
      throw new BadRequestException('Cette demande ne peut plus etre annulee.');
    }
    return {
      status: 'cancelled',
      cancellation_reason: trimText(payload.cancellation_reason) ?? 'Annulation client',
      cancelled_at: new Date().toISOString(),
    };
  }

  if (user.role === 'prestataire') {
    const currentProviderId = String(existingRow.provider_id ?? '');
    const providerIds = getProviderIdsForUser(user.id);
    if (!providerIds.includes(currentProviderId)) {
      throw new UnauthorizedException('Acces refuse.');
    }

    const allowedTransitions = new Map<string, string[]>([
      ['confirmed', ['in_progress', 'declined']],
      ['in_progress', ['completed']],
      ['completed', []],
      ['declined', []],
      ['pending', []],
      ['cancelled', []],
    ]);

    const allowedNextStatuses = allowedTransitions.get(currentStatus) ?? [];
    if (!allowedNextStatuses.includes(nextStatus)) {
      throw new BadRequestException('Transition de mission invalide.');
    }

    return {
      status: nextStatus,
      provider_progress_note: trimText(payload.provider_progress_note) ?? trimText(existingRow.provider_progress_note),
    };
  }

  if (user.role === 'admin') {
    const providerIdCandidate = payload.provider_id === null
      ? null
      : payload.provider_id !== undefined
        ? toNumber(payload.provider_id)
        : toNumber(existingRow.provider_id);

    if (payload.provider_id !== undefined && payload.provider_id !== null && providerIdCandidate === null) {
      throw new BadRequestException('Le prestataire assigne est invalide.');
    }

    const assignedProvider = providerIdCandidate !== null ? findRow('providers', providerIdCandidate) : null;
    if (providerIdCandidate !== null && !assignedProvider) {
      throw new BadRequestException('Le prestataire assigne est introuvable.');
    }

    const nextPrice = payload.price === undefined
      ? (existingRow.price === null || existingRow.price === undefined ? null : requireNumberInRange(existingRow.price, 0, 100_000_000, 'Le montant est invalide.'))
      : (payload.price === null ? null : requireNumberInRange(payload.price, 0, 100_000_000, 'Le montant est invalide.'));
    const financials = computeBookingFinancials(nextPrice, trimText(assignedProvider?.user_id) ?? trimText(findRow('providers', existingRow.provider_id)?.user_id));

    return {
      provider_id: assignedProvider?.id ?? null,
      requested_provider_id: payload.requested_provider_id ?? existingRow.requested_provider_id ?? null,
      requested_provider_name: payload.requested_provider_name ?? existingRow.requested_provider_name ?? null,
      status: nextStatus,
      assignment_status: assignedProvider ? 'assigned' : 'pending_review',
      assigned_by_c2p: assignedProvider ? user.id : null,
      assigned_at: assignedProvider ? (trimText(payload.assigned_at) ?? new Date().toISOString()) : null,
      c2p_note: trimText(payload.c2p_note) ?? trimText(existingRow.c2p_note),
      payment_method: trimText(payload.payment_method) ?? trimText(existingRow.payment_method) ?? 'wallet',
      price: nextPrice,
      commission_rate: financials.commissionRate,
      platform_fee_amount: financials.platformFeeAmount,
      provider_payout_amount: financials.providerPayoutAmount,
      wallet_flow: trimText(payload.wallet_flow) ?? trimText(existingRow.wallet_flow) ?? 'escrow',
      request_channel: trimText(payload.request_channel) ?? trimText(existingRow.request_channel) ?? 'c2p_managed',
    };
  }

  throw new UnauthorizedException('Acces refuse.');
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
  normalized.level = normalizeCourseLevel(normalized.level);
  if (!normalized.level) {
    throw new BadRequestException('Le niveau de la formation est invalide.');
  }
  normalized.program_branch = normalizeCourseBranch(normalized.program_branch) ?? 'form_actions';
  normalized.delivery_mode = trimText(normalized.delivery_mode) ?? 'online';
  if (!new Set(['online', 'onsite', 'hybrid']).has(String(normalized.delivery_mode))) {
    throw new BadRequestException('La modalite de la formation est invalide.');
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
    const requestedInstructorId = trimText(normalized.instructor_id);
    if (requestedInstructorId && requestedInstructorId !== user.id) {
      throw new UnauthorizedException('Acces refuse.');
    }
    normalized.instructor_id = user.id;
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

export function sanitizePayoutAccountRecord(row: Row, user: AuthUser) {
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

export function sanitizePayoutRequestRecord(row: Row, user: AuthUser) {
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
  if (!existing && user.role !== 'admin' && requireNumberOrFallback(normalized.amount, 0) > getWalletAvailableBalance(targetUserId)) {
    throw new BadRequestException('Le montant demande depasse le solde disponible pour retrait.');
  }
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

export function sanitizeUserSubscriptionRecord(row: Row, user: AuthUser) {
  const normalized = clone(row);
  const existing = normalized.id !== undefined && normalized.id !== null ? findRow('user_subscriptions', normalized.id) : null;
  const targetUserId = user.role === 'admin'
    ? requireIdentifier(normalized.user_id ?? existing?.user_id, 'Le titulaire de l abonnement est invalide.')
    : user.id;

  if (user.role !== 'admin' && existing && String(existing.user_id) !== user.id) {
    throw new UnauthorizedException('Acces refuse.');
  }

  const targetUser = findUserById(targetUserId);
  if (!targetUser) {
    throw new BadRequestException('Le titulaire de l abonnement est introuvable.');
  }
  if (!new Set(['prestataire', 'formateur', 'porteur', 'partenaire']).has(targetUser.role)) {
    throw new BadRequestException('Ce role ne peut pas souscrire a un abonnement SaaS.');
  }

  const { plan, parsedPlanId } = findSubscriptionPlan(normalized.plan_id ?? existing?.plan_id);
  if (!Boolean(plan.active ?? true)) {
    throw new BadRequestException('Ce plan d abonnement n est plus disponible.');
  }

  if (user.role !== 'admin' && String(plan.role) !== targetUser.role) {
    throw new UnauthorizedException('Ce plan ne correspond pas a votre role.');
  }

  const nowIso = new Date().toISOString();
  const renewNow = parseBoolean(normalized.renew_now, false);
  const planChanged = existing ? String(existing.plan_id) !== parsedPlanId : true;
  const allowedStatuses = new Set(['trialing', 'active', 'past_due', 'expired', 'cancelled']);
  const requestedStatus = trimText(normalized.status) ?? trimText(existing?.status) ?? 'active';
  const requiresCharge = user.role !== 'admin' && requestedStatus !== 'cancelled' && (!existing || renewNow || planChanged);
  if (!allowedStatuses.has(requestedStatus)) {
    throw new BadRequestException('Le statut de l abonnement est invalide.');
  }

  normalized.user_id = targetUserId;
  normalized.role = String(plan.role);
  normalized.plan_id = parsedPlanId;
  normalized.plan_name = String(plan.name);
  normalized.currency = String(plan.currency ?? 'XAF');
  normalized.amount = requireNumberOrFallback(plan.price_monthly, 0);
  normalized.commission_rate = requireNumberOrFallback(plan.commission_rate, 0);
  normalized.auto_renew = parseBoolean(normalized.auto_renew, existing ? Boolean(existing.auto_renew) : true);
  if (requiresCharge && requireNumberOrFallback(normalized.amount, 0) > getWalletAvailableBalance(targetUserId)) {
    throw new BadRequestException('Solde insuffisant pour activer ou renouveler cet abonnement.');
  }

  if (user.role === 'admin') {
    normalized.status = requestedStatus;
    normalized.started_at = trimText(normalized.started_at) ?? trimText(existing?.started_at) ?? nowIso;
    normalized.renews_at = trimText(normalized.renews_at) ?? trimText(existing?.renews_at) ?? addDaysIso(nowIso, 30);
    normalized.last_billed_at = trimText(normalized.last_billed_at) ?? trimText(existing?.last_billed_at) ?? nowIso;
  } else if (requestedStatus === 'cancelled') {
    normalized.status = 'cancelled';
    normalized.started_at = trimText(existing?.started_at) ?? nowIso;
    normalized.renews_at = trimText(existing?.renews_at) ?? addDaysIso(nowIso, 30);
    normalized.last_billed_at = trimText(existing?.last_billed_at) ?? nowIso;
  } else {
    const billingAnchor = existing && !planChanged && !renewNow && trimText(existing.renews_at)
      ? String(existing.renews_at)
      : nowIso;
    normalized.status = 'active';
    normalized.started_at = trimText(existing?.started_at) ?? nowIso;
    normalized.renews_at = addDaysIso(billingAnchor, 30);
    normalized.last_billed_at = nowIso;
  }

  delete normalized.renew_now;
  return normalized;
}

function sanitizeProviderVerificationRequestRecord(row: Row, user: AuthUser) {
  const normalized = clone(row);
  const existing = normalized.id !== undefined && normalized.id !== null ? findRow('provider_verification_requests', normalized.id) : null;
  const providerId = requireIdentifier(normalized.provider_id ?? existing?.provider_id, 'Le prestataire associe est invalide.');
  const provider = findRow('providers', providerId);
  if (!provider) {
    throw new BadRequestException('Le prestataire associe est introuvable.');
  }

  const ownerUserId = String(provider.user_id ?? existing?.user_id ?? normalized.user_id ?? '');
  if (!ownerUserId) {
    throw new BadRequestException('Le titulaire du prestataire est introuvable.');
  }

  if (user.role !== 'admin') {
    if (user.role !== 'prestataire' || ownerUserId !== user.id) {
      throw new UnauthorizedException('Acces refuse.');
    }
    if (existing && String(existing.user_id ?? '') !== user.id) {
      throw new UnauthorizedException('Acces refuse.');
    }
  }

  const nowIso = new Date().toISOString();
  const activePass = [...(store.provider_visibility_passes ?? [])]
    .filter((pass) =>
      String(pass.provider_id) === providerId
      && String(pass.user_id ?? '') === ownerUserId
      && String(pass.status ?? '') === 'active'
      && parseBoolean(pass.verification_eligible, false),
    )
    .sort((left, right) => compareValues(right.issued_at ?? right.created_at, left.issued_at ?? left.created_at))
    .find((pass) => {
      if (!pass.expires_at) return true;
      const expiresAt = Date.parse(String(pass.expires_at));
      return Number.isNaN(expiresAt) || expiresAt >= Date.now();
    });

  if (user.role !== 'admin' && !activePass) {
    throw new BadRequestException('Un billet SenPresta eligible est requis avant la demande de verification.');
  }

  const currentStatus = trimText(existing?.status) ?? 'pending';
  const requestedStatus = trimText(normalized.status) ?? currentStatus;
  const allowedStatuses = new Set(['pending', 'in_review', 'approved', 'rejected', 'cancelled']);
  if (!allowedStatuses.has(requestedStatus)) {
    throw new BadRequestException('Le statut de la demande de verification est invalide.');
  }

  normalized.provider_id = providerId;
  normalized.provider_name = trimText(normalized.provider_name) ?? trimText(provider.name) ?? trimText(provider.public_alias) ?? `Prestataire #${providerId}`;
  normalized.user_id = ownerUserId;
  normalized.requested_level = 'verified';
  normalized.pass_id = trimText(existing?.pass_id) ?? trimText(normalized.pass_id) ?? trimText(activePass?.id);
  normalized.pass_code = trimText(existing?.pass_code) ?? trimText(normalized.pass_code) ?? trimText(activePass?.code);
  normalized.pass_tier = trimText(existing?.pass_tier) ?? trimText(normalized.pass_tier) ?? trimText(activePass?.pass_tier) ?? null;
  normalized.source = trimText(existing?.source) ?? trimText(normalized.source) ?? 'self_service';
  normalized.note = trimText(normalized.note) ?? trimText(existing?.note) ?? '';

  if (String(normalized.note).length > 1200) {
    throw new BadRequestException('La note de verification est trop longue.');
  }

  if (user.role === 'admin') {
    normalized.status = requestedStatus;
    normalized.admin_notes = trimText(normalized.admin_notes) ?? trimText(existing?.admin_notes);
    if (normalized.admin_notes && String(normalized.admin_notes).length > 1200) {
      throw new BadRequestException('La note administrateur est trop longue.');
    }

    if (requestedStatus === 'pending') {
      normalized.reviewed_at = null;
      normalized.reviewed_by = null;
    } else if (requestedStatus === 'in_review') {
      normalized.reviewed_at = existing?.reviewed_at ?? null;
      normalized.reviewed_by = user.id;
    } else {
      normalized.reviewed_at = new Date().toISOString();
      normalized.reviewed_by = user.id;
    }
  } else {
    normalized.status = !existing
      ? 'pending'
      : currentStatus === 'pending' && requestedStatus === 'cancelled'
        ? 'cancelled'
        : currentStatus;
    normalized.reviewed_at = existing?.reviewed_at ?? null;
    normalized.reviewed_by = existing?.reviewed_by ?? null;
    normalized.admin_notes = existing?.admin_notes ?? null;
  }

  normalized.requested_at = trimText(existing?.requested_at) ?? nowIso;
  return normalized;
}

function sanitizeEscrowCaseRecord(row: Row, user: AuthUser) {
  if (user.role !== 'admin') {
    throw new UnauthorizedException('Acces refuse.');
  }

  const normalized = clone(row);
  const existing = normalized.id !== undefined && normalized.id !== null ? findRow('escrow_cases', normalized.id) : null;
  const bookingId = requireIdentifier(normalized.booking_id ?? existing?.booking_id, 'La mission associee est invalide.');
  const booking = findRow('bookings', bookingId);
  if (!booking) {
    throw new BadRequestException('La mission associee est introuvable.');
  }

  const currentStatus = normalizeEscrowStatus(existing?.status, booking.price ? 'awaiting_funding' : 'awaiting_quote');
  const nextStatus = normalizeEscrowStatus(normalized.status, currentStatus);
  const allowedTransitions = new Map<string, string[]>([
    ['awaiting_quote', ['awaiting_funding', 'cancelled']],
    ['awaiting_funding', ['funded', 'cancelled', 'refunded']],
    ['funded', ['assigned', 'refunded', 'cancelled']],
    ['assigned', ['in_progress', 'refunded', 'cancelled']],
    ['in_progress', ['delivery_review', 'refunded']],
    ['delivery_review', ['released', 'refunded']],
    ['released', []],
    ['refunded', []],
    ['cancelled', []],
  ]);

  if (existing && nextStatus !== currentStatus && !(allowedTransitions.get(currentStatus) ?? []).includes(nextStatus)) {
    throw new BadRequestException('Transition de sequestre invalide.');
  }

  const provider = findRow('providers', normalized.provider_id ?? existing?.provider_id ?? booking.provider_id ?? normalized.requested_provider_id ?? existing?.requested_provider_id ?? booking.requested_provider_id);
  normalized.booking_id = booking.id;
  normalized.client_id = booking.client_id;
  normalized.provider_id = provider?.id ?? booking.provider_id ?? existing?.provider_id ?? null;
  normalized.provider_user_id = provider?.user_id ?? existing?.provider_user_id ?? null;
  normalized.requested_provider_id = normalized.requested_provider_id ?? existing?.requested_provider_id ?? booking.requested_provider_id ?? null;
  normalized.service = booking.service ?? existing?.service ?? null;
  normalized.currency = trimText(normalized.currency) ?? trimText(existing?.currency) ?? 'XAF';
  normalized.amount_total = requireNumberOrFallback(normalized.amount_total, requireNumberOrFallback(booking.price, 0));
  normalized.platform_fee_amount = requireNumberOrFallback(normalized.platform_fee_amount, requireNumberOrFallback(booking.platform_fee_amount, 0));
  normalized.provider_amount = requireNumberOrFallback(normalized.provider_amount, requireNumberOrFallback(booking.provider_payout_amount, 0));
  normalized.status = nextStatus;
  normalized.note = trimText(normalized.note) ?? trimText(existing?.note);
  normalized.funded_at = nextStatus === 'funded' || nextStatus === 'assigned' || nextStatus === 'in_progress' || nextStatus === 'delivery_review' || nextStatus === 'released'
    ? trimText(normalized.funded_at) ?? trimText(existing?.funded_at) ?? new Date().toISOString()
    : trimText(existing?.funded_at);
  normalized.released_at = nextStatus === 'released'
    ? trimText(normalized.released_at) ?? new Date().toISOString()
    : trimText(existing?.released_at);
  normalized.refunded_at = nextStatus === 'refunded'
    ? trimText(normalized.refunded_at) ?? new Date().toISOString()
    : trimText(existing?.refunded_at);
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

function sanitizeLessonProgressRecord(row: Row, user: AuthUser) {
  const normalized = clone(row);
  const existing = normalized.id !== undefined && normalized.id !== null ? findRow('lesson_progress', normalized.id) : null;
  const parsedLessonId = requireIdentifier(normalized.lesson_id ?? existing?.lesson_id, 'La lecon associee est invalide.');
  const lesson = findRow('course_lessons', parsedLessonId);
  if (!lesson) {
    throw new BadRequestException('La lecon associee est introuvable.');
  }
  const parsedSectionId = requireIdentifier(lesson.section_id, 'La section associee est invalide.');
  const parsedCourseId = requireIdentifier(lesson.course_id, 'La formation associee est invalide.');
  const course = findRow('courses', parsedCourseId);
  if (!course) {
    throw new BadRequestException('La formation associee est introuvable.');
  }

  const targetStudentId = requireIdentifier(normalized.student_id ?? existing?.student_id ?? user.id, 'L apprenant associe est invalide.');
  if (user.role !== 'admin') {
    if (user.role !== 'apprenant') {
      throw new UnauthorizedException('Acces refuse.');
    }
    if (targetStudentId !== user.id) {
      throw new UnauthorizedException('Acces refuse.');
    }
    if (!getStudentCourseIds(user.id).includes(parsedCourseId)) {
      throw new UnauthorizedException('Inscription requise.');
    }
  }

  const requestedProgress = toNumber(normalized.progress);
  if (requestedProgress !== null && (requestedProgress < 0 || requestedProgress > 100)) {
    throw new BadRequestException('La progression de la lecon est invalide.');
  }

  const completed = parseBoolean(
    normalized.completed,
    parseBoolean(existing?.completed, false) || (requestedProgress ?? requireNumberOrFallback(existing?.progress, 0)) >= 100,
  );
  const progress = completed
    ? 100
    : Math.round(
        Math.max(
          0,
          Math.min(
            100,
            requestedProgress ?? requireNumberOrFallback(existing?.progress, 0),
          ),
        ),
      );

  normalized.course_id = parsedCourseId;
  normalized.section_id = parsedSectionId;
  normalized.lesson_id = parsedLessonId;
  normalized.course_name = String(course.title);
  normalized.lesson_title = String(lesson.title);
  normalized.student_id = targetStudentId;
  normalized.student_name = existing?.student_name ?? `${user.firstName} ${user.lastName}`.trim();
  normalized.progress = progress;
  normalized.completed = completed;
  normalized.status = completed ? 'completed' : (progress > 0 ? 'in_progress' : 'not_started');
  normalized.first_viewed_at = trimText(existing?.first_viewed_at) ?? new Date().toISOString();
  normalized.last_viewed_at = new Date().toISOString();
  normalized.completed_at = completed ? trimText(existing?.completed_at) ?? new Date().toISOString() : null;
  return normalized;
}

function sanitizeCourseReviewRecord(row: Row, user: AuthUser) {
  const normalized = clone(row);
  const existing = normalized.id !== undefined && normalized.id !== null ? findRow('course_reviews', normalized.id) : null;
  const parsedCourseId = requireIdentifier(normalized.course_id ?? existing?.course_id, 'La formation associee est invalide.');
  const course = findRow('courses', parsedCourseId);
  if (!course) {
    throw new BadRequestException('La formation associee est introuvable.');
  }

  const targetStudentId = requireIdentifier(normalized.student_id ?? existing?.student_id ?? user.id, 'L apprenant associe est invalide.');
  if (user.role !== 'admin') {
    if (user.role !== 'apprenant') {
      throw new UnauthorizedException('Acces refuse.');
    }
    if (targetStudentId !== user.id) {
      throw new UnauthorizedException('Acces refuse.');
    }
    if (existing && String(existing.student_id) !== user.id) {
      throw new UnauthorizedException('Acces refuse.');
    }
    const enrollment = (store.course_enrollments ?? []).find(
      (entry) =>
        String(entry.student_id) === user.id &&
        String(entry.course_id) === parsedCourseId,
    );
    if (!enrollment) {
      throw new UnauthorizedException('Inscription requise.');
    }
    const progress = toNumber(enrollment.progress) ?? 0;
    if (progress <= 0 && String(enrollment.status) !== 'completed') {
      throw new BadRequestException('Suivez au moins une lecon avant de publier un avis.');
    }
  }

  normalized.course_id = parsedCourseId;
  normalized.course_name = String(course.title);
  normalized.student_id = targetStudentId;
  normalized.student_name = existing?.student_name ?? `${user.firstName} ${user.lastName}`.trim();
  normalized.student_avatar = trimText(existing?.student_avatar) ?? trimText(user.avatar);
  normalized.rating = requireInteger(normalized.rating ?? existing?.rating, 1, 5, 'La note doit etre comprise entre 1 et 5.');
  normalized.comment = requireText(normalized.comment ?? existing?.comment, 'Le commentaire de l avis est obligatoire.');
  normalized.status = trimText(normalized.status) ?? trimText(existing?.status) ?? 'published';
  if (!new Set(['published', 'hidden']).has(String(normalized.status))) {
    throw new BadRequestException('Le statut de l avis est invalide.');
  }
  if (user.role !== 'admin') {
    normalized.status = 'published';
  }
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

function sanitizeConversationCreateRecord(row: Row, user: AuthUser) {
  const normalized = sanitizeConversationParticipants(user, row.participants, findUserById);
  if (!normalized) {
    throw new UnauthorizedException('Acces refuse.');
  }

  return {
    name: normalized.conversationName,
    role: normalized.conversationRole,
    avatar: normalized.conversationAvatar,
    participants: normalized.participants,
    type: 'individual',
    members: 2,
  };
}

function sanitizeMessageCreateRecord(row: Row, user: AuthUser) {
  if (String(row.sender_id) !== user.id) {
    throw new UnauthorizedException('Acces refuse.');
  }

  const conversation = findRow('conversations', row.conversation_id);
  if (!conversation || !isConversationAllowedForActor(user, conversation.participants, findUserById)) {
    throw new UnauthorizedException('Acces refuse.');
  }

  const attachments = Array.isArray(row.attachments) ? row.attachments : [];
  const content = trimText(row.content);
  if (!content && attachments.length === 0) {
    throw new BadRequestException('Le message est obligatoire.');
  }

  return {
    conversation_id: conversation.id,
    sender_id: user.id,
    sender_name: `${user.firstName} ${user.lastName}`.trim(),
    sender_avatar: user.avatar ?? null,
    content: content ?? '',
    attachments,
    read: false,
  };
}

function sanitizeUpdatePayload(table: string, existingRow: Row, payload: Row, user: AuthUser) {
  assertSubscriptionRequiredForWrite(table, user);
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
    case 'user_subscriptions':
      return sanitizeUserSubscriptionRecord({ ...existingRow, ...payload }, user);
    case 'provider_verification_requests':
      return sanitizeProviderVerificationRequestRecord({ ...existingRow, ...payload }, user);
    case 'escrow_cases':
      return sanitizeEscrowCaseRecord({ ...existingRow, ...payload }, user);
    case 'lesson_comments':
      return sanitizeLessonCommentRecord({ ...existingRow, ...payload }, user);
    case 'lesson_progress':
      return sanitizeLessonProgressRecord({ ...existingRow, ...payload }, user);
    case 'course_reviews':
      return sanitizeCourseReviewRecord({ ...existingRow, ...payload }, user);
    case 'course_faq_items':
      return sanitizeCourseFaqRecord({ ...existingRow, ...payload }, user);
    case 'conversations':
      if (!isConversationAllowedForActor(user, existingRow.participants, findUserById)) {
        throw new UnauthorizedException('Acces refuse.');
      }
      return {
        updated_at: payload.updated_at ?? new Date().toISOString(),
      };
    case 'messages':
      if (!isConversationAllowedForActor(user, findRow('conversations', existingRow.conversation_id)?.participants, findUserById)) {
        throw new UnauthorizedException('Acces refuse.');
      }
      if (String(existingRow.sender_id) === user.id) {
        throw new UnauthorizedException('Acces refuse.');
      }
      return {
        read: payload.read === true,
      };
    case 'bookings':
      return sanitizeBookingUpdateRecord(existingRow, payload, user);
    default:
      return payload;
  }
}

function sanitizeCreatePayload(table: string, row: Row, user: AuthUser) {
  const providerIds = getProviderIdsForUser(user.id);
  const ownerProjectIds = getOwnerProjectIds(user.id);
  const courseIds = getInstructorCourseIds(user.id);
  assertSubscriptionRequiredForWrite(table, user);

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
      if (user.role !== 'admin' && !new Set(['formateur', 'prestataire', 'porteur']).has(user.role)) throw new UnauthorizedException('Acces refuse.');
      return sanitizePayoutAccountRecord(row, user);
    case 'payout_requests':
      if (user.role !== 'admin' && !new Set(['formateur', 'prestataire', 'porteur']).has(user.role)) throw new UnauthorizedException('Acces refuse.');
      return sanitizePayoutRequestRecord(row, user);
    case 'user_subscriptions':
      if (user.role !== 'admin' && !new Set(['formateur', 'prestataire', 'porteur', 'partenaire']).has(user.role)) throw new UnauthorizedException('Acces refuse.');
      return sanitizeUserSubscriptionRecord(row, user);
    case 'provider_verification_requests':
      if (user.role !== 'admin' && user.role !== 'prestataire') throw new UnauthorizedException('Acces refuse.');
      return sanitizeProviderVerificationRequestRecord(row, user);
    case 'escrow_cases':
      if (user.role !== 'admin') throw new UnauthorizedException('Acces refuse.');
      return sanitizeEscrowCaseRecord(row, user);
    case 'lesson_comments':
      if (!new Set(['admin', 'formateur', 'apprenant']).has(user.role)) throw new UnauthorizedException('Acces refuse.');
      return sanitizeLessonCommentRecord(row, user);
    case 'lesson_progress':
      if (!new Set(['admin', 'apprenant']).has(user.role)) throw new UnauthorizedException('Acces refuse.');
      return sanitizeLessonProgressRecord(row, user);
    case 'course_reviews':
      if (!new Set(['admin', 'apprenant']).has(user.role)) throw new UnauthorizedException('Acces refuse.');
      return sanitizeCourseReviewRecord(row, user);
    case 'course_faq_items':
      if (user.role !== 'admin' && user.role !== 'formateur') throw new UnauthorizedException('Acces refuse.');
      return sanitizeCourseFaqRecord(row, user);
    case 'notifications': {
      const targetUserId = String(row.user_id ?? '');
      const notificationType = normalizeNotificationType(row.type);
      if (!canNotifyUser(user, targetUserId, notificationType)) {
        throw new UnauthorizedException('Acces refuse.');
      }
      return {
        ...row,
        type: notificationType,
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
      return sanitizeBookingCreateRecord(row, user);
    case 'client_orders':
    case 'client_favorites':
      if (user.role !== 'client' || String(row.client_id) !== user.id) throw new UnauthorizedException('Acces refuse.');
      return row;
    case 'provider_reviews':
      if (user.role !== 'client' || String(row.client_id) !== user.id) throw new UnauthorizedException('Acces refuse.');
      return row;
    case 'admin_reports':
      if (user.role !== 'admin' && user.role !== 'client') throw new UnauthorizedException('Acces refuse.');
      return {
        reporter: `${user.firstName} ${user.lastName}`.trim(),
        reporter_id: user.id,
        reported: requireText(row.reported, 'La cible du signalement est obligatoire.'),
        target_id: trimText(row.target_id),
        target_table: trimText(row.target_table),
        type: requireText(row.type, 'Le type du signalement est obligatoire.'),
        reason: requireText(row.reason, 'Le motif du signalement est obligatoire.'),
        description: requireText(row.description, 'La description du signalement est obligatoire.'),
        priority: ['high', 'medium', 'low'].includes(String(row.priority)) ? row.priority : 'medium',
        status: 'pending',
        adminAction: null,
        date: row.date ?? new Date().toISOString(),
        source: 'client_dashboard',
      };
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
      return sanitizeConversationCreateRecord(row, user);
    case 'messages':
      return sanitizeMessageCreateRecord(row, user);
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

export function mergeRowsToPersist(target: Record<string, Row[]>, table: string, rows: Row[]) {
  if (rows.length === 0) return;
  target[table] = [...(target[table] ?? []), ...rows.map((row) => clone(row))];
}

export function collectRowsByIds(table: string, ids: Array<string | number>) {
  const allowed = new Set(ids.map(String));
  return listAppRows(table).filter((row) => allowed.has(String(row.id)));
}

export function ensureWalletAccount(userId: string, rowsToPersist: Record<string, Row[]>) {
  const existing = getWalletAccountRow(userId);
  if (existing) return existing;

  const created = withId(prepareInsert('wallet_accounts', {
    id: createSyntheticId('wallet'),
    user_id: userId,
    balance: 0,
    currency: 'XAF',
  }));
  appendAppRows('wallet_accounts', [created]);
  mergeRowsToPersist(rowsToPersist, 'wallet_accounts', collectRowsByIds('wallet_accounts', [String(created.id)]));
  return findRow('wallet_accounts', created.id) ?? created;
}

function createFinanceSideEffectsContext(): FinanceSideEffectsContext {
  return {
    store,
    clone,
    withId,
    prepareInsert,
    createSyntheticId,
    createReference,
    appendAppRows,
    patchAppRows,
    mergeRowsToPersist,
    collectRowsByIds,
    ensureWalletAccount,
    findRow,
    findEscrowByBookingId: (bookingId) => findEscrowByBookingId(bookingId) ?? undefined,
    requireNumberOrFallback,
    trimText,
  };
}

function createProviderVisibilityContext() {
  return {
    store,
    findRow,
    appendAppRows,
    patchAppRows,
    mergeRowsToPersist,
    collectRowsByIds,
  };
}

function appendPaymentTransaction(
  rowsToPersist: Record<string, Row[]>,
  payload: Row,
) {
  const existing = (
    (payload.id !== undefined ? findRow('payment_transactions', payload.id) : null)
    ?? ((payload.financial_operation_id
      ? (store.payment_transactions ?? []).find((row) => String(row.financial_operation_id ?? '') === String(payload.financial_operation_id))
      : null) ?? null)
  );

  if (existing) {
    patchAppRows('payment_transactions', (row) => String(row.id) === String(existing.id), {
      ...existing,
      ...payload,
      currency: payload.currency ?? existing.currency ?? 'XAF',
      status: payload.status ?? existing.status ?? 'completed',
      date: payload.date ?? existing.date ?? new Date().toISOString(),
      reference: payload.reference ?? existing.reference ?? createReference('REF'),
      updated_at: new Date().toISOString(),
    });
    mergeRowsToPersist(rowsToPersist, 'payment_transactions', collectRowsByIds('payment_transactions', [String(existing.id)]));
    return findRow('payment_transactions', existing.id) ?? existing;
  }

  const transaction = withId(prepareInsert('payment_transactions', {
    id: payload.id ?? createReference('TRX'),
    currency: 'XAF',
    status: 'completed',
    date: new Date().toISOString(),
    reference: createReference('REF'),
    ...payload,
  }));
  appendAppRows('payment_transactions', [transaction]);
  mergeRowsToPersist(rowsToPersist, 'payment_transactions', collectRowsByIds('payment_transactions', [String(transaction.id)]));
  return findRow('payment_transactions', transaction.id) ?? transaction;
}

function appendCommissionEntry(
  rowsToPersist: Record<string, Row[]>,
  payload: Row,
) {
  const existing = (
    (payload.id !== undefined ? findRow('commission_ledger', payload.id) : null)
    ?? ((payload.financial_operation_id
      ? (store.commission_ledger ?? []).find((row) => String(row.financial_operation_id ?? '') === String(payload.financial_operation_id))
      : null) ?? null)
  );

  if (existing) {
    patchAppRows('commission_ledger', (row) => String(row.id) === String(existing.id), {
      ...existing,
      ...payload,
      currency: payload.currency ?? existing.currency ?? 'XAF',
      status: payload.status ?? existing.status ?? 'recognized',
      recognized_at: payload.recognized_at ?? existing.recognized_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    mergeRowsToPersist(rowsToPersist, 'commission_ledger', collectRowsByIds('commission_ledger', [String(existing.id)]));
    return findRow('commission_ledger', existing.id) ?? existing;
  }

  const entry = withId(prepareInsert('commission_ledger', {
    id: payload.id ?? createSyntheticId('com'),
    currency: 'XAF',
    status: 'recognized',
    recognized_at: new Date().toISOString(),
    beneficiary_user_id: 'usr-admin',
    ...payload,
  }));
  appendAppRows('commission_ledger', [entry]);
  mergeRowsToPersist(rowsToPersist, 'commission_ledger', collectRowsByIds('commission_ledger', [String(entry.id)]));
  return findRow('commission_ledger', entry.id) ?? entry;
}

export function createWalletMutationHooks(rowsToPersist: Record<string, Row[]>) {
  return {
    syncWalletRow(wallet: Row) {
      mergeRowsToPersist(rowsToPersist, 'wallet_accounts', collectRowsByIds('wallet_accounts', [String(wallet.id)]));
    },
    appendPaymentTransaction(payload: Row) {
      return appendPaymentTransaction(rowsToPersist, payload);
    },
    appendCommissionEntry(payload: Row) {
      return appendCommissionEntry(rowsToPersist, payload);
    },
  };
}

async function applyBookingCreateSideEffects(
  bookings: Row[],
  rowsToPersist: Record<string, Row[]>,
  outboxEvents: OutboxEventInput[],
  walletService: WalletService,
  actorId?: string | null,
) {
  return applyBookingCreateSideEffectsByPolicy(
    bookings,
    rowsToPersist,
    outboxEvents,
    walletService,
    actorId,
    createFinanceSideEffectsContext(),
  );
}

async function applyBookingUpdateSideEffects(
  previousRows: Row[],
  updatedRows: Row[],
  rowsToPersist: Record<string, Row[]>,
  outboxEvents: OutboxEventInput[],
  walletService: WalletService,
  actorId?: string | null,
) {
  return applyBookingUpdateSideEffectsByPolicy(
    previousRows,
    updatedRows,
    rowsToPersist,
    outboxEvents,
    walletService,
    actorId,
    createFinanceSideEffectsContext(),
  );
}

export async function applyEscrowUpdateSideEffects(
  previousRows: Row[],
  updatedRows: Row[],
  rowsToPersist: Record<string, Row[]>,
  outboxEvents: OutboxEventInput[],
  walletService: WalletService,
  actorId?: string | null,
) {
  return applyEscrowUpdateSideEffectsByPolicy(
    previousRows,
    updatedRows,
    rowsToPersist,
    outboxEvents,
    walletService,
    actorId,
    createFinanceSideEffectsContext(),
  );
}

export async function applyPayoutRequestUpdateSideEffects(
  previousRows: Row[],
  updatedRows: Row[],
  rowsToPersist: Record<string, Row[]>,
  outboxEvents: OutboxEventInput[],
  walletService: WalletService,
  actorId?: string | null,
) {
  return applyPayoutRequestUpdateSideEffectsByPolicy(
    previousRows,
    updatedRows,
    rowsToPersist,
    outboxEvents,
    walletService,
    actorId,
    createFinanceSideEffectsContext(),
  );
}

export async function applySubscriptionMutationSideEffects(
  previousRows: Row[],
  updatedRows: Row[],
  rowsToPersist: Record<string, Row[]>,
  outboxEvents: OutboxEventInput[],
  walletService: WalletService,
  actorId?: string | null,
) {
  return applySubscriptionMutationSideEffectsByPolicy(
    previousRows,
    updatedRows,
    rowsToPersist,
    outboxEvents,
    walletService,
    actorId,
    createFinanceSideEffectsContext(),
  );
}

@Controller('data')
export class DataController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly platformPersistenceService: PlatformPersistenceService,
    private readonly walletService: WalletService,
    private readonly authService: AuthService,
  ) {}

  @Get(':table')
  async findMany(
    @Req() request: AuthenticatedRequest,
    @Param('table') table: string,
    @Query() query: Record<string, string | string[] | undefined>,
  ) {
    await syncAppStoreFromDatabase(this.prisma);
    await assertTableAccess(table, request.auth?.user ?? null, 'GET', this.authService);
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
    await assertTableAccess(table, request.auth?.user ?? null, 'POST', this.authService);
    ensureTable(table);
    const rawRows = Array.isArray(payload) ? payload : [payload];
    const user = request.auth?.user;
    const normalizedRows = user ? rawRows.map((row) => sanitizeCreatePayload(table, clone(row), user)) : rawRows;
    ensureConstraints(table, normalizedRows);

    const rows = normalizedRows.map((row) => withId(prepareInsert(table, row)));
    const response = appendAppRows(table, rows);
    const rowsToPersist: Record<string, Row[]> = {
      [table]: rows,
    };
    const outboxEvents: OutboxEventInput[] = [];
    if (table === 'bookings') {
      await applyBookingCreateSideEffects(response, rowsToPersist, outboxEvents, this.walletService, user?.id);
    }
    if (table === 'user_subscriptions') {
      await applySubscriptionMutationSideEffects([], response, rowsToPersist, outboxEvents, this.walletService, user?.id);
      const visibilityContext = createProviderVisibilityContext();
      for (const subscription of response) {
        syncProviderStateFromSubscription(subscription, rowsToPersist, visibilityContext);
        issueProviderVisibilityPass(null, subscription, rowsToPersist, visibilityContext);
      }
    }
    if (table === 'provider_verification_requests') {
      applyProviderVerificationDecision(response, rowsToPersist, createProviderVisibilityContext());
    }
    if (table === 'virtual_classes') {
      appendVirtualClassCreateEvents({
        getCourseEnrollments: (courseId) => (store.course_enrollments ?? [])
          .filter((enrollment) => String(enrollment.course_id) === String(courseId))
          .map((enrollment) => ({
            user_id: String(enrollment.student_id),
            student_name: String(enrollment.student_name ?? 'Apprenant'),
          })),
      }, response, outboxEvents, user?.id);
    }
    await this.platformPersistenceService.persistRows(rowsToPersist, {
      actorId: user?.id,
      reason: `data:${table}:create`,
      beforeRowsByTable: {},
      afterRowsByTable: rowsToPersist,
      outboxEvents,
    });
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
    await assertTableAccess(table, request.auth?.user ?? null, 'PATCH', this.authService);
    if (APPEND_ONLY_TABLES.has(table)) {
      throw new BadRequestException('Cette table est immutable. Utilisez une contre-ecriture.');
    }
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
    const rowsToPersist: Record<string, Row[]> = {
      [table]: updatedRows,
    };
    const outboxEvents: OutboxEventInput[] = [];
    if (table === 'virtual_classes') {
      appendVirtualClassUpdateEvents({
        getCourseEnrollments: (courseId) => (store.course_enrollments ?? [])
          .filter((enrollment) => String(enrollment.course_id) === String(courseId))
          .map((enrollment) => ({
            user_id: String(enrollment.student_id),
            student_name: String(enrollment.student_name ?? 'Apprenant'),
          })),
      }, previousRows, updatedRows, outboxEvents, user?.id);
    }
    if (table === 'bookings') {
      await applyBookingUpdateSideEffects(previousRows, updatedRows, rowsToPersist, outboxEvents, this.walletService, user?.id);
    }
    if (table === 'escrow_cases') {
      await applyEscrowUpdateSideEffects(previousRows, updatedRows, rowsToPersist, outboxEvents, this.walletService, user?.id);
    }
    if (table === 'payout_requests') {
      await applyPayoutRequestUpdateSideEffects(previousRows, updatedRows, rowsToPersist, outboxEvents, this.walletService, user?.id);
    }
    if (table === 'user_subscriptions') {
      await applySubscriptionMutationSideEffects(previousRows, updatedRows, rowsToPersist, outboxEvents, this.walletService, user?.id);
      const visibilityContext = createProviderVisibilityContext();
      for (const subscription of updatedRows) {
        const previous = previousRows.find((row) => String(row.id) === String(subscription.id)) ?? null;
        syncProviderStateFromSubscription(subscription, rowsToPersist, visibilityContext);
        issueProviderVisibilityPass(previous, subscription, rowsToPersist, visibilityContext);
      }
    }
    if (table === 'provider_verification_requests') {
      applyProviderVerificationDecision(updatedRows, rowsToPersist, createProviderVisibilityContext());
    }
    await this.platformPersistenceService.persistRows(rowsToPersist, {
      actorId: user?.id,
      reason: `data:${table}:update`,
      beforeRowsByTable: { [table]: previousRows },
      afterRowsByTable: rowsToPersist,
      outboxEvents,
    });
    return hydrateRows(table, updatedRows);
  }

  @Delete(':table')
  async remove(
    @Req() request: AuthenticatedRequest,
    @Param('table') table: string,
    @Query() query: Record<string, string | string[] | undefined>,
  ) {
    await syncAppStoreFromDatabase(this.prisma);
    await assertTableAccess(table, request.auth?.user ?? null, 'DELETE', this.authService);
    if (APPEND_ONLY_TABLES.has(table)) {
      throw new BadRequestException('Cette table est immutable et ne peut pas etre supprimee.');
    }
    ensureTable(table);
    const rows = store[table] ?? [];
    const actorRows = filterRowsForActor(table, rows, request.auth?.user ?? null);
    const actorRowIds = new Set(actorRows.map((row) => String(row.id)));
    const matchedIds = new Set(rows.filter((row) => matches(row, query)).map((row) => String(row.id)));
    const removed = rows.filter((row) => matches(row, query) && actorRowIds.has(String(row.id)));
    if (matchedIds.size > 0 && removed.length === 0) {
      throw new UnauthorizedException('Acces refuse.');
    }
    const deletedRowIdsByTable: Record<string, string[]> = {
      [table]: removed.map((row) => String(row.id)),
    };
    const registerDeleted = (targetTable: string, rowIds: string[]) => {
      if (rowIds.length === 0) return;
      deletedRowIdsByTable[targetTable] = [
        ...(deletedRowIdsByTable[targetTable] ?? []),
        ...rowIds,
      ];
    };
    store[table] = rows.filter((row) => !(matches(row, query) && actorRowIds.has(String(row.id))));

    if (table === 'course_sections') {
      const removedSectionIds = new Set(removed.map((row) => String(row.id)));
      const removedLessonIds = (store.course_lessons ?? [])
        .filter((lesson) => removedSectionIds.has(String(lesson.section_id)))
        .map((lesson) => String(lesson.id));
      registerDeleted('course_lessons', removedLessonIds);
      store.course_lessons = (store.course_lessons ?? []).filter((lesson) => !removedSectionIds.has(String(lesson.section_id)));

      const removedAssetIds = (store.lesson_assets ?? [])
        .filter((asset) => removedLessonIds.includes(String(asset.lesson_id)))
        .map((asset) => String(asset.id));
      registerDeleted('lesson_assets', removedAssetIds);
      store.lesson_assets = (store.lesson_assets ?? []).filter((asset) => !removedLessonIds.includes(String(asset.lesson_id)));

      const removedCommentIds = (store.lesson_comments ?? [])
        .filter((comment) => removedLessonIds.includes(String(comment.lesson_id)))
        .map((comment) => String(comment.id));
      registerDeleted('lesson_comments', removedCommentIds);
      store.lesson_comments = (store.lesson_comments ?? []).filter((comment) => !removedLessonIds.includes(String(comment.lesson_id)));

      const removedProgressIds = (store.lesson_progress ?? [])
        .filter((entry) => removedLessonIds.includes(String(entry.lesson_id)))
        .map((entry) => String(entry.id));
      registerDeleted('lesson_progress', removedProgressIds);
      store.lesson_progress = (store.lesson_progress ?? []).filter((entry) => !removedLessonIds.includes(String(entry.lesson_id)));
    }

    if (table === 'course_lessons') {
      const removedLessonIds = new Set(removed.map((row) => String(row.id)));
      const removedAssetIds = (store.lesson_assets ?? [])
        .filter((asset) => removedLessonIds.has(String(asset.lesson_id)))
        .map((asset) => String(asset.id));
      registerDeleted('lesson_assets', removedAssetIds);
      store.lesson_assets = (store.lesson_assets ?? []).filter((asset) => !removedLessonIds.has(String(asset.lesson_id)));

      const removedCommentIds = (store.lesson_comments ?? [])
        .filter((comment) => removedLessonIds.has(String(comment.lesson_id)))
        .map((comment) => String(comment.id));
      registerDeleted('lesson_comments', removedCommentIds);
      store.lesson_comments = (store.lesson_comments ?? []).filter((comment) => !removedLessonIds.has(String(comment.lesson_id)));

      const removedProgressIds = (store.lesson_progress ?? [])
        .filter((entry) => removedLessonIds.has(String(entry.lesson_id)))
        .map((entry) => String(entry.id));
      registerDeleted('lesson_progress', removedProgressIds);
      store.lesson_progress = (store.lesson_progress ?? []).filter((entry) => !removedLessonIds.has(String(entry.lesson_id)));
    }

    if (table === 'quiz_questions') {
      const removedQuestionIds = new Set(removed.map((row) => String(row.id)));
      const removedChoiceIds = (store.quiz_choices ?? [])
        .filter((choice) => removedQuestionIds.has(String(choice.question_id)))
        .map((choice) => String(choice.id));
      registerDeleted('quiz_choices', removedChoiceIds);
      store.quiz_choices = (store.quiz_choices ?? []).filter((choice) => !removedQuestionIds.has(String(choice.question_id)));
    }

    if (table === 'exams') {
      const removedExamIds = new Set(removed.map((row) => String(row.id)));
      const removedSubmissionIds = (store.submissions ?? [])
        .filter((submission) => removedExamIds.has(String(submission.exam_id)))
        .map((submission) => String(submission.id));
      registerDeleted('submissions', removedSubmissionIds);
      store.submissions = (store.submissions ?? []).filter((submission) => !removedExamIds.has(String(submission.exam_id)));

      const removedQuestionIds = (store.quiz_questions ?? [])
        .filter((question) => removedExamIds.has(String(question.exam_id)))
        .map((question) => String(question.id));
      registerDeleted('quiz_questions', removedQuestionIds);
      store.quiz_questions = (store.quiz_questions ?? []).filter((question) => !removedExamIds.has(String(question.exam_id)));

      const removedChoiceIds = (store.quiz_choices ?? [])
        .filter((choice) => removedQuestionIds.includes(String(choice.question_id)))
        .map((choice) => String(choice.id));
      registerDeleted('quiz_choices', removedChoiceIds);
      store.quiz_choices = (store.quiz_choices ?? []).filter((choice) => !removedQuestionIds.includes(String(choice.question_id)));
    }

    if (table === 'courses') {
      const removedCourseIds = new Set(removed.map((row) => String(row.id)));
      const removedSectionIds = (store.course_sections ?? [])
        .filter((section) => removedCourseIds.has(String(section.course_id)))
        .map((section) => String(section.id));
      registerDeleted('course_sections', removedSectionIds);
      store.course_sections = (store.course_sections ?? []).filter((section) => !removedCourseIds.has(String(section.course_id)));

      const removedLessonIds = (store.course_lessons ?? [])
        .filter((lesson) => removedCourseIds.has(String(lesson.course_id)))
        .map((lesson) => String(lesson.id));
      registerDeleted('course_lessons', removedLessonIds);
      store.course_lessons = (store.course_lessons ?? []).filter((lesson) => !removedCourseIds.has(String(lesson.course_id)));

      const removedAssetIds = (store.lesson_assets ?? [])
        .filter((asset) => removedCourseIds.has(String(asset.course_id)))
        .map((asset) => String(asset.id));
      registerDeleted('lesson_assets', removedAssetIds);
      store.lesson_assets = (store.lesson_assets ?? []).filter((asset) => !removedCourseIds.has(String(asset.course_id)));

      const removedCommentIds = (store.lesson_comments ?? [])
        .filter((comment) => removedCourseIds.has(String(comment.course_id)))
        .map((comment) => String(comment.id));
      registerDeleted('lesson_comments', removedCommentIds);
      store.lesson_comments = (store.lesson_comments ?? []).filter((comment) => !removedCourseIds.has(String(comment.course_id)));

      const removedProgressIds = (store.lesson_progress ?? [])
        .filter((entry) => removedCourseIds.has(String(entry.course_id)))
        .map((entry) => String(entry.id));
      registerDeleted('lesson_progress', removedProgressIds);
      store.lesson_progress = (store.lesson_progress ?? []).filter((entry) => !removedCourseIds.has(String(entry.course_id)));

      const removedReviewIds = (store.course_reviews ?? [])
        .filter((review) => removedCourseIds.has(String(review.course_id)))
        .map((review) => String(review.id));
      registerDeleted('course_reviews', removedReviewIds);
      store.course_reviews = (store.course_reviews ?? []).filter((review) => !removedCourseIds.has(String(review.course_id)));

      const removedFaqIds = (store.course_faq_items ?? [])
        .filter((item) => removedCourseIds.has(String(item.course_id)))
        .map((item) => String(item.id));
      registerDeleted('course_faq_items', removedFaqIds);
      store.course_faq_items = (store.course_faq_items ?? []).filter((item) => !removedCourseIds.has(String(item.course_id)));

      const removedClassIds = (store.virtual_classes ?? [])
        .filter((vclass) => removedCourseIds.has(String(vclass.course_id)))
        .map((vclass) => String(vclass.id));
      registerDeleted('virtual_classes', removedClassIds);
      store.virtual_classes = (store.virtual_classes ?? []).filter((vclass) => !removedCourseIds.has(String(vclass.course_id)));

      const removedExamIds = (store.exams ?? [])
        .filter((exam) => removedCourseIds.has(String(exam.course_id)))
        .map((exam) => String(exam.id));
      registerDeleted('exams', removedExamIds);
      store.exams = (store.exams ?? []).filter((exam) => !removedCourseIds.has(String(exam.course_id)));

      const removedSubmissionIds = (store.submissions ?? [])
        .filter((submission) => removedExamIds.includes(String(submission.exam_id)))
        .map((submission) => String(submission.id));
      registerDeleted('submissions', removedSubmissionIds);
      store.submissions = (store.submissions ?? []).filter((submission) => !removedExamIds.includes(String(submission.exam_id)));

      const removedQuestionIds = (store.quiz_questions ?? [])
        .filter((question) => removedExamIds.includes(String(question.exam_id)))
        .map((question) => String(question.id));
      registerDeleted('quiz_questions', removedQuestionIds);
      store.quiz_questions = (store.quiz_questions ?? []).filter((question) => !removedExamIds.includes(String(question.exam_id)));

      const removedChoiceIds = (store.quiz_choices ?? [])
        .filter((choice) => removedQuestionIds.includes(String(choice.question_id)))
        .map((choice) => String(choice.id));
      registerDeleted('quiz_choices', removedChoiceIds);
      store.quiz_choices = (store.quiz_choices ?? []).filter((choice) => !removedQuestionIds.includes(String(choice.question_id)));
    }

    recomputeDerivedData();
    await this.platformPersistenceService.deleteRows(deletedRowIdsByTable, {
      actorId: request.auth?.user?.id,
      reason: `data:${table}:delete`,
      beforeRowsByTable: { [table]: removed },
    });
    return hydrateRows(table, removed);
  }
}
