export interface OutboxEventInput {
  id?: string;
  eventType: string;
  eventVersion?: number;
  aggregateType?: string | null;
  aggregateId?: string | null;
  actorId?: string | null;
  idempotencyKey?: string | null;
  dedupeKey?: string | null;
  availableAt?: string | Date | null;
  nextRetryAt?: string | Date | null;
  occurredAt?: string | Date | null;
  correlationId?: string | null;
  financialOperationId?: string | null;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown> | null;
  maxRetries?: number;
}

export interface OutboxEventDescriptor {
  id: string;
  eventType: string;
  eventVersion: number;
  aggregateType?: string | null;
  aggregateId?: string | null;
  actorId?: string | null;
  idempotencyKey?: string | null;
  dedupeKey?: string | null;
  occurredAt?: Date | null;
  correlationId?: string | null;
  financialOperationId?: string | null;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  attemptCount: number;
  maxRetries: number;
  status: string;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface OutboxEventHandler {
  supports(event: OutboxEventDescriptor): boolean;
  handle(event: OutboxEventDescriptor): Promise<void>;
}
