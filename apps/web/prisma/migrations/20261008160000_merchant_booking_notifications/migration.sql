ALTER TYPE "NotificationType" ADD VALUE 'MERCHANT_BOOKING_CANCELLED';
ALTER TYPE "NotificationType" ADD VALUE 'MERCHANT_BOOKING_CONFIRMED';
ALTER TYPE "NotificationType" ADD VALUE 'MERCHANT_BOOKING_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'MERCHANT_BOOKING_PUBLISHED';

ALTER TABLE "Notification" ADD COLUMN "residencySlotId" TEXT;
CREATE INDEX "Notification_residencySlotId_idx" ON "Notification"("residencySlotId");
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_residencySlotId_fkey"
  FOREIGN KEY ("residencySlotId") REFERENCES "MerchantResidencySlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
