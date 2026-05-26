import { Body, Controller, Get, Param, Post, Query, Req, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../common/http/request-context.js';
import { PermissionGuard } from '../auth/permission.guard.js';
import { RequirePermission } from '../auth/require-permission.decorator.js';
import { operatorActionSchema, type OperatorActionDto } from '../common/dto/operator-action.dto.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import { PrismaService } from '../database/prisma.service.js';
import { OutboxHandlerRegistryService } from './outbox-handler-registry.service.js';
import { OutboxProcessorService } from './outbox.processor.service.js';

@ApiTags('outbox')
@Controller('outbox')
@UseGuards(PermissionGuard)
export class OutboxController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outboxProcessor: OutboxProcessorService,
    private readonly outboxHandlerRegistry: OutboxHandlerRegistryService,
  ) {}

  private assertDatabaseWriteAvailable() {
    if (!this.prisma.isConnected) {
      throw new ServiceUnavailableException('Outbox indisponible tant que la base principale est hors ligne.');
    }
  }

  @Get('metrics')
  @RequirePermission('superadmin.sensitive.read')
  async getMetrics(@Req() _request: AuthenticatedRequest) {
    if (!this.prisma.isConnected) {
      return {
        counts: {
          pending: 0,
          processing: 0,
          failed: 0,
          dead: 0,
          processed: 0,
        },
        dueNow: 0,
        oldestDueLagMs: 0,
        oldestDueLagSeconds: 0,
        maxAttemptCount: 0,
        averageAttemptCount: 0,
        supportedHandlers: this.outboxHandlerRegistry.supportedKeys(),
        generatedAt: new Date().toISOString(),
      };
    }

    const now = new Date();
    const grouped = await this.prisma.outboxEvent.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    const oldestDueEvent = await this.prisma.outboxEvent.findFirst({
      where: {
        status: { in: ['pending', 'failed'] },
        processedAt: null,
        OR: [
          { nextRetryAt: { lte: now } },
          { nextRetryAt: null, availableAt: { lte: now } },
        ],
      },
      orderBy: [{ nextRetryAt: 'asc' }, { availableAt: 'asc' }, { createdAt: 'asc' }],
    });

    const aggregate = await this.prisma.outboxEvent.aggregate({
      _max: { attemptCount: true },
      _avg: { attemptCount: true },
    });

    const counts = Object.fromEntries(grouped.map((item) => [item.status, item._count._all]));
    const dueAt = oldestDueEvent?.nextRetryAt ?? oldestDueEvent?.availableAt ?? null;
    const lagMs = dueAt ? Math.max(0, now.getTime() - dueAt.getTime()) : 0;

    return {
      counts: {
        pending: counts.pending ?? 0,
        processing: counts.processing ?? 0,
        failed: counts.failed ?? 0,
        dead: counts.dead ?? 0,
        processed: counts.processed ?? 0,
      },
      dueNow: (counts.pending ?? 0) + (counts.failed ?? 0),
      oldestDueLagMs: lagMs,
      oldestDueLagSeconds: Math.round(lagMs / 1000),
      maxAttemptCount: aggregate._max.attemptCount ?? 0,
      averageAttemptCount: Number(aggregate._avg.attemptCount ?? 0),
      supportedHandlers: this.outboxHandlerRegistry.supportedKeys(),
      generatedAt: now.toISOString(),
    };
  }

  @Get('dead-letter')
  @RequirePermission('superadmin.sensitive.read')
  async getDeadLetter(
    @Req() _request: AuthenticatedRequest,
    @Query('limit') limit?: string,
  ) {
    const take = Math.min(Math.max(Number(limit ?? 25) || 25, 1), 200);
    if (!this.prisma.isConnected) {
      return [];
    }
    return this.prisma.outboxEvent.findMany({
      where: { status: 'dead' },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take,
      select: {
        id: true,
        eventType: true,
        eventVersion: true,
        aggregateType: true,
        aggregateId: true,
        actorId: true,
        correlationId: true,
        financialOperationId: true,
        idempotencyKey: true,
        occurredAt: true,
        attemptCount: true,
        maxRetries: true,
        lastError: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  @Get('deliveries')
  @RequirePermission('superadmin.sensitive.read')
  async getDeliveries(
    @Req() _request: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('channel') channel?: string,
  ) {
    const take = Math.min(Math.max(Number(limit ?? 50) || 50, 1), 200);
    if (!this.prisma.isConnected) {
      return [];
    }
    return this.prisma.notificationDelivery.findMany({
      where: channel ? { channel } : undefined,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take,
    });
  }

  @Get('webhooks/history')
  @RequirePermission('superadmin.sensitive.read')
  async getWebhookHistory(
    @Req() _request: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const take = Math.min(Math.max(Number(limit ?? 50) || 50, 1), 200);
    if (!this.prisma.isConnected) {
      return [];
    }
    return this.prisma.webhookDispatchRecord.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take,
    });
  }

  @Post('process')
  @RequirePermission('superadmin.sensitive.write')
  async processNow(
    @Req() _request: AuthenticatedRequest,
    @Query('limit') limit?: string,
  ) {
    this.assertDatabaseWriteAvailable();
    const batchSize = Math.min(Math.max(Number(limit ?? 25) || 25, 1), 200);
    return this.outboxProcessor.processPendingBatch(batchSize);
  }

  @Post('events/:eventId/requeue')
  @RequirePermission('superadmin.sensitive.write')
  async requeueEvent(
    @Req() request: AuthenticatedRequest,
    @Param('eventId') eventId: string,
    @Body(new ZodValidationPipe(operatorActionSchema)) payload: OperatorActionDto,
  ) {
    this.assertDatabaseWriteAvailable();
    return this.outboxProcessor.requeueEvent({
      eventId,
      actorId: request.auth?.user?.id ?? 'system',
      correlationId: request.requestId ?? `req-${Date.now()}`,
      reason: payload.reason,
    });
  }

  @Post('events/:eventId/ignore')
  @RequirePermission('superadmin.sensitive.write')
  async ignoreEvent(
    @Req() request: AuthenticatedRequest,
    @Param('eventId') eventId: string,
    @Body(new ZodValidationPipe(operatorActionSchema)) payload: OperatorActionDto,
  ) {
    this.assertDatabaseWriteAvailable();
    return this.outboxProcessor.ignoreEvent({
      eventId,
      actorId: request.auth?.user?.id ?? 'system',
      correlationId: request.requestId ?? `req-${Date.now()}`,
      reason: payload.reason,
    });
  }

  @Post('events/:eventId/replay')
  @RequirePermission('superadmin.sensitive.write')
  async replayEvent(
    @Req() request: AuthenticatedRequest,
    @Param('eventId') eventId: string,
    @Body(new ZodValidationPipe(operatorActionSchema)) payload: OperatorActionDto,
  ) {
    this.assertDatabaseWriteAvailable();
    return this.outboxProcessor.replayEvent({
      eventId,
      actorId: request.auth?.user?.id ?? 'system',
      correlationId: request.requestId ?? `req-${Date.now()}`,
      reason: payload.reason,
    });
  }
}
