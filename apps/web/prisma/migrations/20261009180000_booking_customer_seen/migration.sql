ALTER TABLE "MerchantBookingReservation" ADD COLUMN "customerSeenAt" TIMESTAMP(3);

CREATE INDEX "MerchantBookingReservation_profileId_customerSeenAt_idx"
ON "MerchantBookingReservation"("profileId", "customerSeenAt");
