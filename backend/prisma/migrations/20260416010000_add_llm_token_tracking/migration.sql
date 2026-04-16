-- AlterTable
ALTER TABLE "whatsapp_messages" ADD COLUMN "model_used" TEXT,
ADD COLUMN "prompt_tokens" INTEGER,
ADD COLUMN "completion_tokens" INTEGER,
ADD COLUMN "llm_cost_usd" DOUBLE PRECISION;
