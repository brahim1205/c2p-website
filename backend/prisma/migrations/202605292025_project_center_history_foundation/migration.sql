CREATE TABLE "ProjectCenterHistoryEntry" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "eventDate" TEXT,
    "actorName" TEXT,
    "action" TEXT NOT NULL,
    "eventType" TEXT,
    "metadata" JSONB,
    "source" TEXT NOT NULL DEFAULT 'app_row_migration',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectCenterHistoryEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectCenterHistoryEntry_projectId_eventDate_idx" ON "ProjectCenterHistoryEntry"("projectId", "eventDate");
CREATE INDEX "ProjectCenterHistoryEntry_eventType_idx" ON "ProjectCenterHistoryEntry"("eventType");
CREATE INDEX "ProjectCenterHistoryEntry_source_idx" ON "ProjectCenterHistoryEntry"("source");
