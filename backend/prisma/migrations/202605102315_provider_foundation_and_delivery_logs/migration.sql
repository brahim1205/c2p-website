CREATE TABLE "NotificationDelivery" (
  "id" TEXT NOT NULL,
  "deliveryKey" TEXT NOT NULL,
  "outboxEventId" TEXT,
  "eventType" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "recipientUserId" TEXT,
  "recipientAddress" TEXT,
  "provider" TEXT,
  "providerMessageId" TEXT,
  "status" TEXT NOT NULL,
  "attemptedAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "error" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationDelivery_deliveryKey_key" ON "NotificationDelivery"("deliveryKey");
CREATE INDEX "NotificationDelivery_outboxEventId_idx" ON "NotificationDelivery"("outboxEventId");
CREATE INDEX "NotificationDelivery_channel_status_idx" ON "NotificationDelivery"("channel", "status");
CREATE INDEX "NotificationDelivery_recipientUserId_createdAt_idx" ON "NotificationDelivery"("recipientUserId", "createdAt");

CREATE TABLE "WebhookDispatchRecord" (
  "id" TEXT NOT NULL,
  "dispatchKey" TEXT NOT NULL,
  "outboxEventId" TEXT,
  "eventType" TEXT NOT NULL,
  "targetUrl" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "responseStatus" INTEGER,
  "responseBody" TEXT,
  "error" TEXT,
  "attemptCount" INTEGER NOT NULL DEFAULT 1,
  "dispatchedAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "correlationId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WebhookDispatchRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebhookDispatchRecord_dispatchKey_key" ON "WebhookDispatchRecord"("dispatchKey");
CREATE INDEX "WebhookDispatchRecord_outboxEventId_idx" ON "WebhookDispatchRecord"("outboxEventId");
CREATE INDEX "WebhookDispatchRecord_status_createdAt_idx" ON "WebhookDispatchRecord"("status", "createdAt");
CREATE INDEX "WebhookDispatchRecord_correlationId_idx" ON "WebhookDispatchRecord"("correlationId");

CREATE TABLE "PaymentIntent" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "userId" TEXT,
  "provider" TEXT NOT NULL,
  "providerIntentRef" TEXT,
  "contextType" TEXT,
  "contextId" TEXT,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'FCFA',
  "status" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "confirmedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "financialOperationId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PaymentIntent_userId_status_idx" ON "PaymentIntent"("userId", "status");
CREATE INDEX "PaymentIntent_provider_status_idx" ON "PaymentIntent"("provider", "status");
CREATE INDEX "PaymentIntent_contextType_contextId_idx" ON "PaymentIntent"("contextType", "contextId");
CREATE INDEX "PaymentIntent_financialOperationId_idx" ON "PaymentIntent"("financialOperationId");

CREATE TABLE "ProviderTransaction" (
  "id" TEXT NOT NULL,
  "paymentIntentId" TEXT,
  "provider" TEXT NOT NULL,
  "providerReference" TEXT NOT NULL,
  "providerStatus" TEXT NOT NULL,
  "direction" TEXT,
  "amount" INTEGER,
  "currency" TEXT,
  "confirmedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "rawPayload" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProviderTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProviderTransaction_provider_providerReference_key" ON "ProviderTransaction"("provider", "providerReference");
CREATE INDEX "ProviderTransaction_paymentIntentId_idx" ON "ProviderTransaction"("paymentIntentId");
CREATE INDEX "ProviderTransaction_provider_providerStatus_idx" ON "ProviderTransaction"("provider", "providerStatus");

CREATE TABLE "WebhookReceipt" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerEventId" TEXT,
  "eventType" TEXT,
  "status" TEXT NOT NULL,
  "idempotencyKey" TEXT,
  "correlationId" TEXT,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "error" TEXT,
  "rawPayload" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WebhookReceipt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WebhookReceipt_provider_status_idx" ON "WebhookReceipt"("provider", "status");
CREATE INDEX "WebhookReceipt_providerEventId_idx" ON "WebhookReceipt"("providerEventId");
CREATE INDEX "WebhookReceipt_idempotencyKey_idx" ON "WebhookReceipt"("idempotencyKey");
CREATE INDEX "WebhookReceipt_correlationId_idx" ON "WebhookReceipt"("correlationId");

CREATE TABLE "SettlementRecord" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerSettlementRef" TEXT,
  "status" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'FCFA',
  "settledAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SettlementRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SettlementRecord_provider_status_idx" ON "SettlementRecord"("provider", "status");
CREATE INDEX "SettlementRecord_providerSettlementRef_idx" ON "SettlementRecord"("providerSettlementRef");

CREATE TABLE "ReconciliationJob" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "scope" TEXT,
  "status" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "windowStart" TIMESTAMP(3),
  "windowEnd" TIMESTAMP(3),
  "summary" JSONB,
  "error" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReconciliationJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReconciliationJob_provider_status_idx" ON "ReconciliationJob"("provider", "status");
CREATE INDEX "ReconciliationJob_windowStart_windowEnd_idx" ON "ReconciliationJob"("windowStart", "windowEnd");
