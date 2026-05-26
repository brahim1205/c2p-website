import { createHash } from 'crypto';
import { PrismaClient } from '@prisma/client';

const API_URL = process.env.API_URL || 'http://localhost:3003/api';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function stableNormalize(value) {
  if (Array.isArray(value)) {
    return value.map((item) => stableNormalize(item));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableNormalize(item)]),
    );
  }
  return value;
}

function fingerprint(input) {
  return createHash('sha256')
    .update(JSON.stringify(stableNormalize(input)))
    .digest('hex');
}

async function postWebhook(payload) {
  const response = await fetch(`${API_URL}/payments/providers/dexpay/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Request-Id': `webhook-replay-check-${Date.now()}`,
    },
    body: JSON.stringify(payload),
  });
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = {};
  }
  return { response, body };
}

async function main() {
  const prisma = new PrismaClient();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const providerEventId = `evt-replay-${suffix}`;
  const providerReference = `order-replay-${suffix}`;
  const providerStatus = 'COMPLETED';
  const eventType = 'provider.webhook.received';
  const idempotencyKey = `dexpay:webhook:${providerEventId}:${providerStatus}`;
  const receiptId = `whr-replay-check-${suffix}`;
  const payload = {
    eventId: providerEventId,
    orderId: providerReference,
    status: providerStatus,
  };
  const payloadFingerprint = fingerprint({
    provider: 'dexpay',
    providerEventId,
    providerReference,
    providerStatus,
    eventType,
    payload,
  });

  try {
    await prisma.webhookReceipt.create({
      data: {
        id: receiptId,
        provider: 'dexpay',
        providerEventId,
        eventType,
        status: 'processed',
        idempotencyKey,
        rawPayload: payload,
        processedAt: new Date(),
        metadata: {
          payloadFingerprint,
          smokeCheck: 'dexpay-webhook-replay',
        },
      },
    });

    const replay = await postWebhook(payload);
    assert(replay.response.ok, `expected identical webhook replay to be accepted, got ${replay.response.status}`);
    assert(replay.body?.duplicate === true, 'identical webhook replay must be marked duplicate');
    assert(String(replay.body?.receiptId) === receiptId, 'identical webhook replay must return the existing receipt');

    const divergentReplay = await postWebhook({
      ...payload,
      amount: 12345,
    });
    assert(
      divergentReplay.response.status === 409,
      `expected divergent webhook replay to be rejected with 409, got ${divergentReplay.response.status}`,
    );

    const updatedReceipt = await prisma.webhookReceipt.findUnique({ where: { id: receiptId } });
    assert(updatedReceipt?.error === 'webhook_replay_payload_mismatch', 'replay mismatch must be persisted on the receipt');
    assert(
      Number(updatedReceipt?.metadata?.replayMismatchCount ?? 0) >= 1,
      'replay mismatch counter must be incremented',
    );

    console.log(JSON.stringify({
      ok: true,
      receiptId,
      duplicateAccepted: true,
      divergentReplayBlocked: true,
    }, null, 2));
  } finally {
    await prisma.webhookReceipt.deleteMany({ where: { id: receiptId } });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
