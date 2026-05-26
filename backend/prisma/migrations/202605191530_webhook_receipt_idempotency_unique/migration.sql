-- Guarantee one persisted receipt per provider/idempotency key.
-- Existing duplicates are preserved but renamed before the constraint is added,
-- so production migration cannot fail because of older race-condition rows.
WITH ranked AS (
  SELECT
    id,
    provider,
    "idempotencyKey",
    ROW_NUMBER() OVER (
      PARTITION BY provider, "idempotencyKey"
      ORDER BY "createdAt" ASC, id ASC
    ) AS rn
  FROM "WebhookReceipt"
  WHERE "idempotencyKey" IS NOT NULL
)
UPDATE "WebhookReceipt" AS receipt
SET
  "idempotencyKey" = CONCAT(receipt."idempotencyKey", ':duplicate:', receipt.id),
  metadata = COALESCE(receipt.metadata, '{}'::jsonb)
    || jsonb_build_object(
      'originalIdempotencyKey', ranked."idempotencyKey",
      'idempotencyKeyDeduplicatedAt', NOW(),
      'idempotencyKeyDeduplicatedReason', 'pre_unique_constraint_duplicate'
    )
FROM ranked
WHERE receipt.id = ranked.id
  AND ranked.rn > 1;

ALTER TABLE "WebhookReceipt"
ADD CONSTRAINT "WebhookReceipt_provider_idempotencyKey_key"
UNIQUE ("provider", "idempotencyKey");
