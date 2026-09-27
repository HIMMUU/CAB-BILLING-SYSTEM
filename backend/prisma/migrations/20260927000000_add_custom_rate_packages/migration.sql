ALTER TABLE "rate_cards"
ADD COLUMN "custom_packages" JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE "rate_cards"
SET "status" = 'ACTIVE'
WHERE "status" = 'PENDING_APPROVAL';
