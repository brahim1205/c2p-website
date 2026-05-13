import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service.js';

type DeliveryStatus = 'pending' | 'delivered' | 'failed' | 'skipped';

@Injectable()
export class OutboxDeliveryLogService {
  constructor(private readonly prisma: PrismaService) {}

  private toJson(value: Record<string, unknown> | undefined) {
    return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
  }

  async recordNotificationDelivery(input: {
    outboxEventId: string;
    eventType: string;
    channel: 'email' | 'sms' | 'in_app';
    recipientUserId?: string | null;
    recipientAddress?: string | null;
    provider?: string | null;
    providerMessageId?: string | null;
    status: DeliveryStatus;
    error?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    if (!this.prisma.isConnected) return;
    const deliveryKey = [
      input.outboxEventId,
      input.channel,
      input.recipientUserId ?? '',
      input.recipientAddress ?? '',
    ].join(':');
    const now = new Date();
    await this.prisma.notificationDelivery.upsert({
      where: { deliveryKey },
      update: {
        status: input.status,
        provider: input.provider ?? undefined,
        providerMessageId: input.providerMessageId ?? undefined,
        attemptedAt: now,
        deliveredAt: input.status === 'delivered' ? now : undefined,
        failedAt: input.status === 'failed' ? now : undefined,
        error: input.error ?? null,
        metadata: this.toJson(input.metadata),
      },
      create: {
        id: `delivery-${randomUUID()}`,
        deliveryKey,
        outboxEventId: input.outboxEventId,
        eventType: input.eventType,
        channel: input.channel,
        recipientUserId: input.recipientUserId ?? undefined,
        recipientAddress: input.recipientAddress ?? undefined,
        provider: input.provider ?? undefined,
        providerMessageId: input.providerMessageId ?? undefined,
        status: input.status,
        attemptedAt: now,
        deliveredAt: input.status === 'delivered' ? now : undefined,
        failedAt: input.status === 'failed' ? now : undefined,
        error: input.error ?? null,
        metadata: this.toJson(input.metadata),
      },
    });
  }

  async recordWebhookDispatch(input: {
    outboxEventId: string;
    eventType: string;
    targetUrl: string;
    method: string;
    status: 'delivered' | 'failed';
    responseStatus?: number | null;
    responseBody?: string | null;
    error?: string | null;
    attemptCount?: number;
    correlationId?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    if (!this.prisma.isConnected) return;
    const dispatchKey = `${input.outboxEventId}:${input.targetUrl}:${input.method}`;
    const now = new Date();
    await this.prisma.webhookDispatchRecord.upsert({
      where: { dispatchKey },
      update: {
        status: input.status,
        responseStatus: input.responseStatus ?? undefined,
        responseBody: input.responseBody ?? undefined,
        error: input.error ?? null,
        attemptCount: input.attemptCount ?? 1,
        dispatchedAt: now,
        deliveredAt: input.status === 'delivered' ? now : undefined,
        correlationId: input.correlationId ?? undefined,
        metadata: this.toJson(input.metadata),
      },
      create: {
        id: `whdisp-${randomUUID()}`,
        dispatchKey,
        outboxEventId: input.outboxEventId,
        eventType: input.eventType,
        targetUrl: input.targetUrl,
        method: input.method,
        status: input.status,
        responseStatus: input.responseStatus ?? undefined,
        responseBody: input.responseBody ?? undefined,
        error: input.error ?? null,
        attemptCount: input.attemptCount ?? 1,
        dispatchedAt: now,
        deliveredAt: input.status === 'delivered' ? now : undefined,
        correlationId: input.correlationId ?? undefined,
        metadata: this.toJson(input.metadata),
      },
    });
  }
}
