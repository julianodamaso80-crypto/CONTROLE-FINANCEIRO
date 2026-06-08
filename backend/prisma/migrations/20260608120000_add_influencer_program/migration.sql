-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'INFLUENCER';

-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('SALE', 'RECURRING');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'PAID', 'CANCELED');

-- CreateTable
CREATE TABLE "influencers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "ref_code" TEXT NOT NULL,
    "sale_commission_pct" DECIMAL(5,2) NOT NULL DEFAULT 30,
    "recurring_commission_pct" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "pix_key" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "influencers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "influencer_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "influencer_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "type" "CommissionType" NOT NULL,
    "base_amount" DECIMAL(15,2) NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "influencers_user_id_key" ON "influencers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "influencers_ref_code_key" ON "influencers"("ref_code");

-- CreateIndex
CREATE INDEX "influencers_ref_code_idx" ON "influencers"("ref_code");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_company_id_key" ON "referrals"("company_id");

-- CreateIndex
CREATE INDEX "referrals_influencer_id_idx" ON "referrals"("influencer_id");

-- CreateIndex
CREATE INDEX "commissions_influencer_id_status_idx" ON "commissions"("influencer_id", "status");

-- CreateIndex
CREATE INDEX "commissions_company_id_idx" ON "commissions"("company_id");

-- CreateIndex
CREATE INDEX "commissions_created_at_idx" ON "commissions"("created_at");

-- AddForeignKey
ALTER TABLE "influencers" ADD CONSTRAINT "influencers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_influencer_id_fkey" FOREIGN KEY ("influencer_id") REFERENCES "influencers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_influencer_id_fkey" FOREIGN KEY ("influencer_id") REFERENCES "influencers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commissions" ADD CONSTRAINT "commissions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
