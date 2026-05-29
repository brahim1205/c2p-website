CREATE TABLE "ProjectCenterMilestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tasks" JSONB,
    "metadata" JSONB,
    "source" TEXT NOT NULL DEFAULT 'app_row_migration',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectCenterMilestone_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectCenterDocument" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "docType" TEXT,
    "size" TEXT,
    "docDate" TEXT,
    "category" TEXT,
    "url" TEXT,
    "metadata" JSONB,
    "source" TEXT NOT NULL DEFAULT 'app_row_migration',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectCenterDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectCenterMilestone_projectId_status_idx" ON "ProjectCenterMilestone"("projectId", "status");
CREATE INDEX "ProjectCenterMilestone_projectId_dueDate_idx" ON "ProjectCenterMilestone"("projectId", "dueDate");
CREATE INDEX "ProjectCenterMilestone_source_idx" ON "ProjectCenterMilestone"("source");
CREATE INDEX "ProjectCenterDocument_projectId_category_idx" ON "ProjectCenterDocument"("projectId", "category");
CREATE INDEX "ProjectCenterDocument_projectId_docDate_idx" ON "ProjectCenterDocument"("projectId", "docDate");
CREATE INDEX "ProjectCenterDocument_source_idx" ON "ProjectCenterDocument"("source");
