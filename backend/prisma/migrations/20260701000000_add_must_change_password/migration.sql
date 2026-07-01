-- Força troca de senha no primeiro login pra contas criadas com senha provisória pelo admin
ALTER TABLE "users" ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false;
