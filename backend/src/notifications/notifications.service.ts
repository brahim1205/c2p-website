import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service.js';
import type { AuthUser } from '../auth/auth.store.js';
import { PlatformPersistenceService } from '../database/platform-persistence.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { canNotifyUser } from '../data/data-actor-scope.js';
import { normalizeNotificationType } from '../data/data-notification-policy.js';
import {
  appendAppRows,
  clone,
  patchAppRows,
  store,
  syncAppStoreFromDatabase,
  withId,
} from '../data/data-app-store.js';
import type { Row } from '../data/mock-store.js';

const MAX_NOTIFICATIONS = 30;

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly platformPersistenceService: PlatformPersistenceService,
    private readonly authService: AuthService,
  ) {}

  async listMine(actor: AuthUser, limit = MAX_NOTIFICATIONS) {
    await this.authService.assertPermissionForActor(actor, 'data.notifications.read', {
      targetType: 'notifications',
      targetId: actor.id,
      reason: 'notifications:self:read',
    });
    await syncAppStoreFromDatabase(this.prisma);
    const normalizedLimit = Math.min(Math.max(Number(limit) || MAX_NOTIFICATIONS, 1), MAX_NOTIFICATIONS);
    return clone(store.notifications ?? [])
      .filter((row) => String(row.user_id) === String(actor.id))
      .sort((left, right) => Date.parse(String(right.created_at ?? '')) - Date.parse(String(left.created_at ?? '')))
      .slice(0, normalizedLimit);
  }

  async create(actor: AuthUser, payload: unknown) {
    await this.authService.assertPermissionForActor(actor, 'data.notifications.write', {
      targetType: 'notifications',
      targetId: actor.id,
      reason: 'notifications:create',
    });
    const input = this.requireObject(payload);
    const userId = String(input.userId ?? input.user_id ?? '').trim();
    if (!userId) {
      throw new BadRequestException('Destinataire notification requis.');
    }
    const notificationType = normalizeNotificationType(input.type);
    await syncAppStoreFromDatabase(this.prisma);
    if (!canNotifyUser(actor, userId, notificationType)) {
      throw new UnauthorizedException('Acces refuse.');
    }
    const now = new Date().toISOString();
    const row = withId({
      user_id: userId,
      title: String(input.title ?? '').trim(),
      message: String(input.message ?? '').trim(),
      type: notificationType,
      is_read: Boolean(input.is_read ?? false),
      link: input.link ?? null,
      metadata: this.normalizeMetadata(input.metadata, input.avatar, actor),
      created_at: now,
      updated_at: now,
    });
    if (!row.title || !row.message) {
      throw new BadRequestException('Titre et message requis.');
    }
    const created = appendAppRows('notifications', [row]);
    await this.platformPersistenceService.persistRows({ notifications: [row] }, {
      actorId: actor.id,
      reason: 'notifications:create',
      afterRowsByTable: { notifications: [row] },
    });
    return created[0] ?? row;
  }

  async markAsRead(actor: AuthUser, id: string) {
    await this.authService.assertPermissionForActor(actor, 'data.notifications.write', {
      targetType: 'notifications',
      targetId: id,
      reason: 'notifications:read',
    });
    await syncAppStoreFromDatabase(this.prisma);
    const previous = this.findOwnNotification(actor, id);
    const updated = patchAppRows('notifications', (row) =>
      String(row.id) === String(id) && String(row.user_id) === String(actor.id), {
      is_read: true,
    });
    await this.platformPersistenceService.persistRows({ notifications: updated }, {
      actorId: actor.id,
      reason: 'notifications:read',
      beforeRowsByTable: { notifications: [previous] },
      afterRowsByTable: { notifications: updated },
    });
    return updated[0] ?? { ...previous, is_read: true };
  }

  async markAllAsRead(actor: AuthUser) {
    await this.authService.assertPermissionForActor(actor, 'data.notifications.write', {
      targetType: 'notifications',
      targetId: actor.id,
      reason: 'notifications:read-all',
    });
    await syncAppStoreFromDatabase(this.prisma);
    const previousRows = clone(store.notifications ?? []).filter((row) =>
      String(row.user_id) === String(actor.id) && row.is_read !== true,
    );
    const updated = patchAppRows('notifications', (row) =>
      String(row.user_id) === String(actor.id) && row.is_read !== true, {
      is_read: true,
    });
    await this.platformPersistenceService.persistRows({ notifications: updated }, {
      actorId: actor.id,
      reason: 'notifications:read-all',
      beforeRowsByTable: { notifications: previousRows },
      afterRowsByTable: { notifications: updated },
    });
    return updated;
  }

  async deleteOne(actor: AuthUser, id: string) {
    await this.authService.assertPermissionForActor(actor, 'data.notifications.write', {
      targetType: 'notifications',
      targetId: id,
      reason: 'notifications:delete',
    });
    await syncAppStoreFromDatabase(this.prisma);
    const previous = this.findOwnNotification(actor, id);
    store.notifications = (store.notifications ?? []).filter((row) =>
      !(String(row.id) === String(id) && String(row.user_id) === String(actor.id)),
    );
    await this.platformPersistenceService.deleteRows({ notifications: [String(previous.id)] }, {
      actorId: actor.id,
      reason: 'notifications:delete',
      beforeRowsByTable: { notifications: [previous] },
    });
    return previous;
  }

  async clearMine(actor: AuthUser) {
    await this.authService.assertPermissionForActor(actor, 'data.notifications.write', {
      targetType: 'notifications',
      targetId: actor.id,
      reason: 'notifications:clear',
    });
    await syncAppStoreFromDatabase(this.prisma);
    const previousRows = clone(store.notifications ?? []).filter((row) => String(row.user_id) === String(actor.id));
    store.notifications = (store.notifications ?? []).filter((row) => String(row.user_id) !== String(actor.id));
    await this.platformPersistenceService.deleteRows({
      notifications: previousRows.map((row) => String(row.id)),
    }, {
      actorId: actor.id,
      reason: 'notifications:clear',
      beforeRowsByTable: { notifications: previousRows },
    });
    return { deleted: previousRows.length };
  }

  async getProviderRecipient(actor: AuthUser, providerId: string) {
    await this.authService.assertPermissionForActor(actor, 'data.notifications.write', {
      targetType: 'provider',
      targetId: providerId,
      reason: 'notifications:provider-recipient',
    });
    await syncAppStoreFromDatabase(this.prisma);
    const provider = (store.providers ?? []).find((row) => String(row.id) === String(providerId));
    if (!provider) {
      throw new NotFoundException('Prestataire introuvable.');
    }
    return { userId: provider.user_id ?? null };
  }

  private findOwnNotification(actor: AuthUser, id: string) {
    const row = (store.notifications ?? []).find((item) =>
      String(item.id) === String(id) && String(item.user_id) === String(actor.id),
    );
    if (!row) {
      throw new NotFoundException('Notification introuvable.');
    }
    return clone(row);
  }

  private normalizeMetadata(metadata: unknown, avatar: unknown, actor: AuthUser) {
    const actorMetadata = {
      actor_id: actor.id,
      actor_role: actor.role,
    };
    if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
      return {
        ...(metadata as Row),
        ...actorMetadata,
      };
    }
    return avatar ? { avatar, ...actorMetadata } : actorMetadata;
  }

  private requireObject(payload: unknown): Row {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new BadRequestException('Payload notification invalide.');
    }
    return payload as Row;
  }
}
