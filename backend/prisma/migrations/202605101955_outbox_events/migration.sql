-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "aggregateType" TEXT,
    "aggregateId" TEXT,
    "dedupeKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "retries" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 5,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "correlationId" TEXT,
    "financialOperationId" TEXT,
    "payload" JSONB NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'native',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OutboxEvent_dedupeKey_key" ON "OutboxEvent"("dedupeKey");
CREATE INDEX "OutboxEvent_status_availableAt_idx" ON "OutboxEvent"("status", "availableAt");
CREATE INDEX "OutboxEvent_aggregateType_aggregateId_idx" ON "OutboxEvent"("aggregateType", "aggregateId");
CREATE INDEX "OutboxEvent_correlationId_idx" ON "OutboxEvent"("correlationId");
CREATE INDEX "OutboxEvent_financialOperationId_idx" ON "OutboxEvent"("financialOperationId");
CREATE INDEX "OutboxEvent_source_idx" ON "OutboxEvent"("source");
