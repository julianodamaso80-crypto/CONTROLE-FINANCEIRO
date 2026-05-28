-- =============================================
-- Tracking: atribuição (UTMs + click IDs) + log de envios CAPI/MP/Google Ads
-- Tabelas: utm_attribution, conversion_event_log, lead_status_history
-- =============================================

-- Enum: destinos de tracking
CREATE TYPE "TrackingDestination" AS ENUM ('META_CAPI', 'GA4_MP', 'GOOGLE_ADS');

-- Tabela 1: utm_attribution (1 linha por company)
CREATE TABLE "utm_attribution" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "user_id" UUID,
    "event_id" TEXT,
    "external_id" TEXT,
    "ga_client_id" TEXT,
    "fbp" TEXT,
    "fbc" TEXT,
    "gclid" TEXT,
    "fbclid" TEXT,
    "gbraid" TEXT,
    "wbraid" TEXT,
    "msclkid" TEXT,
    "ttclid" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "utm_content" TEXT,
    "utm_term" TEXT,
    "landing_page" TEXT,
    "referrer" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "utm_attribution_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "utm_attribution_company_id_key" ON "utm_attribution"("company_id");
CREATE INDEX "utm_attribution_gclid_idx" ON "utm_attribution"("gclid");
CREATE INDEX "utm_attribution_fbclid_idx" ON "utm_attribution"("fbclid");
CREATE INDEX "utm_attribution_utm_source_utm_medium_idx" ON "utm_attribution"("utm_source", "utm_medium");

ALTER TABLE "utm_attribution"
    ADD CONSTRAINT "utm_attribution_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;


-- Tabela 2: conversion_event_log (append-only, todos envios pra plataformas)
CREATE TABLE "conversion_event_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "destino" "TrackingDestination" NOT NULL,
    "event_name" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "response_status" INTEGER,
    "response_body" TEXT,
    "success" BOOLEAN NOT NULL,
    "error_message" TEXT,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "conversion_event_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "conversion_event_log_company_id_sent_at_idx" ON "conversion_event_log"("company_id", "sent_at" DESC);
CREATE INDEX "conversion_event_log_destino_success_idx" ON "conversion_event_log"("destino", "success");
CREATE INDEX "conversion_event_log_event_name_sent_at_idx" ON "conversion_event_log"("event_name", "sent_at" DESC);

ALTER TABLE "conversion_event_log"
    ADD CONSTRAINT "conversion_event_log_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;


-- Tabela 3: lead_status_history (trail de transições de status do lead)
CREATE TABLE "lead_status_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "raw_payload" JSONB,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lead_status_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "lead_status_history_company_id_changed_at_idx" ON "lead_status_history"("company_id", "changed_at" DESC);

ALTER TABLE "lead_status_history"
    ADD CONSTRAINT "lead_status_history_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
