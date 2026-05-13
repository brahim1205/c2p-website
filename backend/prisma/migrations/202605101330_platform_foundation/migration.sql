-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'client',
    "status" TEXT NOT NULL DEFAULT 'active',
    "phone" TEXT,
    "avatar" TEXT,
    "bio" TEXT,
    "location" TEXT,
    "publicTitle" TEXT,
    "website" TEXT,
    "preferredLanguage" TEXT,
    "languages" JSONB,
    "skills" JSONB,
    "socialLinks" JSONB,
    "certifications" JSONB,
    "portfolioItems" JSONB,
    "introVideo" TEXT,
    "publicProfileEnabled" BOOLEAN NOT NULL DEFAULT false,
    "expertVerified" BOOLEAN NOT NULL DEFAULT false,
    "paymentSettings" JSONB,
    "isTwoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "passwordHash" TEXT,
    "passwordHistory" JSONB,
    "backupCodes" JSONB,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastPasswordChangeAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'native',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSessionRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "device" TEXT,
    "location" TEXT,
    "ip" TEXT,
    "lastActive" TIMESTAMP(3),
    "current" BOOLEAN NOT NULL DEFAULT false,
    "tokenHash" TEXT,
    "csrfToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "absoluteExpiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "userAgent" TEXT,
    "source" TEXT NOT NULL DEFAULT 'native',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSessionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshTokenSessionRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "revokedAt" TIMESTAMP(3),
    "replacedById" TEXT,
    "source" TEXT NOT NULL DEFAULT 'native',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshTokenSessionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingTwoFactorChallengeRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'native',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingTwoFactorChallengeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLogEntry" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "userId" TEXT,
    "actorLabel" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "status" TEXT NOT NULL,
    "ip" TEXT,
    "device" TEXT,
    "source" TEXT NOT NULL DEFAULT 'native',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'FCFA',
    "balance" INTEGER NOT NULL DEFAULT 0,
    "availableBalance" INTEGER NOT NULL DEFAULT 0,
    "heldBalance" INTEGER NOT NULL DEFAULT 0,
    "pendingReleaseBalance" INTEGER NOT NULL DEFAULT 0,
    "pendingPayoutAmount" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'native',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'FCFA',
    "method" TEXT,
    "status" TEXT NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'native',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "priceMonthly" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'FCFA',
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "priorityMatching" BOOLEAN NOT NULL DEFAULT false,
    "analyticsLevel" TEXT,
    "supportLevel" TEXT,
    "verifiedBadge" BOOLEAN NOT NULL DEFAULT false,
    "features" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL DEFAULT 'native',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'FCFA',
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3),
    "renewsAt" TIMESTAMP(3),
    "lastBilledAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'native',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "accountName" TEXT,
    "accountIdentifier" TEXT,
    "label" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'native',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'FCFA',
    "method" TEXT NOT NULL,
    "accountId" TEXT,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "requestedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'native',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscrowCase" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "clientId" TEXT,
    "providerId" TEXT,
    "providerUserId" TEXT,
    "requestedProviderId" TEXT,
    "service" TEXT,
    "amountTotal" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'FCFA',
    "platformFeeAmount" INTEGER NOT NULL DEFAULT 0,
    "providerAmount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "fundedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "note" TEXT,
    "paymentTransactionId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'native',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EscrowCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mission" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "providerId" TEXT,
    "requestedProviderId" TEXT,
    "service" TEXT,
    "category" TEXT,
    "status" TEXT NOT NULL,
    "requestChannel" TEXT,
    "assignmentStatus" TEXT,
    "walletFlow" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "budgetAmount" INTEGER,
    "currency" TEXT,
    "location" TEXT,
    "description" TEXT,
    "source" TEXT NOT NULL DEFAULT 'native',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "number" TEXT,
    "type" TEXT,
    "description" TEXT,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'FCFA',
    "status" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "paidDate" TIMESTAMP(3),
    "recipient" JSONB,
    "items" JSONB,
    "source" TEXT NOT NULL DEFAULT 'native',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionLedgerEntry" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "userId" TEXT,
    "beneficiaryUserId" TEXT,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'FCFA',
    "status" TEXT NOT NULL,
    "description" TEXT,
    "recognizedAt" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'native',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppRow" (
    "key" TEXT NOT NULL,
    "table" TEXT NOT NULL,
    "rowId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppRow_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE INDEX "User_source_idx" ON "User"("source");

-- CreateIndex
CREATE INDEX "UserSessionRecord_userId_idx" ON "UserSessionRecord"("userId");

-- CreateIndex
CREATE INDEX "UserSessionRecord_source_idx" ON "UserSessionRecord"("source");

-- CreateIndex
CREATE INDEX "RefreshTokenSessionRecord_userId_idx" ON "RefreshTokenSessionRecord"("userId");

-- CreateIndex
CREATE INDEX "RefreshTokenSessionRecord_sessionId_idx" ON "RefreshTokenSessionRecord"("sessionId");

-- CreateIndex
CREATE INDEX "RefreshTokenSessionRecord_source_idx" ON "RefreshTokenSessionRecord"("source");

-- CreateIndex
CREATE INDEX "PendingTwoFactorChallengeRecord_userId_idx" ON "PendingTwoFactorChallengeRecord"("userId");

-- CreateIndex
CREATE INDEX "PendingTwoFactorChallengeRecord_source_idx" ON "PendingTwoFactorChallengeRecord"("source");

-- CreateIndex
CREATE INDEX "AuditLogEntry_scope_createdAt_idx" ON "AuditLogEntry"("scope", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLogEntry_userId_createdAt_idx" ON "AuditLogEntry"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLogEntry_source_idx" ON "AuditLogEntry"("source");

-- CreateIndex
CREATE INDEX "Wallet_userId_idx" ON "Wallet"("userId");

-- CreateIndex
CREATE INDEX "Wallet_source_idx" ON "Wallet"("source");

-- CreateIndex
CREATE INDEX "WalletTransaction_userId_occurredAt_idx" ON "WalletTransaction"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "WalletTransaction_type_status_idx" ON "WalletTransaction"("type", "status");

-- CreateIndex
CREATE INDEX "WalletTransaction_source_idx" ON "WalletTransaction"("source");

-- CreateIndex
CREATE INDEX "SubscriptionPlan_role_active_idx" ON "SubscriptionPlan"("role", "active");

-- CreateIndex
CREATE INDEX "SubscriptionPlan_source_idx" ON "SubscriptionPlan"("source");

-- CreateIndex
CREATE INDEX "UserSubscription_userId_status_idx" ON "UserSubscription"("userId", "status");

-- CreateIndex
CREATE INDEX "UserSubscription_planId_idx" ON "UserSubscription"("planId");

-- CreateIndex
CREATE INDEX "UserSubscription_source_idx" ON "UserSubscription"("source");

-- CreateIndex
CREATE INDEX "PayoutAccount_userId_idx" ON "PayoutAccount"("userId");

-- CreateIndex
CREATE INDEX "PayoutAccount_source_idx" ON "PayoutAccount"("source");

-- CreateIndex
CREATE INDEX "PayoutRequest_userId_status_idx" ON "PayoutRequest"("userId", "status");

-- CreateIndex
CREATE INDEX "PayoutRequest_source_idx" ON "PayoutRequest"("source");

-- CreateIndex
CREATE INDEX "EscrowCase_bookingId_idx" ON "EscrowCase"("bookingId");

-- CreateIndex
CREATE INDEX "EscrowCase_clientId_status_idx" ON "EscrowCase"("clientId", "status");

-- CreateIndex
CREATE INDEX "EscrowCase_providerUserId_status_idx" ON "EscrowCase"("providerUserId", "status");

-- CreateIndex
CREATE INDEX "EscrowCase_source_idx" ON "EscrowCase"("source");

-- CreateIndex
CREATE INDEX "Mission_clientId_status_idx" ON "Mission"("clientId", "status");

-- CreateIndex
CREATE INDEX "Mission_providerId_status_idx" ON "Mission"("providerId", "status");

-- CreateIndex
CREATE INDEX "Mission_source_idx" ON "Mission"("source");

-- CreateIndex
CREATE INDEX "Invoice_userId_status_idx" ON "Invoice"("userId", "status");

-- CreateIndex
CREATE INDEX "Invoice_source_idx" ON "Invoice"("source");

-- CreateIndex
CREATE INDEX "CommissionLedgerEntry_sourceType_sourceId_idx" ON "CommissionLedgerEntry"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "CommissionLedgerEntry_beneficiaryUserId_idx" ON "CommissionLedgerEntry"("beneficiaryUserId");

-- CreateIndex
CREATE INDEX "CommissionLedgerEntry_source_idx" ON "CommissionLedgerEntry"("source");

-- CreateIndex
CREATE INDEX "AppRow_table_idx" ON "AppRow"("table");

-- CreateIndex
CREATE UNIQUE INDEX "AppRow_table_rowId_key" ON "AppRow"("table", "rowId");

