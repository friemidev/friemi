-- CreateEnum
CREATE TYPE "MerchantBookingScheduleMode" AS ENUM ('DAILY', 'WEEKLY', 'DATES');

-- CreateEnum
CREATE TYPE "MerchantBookingReservationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'MERCHANT_RESERVATION_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE 'MERCHANT_RESERVATION_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE 'MERCHANT_RESERVATION_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'MERCHANT_RESERVATION_CANCELLED';

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "isPersistent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastBookingAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "bookingAccessEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "merchantBookingId" TEXT;

-- CreateTable
CREATE TABLE "MerchantBookingSettings" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "createdByProfileId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "scheduleMode" "MerchantBookingScheduleMode" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "weekdays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "specificDates" DATE[],
    "closedDates" DATE[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantBookingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantBookingReservation" (
    "id" TEXT NOT NULL,
    "settingsId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "partySize" INTEGER NOT NULL,
    "contactName" VARCHAR(80) NOT NULL,
    "contactPhone" VARCHAR(32) NOT NULL,
    "note" VARCHAR(1000),
    "status" "MerchantBookingReservationStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" VARCHAR(500),
    "reviewedByProfileId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantBookingReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MerchantBookingSettings_merchantId_key" ON "MerchantBookingSettings"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantBookingSettings_activityId_key" ON "MerchantBookingSettings"("activityId");

-- CreateIndex
CREATE INDEX "MerchantBookingReservation_settingsId_date_status_idx" ON "MerchantBookingReservation"("settingsId", "date", "status");

-- CreateIndex
CREATE INDEX "MerchantBookingReservation_profileId_createdAt_idx" ON "MerchantBookingReservation"("profileId", "createdAt");

-- Keep cancelled/rejected history while allowing only one live booking per customer/date.
CREATE UNIQUE INDEX "MerchantBookingReservation_live_date_key"
ON "MerchantBookingReservation" ("settingsId", "date", "profileId")
WHERE "status" IN ('PENDING', 'ACCEPTED');

ALTER TABLE "MerchantBookingReservation"
ADD CONSTRAINT "MerchantBookingReservation_partySize_check" CHECK ("partySize" BETWEEN 1 AND 999);

ALTER TABLE "MerchantBookingSettings"
ADD CONSTRAINT "MerchantBookingSettings_date_range_check" CHECK ("endDate" IS NULL OR "endDate" >= "startDate");

-- CreateIndex
CREATE INDEX "Notification_merchantBookingId_idx" ON "Notification"("merchantBookingId");

-- AddForeignKey
ALTER TABLE "MerchantBookingSettings" ADD CONSTRAINT "MerchantBookingSettings_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantBookingSettings" ADD CONSTRAINT "MerchantBookingSettings_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantBookingSettings" ADD CONSTRAINT "MerchantBookingSettings_createdByProfileId_fkey" FOREIGN KEY ("createdByProfileId") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantBookingReservation" ADD CONSTRAINT "MerchantBookingReservation_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "MerchantBookingSettings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantBookingReservation" ADD CONSTRAINT "MerchantBookingReservation_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantBookingReservation" ADD CONSTRAINT "MerchantBookingReservation_reviewedByProfileId_fkey" FOREIGN KEY ("reviewedByProfileId") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_merchantBookingId_fkey" FOREIGN KEY ("merchantBookingId") REFERENCES "MerchantBookingReservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
