-- Adiciona coluna provider (asaas | kirvano). Default 'kirvano' pra novos cadastros.
ALTER TABLE "subscriptions"
  ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'kirvano';

-- Marca legados Asaas como 'asaas' (preserva fluxo deles intacto).
UPDATE "subscriptions"
  SET "provider" = 'asaas'
  WHERE "asaas_subscription_id" IS NOT NULL
     OR "asaas_customer_id" IS NOT NULL;

-- Campos específicos da Kirvano.
ALTER TABLE "subscriptions"
  ADD COLUMN "kirvano_checkout_id" TEXT,
  ADD COLUMN "kirvano_customer_email" TEXT;

CREATE INDEX "subscriptions_provider_idx" ON "subscriptions"("provider");
CREATE INDEX "subscriptions_kirvano_checkout_id_idx" ON "subscriptions"("kirvano_checkout_id");
