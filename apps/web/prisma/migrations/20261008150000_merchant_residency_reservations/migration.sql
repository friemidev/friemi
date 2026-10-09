-- CreateEnum
CREATE TYPE "MerchantResidencyStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "MerchantResidencySignupStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateTable
CREATE TABLE "MerchantResidencySlot" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "requestedByProfileId" TEXT,
    "reviewedByProfileId" TEXT,
    "date" DATE NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" TEXT NOT NULL,
    "status" "MerchantResidencyStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" VARCHAR(500),
    "reviewedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "activityId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantResidencySlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantResidencySignup" (
    "id" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "status" "MerchantResidencySignupStatus" NOT NULL DEFAULT 'ACTIVE',
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantResidencySignup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MerchantResidencySlot_activityId_key" ON "MerchantResidencySlot"("activityId");

-- CreateIndex
CREATE INDEX "MerchantResidencySlot_merchantId_date_status_idx" ON "MerchantResidencySlot"("merchantId", "date", "status");

-- CreateIndex
CREATE INDEX "MerchantResidencySlot_date_status_idx" ON "MerchantResidencySlot"("date", "status");

-- CreateIndex
CREATE INDEX "MerchantResidencySlot_status_createdAt_idx" ON "MerchantResidencySlot"("status", "createdAt");

-- CreateIndex
CREATE INDEX "MerchantResidencySignup_profileId_status_idx" ON "MerchantResidencySignup"("profileId", "status");

-- CreateIndex
CREATE INDEX "MerchantResidencySignup_slotId_status_idx" ON "MerchantResidencySignup"("slotId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantResidencySignup_slotId_profileId_key" ON "MerchantResidencySignup"("slotId", "profileId");

-- AddForeignKey
ALTER TABLE "MerchantResidencySlot" ADD CONSTRAINT "MerchantResidencySlot_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantResidencySlot" ADD CONSTRAINT "MerchantResidencySlot_requestedByProfileId_fkey" FOREIGN KEY ("requestedByProfileId") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantResidencySlot" ADD CONSTRAINT "MerchantResidencySlot_reviewedByProfileId_fkey" FOREIGN KEY ("reviewedByProfileId") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantResidencySlot" ADD CONSTRAINT "MerchantResidencySlot_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantResidencySignup" ADD CONSTRAINT "MerchantResidencySignup_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "MerchantResidencySlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantResidencySignup" ADD CONSTRAINT "MerchantResidencySignup_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- A merchant can hold one open request per date. Rejected/cancelled requests
-- remain as history and may be replaced by a fresh request.
CREATE UNIQUE INDEX "MerchantResidencySlot_merchant_open_date_key"
  ON "MerchantResidencySlot"("merchantId", "date")
  WHERE "status" IN ('PENDING', 'CONFIRMED', 'PUBLISHED');

-- The Friemi venue confirms only one merchant residency for a calendar date.
CREATE UNIQUE INDEX "MerchantResidencySlot_confirmed_date_key"
  ON "MerchantResidencySlot"("date")
  WHERE "status" IN ('CONFIRMED', 'PUBLISHED');

ALTER TABLE "MerchantResidencySlot"
  ADD CONSTRAINT "MerchantResidencySlot_published_activity_check"
  CHECK ("status" <> 'PUBLISHED' OR ("activityId" IS NOT NULL AND "publishedAt" IS NOT NULL));
