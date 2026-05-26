-- CreateTable
CREATE TABLE "FinanceLedgerEntry" (
    "id" TEXT NOT NULL,
    "financialOperationId" TEXT NOT NULL,
    "entryType" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "accountId" TEXT,
    "userId" TEXT,
    "direction" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'FCFA',
    "sourceType" TEXT,
    "sourceId" TEXT,
    "transactionId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinanceLedgerEntry_financialOperationId_idx" ON "FinanceLedgerEntry"("financialOperationId");

-- CreateIndex
CREATE INDEX "FinanceLedgerEntry_accountType_accountId_idx" ON "FinanceLedgerEntry"("accountType", "accountId");

-- CreateIndex
CREATE INDEX "FinanceLedgerEntry_userId_createdAt_idx" ON "FinanceLedgerEntry"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "FinanceLedgerEntry_sourceType_sourceId_idx" ON "FinanceLedgerEntry"("sourceType", "sourceId");
