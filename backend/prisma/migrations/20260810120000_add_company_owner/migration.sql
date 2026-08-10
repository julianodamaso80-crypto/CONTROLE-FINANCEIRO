-- Dono da conta: separa "quem manda na própria conta" de "admin da plataforma".
-- Até aqui, gerenciar membros exigia role ADMIN, que é a mesma role que abre o
-- painel /admin da plataforma inteira — por isso nenhum cliente conseguia
-- convidar ninguém.

ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "owner_id" UUID;

-- Backfill: o usuário mais antigo de cada empresa é o dono.
UPDATE "companies" c
SET "owner_id" = u.id
FROM (
  SELECT DISTINCT ON (company_id) id, company_id
  FROM "users"
  ORDER BY company_id, created_at ASC
) u
WHERE u.company_id = c.id
  AND c."owner_id" IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'companies_owner_id_fkey'
  ) THEN
    ALTER TABLE "companies"
      ADD CONSTRAINT "companies_owner_id_fkey"
      FOREIGN KEY ("owner_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "companies_owner_id_idx" ON "companies"("owner_id");
