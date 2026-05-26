import { Injectable } from '@nestjs/common';
import { appendAppRows, collectRowsByIds, mergeRowsToPersist, syncAppStoreFromDatabase } from '../data/data-app-store.js';
import type { Row } from '../data/mock-store.js';
import { PlatformPersistenceService } from '../database/platform-persistence.service.js';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class OutboxNotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly platformPersistenceService: PlatformPersistenceService,
  ) {}

  async persistNotifications(notifications: Record<string, unknown>[]) {
    if (!Array.isArray(notifications) || notifications.length === 0) {
      return 0;
    }

    await syncAppStoreFromDatabase(this.prisma, { force: true });
    const rows = notifications.map((notification) => ({
      id: String(notification.id ?? `notif-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`),
      type: 'communication',
      is_read: false,
      created_at: new Date().toISOString(),
      ...(notification as Row),
    }));
    appendAppRows('notifications', rows);
    const rowsToPersist: Record<string, Row[]> = {};
    mergeRowsToPersist(rowsToPersist, 'notifications', collectRowsByIds('notifications', rows.map((row) => String(row.id))));
    await this.platformPersistenceService.persistRows(rowsToPersist, {
      reason: 'notification_outbox_delivery',
    });
    return notifications.length;
  }
}
