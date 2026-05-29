CREATE TABLE "MarketplaceProvider" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "name" TEXT NOT NULL,
  "title" TEXT,
  "category" TEXT,
  "location" TEXT,
  "avatar" TEXT,
  "coverImage" TEXT,
  "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "reviewCount" INTEGER NOT NULL DEFAULT 0,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "services" JSONB,
  "metadata" JSONB,
  "source" TEXT NOT NULL DEFAULT 'app_row_migration',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketplaceProvider_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MarketplaceProvider_userId_idx" ON "MarketplaceProvider"("userId");
CREATE INDEX "MarketplaceProvider_category_active_idx" ON "MarketplaceProvider"("category", "active");
CREATE INDEX "MarketplaceProvider_verified_active_idx" ON "MarketplaceProvider"("verified", "active");
CREATE INDEX "MarketplaceProvider_source_idx" ON "MarketplaceProvider"("source");

CREATE TABLE "MarketplaceProviderService" (
  "id" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "providerUserId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT,
  "location" TEXT,
  "price" INTEGER,
  "priceLabel" TEXT,
  "priceType" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "image" TEXT,
  "metadata" JSONB,
  "source" TEXT NOT NULL DEFAULT 'app_row_migration',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketplaceProviderService_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MarketplaceProviderService_providerId_status_idx" ON "MarketplaceProviderService"("providerId", "status");
CREATE INDEX "MarketplaceProviderService_providerUserId_status_idx" ON "MarketplaceProviderService"("providerUserId", "status");
CREATE INDEX "MarketplaceProviderService_category_status_idx" ON "MarketplaceProviderService"("category", "status");
CREATE INDEX "MarketplaceProviderService_source_idx" ON "MarketplaceProviderService"("source");

CREATE TABLE "MarketplaceProviderReview" (
  "id" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "clientId" TEXT,
  "clientName" TEXT,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "service" TEXT,
  "response" TEXT,
  "helpful" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "source" TEXT NOT NULL DEFAULT 'app_row_migration',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketplaceProviderReview_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MarketplaceProviderReview_providerId_createdAt_idx" ON "MarketplaceProviderReview"("providerId", "createdAt");
CREATE INDEX "MarketplaceProviderReview_clientId_createdAt_idx" ON "MarketplaceProviderReview"("clientId", "createdAt");
CREATE INDEX "MarketplaceProviderReview_rating_idx" ON "MarketplaceProviderReview"("rating");
CREATE INDEX "MarketplaceProviderReview_source_idx" ON "MarketplaceProviderReview"("source");

CREATE TABLE "MarketplaceClientFavorite" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "metadata" JSONB,
  "source" TEXT NOT NULL DEFAULT 'app_row_migration',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketplaceClientFavorite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarketplaceClientFavorite_clientId_providerId_key" ON "MarketplaceClientFavorite"("clientId", "providerId");
CREATE INDEX "MarketplaceClientFavorite_clientId_idx" ON "MarketplaceClientFavorite"("clientId");
CREATE INDEX "MarketplaceClientFavorite_providerId_idx" ON "MarketplaceClientFavorite"("providerId");
CREATE INDEX "MarketplaceClientFavorite_source_idx" ON "MarketplaceClientFavorite"("source");

CREATE TABLE "MarketplaceClientOrder" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "providerId" TEXT,
  "service" TEXT,
  "status" TEXT NOT NULL,
  "amount" INTEGER,
  "currency" TEXT NOT NULL DEFAULT 'FCFA',
  "scheduledAt" TIMESTAMP(3),
  "metadata" JSONB,
  "source" TEXT NOT NULL DEFAULT 'app_row_migration',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketplaceClientOrder_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MarketplaceClientOrder_clientId_status_idx" ON "MarketplaceClientOrder"("clientId", "status");
CREATE INDEX "MarketplaceClientOrder_providerId_status_idx" ON "MarketplaceClientOrder"("providerId", "status");
CREATE INDEX "MarketplaceClientOrder_source_idx" ON "MarketplaceClientOrder"("source");

CREATE TABLE "MarketplaceProviderVerificationRequest" (
  "id" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "requestedLevel" TEXT,
  "status" TEXT NOT NULL,
  "note" TEXT,
  "reviewedBy" TEXT,
  "requestedAt" TIMESTAMP(3),
  "reviewedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "source" TEXT NOT NULL DEFAULT 'app_row_migration',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketplaceProviderVerificationRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MarketplaceProviderVerificationRequest_providerId_status_idx" ON "MarketplaceProviderVerificationRequest"("providerId", "status");
CREATE INDEX "MarketplaceProviderVerificationRequest_userId_status_idx" ON "MarketplaceProviderVerificationRequest"("userId", "status");
CREATE INDEX "MarketplaceProviderVerificationRequest_source_idx" ON "MarketplaceProviderVerificationRequest"("source");
