-- CreateTable
CREATE TABLE "FinancialOperation" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "actorId" TEXT,
    "subjectUserId" TEXT,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "amount" INTEGER,
    "currency" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "FinancialOperation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinancialOperation_idempotencyKey_key" ON "FinancialOperation"("idempotencyKey");

-- CreateIndex
CREATE INDEX "FinancialOperation_kind_status_idx" ON "FinancialOperation"("kind", "status");

-- CreateIndex
CREATE INDEX "FinancialOperation_resourceType_resourceId_idx" ON "FinancialOperation"("resourceType", "resourceId");
