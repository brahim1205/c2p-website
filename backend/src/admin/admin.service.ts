import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PlatformPersistenceService } from '../database/platform-persistence.service.js';
import { PrismaService } from '../database/prisma.service.js';
import {
  appendAppRows,
  clone,
  compareValues,
  patchAppRows,
  store,
  syncAppStoreFromDatabase,
  withId,
} from '../data/data-app-store.js';
import { applyDataDeleteCascade } from '../data/data-delete-cascade.js';
import { ensureConstraints, prepareInsert, recomputeDerivedData } from '../data/data-runtime.js';
import { hydrateRows } from '../data/data-row-hydration.js';
import type { Row } from '../data/mock-store.js';

type AdminResourceConfig = {
  table: string;
  orderBy: string;
  direction: 'asc' | 'desc';
};

const ADMIN_RESOURCES: Record<string, AdminResourceConfig> = {
  accreditations: { table: 'admin_accreditations', orderBy: 'date', direction: 'desc' },
  content: { table: 'admin_content_items', orderBy: 'date', direction: 'desc' },
  campaigns: { table: 'admin_campaigns', orderBy: 'createdAt', direction: 'desc' },
  reports: { table: 'admin_reports', orderBy: 'date', direction: 'desc' },
  categories: { table: 'admin_platform_categories', orderBy: 'id', direction: 'asc' },
  rules: { table: 'admin_platform_rules', orderBy: 'id', direction: 'asc' },
  featureFlags: { table: 'admin_feature_flags', orderBy: 'scope', direction: 'asc' },
  integrations: { table: 'admin_integrations', orderBy: 'id', direction: 'asc' },
  backups: { table: 'admin_backups', orderBy: 'date', direction: 'desc' },
  securityAlerts: { table: 'admin_security_alerts', orderBy: 'timestamp', direction: 'desc' },
  auditLogs: { table: 'admin_audit_logs', orderBy: 'timestamp', direction: 'desc' },
};

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly platformPersistenceService: PlatformPersistenceService,
  ) {}

  async listResource(resource: string) {
    const config = this.getResourceConfig(resource);
    await syncAppStoreFromDatabase(this.prisma);
    return this.sortedRows(config);
  }

  async createResource(resource: string, payload: unknown, actorId: string | null) {
    const config = this.getResourceConfig(resource);
    const input = this.requireObject(payload);
    await syncAppStoreFromDatabase(this.prisma);
    const row = withId(prepareInsert(config.table, input));
    ensureConstraints(config.table, [row]);
    const created = appendAppRows(config.table, [row]);
    await this.platformPersistenceService.persistRows({ [config.table]: [row] }, {
      actorId,
      reason: `admin:${resource}:create`,
      afterRowsByTable: { [config.table]: [row] },
    });
    return created[0] ?? row;
  }

  async updateResource(resource: string, id: string, payload: unknown, actorId: string | null) {
    const config = this.getResourceConfig(resource);
    const patch = this.requireObject(payload);
    await syncAppStoreFromDatabase(this.prisma);
    const previous = this.findResourceRow(config, id);
    const updated = patchAppRows(config.table, (row) => String(row.id) === String(previous.id), patch);
    await this.platformPersistenceService.persistRows({ [config.table]: updated }, {
      actorId,
      reason: `admin:${resource}:update`,
      beforeRowsByTable: { [config.table]: [previous] },
      afterRowsByTable: { [config.table]: updated },
    });
    return updated[0] ?? { ...previous, ...patch };
  }

  async deleteResource(resource: string, id: string, actorId: string | null) {
    const config = this.getResourceConfig(resource);
    await syncAppStoreFromDatabase(this.prisma);
    const previous = this.findResourceRow(config, id);
    store[config.table] = (store[config.table] ?? []).filter((row) => String(row.id) !== String(previous.id));
    const deletedRowIdsByTable = applyDataDeleteCascade(config.table, [previous]);
    recomputeDerivedData();
    await this.platformPersistenceService.deleteRows(deletedRowIdsByTable, {
      actorId,
      reason: `admin:${resource}:delete`,
      beforeRowsByTable: { [config.table]: [previous] },
    });
    return [previous];
  }

  async getDashboardData() {
    await syncAppStoreFromDatabase(this.prisma);
    return {
      courses: hydrateRows('courses', store.courses ?? []).sort((left, right) =>
        this.compareDesc(left.updated_at ?? left.created_at, right.updated_at ?? right.created_at),
      ),
      bookings: hydrateRows('bookings', store.bookings ?? []).sort((left, right) =>
        this.compareDesc(left.created_at, right.created_at),
      ),
      providers: hydrateRows('providers', store.providers ?? [])
        .map((provider) => ({
          id: provider.id,
          name: provider.name,
          user_id: provider.user_id ?? null,
          category: provider.category ?? null,
          verified: provider.verified ?? null,
        }))
        .sort((left, right) => String(left.name ?? '').localeCompare(String(right.name ?? ''))),
    };
  }

  async assignBookingProvider(bookingId: string, payload: unknown, actorId: string | null) {
    const input = this.requireObject(payload);
    const providerId = input.provider_id ?? input.providerId;
    if (providerId === undefined || providerId === null) {
      throw new BadRequestException('Prestataire requis.');
    }
    await syncAppStoreFromDatabase(this.prisma);
    const booking = (store.bookings ?? []).find((row) => String(row.id) === String(bookingId));
    if (!booking) {
      throw new NotFoundException('Reservation introuvable.');
    }
    const provider = (store.providers ?? []).find((row) => String(row.id) === String(providerId));
    if (!provider) {
      throw new NotFoundException('Prestataire introuvable.');
    }
    const previous = clone(booking);
    const now = new Date().toISOString();
    const updated = patchAppRows('bookings', (row) => String(row.id) === String(booking.id), {
      provider_id: provider.id,
      requested_provider_id: booking.requested_provider_id ?? provider.id,
      requested_provider_name: booking.requested_provider_name ?? null,
      status: 'confirmed',
      assignment_status: 'assigned',
      assigned_by_c2p: actorId,
      assigned_at: now,
      updated_at: now,
    });
    await this.platformPersistenceService.persistRows({ bookings: updated }, {
      actorId,
      reason: 'admin:booking:assign-provider',
      beforeRowsByTable: { bookings: [previous] },
      afterRowsByTable: { bookings: updated },
    });
    return {
      ...(updated[0] ?? previous),
      provider: {
        id: provider.id,
        name: provider.name,
        user_id: provider.user_id ?? null,
        category: provider.category ?? null,
        verified: provider.verified ?? null,
      },
    };
  }

  async getAnalyticsData() {
    await syncAppStoreFromDatabase(this.prisma);
    return {
      bookings: hydrateRows('bookings', store.bookings ?? []),
      enrollments: hydrateRows('course_enrollments', store.course_enrollments ?? []),
      providers: hydrateRows('providers', store.providers ?? []),
    };
  }

  private getResourceConfig(resource: string) {
    const config = ADMIN_RESOURCES[resource];
    if (!config) {
      throw new NotFoundException('Ressource admin inconnue.');
    }
    return config;
  }

  private sortedRows(config: AdminResourceConfig) {
    const rows = hydrateRows(config.table, store[config.table] ?? []);
    return rows.sort((left, right) => {
      const delta = compareValues(left[config.orderBy], right[config.orderBy]);
      return config.direction === 'asc' ? delta : -delta;
    });
  }

  private findResourceRow(config: AdminResourceConfig, id: string) {
    const row = (store[config.table] ?? []).find((candidate) => String(candidate.id) === String(id));
    if (!row) {
      throw new NotFoundException('Ressource admin introuvable.');
    }
    return clone(row);
  }

  private requireObject(payload: unknown): Row {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new BadRequestException('Payload admin invalide.');
    }
    return payload as Row;
  }

  private compareDesc(left: unknown, right: unknown) {
    return -compareValues(left, right);
  }
}
