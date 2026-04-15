-- Wipe existing data: phone will become required and unique.
-- Truncate with CASCADE to clear all dependent tables (transactions, whatsapp, etc.)
TRUNCATE TABLE "companies" RESTART IDENTITY CASCADE;

-- Make phone NOT NULL
ALTER TABLE "users" ALTER COLUMN "phone" SET NOT NULL;

-- Global unique constraint on phone
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- Lookup index for webhook sender lookup
CREATE INDEX "users_phone_idx" ON "users"("phone");
