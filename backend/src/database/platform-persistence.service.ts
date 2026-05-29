import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from './prisma.service.js';
import { AuditLogService } from './audit-log.service.js';
import type { Row } from '../data/mock-store.js';
import { normalizeOutboxEventInput } from '../outbox/outbox-contract.js';
import type { OutboxEventInput } from '../outbox/outbox.types.js';
import { deleteLearningProjection, persistLearningProjection } from './platform-learning-projection.js';
import { deleteMarketplaceProjection, persistMarketplaceProjection } from './platform-marketplace-projection.js';

const FINANCIAL_PROJECTION_TABLES = new Set([
  'bookings',
  'wallet_accounts',
  'payment_transactions',
  'subscription_plans',
  'user_subscriptions',
  'payout_accounts',
  'payout_requests',
  'escrow_cases',
  'invoices',
  'commission_ledger',
]);

const MARKETPLACE_PROJECTION_TABLES = new Set([
  'providers',
  'provider_services',
  'provider_reviews',
  'client_orders',
  'client_favorites',
  'provider_verification_requests',
]);

type MutationContext = {
  actorId?: string | null;
  reason?: string;
  beforeRowsByTable?: Record<string, Row[]>;
  afterRowsByTable?: Record<string, Row[]>;
  outboxEvents?: OutboxEventInput[];
};

@Injectable()
export class PlatformPersistenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async persistRows(rowsByTable: Record<string, Row[]>, context: MutationContext = {}) {
    if (!this.prisma.isConnected) {
      return;
    }

    const normalizedEntries = Object.entries(rowsByTable)
      .map(([table, rows]) => [table, this.dedupeRows(rows)] as const)
      .filter(([, rows]) => rows.length > 0);

    if (normalizedEntries.length === 0) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      for (const [table, rows] of normalizedEntries) {
        await this.upsertAppRows(tx, table, rows);
      }

      await this.persistNormalizedProjection(
        tx,
        Object.fromEntries(normalizedEntries),
      );
      await this.persistOutboxEvents(tx, context.outboxEvents ?? []);
    }, {
      maxWait: 10_000,
      timeout: 30_000,
    });

    const changedTables = normalizedEntries.map(([table]) => table);
    if (changedTables.some((table) => FINANCIAL_PROJECTION_TABLES.has(table))) {
      const financialOperationIds = Array.from(new Set(
        normalizedEntries
          .flatMap(([, rows]) => rows)
          .map((row) => this.toNullableString(row.financial_operation_id))
          .filter(Boolean),
      ));
      await this.auditLogService.record({
        scope: 'database',
        action: 'financial_projection_write',
        userId: context.actorId ?? undefined,
        targetType: 'tables',
        targetId: changedTables.join(','),
        metadata: {
          financialOperationIds,
          reason: context.reason ?? 'unspecified',
          counts: Object.fromEntries(normalizedEntries.map(([table, rows]) => [table, rows.length])),
          before: context.beforeRowsByTable ?? {},
          after: context.afterRowsByTable ?? Object.fromEntries(normalizedEntries),
        },
      });
    }

    if (changedTables.some((table) => MARKETPLACE_PROJECTION_TABLES.has(table))) {
      await this.auditLogService.record({
        scope: 'database',
        action: 'marketplace_projection_write',
        userId: context.actorId ?? undefined,
        targetType: 'tables',
        targetId: changedTables.join(','),
        metadata: {
          reason: context.reason ?? 'unspecified',
          counts: Object.fromEntries(normalizedEntries.map(([table, rows]) => [table, rows.length])),
        },
      });
    }

  }

  async deleteRows(removalsByTable: Record<string, string[]>, context: MutationContext = {}) {
    if (!this.prisma.isConnected) {
      return;
    }

    const normalizedEntries = Object.entries(removalsByTable)
      .map(([table, ids]) => [table, Array.from(new Set(ids.map(String)))] as const)
      .filter(([, ids]) => ids.length > 0);

    if (normalizedEntries.length === 0) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      for (const [table, ids] of normalizedEntries) {
        await tx.appRow.deleteMany({
          where: {
            table,
            rowId: { in: ids },
          },
        });
      }

      await this.deleteNormalizedProjection(tx, Object.fromEntries(normalizedEntries));
    }, {
      maxWait: 10_000,
      timeout: 30_000,
    });

    const changedTables = normalizedEntries.map(([table]) => table);
    if (changedTables.some((table) => FINANCIAL_PROJECTION_TABLES.has(table))) {
      await this.auditLogService.record({
        scope: 'database',
        action: 'financial_projection_delete',
        userId: context.actorId ?? undefined,
        targetType: 'tables',
        targetId: changedTables.join(','),
        metadata: {
          reason: context.reason ?? 'unspecified',
          counts: Object.fromEntries(normalizedEntries.map(([table, ids]) => [table, ids.length])),
          before: context.beforeRowsByTable ?? {},
        },
      });
    }

    if (changedTables.some((table) => MARKETPLACE_PROJECTION_TABLES.has(table))) {
      await this.auditLogService.record({
        scope: 'database',
        action: 'marketplace_projection_delete',
        userId: context.actorId ?? undefined,
        targetType: 'tables',
        targetId: changedTables.join(','),
        metadata: {
          reason: context.reason ?? 'unspecified',
          counts: Object.fromEntries(normalizedEntries.map(([table, ids]) => [table, ids.length])),
        },
      });
    }

  }

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  private toJson(value: unknown) {
    return this.clone(value) as Prisma.InputJsonValue;
  }

  private toString(value: unknown, fallback = '') {
    if (value === null || value === undefined) return fallback;
    return String(value);
  }

  private toNullableString(value: unknown) {
    const normalized = this.toString(value).trim();
    return normalized ? normalized : undefined;
  }

  private toDate(value: unknown) {
    if (!value) return undefined;
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  private toBool(value: unknown, fallback = false) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true') return true;
      if (normalized === 'false') return false;
    }
    return fallback;
  }

  private toInt(value: unknown, fallback = 0) {
    const normalized = Number(value);
    return Number.isFinite(normalized) ? Math.round(normalized) : fallback;
  }

  private toFloat(value: unknown, fallback = 0) {
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized : fallback;
  }

  private slugify(value: string) {
    let slug = '';
    for (const char of value.normalize('NFKD').trim().toLowerCase()) {
      const code = char.charCodeAt(0);
      const isLetterOrDigit = (code >= 97 && code <= 122) || (code >= 48 && code <= 57);
      if (isLetterOrDigit) {
        slug += char;
      } else if ((char === ' ' || char === '_' || char === '-') && slug && !slug.endsWith('-')) {
        slug += '-';
      }
    }
    return slug.endsWith('-') ? slug.slice(0, -1) : slug;
  }

  private rowKey(table: string, rowId: string) {
    return table.startsWith('auth_') ? `${table}:${rowId}` : `${table}::${rowId}`;
  }

  private dedupeRows(rows: Row[]) {
    return Array.from(
      new Map(rows.map((row) => [this.toString(row.id), this.clone(row)])).values(),
    );
  }

  private async upsertAppRows(tx: Prisma.TransactionClient, table: string, rows: Row[]) {
    for (const row of rows) {
      const rowId = this.toString(row.id);
      await tx.appRow.upsert({
        where: { key: this.rowKey(table, rowId) },
        update: { data: this.toJson(row) },
        create: {
          key: this.rowKey(table, rowId),
          table,
          rowId,
          data: this.toJson(row),
        },
      });
    }
  }

  private async persistNormalizedProjection(tx: Prisma.TransactionClient, rowsByTable: Record<string, Row[]>) {
    await this.persistWallets(tx, rowsByTable.wallet_accounts ?? []);
    await this.persistWalletTransactions(tx, rowsByTable.payment_transactions ?? []);
    await this.persistSubscriptionPlans(tx, rowsByTable.subscription_plans ?? []);
    await this.persistUserSubscriptions(tx, rowsByTable.user_subscriptions ?? []);
    await this.persistPayoutAccounts(tx, rowsByTable.payout_accounts ?? []);
    await this.persistPayoutRequests(tx, rowsByTable.payout_requests ?? []);
    await this.persistEscrows(tx, rowsByTable.escrow_cases ?? []);
    await this.persistInvoices(tx, rowsByTable.invoices ?? []);
    await this.persistCommissionEntries(tx, rowsByTable.commission_ledger ?? []);
    await this.persistMissions(tx, rowsByTable.bookings ?? []);
    await persistMarketplaceProjection(tx, {
      providers: rowsByTable.providers ?? [],
      provider_services: rowsByTable.provider_services ?? [],
      provider_reviews: rowsByTable.provider_reviews ?? [],
      client_orders: rowsByTable.client_orders ?? [],
      client_favorites: rowsByTable.client_favorites ?? [],
      provider_verification_requests: rowsByTable.provider_verification_requests ?? [],
    });
    await persistLearningProjection(tx, { courses: rowsByTable.courses ?? [], course_sections: rowsByTable.course_sections ?? [], course_lessons: rowsByTable.course_lessons ?? [], course_reviews: rowsByTable.course_reviews ?? [], virtual_classes: rowsByTable.virtual_classes ?? [], course_enrollments: rowsByTable.course_enrollments ?? [], lesson_progress: rowsByTable.lesson_progress ?? [], exams: rowsByTable.exams ?? [], quiz_questions: rowsByTable.quiz_questions ?? [], quiz_choices: rowsByTable.quiz_choices ?? [], submissions: rowsByTable.submissions ?? [], certificates: rowsByTable.certificates ?? [] });
  }

  private async deleteNormalizedProjection(tx: Prisma.TransactionClient, removalsByTable: Record<string, string[]>) {
    if (removalsByTable.wallet_accounts?.length) {
      await tx.wallet.deleteMany({ where: { id: { in: removalsByTable.wallet_accounts } } });
    }
    if (removalsByTable.payment_transactions?.length) {
      await tx.walletTransaction.deleteMany({ where: { id: { in: removalsByTable.payment_transactions } } });
    }
    if (removalsByTable.subscription_plans?.length) {
      await tx.subscriptionPlan.deleteMany({ where: { id: { in: removalsByTable.subscription_plans } } });
    }
    if (removalsByTable.user_subscriptions?.length) {
      await tx.userSubscription.deleteMany({ where: { id: { in: removalsByTable.user_subscriptions } } });
    }
    if (removalsByTable.payout_accounts?.length) {
      await tx.payoutAccount.deleteMany({ where: { id: { in: removalsByTable.payout_accounts } } });
    }
    if (removalsByTable.payout_requests?.length) {
      await tx.payoutRequest.deleteMany({ where: { id: { in: removalsByTable.payout_requests } } });
    }
    if (removalsByTable.escrow_cases?.length) {
      await tx.escrowCase.deleteMany({ where: { id: { in: removalsByTable.escrow_cases } } });
    }
    if (removalsByTable.invoices?.length) {
      await tx.invoice.deleteMany({ where: { id: { in: removalsByTable.invoices } } });
    }
    if (removalsByTable.commission_ledger?.length) {
      await tx.commissionLedgerEntry.deleteMany({ where: { id: { in: removalsByTable.commission_ledger } } });
    }
    if (removalsByTable.bookings?.length) {
      await tx.mission.deleteMany({ where: { id: { in: removalsByTable.bookings } } });
    }
    await deleteMarketplaceProjection(tx, {
      providers: removalsByTable.providers ?? [],
      provider_services: removalsByTable.provider_services ?? [],
      provider_reviews: removalsByTable.provider_reviews ?? [],
      client_orders: removalsByTable.client_orders ?? [],
      client_favorites: removalsByTable.client_favorites ?? [],
      provider_verification_requests: removalsByTable.provider_verification_requests ?? [],
    });
    await deleteLearningProjection(tx, { courses: removalsByTable.courses ?? [], course_sections: removalsByTable.course_sections ?? [], course_lessons: removalsByTable.course_lessons ?? [], course_reviews: removalsByTable.course_reviews ?? [], virtual_classes: removalsByTable.virtual_classes ?? [], course_enrollments: removalsByTable.course_enrollments ?? [], lesson_progress: removalsByTable.lesson_progress ?? [], exams: removalsByTable.exams ?? [], quiz_questions: removalsByTable.quiz_questions ?? [], quiz_choices: removalsByTable.quiz_choices ?? [], submissions: removalsByTable.submissions ?? [], certificates: removalsByTable.certificates ?? [] });
  }

  private async persistOutboxEvents(tx: Prisma.TransactionClient, events: OutboxEventInput[]) {
    for (const rawEvent of events) {
      const event = normalizeOutboxEventInput(rawEvent);
      const eventId = this.toString(event.id || `outbox-${Date.now()}-${randomUUID()}`);
      const idempotencyKey = event.idempotencyKey ?? event.dedupeKey ?? undefined;
      if (idempotencyKey) {
        await tx.outboxEvent.upsert({
          where: { idempotencyKey },
          update: {
            eventType: event.eventType,
            eventVersion: event.eventVersion ?? 1,
            aggregateType: event.aggregateType ?? undefined,
            aggregateId: event.aggregateId ?? undefined,
            actorId: event.actorId ?? undefined,
            idempotencyKey,
            dedupeKey: event.dedupeKey ?? idempotencyKey,
            availableAt: event.availableAt ? new Date(String(event.availableAt)) : undefined,
            nextRetryAt: event.nextRetryAt ? new Date(String(event.nextRetryAt)) : (event.availableAt ? new Date(String(event.availableAt)) : undefined),
            occurredAt: event.occurredAt ? new Date(String(event.occurredAt)) : undefined,
            correlationId: event.correlationId ?? undefined,
            financialOperationId: event.financialOperationId ?? undefined,
            payload: this.toJson(event.payload),
            source: 'native',
            metadata: this.toJson(event.metadata ?? {}),
            maxRetries: event.maxRetries ?? 5,
          },
          create: {
            id: eventId,
            eventType: event.eventType,
            eventVersion: event.eventVersion ?? 1,
            aggregateType: event.aggregateType ?? undefined,
            aggregateId: event.aggregateId ?? undefined,
            actorId: event.actorId ?? undefined,
            idempotencyKey,
            dedupeKey: event.dedupeKey ?? idempotencyKey,
            status: 'pending',
            attemptCount: 0,
            retries: 0,
            maxRetries: event.maxRetries ?? 5,
            availableAt: event.availableAt ? new Date(String(event.availableAt)) : new Date(),
            nextRetryAt: event.nextRetryAt ? new Date(String(event.nextRetryAt)) : (event.availableAt ? new Date(String(event.availableAt)) : new Date()),
            occurredAt: event.occurredAt ? new Date(String(event.occurredAt)) : new Date(),
            correlationId: event.correlationId ?? undefined,
            financialOperationId: event.financialOperationId ?? undefined,
            payload: this.toJson(event.payload),
            source: 'native',
            metadata: this.toJson(event.metadata ?? {}),
          },
        });
        continue;
      }

      await tx.outboxEvent.create({
        data: {
          id: eventId,
          eventType: event.eventType,
          eventVersion: event.eventVersion ?? 1,
          aggregateType: event.aggregateType ?? undefined,
          aggregateId: event.aggregateId ?? undefined,
          actorId: event.actorId ?? undefined,
          status: 'pending',
          idempotencyKey,
          dedupeKey: event.dedupeKey ?? idempotencyKey,
          attemptCount: 0,
          retries: 0,
          maxRetries: event.maxRetries ?? 5,
          availableAt: event.availableAt ? new Date(String(event.availableAt)) : new Date(),
          nextRetryAt: event.nextRetryAt ? new Date(String(event.nextRetryAt)) : (event.availableAt ? new Date(String(event.availableAt)) : new Date()),
          occurredAt: event.occurredAt ? new Date(String(event.occurredAt)) : new Date(),
          correlationId: event.correlationId ?? undefined,
          financialOperationId: event.financialOperationId ?? undefined,
          payload: this.toJson(event.payload),
          source: 'native',
          metadata: this.toJson(event.metadata ?? {}),
        },
      });
    }
  }

  private async persistWallets(tx: Prisma.TransactionClient, rows: Row[]) {
    for (const row of rows) {
      const data: Prisma.WalletCreateInput = {
        id: this.toString(row.id),
        userId: this.toString(row.user_id),
        currency: this.toString(row.currency, 'XAF'),
        balance: this.toInt(row.balance),
        availableBalance: this.toInt(row.available_balance, this.toInt(row.balance)),
        heldBalance: this.toInt(row.held_balance),
        pendingReleaseBalance: this.toInt(row.pending_release_balance),
        pendingPayoutAmount: this.toInt(row.pending_payout_amount),
        source: 'app_row',
        metadata: this.toJson(row),
        createdAt: this.toDate(row.created_at ?? row.updated_at) ?? new Date(),
        updatedAt: this.toDate(row.updated_at ?? row.created_at) ?? new Date(),
      };
      const { id, createdAt, source: _source, ...update } = data;
      await tx.wallet.upsert({
        where: { id },
        create: data,
        update,
      });
    }
  }

  private async persistWalletTransactions(tx: Prisma.TransactionClient, rows: Row[]) {
    const data = rows
      .filter((row) => row.id !== undefined && row.type !== undefined)
      .map((row): Prisma.WalletTransactionCreateManyInput => ({
        id: this.toString(row.id),
        userId: this.toNullableString(row.user_id),
        type: this.toString(row.type),
        amount: this.toInt(row.amount),
        currency: this.toString(row.currency, 'XAF'),
        method: this.toNullableString(row.method),
        status: this.toString(row.status, 'completed'),
        description: this.toNullableString(row.description),
        reference: this.toNullableString(row.reference),
        occurredAt: this.toDate(row.date ?? row.created_at) ?? new Date(),
        source: 'app_row',
        metadata: this.toJson(row),
        createdAt: this.toDate(row.created_at ?? row.date) ?? new Date(),
      }));

    if (data.length > 0) {
      await tx.walletTransaction.createMany({
        data,
        skipDuplicates: true,
      });
    }
  }

  private async persistSubscriptionPlans(tx: Prisma.TransactionClient, rows: Row[]) {
    for (const row of rows) {
      const name = this.toString(row.name, this.toString(row.id));
      const data: Prisma.SubscriptionPlanCreateInput = {
        id: this.toString(row.id),
        role: this.toString(row.role, 'unknown'),
        name,
        slug: this.toString(row.slug, this.slugify(name)),
        priceMonthly: this.toInt(row.price_monthly),
        currency: this.toString(row.currency, 'XAF'),
        commissionRate: this.toFloat(row.commission_rate),
        priorityMatching: this.toBool(row.priority_matching),
        analyticsLevel: this.toNullableString(row.analytics_level),
        supportLevel: this.toNullableString(row.support_level),
        verifiedBadge: this.toBool(row.verified_badge),
        features: row.features ? this.toJson(row.features) : undefined,
        active: this.toBool(row.active, true),
        source: 'app_row',
        metadata: this.toJson(row),
        createdAt: this.toDate(row.created_at ?? row.updated_at) ?? new Date(),
        updatedAt: this.toDate(row.updated_at ?? row.created_at) ?? new Date(),
      };
      const { id, createdAt, source: _source, ...update } = data;
      await tx.subscriptionPlan.upsert({
        where: { id },
        create: data,
        update,
      });
    }
  }

  private async persistUserSubscriptions(tx: Prisma.TransactionClient, rows: Row[]) {
    for (const row of rows) {
      const data: Prisma.UserSubscriptionCreateInput = {
        id: this.toString(row.id),
        userId: this.toString(row.user_id),
        role: this.toString(row.role, 'unknown'),
        planId: this.toString(row.plan_id, 'unknown-plan'),
        planName: this.toString(row.plan_name, 'Plan'),
        status: this.toString(row.status, 'inactive'),
        amount: this.toInt(row.amount),
        currency: this.toString(row.currency, 'XAF'),
        commissionRate: this.toFloat(row.commission_rate),
        autoRenew: this.toBool(row.auto_renew),
        startedAt: this.toDate(row.started_at),
        renewsAt: this.toDate(row.renews_at),
        lastBilledAt: this.toDate(row.last_billed_at),
        endedAt: this.toDate(row.ended_at),
        source: 'app_row',
        metadata: this.toJson(row),
        createdAt: this.toDate(row.created_at ?? row.started_at) ?? new Date(),
        updatedAt: this.toDate(row.updated_at ?? row.last_billed_at ?? row.started_at) ?? new Date(),
      };
      const { id, createdAt, source: _source, ...update } = data;
      await tx.userSubscription.upsert({
        where: { id },
        create: data,
        update,
      });
    }
  }

  private async persistPayoutAccounts(tx: Prisma.TransactionClient, rows: Row[]) {
    for (const row of rows) {
      const data: Prisma.PayoutAccountCreateInput = {
        id: this.toString(row.id),
        userId: this.toString(row.user_id),
        method: this.toString(row.method, 'wallet'),
        accountName: this.toNullableString(row.account_name),
        accountIdentifier: this.toNullableString(row.account_identifier),
        label: this.toNullableString(row.label),
        isDefault: this.toBool(row.is_default),
        source: 'app_row',
        metadata: this.toJson(row),
        createdAt: this.toDate(row.created_at ?? row.updated_at) ?? new Date(),
        updatedAt: this.toDate(row.updated_at ?? row.created_at) ?? new Date(),
      };
      const { id, createdAt, source: _source, ...update } = data;
      await tx.payoutAccount.upsert({
        where: { id },
        create: data,
        update,
      });
    }
  }

  private async persistPayoutRequests(tx: Prisma.TransactionClient, rows: Row[]) {
    for (const row of rows) {
      const data: Prisma.PayoutRequestCreateInput = {
        id: this.toString(row.id),
        userId: this.toString(row.user_id),
        amount: this.toInt(row.amount),
        currency: this.toString(row.currency, 'XAF'),
        method: this.toString(row.method, 'wallet'),
        accountId: this.toNullableString(row.account_id),
        status: this.toString(row.status, 'pending'),
        note: this.toNullableString(row.note),
        requestedAt: this.toDate(row.requested_at),
        processedAt: this.toDate(row.processed_at),
        source: 'app_row',
        metadata: this.toJson(row),
        createdAt: this.toDate(row.created_at ?? row.requested_at) ?? new Date(),
        updatedAt: this.toDate(row.updated_at ?? row.processed_at ?? row.requested_at) ?? new Date(),
      };
      const { id, createdAt, source: _source, ...update } = data;
      await tx.payoutRequest.upsert({
        where: { id },
        create: data,
        update,
      });
    }
  }

  private async persistEscrows(tx: Prisma.TransactionClient, rows: Row[]) {
    for (const row of rows) {
      const data: Prisma.EscrowCaseCreateInput = {
        id: this.toString(row.id),
        bookingId: this.toNullableString(row.booking_id),
        clientId: this.toNullableString(row.client_id),
        providerId: this.toNullableString(row.provider_id),
        providerUserId: this.toNullableString(row.provider_user_id),
        requestedProviderId: this.toNullableString(row.requested_provider_id),
        service: this.toNullableString(row.service),
        amountTotal: this.toInt(row.amount_total),
        currency: this.toString(row.currency, 'XAF'),
        platformFeeAmount: this.toInt(row.platform_fee_amount),
        providerAmount: this.toInt(row.provider_amount),
        status: this.toString(row.status, 'draft'),
        fundedAt: this.toDate(row.funded_at),
        releasedAt: this.toDate(row.released_at),
        refundedAt: this.toDate(row.refunded_at),
        note: this.toNullableString(row.note),
        paymentTransactionId: this.toNullableString(row.payment_transaction_id),
        source: 'app_row',
        metadata: this.toJson(row),
        createdAt: this.toDate(row.created_at ?? row.funded_at) ?? new Date(),
        updatedAt: this.toDate(row.updated_at ?? row.released_at ?? row.refunded_at ?? row.funded_at) ?? new Date(),
      };
      const { id, createdAt, source: _source, ...update } = data;
      await tx.escrowCase.upsert({
        where: { id },
        create: data,
        update,
      });
    }
  }

  private async persistInvoices(tx: Prisma.TransactionClient, rows: Row[]) {
    for (const row of rows) {
      const data: Prisma.InvoiceCreateInput = {
        id: this.toString(row.id),
        userId: this.toNullableString(row.user_id),
        number: this.toNullableString(row.number),
        type: this.toNullableString(row.type),
        description: this.toNullableString(row.description),
        amount: this.toInt(row.amount),
        currency: this.toString(row.currency, 'XAF'),
        status: this.toString(row.status, 'draft'),
        issueDate: this.toDate(row.issueDate),
        dueDate: this.toDate(row.dueDate),
        paidDate: this.toDate(row.paidDate),
        recipient: row.recipient ? this.toJson(row.recipient) : undefined,
        items: row.items ? this.toJson(row.items) : undefined,
        source: 'app_row',
        metadata: this.toJson(row),
        createdAt: this.toDate(row.created_at ?? row.issueDate) ?? new Date(),
        updatedAt: this.toDate(row.updated_at ?? row.paidDate ?? row.dueDate ?? row.issueDate) ?? new Date(),
      };
      const { id, createdAt, source: _source, ...update } = data;
      await tx.invoice.upsert({
        where: { id },
        create: data,
        update,
      });
    }
  }

  private async persistCommissionEntries(tx: Prisma.TransactionClient, rows: Row[]) {
    const data = rows
      .filter((row) => row.id !== undefined)
      .map((row): Prisma.CommissionLedgerEntryCreateManyInput => ({
        id: this.toString(row.id),
        sourceType: this.toNullableString(row.source_type),
        sourceId: this.toNullableString(row.source_id),
        userId: this.toNullableString(row.user_id),
        beneficiaryUserId: this.toNullableString(row.beneficiary_user_id),
        amount: this.toInt(row.amount),
        currency: this.toString(row.currency, 'XAF'),
        status: this.toString(row.status, 'recognized'),
        description: this.toNullableString(row.description),
        recognizedAt: this.toDate(row.recognized_at),
        source: 'app_row',
        metadata: this.toJson(row),
        createdAt: this.toDate(row.created_at ?? row.recognized_at) ?? new Date(),
      }));

    if (data.length > 0) {
      await tx.commissionLedgerEntry.createMany({
        data,
        skipDuplicates: true,
      });
    }
  }

  private async persistMissions(tx: Prisma.TransactionClient, rows: Row[]) {
    for (const row of rows) {
      const data: Prisma.MissionCreateInput = {
        id: this.toString(row.id),
        clientId: this.toNullableString(row.client_id),
        providerId: this.toNullableString(row.provider_id),
        requestedProviderId: this.toNullableString(row.requested_provider_id),
        service: this.toNullableString(row.service),
        category: this.toNullableString(row.category),
        status: this.toString(row.status, 'pending_review'),
        requestChannel: this.toNullableString(row.request_channel),
        assignmentStatus: this.toNullableString(row.assignment_status),
        walletFlow: this.toNullableString(row.wallet_flow),
        scheduledAt: this.toDate(row.scheduled_at),
        completedAt: this.toDate(row.completed_at),
        cancelledAt: this.toDate(row.cancelled_at),
        budgetAmount: row.budget_amount === undefined ? undefined : this.toInt(row.budget_amount),
        currency: this.toNullableString(row.currency),
        location: this.toNullableString(row.location),
        description: this.toNullableString(row.description),
        source: 'app_row',
        metadata: this.toJson(row),
        createdAt: this.toDate(row.created_at) ?? new Date(),
        updatedAt: this.toDate(row.updated_at ?? row.completed_at ?? row.cancelled_at ?? row.created_at) ?? new Date(),
      };
      const { id, createdAt, source: _source, ...update } = data;
      await tx.mission.upsert({
        where: { id },
        create: data,
        update,
      });
    }
  }
}
