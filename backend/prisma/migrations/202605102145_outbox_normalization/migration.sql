ALTER TABLE "OutboxEvent"
ADD COLUMN     "eventVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "attemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "nextRetryAt" TIMESTAMP(3);

UPDATE "OutboxEvent"
SET "idempotencyKey" = "dedupeKey"
WHERE "idempotencyKey" IS NULL
  AND "dedupeKey" IS NOT NULL;

UPDATE "OutboxEvent"
SET "attemptCount" = COALESCE("retries", 0)
WHERE "attemptCount" = 0;

UPDATE "OutboxEvent"
SET "nextRetryAt" = "availableAt"
WHERE "nextRetryAt" IS NULL
  AND "status" IN ('pending', 'failed', 'processing');

CREATE UNIQUE INDEX "OutboxEvent_idempotencyKey_key" ON "OutboxEvent"("idempotencyKey");
CREATE INDEX "OutboxEvent_status_nextRetryAt_idx" ON "OutboxEvent"("status", "nextRetryAt");
CREATE INDEX "OutboxEvent_eventType_eventVersion_status_idx" ON "OutboxEvent"("eventType", "eventVersion", "status");
