-- CreateTable
CREATE TABLE "RbacRole" (
    "id" TEXT NOT NULL,
    "label" TEXT,
    "description" TEXT,
    "system" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RbacRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RbacPermission" (
    "id" TEXT NOT NULL,
    "label" TEXT,
    "description" TEXT,
    "system" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RbacPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RbacRolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RbacRolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RbacUserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedBy" TEXT,
    "source" TEXT NOT NULL DEFAULT 'native',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RbacUserRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RbacRole_system_idx" ON "RbacRole"("system");

-- CreateIndex
CREATE INDEX "RbacPermission_system_idx" ON "RbacPermission"("system");

-- CreateIndex
CREATE UNIQUE INDEX "RbacRolePermission_roleId_permissionId_key" ON "RbacRolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE INDEX "RbacRolePermission_roleId_idx" ON "RbacRolePermission"("roleId");

-- CreateIndex
CREATE INDEX "RbacRolePermission_permissionId_idx" ON "RbacRolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "RbacUserRole_userId_roleId_key" ON "RbacUserRole"("userId", "roleId");

-- CreateIndex
CREATE INDEX "RbacUserRole_userId_idx" ON "RbacUserRole"("userId");

-- CreateIndex
CREATE INDEX "RbacUserRole_roleId_idx" ON "RbacUserRole"("roleId");

-- CreateIndex
CREATE INDEX "RbacUserRole_source_idx" ON "RbacUserRole"("source");
