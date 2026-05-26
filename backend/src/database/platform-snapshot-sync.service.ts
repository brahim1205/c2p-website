import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { ConfigService } from '../config/config.service.js';
import { createInitialStore, type Row, type Store } from '../data/mock-store.js';
import {
  getInitialAuditLogs,
  getInitialPendingTwoFactorChallenges,
  getInitialRefreshTokens,
  getInitialSessions,
  getInitialUsers,
  type AuditLog,
  type PendingTwoFactorChallenge,
  type RefreshTokenSession,
  type StoredUser,
  type UserSession,
} from '../auth/auth.store.js';
import { PrismaService } from './prisma.service.js';
import { AuditLogService } from './audit-log.service.js';

type AppRowTable =
  | 'auth_users'
  | 'auth_sessions'
  | 'auth_refresh_tokens'
  | 'auth_pending_2fa'
  | 'auth_audit_logs'
  | keyof Store;

interface PlatformSyncSummary {
  skipped?: string;
  appRowsSeeded: number;
  users: number;
  sessions: number;
  refreshTokens: number;
  pendingChallenges: number;
  auditLogs: number;
  wallets: number;
  walletTransactions: number;
  subscriptionPlans: number;
  subscriptions: number;
  payoutAccounts: number;
  payoutRequests: number;
  escrows: number;
  missions: number;
  invoices: number;
  commissionEntries: number;
}

@Injectable()
export class PlatformSnapshotSyncService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PlatformSnapshotSyncService.name);
  private syncPromise: Promise<PlatformSyncSummary> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async onApplicationBootstrap() {
    if (!this.config.prismaPlatformSyncEnabled || !this.config.prismaPlatformSyncOnBoot) {
      return;
    }

    try {
      await this.syncNow({ reason: 'boot' });
    } catch (error) {
      this.logger.warn(`Platform snapshot sync skipped on boot: ${String(error)}`);
    }
  }

  async syncNow(options: { reason?: string } = {}): Promise<PlatformSyncSummary> {
    if (!this.config.prismaPlatformSyncEnabled) {
      return this.emptySummary('disabled');
    }

    if (!this.prisma.isConnected) {
      return this.emptySummary('database-disconnected');
    }

    if (this.syncPromise) {
      return this.syncPromise;
    }

    this.syncPromise = this.performSync(options.reason ?? 'manual')
      .catch((error: unknown) => {
        if (this.isMissingTableError(error)) {
          this.logger.warn('Prisma normalized tables are not migrated yet. Run prisma migrate/db push before prisma:sync:platform.');
          return this.emptySummary('normalized-schema-missing');
        }

        throw error;
      })
      .finally(() => {
        this.syncPromise = null;
      });

    return this.syncPromise;
  }

  private async performSync(reason: string): Promise<PlatformSyncSummary> {
    const appRowsSeeded = this.config.prismaPlatformSeedEnabled
      ? await this.ensureAppRowsSeeded()
      : 0;
    const groupedRows = await this.loadGroupedRows();

    const users = this.mapUsers(groupedRows.auth_users ?? []);
    const sessions = this.mapSessions(groupedRows.auth_sessions ?? []);
    const refreshTokens = this.mapRefreshTokens(groupedRows.auth_refresh_tokens ?? []);
    const pendingChallenges = this.mapPendingChallenges(groupedRows.auth_pending_2fa ?? []);
    const auditLogs = [
      ...this.mapAuthAuditLogs(groupedRows.auth_audit_logs ?? []),
      ...this.mapAdminAuditLogs(groupedRows.admin_audit_logs ?? []),
    ];
    const wallets = this.mapWallets(groupedRows.wallet_accounts ?? []);
    const walletTransactions = this.mapWalletTransactions(groupedRows.payment_transactions ?? []);
    const subscriptionPlans = this.mapSubscriptionPlans(groupedRows.subscription_plans ?? []);
    const subscriptions = this.mapSubscriptions(groupedRows.user_subscriptions ?? []);
    const payoutAccounts = this.mapPayoutAccounts(groupedRows.payout_accounts ?? []);
    const payoutRequests = this.mapPayoutRequests(groupedRows.payout_requests ?? []);
    const escrows = this.mapEscrows(groupedRows.escrow_cases ?? []);
    const missions = this.mapMissions(groupedRows.bookings ?? []);
    const invoices = this.mapInvoices(groupedRows.invoices ?? []);
    const commissionEntries = this.mapCommissionEntries(groupedRows.commission_ledger ?? []);

    await this.prisma.$transaction(async (tx) => {
      await tx.userSessionRecord.deleteMany({ where: { source: 'app_row' } });
      await tx.refreshTokenSessionRecord.deleteMany({ where: { source: 'app_row' } });
      await tx.pendingTwoFactorChallengeRecord.deleteMany({ where: { source: 'app_row' } });
      await tx.auditLogEntry.deleteMany({ where: { source: 'app_row' } });
      await tx.walletTransaction.deleteMany({ where: { source: 'app_row' } });
      await tx.wallet.deleteMany({ where: { source: 'app_row' } });
      await tx.userSubscription.deleteMany({ where: { source: 'app_row' } });
      await tx.subscriptionPlan.deleteMany({ where: { source: 'app_row' } });
      await tx.payoutRequest.deleteMany({ where: { source: 'app_row' } });
      await tx.payoutAccount.deleteMany({ where: { source: 'app_row' } });
      await tx.escrowCase.deleteMany({ where: { source: 'app_row' } });
      await tx.invoice.deleteMany({ where: { source: 'app_row' } });
      await tx.commissionLedgerEntry.deleteMany({ where: { source: 'app_row' } });
      await tx.mission.deleteMany({ where: { source: 'app_row' } });
      await tx.user.deleteMany({ where: { source: 'app_row' } });

      await this.createManyInChunks(users, (batch) => tx.user.createMany({ data: batch, skipDuplicates: true }));
      await this.createManyInChunks(sessions, (batch) => tx.userSessionRecord.createMany({ data: batch, skipDuplicates: true }));
      await this.createManyInChunks(refreshTokens, (batch) => tx.refreshTokenSessionRecord.createMany({ data: batch, skipDuplicates: true }));
      await this.createManyInChunks(
        pendingChallenges,
        (batch) => tx.pendingTwoFactorChallengeRecord.createMany({ data: batch, skipDuplicates: true }),
      );
      await this.createManyInChunks(auditLogs, (batch) => tx.auditLogEntry.createMany({ data: batch, skipDuplicates: true }));
      await this.createManyInChunks(wallets, (batch) => tx.wallet.createMany({ data: batch, skipDuplicates: true }));
      await this.createManyInChunks(
        walletTransactions,
        (batch) => tx.walletTransaction.createMany({ data: batch, skipDuplicates: true }),
      );
      await this.createManyInChunks(
        subscriptionPlans,
        (batch) => tx.subscriptionPlan.createMany({ data: batch, skipDuplicates: true }),
      );
      await this.createManyInChunks(
        subscriptions,
        (batch) => tx.userSubscription.createMany({ data: batch, skipDuplicates: true }),
      );
      await this.createManyInChunks(
        payoutAccounts,
        (batch) => tx.payoutAccount.createMany({ data: batch, skipDuplicates: true }),
      );
      await this.createManyInChunks(
        payoutRequests,
        (batch) => tx.payoutRequest.createMany({ data: batch, skipDuplicates: true }),
      );
      await this.createManyInChunks(escrows, (batch) => tx.escrowCase.createMany({ data: batch, skipDuplicates: true }));
      await this.createManyInChunks(missions, (batch) => tx.mission.createMany({ data: batch, skipDuplicates: true }));
      await this.createManyInChunks(invoices, (batch) => tx.invoice.createMany({ data: batch, skipDuplicates: true }));
      await this.createManyInChunks(
        commissionEntries,
        (batch) => tx.commissionLedgerEntry.createMany({ data: batch, skipDuplicates: true }),
      );
    }, {
      maxWait: 10_000,
      timeout: 60_000,
    });

    const summary: PlatformSyncSummary = {
      appRowsSeeded,
      users: users.length,
      sessions: sessions.length,
      refreshTokens: refreshTokens.length,
      pendingChallenges: pendingChallenges.length,
      auditLogs: auditLogs.length,
      wallets: wallets.length,
      walletTransactions: walletTransactions.length,
      subscriptionPlans: subscriptionPlans.length,
      subscriptions: subscriptions.length,
      payoutAccounts: payoutAccounts.length,
      payoutRequests: payoutRequests.length,
      escrows: escrows.length,
      missions: missions.length,
      invoices: invoices.length,
      commissionEntries: commissionEntries.length,
    };

    this.logger.log(`Platform snapshot synchronized (${reason}): ${JSON.stringify(summary)}`);
    await this.auditLogService.record({
      scope: 'database',
      action: 'platform_snapshot_sync',
      targetType: 'snapshot',
      targetId: reason,
      metadata: summary as unknown as Record<string, unknown>,
    });

    return summary;
  }

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  private emptySummary(reason: string): PlatformSyncSummary {
    return {
      skipped: reason,
      appRowsSeeded: 0,
      users: 0,
      sessions: 0,
      refreshTokens: 0,
      pendingChallenges: 0,
      auditLogs: 0,
      wallets: 0,
      walletTransactions: 0,
      subscriptionPlans: 0,
      subscriptions: 0,
      payoutAccounts: 0,
      payoutRequests: 0,
      escrows: 0,
      missions: 0,
      invoices: 0,
      commissionEntries: 0,
    };
  }

  private isMissingTableError(error: unknown) {
    if (!error || typeof error !== 'object') return false;
    const maybeError = error as { code?: unknown };
    return maybeError.code === 'P2021';
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

  private toInt(value: unknown, fallback = 0) {
    const normalized = Number(value);
    return Number.isFinite(normalized) ? Math.round(normalized) : fallback;
  }

  private toFloat(value: unknown, fallback = 0) {
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized : fallback;
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

  private toDate(value: unknown) {
    if (!value) return undefined;
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  private slugify(value: string) {
    return value
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private storeRowKey(table: string, rowId: string) {
    return `${table}::${rowId}`;
  }

  private authRowKey(table: string, rowId: string) {
    return `${table}:${rowId}`;
  }

  private buildAppRow(table: AppRowTable, row: Row): Prisma.AppRowCreateManyInput {
    const rowId = this.toString(row.id);
    const key = table.startsWith('auth_') ? this.authRowKey(table, rowId) : this.storeRowKey(table, rowId);

    return {
      key,
      table,
      rowId,
      data: this.toJson(row),
    };
  }

  private buildSeedAppRows(): Prisma.AppRowCreateManyInput[] {
    const storeRows = Object.entries(createInitialStore()).flatMap(([table, rows]) => (
      rows.map((row) => this.buildAppRow(table as AppRowTable, row))
    ));

    const authRows: Array<{ table: AppRowTable; rows: Row[] }> = [
      { table: 'auth_users', rows: getInitialUsers() as unknown as Row[] },
      { table: 'auth_sessions', rows: getInitialSessions() as unknown as Row[] },
      { table: 'auth_refresh_tokens', rows: getInitialRefreshTokens() as unknown as Row[] },
      { table: 'auth_pending_2fa', rows: getInitialPendingTwoFactorChallenges() as unknown as Row[] },
      { table: 'auth_audit_logs', rows: getInitialAuditLogs() as unknown as Row[] },
    ];

    return [
      ...storeRows,
      ...authRows.flatMap(({ table, rows }) => rows.map((row) => this.buildAppRow(table, row))),
    ];
  }

  private async ensureAppRowsSeeded() {
    const records = this.buildSeedAppRows();
    let inserted = 0;

    for (let index = 0; index < records.length; index += 200) {
      const batch = records.slice(index, index + 200);
      const result = await this.prisma.appRow.createMany({
        data: batch,
        skipDuplicates: true,
      });
      inserted += result.count;
    }

    return inserted;
  }

  private async loadGroupedRows() {
    const records = await this.prisma.appRow.findMany();
    const grouped: Partial<Record<AppRowTable, Row[]>> = {};

    for (const record of records) {
      const table = record.table as AppRowTable;
      grouped[table] ??= [];
      grouped[table]!.push(this.clone(record.data as Row));
    }

    return grouped;
  }

  private async createManyInChunks<T>(items: T[], create: (batch: T[]) => Promise<unknown>) {
    for (let index = 0; index < items.length; index += 200) {
      await create(items.slice(index, index + 200));
    }
  }

  private mapUsers(rows: Row[]): Prisma.UserCreateManyInput[] {
    return rows
      .map((row) => row as unknown as StoredUser)
      .filter((row) => Boolean(row.id && row.email))
      .map((row) => ({
        id: row.id,
        email: row.email,
        firstName: row.firstName,
        lastName: row.lastName,
        role: row.role,
        status: row.status,
        phone: row.phone,
        avatar: row.avatar,
        bio: row.bio,
        location: row.location,
        publicTitle: row.publicTitle,
        website: row.website,
        preferredLanguage: row.preferredLanguage,
        languages: row.languages ? this.toJson(row.languages) : undefined,
        skills: row.skills ? this.toJson(row.skills) : undefined,
        socialLinks: row.socialLinks ? this.toJson(row.socialLinks) : undefined,
        certifications: row.certifications ? this.toJson(row.certifications) : undefined,
        portfolioItems: row.portfolioItems ? this.toJson(row.portfolioItems) : undefined,
        introVideo: row.introVideo,
        publicProfileEnabled: this.toBool(row.publicProfileEnabled),
        expertVerified: this.toBool(row.expertVerified),
        paymentSettings: row.paymentSettings ? this.toJson(row.paymentSettings) : undefined,
        isTwoFactorEnabled: this.toBool(row.is2FAEnabled),
        passwordHash: row.passwordHash,
        passwordHistory: row.passwordHistory ? this.toJson(row.passwordHistory) : undefined,
        backupCodes: this.toJson(row.backupCodes ?? []),
        failedLoginAttempts: this.toInt(row.failedLoginAttempts),
        lockedUntil: this.toDate(row.lockedUntil),
        lastPasswordChangeAt: this.toDate(row.lastPasswordChangeAt),
        lastLoginAt: this.toDate(row.lastLoginAt),
        source: 'app_row',
        metadata: this.toJson(row),
        createdAt: this.toDate(row.createdAt) ?? new Date(),
        updatedAt: this.toDate(row.lastLoginAt) ?? this.toDate(row.lastPasswordChangeAt) ?? new Date(),
      }));
  }

  private mapSessions(rows: Row[]): Prisma.UserSessionRecordCreateManyInput[] {
    return rows
      .map((row) => row as UserSession & Record<string, unknown>)
      .filter((row) => Boolean(row.id && row.userId))
      .map((row) => ({
        id: row.id,
        userId: row.userId,
        device: row.device,
        location: row.location,
        ip: row.ip,
        lastActive: this.toDate(row.lastActive),
        current: this.toBool(row.current),
        tokenHash: this.toNullableString(row.tokenHash),
        csrfToken: this.toNullableString(row.csrfToken),
        expiresAt: this.toDate(row.expiresAt),
        absoluteExpiresAt: this.toDate(row.absoluteExpiresAt),
        revokedAt: this.toDate(row.revokedAt),
        userAgent: this.toNullableString(row.userAgent),
        source: 'app_row',
        metadata: this.toJson(row),
        createdAt: this.toDate(row.createdAt) ?? this.toDate(row.lastActive) ?? new Date(),
      }));
  }

  private mapRefreshTokens(rows: Row[]): Prisma.RefreshTokenSessionRecordCreateManyInput[] {
    return rows
      .map((row) => row as unknown as RefreshTokenSession)
      .filter((row) => Boolean(row.id && row.userId && row.tokenHash && row.sessionId))
      .map((row) => ({
        id: row.id,
        userId: row.userId,
        tokenHash: row.tokenHash,
        sessionId: row.sessionId,
        expiresAt: this.toDate(row.expiresAt) ?? new Date(),
        ip: row.ip,
        userAgent: row.userAgent,
        revokedAt: this.toDate(row.revokedAt),
        replacedById: row.replacedById,
        source: 'app_row',
        metadata: this.toJson(row),
        createdAt: this.toDate(row.createdAt) ?? new Date(),
      }));
  }

  private mapPendingChallenges(rows: Row[]): Prisma.PendingTwoFactorChallengeRecordCreateManyInput[] {
    return rows
      .map((row) => row as unknown as PendingTwoFactorChallenge)
      .filter((row) => Boolean(row.id && row.userId && row.codeHash))
      .map((row) => ({
        id: row.id,
        userId: row.userId,
        codeHash: row.codeHash,
        purpose: row.purpose,
        expiresAt: this.toDate(row.expiresAt) ?? new Date(),
        attempts: this.toInt(row.attempts),
        source: 'app_row',
        metadata: this.toJson(row),
        createdAt: this.toDate(row.createdAt) ?? new Date(),
      }));
  }

  private mapAuthAuditLogs(rows: Row[]): Prisma.AuditLogEntryCreateManyInput[] {
    return rows
      .map((row) => row as unknown as AuditLog)
      .filter((row) => Boolean(row.id && row.action))
      .map((row) => ({
        id: `auth-${row.id}`,
        scope: 'auth',
        userId: row.userId,
        action: row.action,
        status: row.status,
        ip: row.ip,
        device: row.device,
        source: 'app_row',
        metadata: this.toJson(row),
        createdAt: this.toDate(row.timestamp) ?? new Date(),
      }));
  }

  private mapAdminAuditLogs(rows: Row[]): Prisma.AuditLogEntryCreateManyInput[] {
    return rows
      .map((row) => row as Record<string, unknown>)
      .filter((row) => Boolean(row.id && row.action))
      .map((row) => ({
        id: `admin-${this.toString(row.id)}`,
        scope: 'admin',
        actorLabel: this.toNullableString(row.admin),
        action: this.toString(row.action),
        targetType: this.toNullableString(row.target),
        status: this.toString(row.status, 'success'),
        ip: this.toNullableString(row.ip),
        source: 'app_row',
        metadata: this.toJson(row),
        createdAt: this.toDate(row.timestamp) ?? new Date(),
      }));
  }

  private mapWallets(rows: Row[]): Prisma.WalletCreateManyInput[] {
    return rows
      .map((row) => row as Record<string, unknown>)
      .filter((row) => Boolean(row.id && row.user_id))
      .map((row) => ({
        id: this.toString(row.id),
        userId: this.toString(row.user_id),
        currency: this.toString(row.currency, 'FCFA'),
        balance: this.toInt(row.balance),
        availableBalance: this.toInt(row.available_balance, this.toInt(row.balance)),
        heldBalance: this.toInt(row.held_balance),
        pendingReleaseBalance: this.toInt(row.pending_release_balance),
        pendingPayoutAmount: this.toInt(row.pending_payout_amount),
        source: 'app_row',
        metadata: this.toJson(row),
        createdAt: this.toDate(row.created_at ?? row.updated_at) ?? new Date(),
        updatedAt: this.toDate(row.updated_at ?? row.created_at) ?? new Date(),
      }));
  }

  private mapWalletTransactions(rows: Row[]): Prisma.WalletTransactionCreateManyInput[] {
    return rows
      .map((row) => row as Record<string, unknown>)
      .filter((row) => Boolean(row.id && row.type))
      .map((row) => ({
        id: this.toString(row.id),
        userId: this.toNullableString(row.user_id),
        type: this.toString(row.type),
        amount: this.toInt(row.amount),
        currency: this.toString(row.currency, 'FCFA'),
        method: this.toNullableString(row.method),
        status: this.toString(row.status, 'completed'),
        description: this.toNullableString(row.description),
        reference: this.toNullableString(row.reference),
        occurredAt: this.toDate(row.date ?? row.created_at) ?? new Date(),
        source: 'app_row',
        metadata: this.toJson(row),
        createdAt: this.toDate(row.created_at ?? row.date) ?? new Date(),
      }));
  }

  private mapSubscriptionPlans(rows: Row[]): Prisma.SubscriptionPlanCreateManyInput[] {
    return rows
      .map((row) => row as Record<string, unknown>)
      .filter((row) => Boolean(row.id))
      .map((row) => {
        const name = this.toString(row.name, this.toString(row.id));
        return {
          id: this.toString(row.id),
          role: this.toString(row.role, 'unknown'),
          name,
          slug: this.toString(row.slug, this.slugify(name)),
          priceMonthly: this.toInt(row.price_monthly),
          currency: this.toString(row.currency, 'FCFA'),
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
      });
  }

  private mapSubscriptions(rows: Row[]): Prisma.UserSubscriptionCreateManyInput[] {
    return rows
      .map((row) => row as Record<string, unknown>)
      .filter((row) => Boolean(row.id && row.user_id))
      .map((row) => ({
        id: this.toString(row.id),
        userId: this.toString(row.user_id),
        role: this.toString(row.role, 'unknown'),
        planId: this.toString(row.plan_id, 'unknown-plan'),
        planName: this.toString(row.plan_name, 'Plan'),
        status: this.toString(row.status, 'inactive'),
        amount: this.toInt(row.amount),
        currency: this.toString(row.currency, 'FCFA'),
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
      }));
  }

  private mapPayoutAccounts(rows: Row[]): Prisma.PayoutAccountCreateManyInput[] {
    return rows
      .map((row) => row as Record<string, unknown>)
      .filter((row) => Boolean(row.id && row.user_id))
      .map((row) => ({
        id: this.toString(row.id),
        userId: this.toString(row.user_id),
        method: this.toString(row.method, 'unknown'),
        accountName: this.toNullableString(row.account_name),
        accountIdentifier: this.toNullableString(row.account_identifier),
        label: this.toNullableString(row.label),
        isDefault: this.toBool(row.is_default),
        source: 'app_row',
        metadata: this.toJson(row),
        createdAt: this.toDate(row.created_at ?? row.updated_at) ?? new Date(),
        updatedAt: this.toDate(row.updated_at ?? row.created_at) ?? new Date(),
      }));
  }

  private mapPayoutRequests(rows: Row[]): Prisma.PayoutRequestCreateManyInput[] {
    return rows
      .map((row) => row as Record<string, unknown>)
      .filter((row) => Boolean(row.id && row.user_id))
      .map((row) => ({
        id: this.toString(row.id),
        userId: this.toString(row.user_id),
        amount: this.toInt(row.amount),
        currency: this.toString(row.currency, 'FCFA'),
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
      }));
  }

  private mapEscrows(rows: Row[]): Prisma.EscrowCaseCreateManyInput[] {
    return rows
      .map((row) => row as Record<string, unknown>)
      .filter((row) => Boolean(row.id))
      .map((row) => ({
        id: this.toString(row.id),
        bookingId: this.toNullableString(row.booking_id),
        clientId: this.toNullableString(row.client_id),
        providerId: this.toNullableString(row.provider_id),
        providerUserId: this.toNullableString(row.provider_user_id),
        requestedProviderId: this.toNullableString(row.requested_provider_id),
        service: this.toNullableString(row.service),
        amountTotal: this.toInt(row.amount_total),
        currency: this.toString(row.currency, 'FCFA'),
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
      }));
  }

  private mapMissions(rows: Row[]): Prisma.MissionCreateManyInput[] {
    return rows
      .map((row) => row as Record<string, unknown>)
      .filter((row) => Boolean(row.id))
      .map((row) => ({
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
      }));
  }

  private mapInvoices(rows: Row[]): Prisma.InvoiceCreateManyInput[] {
    return rows
      .map((row) => row as Record<string, unknown>)
      .filter((row) => Boolean(row.id))
      .map((row) => ({
        id: this.toString(row.id),
        userId: this.toNullableString(row.user_id),
        number: this.toNullableString(row.number),
        type: this.toNullableString(row.type),
        description: this.toNullableString(row.description),
        amount: this.toInt(row.amount),
        currency: this.toString(row.currency, 'FCFA'),
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
      }));
  }

  private mapCommissionEntries(rows: Row[]): Prisma.CommissionLedgerEntryCreateManyInput[] {
    return rows
      .map((row) => row as Record<string, unknown>)
      .filter((row) => Boolean(row.id))
      .map((row) => ({
        id: this.toString(row.id),
        sourceType: this.toNullableString(row.source_type),
        sourceId: this.toNullableString(row.source_id),
        userId: this.toNullableString(row.user_id),
        beneficiaryUserId: this.toNullableString(row.beneficiary_user_id),
        amount: this.toInt(row.amount),
        currency: this.toString(row.currency, 'FCFA'),
        status: this.toString(row.status, 'recognized'),
        description: this.toNullableString(row.description),
        recognizedAt: this.toDate(row.recognized_at),
        source: 'app_row',
        metadata: this.toJson(row),
        createdAt: this.toDate(row.created_at ?? row.recognized_at) ?? new Date(),
      }));
  }
}
