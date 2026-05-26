CREATE TABLE "UploadObject" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT,
  "driver" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "relativePath" TEXT NOT NULL,
  "publicUrl" TEXT,
  "folder" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "sizeBytes" BIGINT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UploadObject_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UploadObject_storageKey_key" ON "UploadObject"("storageKey");
CREATE INDEX "UploadObject_ownerId_status_idx" ON "UploadObject"("ownerId", "status");
CREATE INDEX "UploadObject_driver_status_idx" ON "UploadObject"("driver", "status");
CREATE INDEX "UploadObject_folder_idx" ON "UploadObject"("folder");
CREATE INDEX "UploadObject_resourceType_idx" ON "UploadObject"("resourceType");
