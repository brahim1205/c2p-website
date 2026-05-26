import type { Prisma } from '@prisma/client';
import type { AuditLogService } from '../database/audit-log.service.js';
import type { PrismaService } from '../database/prisma.service.js';

interface ProviderWebhookReplayMismatchInput {
  requestId: string;
  providerEventId?: string | null;
  providerReference?: string | null;
  providerStatus?: string | null;
  receivedFingerprint: string;
  storedFingerprint: string;
  ip?: string | null;
  userAgent?: string | null;
}

function readRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function toJson(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function flagProviderWebhookReplayMismatch(
  prisma: PrismaService,
  auditLogService: AuditLogService,
  receiptId: string,
  input: ProviderWebhookReplayMismatchInput,
) {
  const receipt = await prisma.webhookReceipt.findUnique({ where: { id: receiptId } });
  const metadata = readRecord(receipt?.metadata);
  const replayMismatchCount = Number(metadata.replayMismatchCount ?? 0) + 1;

  await prisma.webhookReceipt.update({
    where: { id: receiptId },
    data: {
      error: 'webhook_replay_payload_mismatch',
      metadata: toJson({
        ...metadata,
        replayMismatchCount,
        lastReplayMismatchAt: new Date().toISOString(),
        lastReplayMismatchRequestId: input.requestId,
        lastReplayMismatchFingerprint: input.receivedFingerprint,
        lastReplayMismatchProviderStatus: input.providerStatus ?? null,
        lastReplayMismatchIp: input.ip ?? null,
        lastReplayMismatchUserAgent: input.userAgent ?? null,
      }),
    },
  });

  await auditLogService.record({
    scope: 'payments',
    action: 'dexpay_webhook_replay_mismatch',
    status: 'blocked',
    userId: 'system:dexpay',
    targetType: 'webhook_receipt',
    targetId: receiptId,
    ip: input.ip ?? null,
    device: input.userAgent ?? null,
    correlationId: input.requestId,
    metadata: {
      provider: 'dexpay',
      providerEventId: input.providerEventId ?? null,
      providerReference: input.providerReference ?? null,
      providerStatus: input.providerStatus ?? null,
      storedFingerprint: input.storedFingerprint,
      receivedFingerprint: input.receivedFingerprint,
      replayMismatchCount,
    },
  });
}
