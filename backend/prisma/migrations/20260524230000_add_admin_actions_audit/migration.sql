-- CreateTable
CREATE TABLE "admin_actions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "admin_id" UUID NOT NULL,
    "admin_name" TEXT NOT NULL,
    "admin_email" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" UUID,
    "target_label" TEXT,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_actions_admin_id_created_at_idx" ON "admin_actions"("admin_id", "created_at");

-- CreateIndex
CREATE INDEX "admin_actions_target_id_idx" ON "admin_actions"("target_id");

-- CreateIndex
CREATE INDEX "admin_actions_created_at_idx" ON "admin_actions"("created_at");
