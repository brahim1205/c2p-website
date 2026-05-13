import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { OutboxEvent, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AuditLogService } from '../database/audit-log.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { OutboxHandlerRegistryService } from './outbox-handler-registry.service.js';
import type { OutboxEventDescriptor } from './outbox.types.js';
import { OutboxService } from './outbox.service.js';

const REPLAYABLE_EVENT_TYPES = new Set([
  'communications.email.send',
  'communications.sms.send',
  'communications.notification.dispatch',
  'webhook.dispatch',
]);

@Injectable()
export class OutboxProcessorService {
  private readonly logger = new Logger(OutboxProcessorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxHandlerRegistry: OutboxHandlerRegistryService,
    private readonly outboxService: OutboxService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async processPendingBatch(limit = 25) {
    if (!this.prisma.isConnected) {
      return { claimed: 0, processed: 0, failed: 0, dead: 0 };
    }

    const events = await this.claimPending(limit);
    let processed = 0;
    let failed = 0;
    let dead = 0;

    for (const event of events) {
      try {
        await this.handleEvent(this.toDescriptor(event));
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: 'processed',
            processedAt: new Date(),
            lastError: null,
            nextRetryAt: null,
          },
        });
        processed += 1;
      } catch (error) {
        failed += 1;
        const attemptCount = Math.max(event.attemptCount, event.retries) + 1;
        const exhausted = attemptCount >= event.maxRetries;
        const nextRetryAt = exhausted ? null : this.computeNextRetryAt(attemptCount);
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: exhausted ? 'dead' : 'failed',
            attemptCount,
            retries: attemptCount,
            availableAt: nextRetryAt ?? event.availableAt,
            nextRetryAt,
            lastError: String(error),
          },
        });
        if (exhausted) {
          dead += 1;
        }
        this.logger.warn(`Outbox event ${event.id} failed: ${String(error)}`);
      }
    }

    return { claimed: events.length, processed, failed, dead };
  }

  async requeueEvent(input: {
    eventId: string;
    actorId: string;
    correlationId: string;
    reason?: string | null;
  }) {
    const event = await this.prisma.outboxEvent.findUnique({ where: { id: input.eventId } });
    if (!event) {
      throw new NotFoundException('Evenement outbox introuvable.');
    }
    if (!['dead', 'failed'].includes(event.status)) {
      throw new BadRequestException('Seuls les evenements dead ou failed peuvent etre relances.');
    }

    const metadata = this.toPayload(event.metadata);
    const previous = {
      status: event.status,
      attemptCount: event.attemptCount,
      retries: event.retries,
      nextRetryAt: event.nextRetryAt?.toISOString() ?? null,
      lastError: event.lastError ?? null,
    };

    const updated = await this.prisma.outboxEvent.update({
      where: { id: event.id },
      data: {
        status: 'pending',
        attemptCount: 0,
        retries: 0,
        processedAt: null,
        lastError: null,
        availableAt: new Date(),
        nextRetryAt: new Date(),
        metadata: this.toJson({
          ...metadata,
          operatorAction: 'requeue',
          operatorReason: input.reason ?? 'manual_requeue',
          operatorActorId: input.actorId,
          operatorCorrelationId: input.correlationId,
          operatorRequeuedAt: new Date().toISOString(),
          previousState: previous,
        }),
      },
    });

    await this.auditLogService.record({
      scope: 'outbox',
      action: 'event.requeue',
      userId: input.actorId,
      targetType: 'outbox_event',
      targetId: event.id,
      status: 'success',
      correlationId: input.correlationId,
      reason: input.reason ?? 'manual_requeue',
      before: previous,
      after: {
        status: updated.status,
        attemptCount: updated.attemptCount,
        retries: updated.retries,
      },
      metadata: {
        eventType: event.eventType,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
      },
    });

    return { eventId: updated.id, status: updated.status };
  }

  async ignoreEvent(input: {
    eventId: string;
    actorId: string;
    correlationId: string;
    reason?: string | null;
  }) {
    const event = await this.prisma.outboxEvent.findUnique({ where: { id: input.eventId } });
    if (!event) {
      throw new NotFoundException('Evenement outbox introuvable.');
    }
    if (!['dead', 'failed'].includes(event.status)) {
      throw new BadRequestException('Seuls les evenements dead ou failed peuvent etre ignores.');
    }

    const metadata = this.toPayload(event.metadata);
    const previous = {
      status: event.status,
      attemptCount: event.attemptCount,
      retries: event.retries,
      lastError: event.lastError ?? null,
    };

    const updated = await this.prisma.outboxEvent.update({
      where: { id: event.id },
      data: {
        status: 'processed',
        processedAt: new Date(),
        nextRetryAt: null,
        metadata: this.toJson({
          ...metadata,
          operatorAction: 'ignore',
          operatorReason: input.reason ?? 'operator_resolved',
          operatorActorId: input.actorId,
          operatorCorrelationId: input.correlationId,
          operatorIgnoredAt: new Date().toISOString(),
          ignoredLastError: event.lastError ?? null,
        }),
      },
    });

    await this.auditLogService.record({
      scope: 'outbox',
      action: 'event.ignore',
      userId: input.actorId,
      targetType: 'outbox_event',
      targetId: event.id,
      status: 'success',
      correlationId: input.correlationId,
      reason: input.reason ?? 'operator_resolved',
      before: previous,
      after: {
        status: updated.status,
        processedAt: updated.processedAt?.toISOString() ?? null,
      },
      metadata: {
        eventType: event.eventType,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
      },
    });

    return { eventId: updated.id, status: updated.status };
  }

  async replayEvent(input: {
    eventId: string;
    actorId: string;
    correlationId: string;
    reason?: string | null;
  }) {
    const event = await this.prisma.outboxEvent.findUnique({ where: { id: input.eventId } });
    if (!event) {
      throw new NotFoundException('Evenement outbox introuvable.');
    }
    if (!REPLAYABLE_EVENT_TYPES.has(event.eventType)) {
      throw new BadRequestException('Ce type d evenement ne peut pas etre rejoue manuellement.');
    }

    const replayId = randomUUID();
    const replayed = await this.outboxService.enqueue({
      eventType: event.eventType,
      eventVersion: event.eventVersion ?? 1,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      actorId: input.actorId,
      idempotencyKey: `${event.idempotencyKey ?? event.id}:replay:${replayId}`,
      correlationId: `${input.correlationId}:replay:${event.id}`,
      financialOperationId: event.financialOperationId,
      occurredAt: new Date().toISOString(),
      payload: this.toPayload(event.payload),
      metadata: {
        ...this.toPayload(event.metadata),
        replayOfEventId: event.id,
        replayRequestedAt: new Date().toISOString(),
        replayRequestedBy: input.actorId,
        replayReason: input.reason ?? 'manual_replay',
      },
      maxRetries: event.maxRetries,
    });

    await this.auditLogService.record({
      scope: 'outbox',
      action: 'event.replay',
      userId: input.actorId,
      targetType: 'outbox_event',
      targetId: event.id,
      status: 'success',
      correlationId: input.correlationId,
      reason: input.reason ?? 'manual_replay',
      metadata: {
        eventType: event.eventType,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        replayEventId: replayed.id,
      },
    });

    return { replayEventId: replayed.id, eventType: replayed.eventType };
  }

  private async claimPending(limit: number) {
    const now = new Date();
    const candidates = await this.prisma.outboxEvent.findMany({
      where: {
        status: { in: ['pending', 'failed'] },
        processedAt: null,
        OR: [
          { nextRetryAt: { lte: now } },
          { nextRetryAt: null, availableAt: { lte: now } },
        ],
      },
      orderBy: [{ nextRetryAt: 'asc' }, { availableAt: 'asc' }, { createdAt: 'asc' }],
      take: limit,
    });

    const claimed: OutboxEvent[] = [];
    for (const candidate of candidates) {
      const result = await this.prisma.outboxEvent.updateMany({
        where: {
          id: candidate.id,
          status: candidate.status,
          processedAt: null,
        },
        data: {
          status: 'processing',
        },
      });
      if (result.count === 1) {
        claimed.push({ ...candidate, status: 'processing' });
      }
    }

    return claimed;
  }

  private async handleEvent(event: OutboxEventDescriptor) {
    const handler = this.outboxHandlerRegistry.resolve(event);
    if (!handler) {
      throw new Error(`No outbox handler registered for ${event.eventType}@${event.eventVersion}`);
    }
    await handler.handle(event);
  }

  private computeNextRetryAt(attemptCount: number) {
    const delayMs = Math.min(30_000 * (2 ** Math.max(attemptCount - 1, 0)), 15 * 60_000);
    return new Date(Date.now() + delayMs);
  }

  private toPayload(value: Prisma.JsonValue | null) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {} as Record<string, unknown>;
    }
    return value as Record<string, unknown>;
  }

  private toJson(value: unknown) {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private toDescriptor(event: OutboxEvent): OutboxEventDescriptor {
    return {
      id: event.id,
      eventType: event.eventType,
      eventVersion: event.eventVersion ?? 1,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      actorId: event.actorId,
      idempotencyKey: event.idempotencyKey ?? event.dedupeKey,
      dedupeKey: event.dedupeKey,
      occurredAt: event.occurredAt,
      correlationId: event.correlationId,
      financialOperationId: event.financialOperationId,
      payload: this.toPayload(event.payload),
      metadata: this.toPayload(event.metadata),
      attemptCount: Math.max(event.attemptCount, event.retries),
      maxRetries: event.maxRetries,
      status: event.status,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }
}
