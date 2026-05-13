import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from './prisma.service.js';

export interface RecordAuditLogInput {
  scope: string;
  action: string;
  status?: string;
  userId?: string | null;
  actorLabel?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  ip?: string | null;
  device?: string | null;
  financialOperationId?: string | null;
  reason?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  correlationId?: string | null;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  private toJson(value: unknown) {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  async record(input: RecordAuditLogInput) {
    if (!this.prisma.isConnected) {
      return null;
    }

    try {
      return await this.prisma.auditLogEntry.create({
        data: {
          id: `audit-${randomUUID()}`,
          scope: input.scope,
          action: input.action,
          status: input.status ?? 'success',
          userId: input.userId ?? undefined,
          actorLabel: input.actorLabel ?? undefined,
          targetType: input.targetType ?? undefined,
          targetId: input.targetId ?? undefined,
          ip: input.ip ?? undefined,
          device: input.device ?? undefined,
          source: 'native',
          metadata: this.toJson({
            ...(input.metadata ?? {}),
            ...(input.financialOperationId ? { financialOperationId: input.financialOperationId } : {}),
            ...(input.reason ? { reason: input.reason } : {}),
            ...(input.correlationId ? { correlationId: input.correlationId } : {}),
            ...(input.before ? { before: input.before } : {}),
            ...(input.after ? { after: input.after } : {}),
          }),
        },
      });
    } catch (error) {
      this.logger.warn(`Unable to persist audit log "${input.scope}:${input.action}": ${String(error)}`);
      return null;
    }
  }
}
