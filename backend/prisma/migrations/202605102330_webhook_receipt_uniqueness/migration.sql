CREATE UNIQUE INDEX "WebhookReceipt_provider_providerEventId_key"
ON "WebhookReceipt"("provider", "providerEventId");
