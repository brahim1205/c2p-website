CREATE TABLE "ProjectCenterFundingRound" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "roundType" TEXT,
    "targetAmount" INTEGER NOT NULL DEFAULT 0,
    "raisedAmount" INTEGER NOT NULL DEFAULT 0,
    "deadline" TEXT,
    "startDate" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "description" TEXT,
    "pitchDeck" BOOLEAN NOT NULL DEFAULT false,
    "businessPlan" BOOLEAN NOT NULL DEFAULT false,
    "valuation" INTEGER NOT NULL DEFAULT 0,
    "revenue" INTEGER NOT NULL DEFAULT 0,
    "burnRate" INTEGER NOT NULL DEFAULT 0,
    "runway" TEXT,
    "nextMilestone" TEXT,
    "metadata" JSONB,
    "source" TEXT NOT NULL DEFAULT 'app_row_migration',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectCenterFundingRound_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectCenterFundingInvestor" (
    "id" TEXT NOT NULL,
    "fundingRoundId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "investorType" TEXT,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "investorDate" TEXT,
    "equity" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "metadata" JSONB,
    "source" TEXT NOT NULL DEFAULT 'app_row_migration',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectCenterFundingInvestor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectCenterPartnership" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "counterpartUserId" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "partnershipType" TEXT,
    "avatar" TEXT,
    "expertise" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "lastActivity" TEXT,
    "metadata" JSONB,
    "source" TEXT NOT NULL DEFAULT 'app_row_migration',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectCenterPartnership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectCenterTracking" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "partnerType" TEXT,
    "investedAmount" INTEGER NOT NULL DEFAULT 0,
    "roi" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "lastUpdate" TIMESTAMP(3),
    "nextMilestone" TEXT,
    "metadata" JSONB,
    "source" TEXT NOT NULL DEFAULT 'app_row_migration',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectCenterTracking_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectCenterCollaboration" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "partnerType" TEXT,
    "counterpartName" TEXT,
    "counterpartRole" TEXT,
    "collaborationType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startDate" TEXT,
    "endDate" TEXT,
    "value" INTEGER NOT NULL DEFAULT 0,
    "deliverables" JSONB,
    "meetings" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "source" TEXT NOT NULL DEFAULT 'app_row_migration',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectCenterCollaboration_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectCenterFundingRound_projectId_status_idx" ON "ProjectCenterFundingRound"("projectId", "status");
CREATE INDEX "ProjectCenterFundingRound_projectId_deadline_idx" ON "ProjectCenterFundingRound"("projectId", "deadline");
CREATE INDEX "ProjectCenterFundingRound_source_idx" ON "ProjectCenterFundingRound"("source");
CREATE INDEX "ProjectCenterFundingInvestor_fundingRoundId_status_idx" ON "ProjectCenterFundingInvestor"("fundingRoundId", "status");
CREATE INDEX "ProjectCenterFundingInvestor_source_idx" ON "ProjectCenterFundingInvestor"("source");
CREATE INDEX "ProjectCenterPartnership_projectId_status_idx" ON "ProjectCenterPartnership"("projectId", "status");
CREATE INDEX "ProjectCenterPartnership_counterpartUserId_idx" ON "ProjectCenterPartnership"("counterpartUserId");
CREATE INDEX "ProjectCenterPartnership_source_idx" ON "ProjectCenterPartnership"("source");
CREATE INDEX "ProjectCenterTracking_partnerId_status_idx" ON "ProjectCenterTracking"("partnerId", "status");
CREATE INDEX "ProjectCenterTracking_projectId_status_idx" ON "ProjectCenterTracking"("projectId", "status");
CREATE INDEX "ProjectCenterTracking_source_idx" ON "ProjectCenterTracking"("source");
CREATE INDEX "ProjectCenterCollaboration_partnerId_status_idx" ON "ProjectCenterCollaboration"("partnerId", "status");
CREATE INDEX "ProjectCenterCollaboration_projectId_status_idx" ON "ProjectCenterCollaboration"("projectId", "status");
CREATE INDEX "ProjectCenterCollaboration_source_idx" ON "ProjectCenterCollaboration"("source");
