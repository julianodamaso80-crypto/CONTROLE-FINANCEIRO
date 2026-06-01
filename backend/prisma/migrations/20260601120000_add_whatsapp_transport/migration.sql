-- CreateEnum
CREATE TYPE "WhatsAppTransport" AS ENUM ('EVOLUTION', 'CLOUD');

-- AlterTable: novos cadastros nascem CLOUD (default)
ALTER TABLE "companies" ADD COLUMN "whatsapp_transport" "WhatsAppTransport" NOT NULL DEFAULT 'CLOUD';

-- Backfill: todas as empresas que JÁ existem continuam na Evolution
UPDATE "companies" SET "whatsapp_transport" = 'EVOLUTION';
