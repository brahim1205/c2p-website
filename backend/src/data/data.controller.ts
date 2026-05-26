import {
  BadRequestException,
  Body,
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
import { ApiTags } from '@nestjs/swagger';
import { PlatformPersistenceService } from '../database/platform-persistence.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { WalletService } from '../database/wallet.service.js';
import { AuthService } from '../auth/auth.service.js';
import { ConfigService } from '../config/config.service.js';
import { MonitoringService } from '../monitoring/monitoring.service.js';
import type { AuthenticatedRequest } from '../common/http/request-context.js';
import type { OutboxEventInput } from '../outbox/outbox.types.js';
import type { Row } from './mock-store.js';
import {
  appendAppRows,
  clone,
  compareValues,
  ensureTable,
  matches,
  store,
  syncAppStoreFromDatabase,
  withId,
} from './data-app-store.js';
import {
  APPEND_ONLY_TABLES,
} from './data-access-policy.js';
import {
  filterRowsForActor,
} from './data-actor-scope.js';
import {
  appendVirtualClassCreateEvents,
  appendVirtualClassUpdateEvents,
} from './data-virtual-class-events.js';
import {
  applyProviderVerificationDecision,
  issueProviderVisibilityPass,
  syncProviderStateFromSubscription,
} from './data-provider-visibility.js';
import { createProviderVisibilityContext } from './data-provider-visibility-runtime.js';
import { hydrateRows } from './data-row-hydration.js';
import { sanitizeRowsForActor } from './data-response-sanitizers.js';
import {
  ensureConstraints,
  prepareInsert,
  recomputeDerivedData,
} from './data-runtime.js';
import {
  applyBookingCreateSideEffects,
  applyBookingUpdateSideEffects,
  applyEscrowUpdateSideEffects,
  applyPayoutRequestUpdateSideEffects,
  applySubscriptionMutationSideEffects,
} from './data-finance-runtime.js';
import {
  assertMutationRowBudget,
  assertScopedMutationQuery,
  assertTableAccess,
  resolveDataReadLimit,
} from './data-table-access.js';
import {
  sanitizeCreatePayload,
  sanitizeUpdatePayload,
} from './data-mutation-sanitizers.js';
import { applyDataDeleteCascade } from './data-delete-cascade.js';
import { assertLegacyDataApiAllowed, getLegacyDataApiMode, type LegacyDataOperation } from './data-legacy-api-policy.js';

@ApiTags('data')
@Controller('data')
export class DataController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly platformPersistenceService: PlatformPersistenceService,
    private readonly walletService: WalletService,
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly monitoringService: MonitoringService,
  ) {}

  private assertLegacyDataAccess(operation: LegacyDataOperation, table: string) {
    const mode = getLegacyDataApiMode(this.configService);

    try {
      assertLegacyDataApiAllowed(this.configService, operation, table);
      this.monitoringService.recordLegacyDataApiRequest(operation, table, mode, 'allowed');
    } catch (error) {
      this.monitoringService.recordLegacyDataApiRequest(operation, table, mode, 'blocked');
      throw error;
    }
  }

  @Get(':table')
  async findMany(
    @Req() request: AuthenticatedRequest,
    @Param('table') table: string,
    @Query() query: Record<string, string | string[] | undefined>,
  ) {
    this.assertLegacyDataAccess('GET', table);
    await syncAppStoreFromDatabase(this.prisma);
    await assertTableAccess(table, request.auth?.user ?? null, 'GET', this.authService);
    ensureTable(table);
    let rows = filterRowsForActor(table, clone(store[table] ?? []), request.auth?.user ?? null).filter((row) => matches(row, query));

    if (typeof query.order === 'string') {
      const direction = query.ascending === 'true' ? 1 : -1;
      rows = rows.sort((left, right) => compareValues(left[query.order as string], right[query.order as string]) * direction);
    }

    rows = rows.slice(0, resolveDataReadLimit(query.limit));

    const hydrated = sanitizeRowsForActor(table, hydrateRows(table, rows), request.auth?.user ?? null);
    return query.single === 'true' ? (hydrated[0] ?? null) : hydrated;
  }

  @Post(':table')
  async create(
    @Req() request: AuthenticatedRequest,
    @Param('table') table: string,
    @Body() payload: Row | Row[],
  ) {
    this.assertLegacyDataAccess('POST', table);
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
    this.assertLegacyDataAccess('PATCH', table);
    await syncAppStoreFromDatabase(this.prisma);
    await assertTableAccess(table, request.auth?.user ?? null, 'PATCH', this.authService);
    assertScopedMutationQuery('PATCH', query);
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
    assertMutationRowBudget('PATCH', accessibleMatched.length);
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
    this.assertLegacyDataAccess('DELETE', table);
    await syncAppStoreFromDatabase(this.prisma);
    await assertTableAccess(table, request.auth?.user ?? null, 'DELETE', this.authService);
    assertScopedMutationQuery('DELETE', query);
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
    assertMutationRowBudget('DELETE', removed.length);
    store[table] = rows.filter((row) => !(matches(row, query) && actorRowIds.has(String(row.id))));
    const deletedRowIdsByTable = applyDataDeleteCascade(table, removed);

    recomputeDerivedData();
    await this.platformPersistenceService.deleteRows(deletedRowIdsByTable, {
      actorId: request.auth?.user?.id,
      reason: `data:${table}:delete`,
      beforeRowsByTable: { [table]: removed },
    });
    return hydrateRows(table, removed);
  }
}
