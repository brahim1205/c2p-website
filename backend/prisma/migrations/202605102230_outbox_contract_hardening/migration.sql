ALTER TABLE "OutboxEvent"
ADD COLUMN "actorId" TEXT,
ADD COLUMN "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "OutboxEvent"
SET "occurredAt" = "createdAt";

CREATE INDEX "OutboxEvent_actorId_idx" ON "OutboxEvent"("actorId");
CREATE INDEX "OutboxEvent_occurredAt_idx" ON "OutboxEvent"("occurredAt");
