-- CreateTable
CREATE TABLE "report_generations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "user_id" UUID,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'PANEL',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_generations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_generations_company_id_created_at_idx" ON "report_generations"("company_id", "created_at");
