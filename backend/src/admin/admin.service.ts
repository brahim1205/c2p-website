import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.store.js';
import { PlatformPersistenceService } from '../database/platform-persistence.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { sanitizeAdminContentItemRecord } from '../data/data-course-sanitizers.js';
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
import { NotificationsService } from '../notifications/notifications.service.js';

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
    private readonly notificationsService: NotificationsService,
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

  async updateResource(resource: string, id: string, payload: unknown, actor: AuthUser | null) {
    const config = this.getResourceConfig(resource);
    const patch = this.requireObject(payload);
    await syncAppStoreFromDatabase(this.prisma);
    const previous = this.findResourceRow(config, id);
    if (resource === 'content') {
      if (!actor) throw new BadRequestException('Administrateur requis.');
      return this.updateContentResource(config, previous, patch, actor);
    }

    const updated = patchAppRows(config.table, (row) => String(row.id) === String(previous.id), patch);
    await this.platformPersistenceService.persistRows({ [config.table]: updated }, {
      actorId: actor?.id ?? null,
      reason: `admin:${resource}:update`,
      beforeRowsByTable: { [config.table]: [previous] },
      afterRowsByTable: { [config.table]: updated },
    });
    return updated[0] ?? { ...previous, ...patch };
  }

  private async updateContentResource(
    config: AdminResourceConfig,
    previous: Row,
    patch: Row,
    actor: AuthUser,
  ) {
    const sourceCourse = String(previous.source_table) === 'courses'
      ? (store.courses ?? []).find((row) => String(row.id) === String(previous.source_id))
      : null;
    const sourceService = String(previous.source_table) === 'provider_services'
      ? (store.provider_services ?? []).find((row) => String(row.id) === String(previous.source_id))
      : null;
    const previousCourse = sourceCourse ? clone(sourceCourse) : null;
    const previousService = sourceService ? clone(sourceService) : null;
    const sanitized = sanitizeAdminContentItemRecord({ ...previous, ...patch }, actor);
    const updated = patchAppRows(config.table, (row) => String(row.id) === String(previous.id), sanitized);
    const updatedCourse = sourceCourse
      ? (store.courses ?? []).find((row) => String(row.id) === String(sourceCourse.id)) ?? null
      : null;
    const updatedService = sourceService
      ? (store.provider_services ?? []).find((row) => String(row.id) === String(sourceService.id)) ?? null
      : null;
    const rowsByTable: Record<string, Row[]> = { [config.table]: updated };
    if (updatedCourse) rowsByTable.courses = [updatedCourse];
    if (updatedService) rowsByTable.provider_services = [updatedService];

    await this.platformPersistenceService.persistRows(rowsByTable, {
      actorId: actor.id,
      reason: 'admin:content:update',
      beforeRowsByTable: {
        [config.table]: [previous],
        ...(previousCourse ? { courses: [previousCourse] } : {}),
        ...(previousService ? { provider_services: [previousService] } : {}),
      },
      afterRowsByTable: rowsByTable,
    });

    const result = updated[0] ?? { ...previous, ...sanitized };
    const statusChanged = String(previous.status) !== String(result.status);
    if (statusChanged && updatedCourse?.instructor_id) {
      const status = String(result.status);
      const decision = status === 'published'
        ? {
            title: 'Formation publiée',
            message: `Votre formation "${String(updatedCourse.title ?? result.title)}" a été validée et publiée.`,
          }
        : status === 'rejected'
          ? {
              title: 'Formation à corriger',
              message: `Votre formation "${String(updatedCourse.title ?? result.title)}" a été refusée. Consultez-la avant une nouvelle soumission.`,
            }
          : null;
      if (decision) {
        await this.notificationsService.create(actor, {
          userId: String(updatedCourse.instructor_id),
          ...decision,
          type: 'formation',
          link: `/dashboard/formateur/mes-cours/${encodeURIComponent(String(updatedCourse.id))}/programme`,
          metadata: {
            course_id: updatedCourse.id,
            moderation_status: status,
          },
        });
      }
    }
    if (statusChanged && updatedService) {
      const serviceProvider = (store.providers ?? []).find((row) => String(row.id) === String(updatedService.provider_id));
      const providerUserId = updatedService.provider_user_id ?? serviceProvider?.user_id;
      const status = String(result.status);
      const decision = status === 'published'
        ? {
            title: 'Service publié',
            message: `Votre service "${String(updatedService.title ?? result.title)}" a été validé et publié.`,
          }
        : status === 'rejected'
          ? {
              title: 'Service à corriger',
              message: `Votre service "${String(updatedService.title ?? result.title)}" a été refusé. Corrigez-le avant une nouvelle soumission.`,
            }
          : null;
      if (decision && providerUserId) {
        await this.notificationsService.create(actor, {
          userId: String(providerUserId),
          ...decision,
          type: 'service',
          link: '/dashboard/prestataire/services',
          metadata: {
            service_id: updatedService.id,
            moderation_status: status,
          },
        });
      }
    }
    return result;
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
      services: hydrateRows('provider_services', store.provider_services ?? []).sort((left, right) =>
        this.compareDesc(left.updated_at ?? left.created_at, right.updated_at ?? right.created_at),
      ),
      contentItems: hydrateRows('admin_content_items', store.admin_content_items ?? []).sort((left, right) =>
        this.compareDesc(left.date, right.date),
      ),
      certificates: hydrateRows('certificates', store.certificates ?? []).sort((left, right) =>
        this.compareDesc(left.updated_at ?? left.created_at ?? left.issued_at, right.updated_at ?? right.created_at ?? right.issued_at),
      ),
    };
  }

  async assignBookingProvider(bookingId: string, payload: unknown, actor: AuthUser | null) {
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
      assigned_by_c2p: actor?.id ?? null,
      assigned_at: now,
      updated_at: now,
    });
    await this.platformPersistenceService.persistRows({ bookings: updated }, {
      actorId: actor?.id ?? null,
      reason: 'admin:booking:assign-provider',
      beforeRowsByTable: { bookings: [previous] },
      afterRowsByTable: { bookings: updated },
    });
    if (actor && booking.client_id) {
      await this.notificationsService.create(actor, {
        userId: String(booking.client_id),
        title: 'Prestataire assigné',
        message: 'C2P a attribué votre demande à un prestataire.',
        type: 'booking',
        link: '/dashboard/client/reservations',
        metadata: { booking_id: booking.id },
      });
    }

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
