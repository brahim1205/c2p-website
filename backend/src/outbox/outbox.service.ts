import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../database/prisma.service.js';
import { normalizeOutboxEventInput } from './outbox-contract.js';
import type { OutboxEventInput } from './outbox.types.js';

@Injectable()
export class OutboxService {
  constructor(private readonly prisma: PrismaService) {}

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  private toJson(value: unknown) {
    return this.clone(value) as Prisma.InputJsonValue;
  }

  createEvent(input: OutboxEventInput): OutboxEventInput {
    const normalized = normalizeOutboxEventInput(input);
    const idempotencyKey = normalized.idempotencyKey ?? normalized.dedupeKey ?? null;
    return {
      ...normalized,
      id: normalized.id ?? `outbox-${randomUUID()}`,
      idempotencyKey,
      dedupeKey: normalized.dedupeKey ?? idempotencyKey,
      availableAt: normalized.availableAt ?? new Date().toISOString(),
      nextRetryAt: normalized.nextRetryAt ?? normalized.availableAt ?? new Date().toISOString(),
      occurredAt: normalized.occurredAt ?? new Date().toISOString(),
      correlationId: normalized.correlationId ?? null,
      financialOperationId: normalized.financialOperationId ?? null,
      metadata: normalized.metadata ?? null,
      maxRetries: normalized.maxRetries ?? 5,
    };
  }

  async enqueue(input: OutboxEventInput) {
    const [created] = await this.enqueueMany([input]);
    return created;
  }

  async enqueueMany(inputs: OutboxEventInput[]) {
    if (inputs.length === 0) {
      return [];
    }
    if (!this.prisma.isConnected) {
      return inputs.map((input) => ({ id: this.createEvent(input).id!, eventType: input.eventType }));
    }

    const created = [] as Array<{ id: string; eventType: string }>;
    await this.prisma.$transaction(async (tx) => {
      for (const input of inputs) {
        const event = this.createEvent(input);
        if (event.idempotencyKey) {
          await tx.outboxEvent.upsert({
            where: { idempotencyKey: event.idempotencyKey },
            update: {
              eventType: event.eventType,
              eventVersion: event.eventVersion ?? 1,
              aggregateType: event.aggregateType ?? undefined,
              aggregateId: event.aggregateId ?? undefined,
              actorId: event.actorId ?? undefined,
              idempotencyKey: event.idempotencyKey,
              dedupeKey: event.dedupeKey ?? undefined,
              availableAt: event.availableAt ? new Date(String(event.availableAt)) : undefined,
              nextRetryAt: event.nextRetryAt ? new Date(String(event.nextRetryAt)) : undefined,
              occurredAt: event.occurredAt ? new Date(String(event.occurredAt)) : undefined,
              correlationId: event.correlationId ?? undefined,
              financialOperationId: event.financialOperationId ?? undefined,
              payload: this.toJson(event.payload),
              metadata: this.toJson(event.metadata ?? {}),
              maxRetries: event.maxRetries ?? 5,
              source: 'native',
            },
            create: {
              id: event.id!,
              eventType: event.eventType,
              eventVersion: event.eventVersion ?? 1,
              aggregateType: event.aggregateType ?? undefined,
              aggregateId: event.aggregateId ?? undefined,
              actorId: event.actorId ?? undefined,
              idempotencyKey: event.idempotencyKey,
              dedupeKey: event.dedupeKey,
              status: 'pending',
              attemptCount: 0,
              retries: 0,
              maxRetries: event.maxRetries ?? 5,
              availableAt: event.availableAt ? new Date(String(event.availableAt)) : new Date(),
              nextRetryAt: event.nextRetryAt ? new Date(String(event.nextRetryAt)) : new Date(),
              occurredAt: event.occurredAt ? new Date(String(event.occurredAt)) : new Date(),
              correlationId: event.correlationId ?? undefined,
              financialOperationId: event.financialOperationId ?? undefined,
              payload: this.toJson(event.payload),
              source: 'native',
              metadata: this.toJson(event.metadata ?? {}),
            },
          });
        } else {
          await tx.outboxEvent.create({
            data: {
              id: event.id!,
              eventType: event.eventType,
              eventVersion: event.eventVersion ?? 1,
              aggregateType: event.aggregateType ?? undefined,
              aggregateId: event.aggregateId ?? undefined,
              actorId: event.actorId ?? undefined,
              status: 'pending',
              idempotencyKey: event.idempotencyKey ?? undefined,
              dedupeKey: event.dedupeKey ?? undefined,
              attemptCount: 0,
              retries: 0,
              maxRetries: event.maxRetries ?? 5,
              availableAt: event.availableAt ? new Date(String(event.availableAt)) : new Date(),
              nextRetryAt: event.nextRetryAt ? new Date(String(event.nextRetryAt)) : new Date(),
              occurredAt: event.occurredAt ? new Date(String(event.occurredAt)) : new Date(),
              correlationId: event.correlationId ?? undefined,
              financialOperationId: event.financialOperationId ?? undefined,
              payload: this.toJson(event.payload),
              source: 'native',
              metadata: this.toJson(event.metadata ?? {}),
            },
          });
        }
        created.push({ id: event.id!, eventType: event.eventType });
      }
    });

    return created;
  }
}
