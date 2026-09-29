ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'COUPON_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'COUPON_CLAIMED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'COUPON_REDEEMED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'COUPON_REDEMPTION_COMPLETED';

CREATE TYPE "CouponWalletStatus" AS ENUM ('AVAILABLE', 'REDEEMED', 'VOIDED');

ALTER TABLE "Merchant" ADD COLUMN "ownerProfileId" TEXT;

CREATE TABLE "Coupon" (
  "id" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "slug" VARCHAR(64) NOT NULL DEFAULT 'default',
  "claimToken" VARCHAR(64) NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "description" TEXT NOT NULL,
  "terms" TEXT,
  "validFrom" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CouponWalletItem" (
  "id" TEXT NOT NULL,
  "couponId" TEXT NOT NULL,
  "ownerProfileId" TEXT NOT NULL,
  "redemptionToken" VARCHAR(64) NOT NULL,
  "status" "CouponWalletStatus" NOT NULL DEFAULT 'AVAILABLE',
  "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "redeemedAt" TIMESTAMP(3),
  "redeemedByProfileId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CouponWalletItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Notification" ADD COLUMN "couponWalletItemId" TEXT;

CREATE UNIQUE INDEX "Merchant_ownerProfileId_key" ON "Merchant"("ownerProfileId");
CREATE INDEX "Merchant_ownerProfileId_isActive_idx" ON "Merchant"("ownerProfileId", "isActive");
CREATE UNIQUE INDEX "Coupon_claimToken_key" ON "Coupon"("claimToken");
CREATE UNIQUE INDEX "Coupon_merchantId_slug_key" ON "Coupon"("merchantId", "slug");
CREATE INDEX "Coupon_merchantId_isActive_createdAt_idx" ON "Coupon"("merchantId", "isActive", "createdAt");
CREATE INDEX "Coupon_expiresAt_idx" ON "Coupon"("expiresAt");
CREATE UNIQUE INDEX "CouponWalletItem_redemptionToken_key" ON "CouponWalletItem"("redemptionToken");
CREATE UNIQUE INDEX "CouponWalletItem_couponId_ownerProfileId_key" ON "CouponWalletItem"("couponId", "ownerProfileId");
CREATE INDEX "CouponWalletItem_ownerProfileId_status_claimedAt_idx" ON "CouponWalletItem"("ownerProfileId", "status", "claimedAt");
CREATE INDEX "CouponWalletItem_couponId_status_idx" ON "CouponWalletItem"("couponId", "status");
CREATE INDEX "CouponWalletItem_redeemedByProfileId_redeemedAt_idx" ON "CouponWalletItem"("redeemedByProfileId", "redeemedAt");
CREATE INDEX "Notification_couponWalletItemId_idx" ON "Notification"("couponWalletItemId");

ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_ownerProfileId_fkey" FOREIGN KEY ("ownerProfileId") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponWalletItem" ADD CONSTRAINT "CouponWalletItem_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponWalletItem" ADD CONSTRAINT "CouponWalletItem_ownerProfileId_fkey" FOREIGN KEY ("ownerProfileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponWalletItem" ADD CONSTRAINT "CouponWalletItem_redeemedByProfileId_fkey" FOREIGN KEY ("redeemedByProfileId") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_couponWalletItemId_fkey" FOREIGN KEY ("couponWalletItemId") REFERENCES "CouponWalletItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
