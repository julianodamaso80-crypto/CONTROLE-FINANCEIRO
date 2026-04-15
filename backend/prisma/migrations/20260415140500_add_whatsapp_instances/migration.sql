-- CreateEnum
CREATE TYPE "WhatsAppInstanceStatus" AS ENUM ('PENDING_QR', 'CONNECTING', 'CONNECTED', 'DISCONNECTED', 'FAILED');

-- CreateTable
CREATE TABLE "whatsapp_instances" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "instance_name" TEXT NOT NULL,
    "instance_token" TEXT,
    "status" "WhatsAppInstanceStatus" NOT NULL DEFAULT 'PENDING_QR',
    "qr_code_base64" TEXT,
    "phone_number" TEXT,
    "profile_name" TEXT,
    "profile_pic_url" TEXT,
    "last_connected_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_instances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_instances_company_id_key" ON "whatsapp_instances"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_instances_instance_name_key" ON "whatsapp_instances"("instance_name");

-- CreateIndex
CREATE INDEX "whatsapp_instances_instance_name_idx" ON "whatsapp_instances"("instance_name");

-- CreateIndex
CREATE INDEX "whatsapp_instances_phone_number_idx" ON "whatsapp_instances"("phone_number");

-- AddForeignKey
ALTER TABLE "whatsapp_instances" ADD CONSTRAINT "whatsapp_instances_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
