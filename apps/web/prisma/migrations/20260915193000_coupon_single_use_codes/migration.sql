CREATE TYPE "CouponClaimCodeStatus" AS ENUM ('ACTIVE', 'CLAIMED', 'REVOKED');

ALTER TABLE "Coupon"
ADD COLUMN "backgroundColor" VARCHAR(7) NOT NULL DEFAULT '#0F6D46',
ADD COLUMN "foregroundColor" VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
ADD COLUMN "accentColor" VARCHAR(7) NOT NULL DEFAULT '#F1F2E3';

CREATE TABLE "CouponClaimCode" (
  "id" TEXT NOT NULL,
  "couponId" TEXT NOT NULL,
  "token" VARCHAR(64) NOT NULL,
  "status" "CouponClaimCodeStatus" NOT NULL DEFAULT 'ACTIVE',
  "claimedByProfileId" TEXT,
  "claimedWalletItemId" TEXT,
  "claimedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CouponClaimCode_pkey" PRIMARY KEY ("id")
);

INSERT INTO "CouponClaimCode" (
  "id",
  "couponId",
  "token",
  "status",
  "createdAt",
  "updatedAt"
)
SELECT
  'legacy_' || md5("id" || "claimToken"),
  "id",
  "claimToken",
  'ACTIVE'::"CouponClaimCodeStatus",
  "createdAt",
  CURRENT_TIMESTAMP
FROM "Coupon";

DROP INDEX "Coupon_claimToken_key";
ALTER TABLE "Coupon" DROP COLUMN "claimToken";

DROP INDEX "CouponWalletItem_couponId_ownerProfileId_key";
ALTER TABLE "CouponWalletItem"
ALTER COLUMN "redemptionToken" DROP NOT NULL,
ADD COLUMN "redemptionTokenExpiresAt" TIMESTAMP(3);

UPDATE "CouponWalletItem"
SET "redemptionToken" = NULL,
    "redemptionTokenExpiresAt" = NULL;

CREATE UNIQUE INDEX "CouponClaimCode_token_key" ON "CouponClaimCode"("token");
CREATE UNIQUE INDEX "CouponClaimCode_claimedWalletItemId_key" ON "CouponClaimCode"("claimedWalletItemId");
CREATE UNIQUE INDEX "CouponClaimCode_couponId_active_key" ON "CouponClaimCode"("couponId") WHERE "status" = 'ACTIVE';
CREATE INDEX "CouponClaimCode_couponId_status_createdAt_idx" ON "CouponClaimCode"("couponId", "status", "createdAt");
CREATE INDEX "CouponClaimCode_claimedByProfileId_claimedAt_idx" ON "CouponClaimCode"("claimedByProfileId", "claimedAt");
CREATE INDEX "CouponWalletItem_redemptionTokenExpiresAt_idx" ON "CouponWalletItem"("redemptionTokenExpiresAt");

ALTER TABLE "CouponClaimCode" ADD CONSTRAINT "CouponClaimCode_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CouponClaimCode" ADD CONSTRAINT "CouponClaimCode_claimedByProfileId_fkey" FOREIGN KEY ("claimedByProfileId") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CouponClaimCode" ADD CONSTRAINT "CouponClaimCode_claimedWalletItemId_fkey" FOREIGN KEY ("claimedWalletItemId") REFERENCES "CouponWalletItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
