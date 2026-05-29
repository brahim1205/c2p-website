CREATE TABLE "ProjectCenterProject" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "sector" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "phase" TEXT,
    "porteurName" TEXT,
    "funding" INTEGER NOT NULL DEFAULT 0,
    "fundingGoal" INTEGER NOT NULL DEFAULT 0,
    "teamSize" INTEGER NOT NULL DEFAULT 0,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "location" TEXT,
    "impact" TEXT,
    "image" TEXT,
    "lookingFor" JSONB,
    "nextMilestone" TEXT,
    "metadata" JSONB,
    "source" TEXT NOT NULL DEFAULT 'app_row_migration',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectCenterProject_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectCenterProject_status_category_idx" ON "ProjectCenterProject"("status", "category");
CREATE INDEX "ProjectCenterProject_ownerId_status_idx" ON "ProjectCenterProject"("ownerId", "status");
CREATE INDEX "ProjectCenterProject_source_idx" ON "ProjectCenterProject"("source");
