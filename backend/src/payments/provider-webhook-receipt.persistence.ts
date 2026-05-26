import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../database/prisma.service.js';
import { providerJson } from './provider-integration.helpers.js';

export type ProviderWebhookReceiptUpsertInput = {
  provider: string;
  providerEventId?: string | null;
  eventType?: string | null;
  status: string;
  idempotencyKey?: string | null;
  correlationId?: string | null;
  rawPayload?: unknown;
  metadata?: Record<string, unknown>;
  processedAt?: Date;
  error?: string | null;
};

export async function upsertProviderWebhookReceipt(
  prisma: PrismaService,
  receiptId: string,
  input: ProviderWebhookReceiptUpsertInput,
) {
  const existing = await prisma.webhookReceipt.findFirst({
    where: {
      provider: input.provider,
      OR: [
        input.providerEventId ? { providerEventId: input.providerEventId } : undefined,
        input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined,
        { id: receiptId },
      ].filter(Boolean) as Prisma.WebhookReceiptWhereInput[],
    },
    orderBy: { createdAt: 'desc' },
  });
  const id = existing?.id ?? receiptId;

  await prisma.webhookReceipt.upsert({
    where: { id },
    update: {
      provider: input.provider,
      providerEventId: input.providerEventId ?? undefined,
      eventType: input.eventType ?? undefined,
      status: input.status,
      idempotencyKey: input.idempotencyKey ?? undefined,
      correlationId: input.correlationId ?? undefined,
      processedAt: input.processedAt ?? undefined,
      error: input.error ?? undefined,
      rawPayload: input.rawPayload ? providerJson(input.rawPayload) : undefined,
      metadata: providerJson(input.metadata ?? {}),
    },
    create: {
      id,
      provider: input.provider,
      providerEventId: input.providerEventId ?? undefined,
      eventType: input.eventType ?? undefined,
      status: input.status,
      idempotencyKey: input.idempotencyKey ?? undefined,
      correlationId: input.correlationId ?? undefined,
      processedAt: input.processedAt ?? undefined,
      error: input.error ?? undefined,
      rawPayload: providerJson(input.rawPayload ?? {}),
      metadata: providerJson(input.metadata ?? {}),
    },
  });
}
