CREATE TYPE "CouponCampaignStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'UNLISTED');
CREATE TYPE "CouponDistributionMode" AS ENUM ('PUBLIC_QR', 'DIRECT_GRANT');
CREATE TYPE "CouponClaimSource" AS ENUM ('PUBLIC_QR', 'POST_REDEMPTION_GIFT', 'LEGACY');

CREATE TABLE "CouponTemplate" (
  "id" TEXT NOT NULL,
  "key" VARCHAR(80) NOT NULL,
  "slug" VARCHAR(80) NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "description" TEXT NOT NULL,
  "defaultTerms" TEXT,
  "imageUrl" TEXT,
  "backgroundColor" VARCHAR(7) NOT NULL DEFAULT '#0F6D46',
  "foregroundColor" VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
  "accentColor" VARCHAR(7) NOT NULL DEFAULT '#F1F2E3',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CouponTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CouponTemplate_key_key" ON "CouponTemplate"("key");
CREATE UNIQUE INDEX "CouponTemplate_slug_key" ON "CouponTemplate"("slug");
CREATE INDEX "CouponTemplate_isActive_createdAt_idx" ON "CouponTemplate"("isActive", "createdAt");

CREATE TABLE "MerchantCouponTemplate" (
  "id" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "assignedByProfileId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MerchantCouponTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MerchantCouponTemplate_merchantId_templateId_key" ON "MerchantCouponTemplate"("merchantId", "templateId");
CREATE INDEX "MerchantCouponTemplate_merchantId_isActive_createdAt_idx" ON "MerchantCouponTemplate"("merchantId", "isActive", "createdAt");
CREATE INDEX "MerchantCouponTemplate_templateId_isActive_idx" ON "MerchantCouponTemplate"("templateId", "isActive");

ALTER TABLE "Coupon"
ADD COLUMN "templateId" TEXT,
ADD COLUMN "campaignStatus" "CouponCampaignStatus" NOT NULL DEFAULT 'PUBLISHED',
ADD COLUMN "distributionMode" "CouponDistributionMode" NOT NULL DEFAULT 'PUBLIC_QR',
ADD COLUMN "claimToken" VARCHAR(64),
ADD COLUMN "quantityLimit" INTEGER,
ADD COLUMN "claimedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "publishedAt" TIMESTAMP(3),
ADD COLUMN "unlistedAt" TIMESTAMP(3),
ADD COLUMN "sourceRedemptionItemId" TEXT;

UPDATE "Coupon"
SET
  "campaignStatus" = CASE
    WHEN "isActive" THEN 'PUBLISHED'::"CouponCampaignStatus"
    ELSE 'UNLISTED'::"CouponCampaignStatus"
  END,
  "publishedAt" = CASE WHEN "isActive" THEN "createdAt" ELSE NULL END,
  "unlistedAt" = CASE WHEN "isActive" THEN NULL ELSE "updatedAt" END,
  "claimedCount" = (
    SELECT COUNT(*)::INTEGER
    FROM "CouponWalletItem"
    WHERE "CouponWalletItem"."couponId" = "Coupon"."id"
  );

UPDATE "Coupon" AS coupon
SET "claimToken" = (
  SELECT code."token"
  FROM "CouponClaimCode" AS code
  WHERE code."couponId" = coupon."id"
    AND code."status" = 'ACTIVE'::"CouponClaimCodeStatus"
  ORDER BY code."createdAt" DESC
  LIMIT 1
)
WHERE coupon."distributionMode" = 'PUBLIC_QR'::"CouponDistributionMode";

UPDATE "Coupon"
SET "claimToken" = 'campaign_' || md5("id")
WHERE "distributionMode" = 'PUBLIC_QR'::"CouponDistributionMode"
  AND "claimToken" IS NULL;

INSERT INTO "CouponTemplate" (
  "id",
  "key",
  "slug",
  "title",
  "description",
  "defaultTerms",
  "imageUrl",
  "backgroundColor",
  "foregroundColor",
  "accentColor",
  "isActive",
  "createdAt",
  "updatedAt"
)
VALUES (
  'coupon_template_omeriz_omelette_rice',
  'omeriz-omelette-rice-promo',
  'omeriz-omelette-rice-promo',
  '滑蛋饭 Promo',
  '到店出示此券，可享滑蛋饭专属优惠。具体优惠内容以门店现场说明为准。',
  '仅限绑定门店核销，不可转让或兑换现金。同一账号每期优惠券限领一次。',
  '/items/coupon/001_momentea/omelette-rice-promo.png',
  '#FFFDF7',
  '#075C4C',
  '#FF6159',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO NOTHING;

UPDATE "Coupon"
SET "templateId" = 'coupon_template_omeriz_omelette_rice'
WHERE "slug" = 'omeriz-omelette-rice-promo';

INSERT INTO "MerchantCouponTemplate" (
  "id",
  "merchantId",
  "templateId",
  "isActive",
  "createdAt",
  "updatedAt"
)
SELECT
  'merchant_coupon_template_' || md5(coupon."merchantId" || coupon."templateId"),
  coupon."merchantId",
  coupon."templateId",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Coupon" AS coupon
WHERE coupon."templateId" IS NOT NULL
GROUP BY coupon."merchantId", coupon."templateId"
ON CONFLICT ("merchantId", "templateId") DO NOTHING;

CREATE TABLE "CouponCampaignClaim" (
  "id" TEXT NOT NULL,
  "couponId" TEXT NOT NULL,
  "userProfileId" TEXT NOT NULL,
  "walletItemId" TEXT NOT NULL,
  "source" "CouponClaimSource" NOT NULL DEFAULT 'PUBLIC_QR',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CouponCampaignClaim_pkey" PRIMARY KEY ("id")
);

INSERT INTO "CouponCampaignClaim" (
  "id",
  "couponId",
  "userProfileId",
  "walletItemId",
  "source",
  "createdAt"
)
SELECT DISTINCT ON (item."couponId", item."ownerProfileId")
  'legacy_campaign_claim_' || md5(item."couponId" || item."ownerProfileId"),
  item."couponId",
  item."ownerProfileId",
  item."id",
  'LEGACY'::"CouponClaimSource",
  item."claimedAt"
FROM "CouponWalletItem" AS item
ORDER BY item."couponId", item."ownerProfileId", item."claimedAt" ASC, item."id" ASC;

ALTER TABLE "Coupon"
ADD CONSTRAINT "Coupon_quantityLimit_check"
CHECK ("quantityLimit" IS NULL OR "quantityLimit" > 0),
ADD CONSTRAINT "Coupon_claimedCount_check"
CHECK ("claimedCount" >= 0);

CREATE UNIQUE INDEX "Coupon_claimToken_key" ON "Coupon"("claimToken");
CREATE UNIQUE INDEX "Coupon_sourceRedemptionItemId_key" ON "Coupon"("sourceRedemptionItemId");
CREATE INDEX "Coupon_merchantId_campaignStatus_createdAt_idx" ON "Coupon"("merchantId", "campaignStatus", "createdAt");
CREATE INDEX "Coupon_templateId_campaignStatus_idx" ON "Coupon"("templateId", "campaignStatus");
CREATE UNIQUE INDEX "CouponCampaignClaim_walletItemId_key" ON "CouponCampaignClaim"("walletItemId");
CREATE UNIQUE INDEX "CouponCampaignClaim_couponId_userProfileId_key" ON "CouponCampaignClaim"("couponId", "userProfileId");
CREATE INDEX "CouponCampaignClaim_userProfileId_createdAt_idx" ON "CouponCampaignClaim"("userProfileId", "createdAt");

DROP INDEX "Coupon_merchantId_isActive_createdAt_idx";

ALTER TABLE "MerchantCouponTemplate"
ADD CONSTRAINT "MerchantCouponTemplate_merchantId_fkey"
FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MerchantCouponTemplate"
ADD CONSTRAINT "MerchantCouponTemplate_templateId_fkey"
FOREIGN KEY ("templateId") REFERENCES "CouponTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Coupon"
ADD CONSTRAINT "Coupon_templateId_fkey"
FOREIGN KEY ("templateId") REFERENCES "CouponTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Coupon"
ADD CONSTRAINT "Coupon_sourceRedemptionItemId_fkey"
FOREIGN KEY ("sourceRedemptionItemId") REFERENCES "CouponWalletItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CouponCampaignClaim"
ADD CONSTRAINT "CouponCampaignClaim_couponId_fkey"
FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CouponCampaignClaim"
ADD CONSTRAINT "CouponCampaignClaim_userProfileId_fkey"
FOREIGN KEY ("userProfileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CouponCampaignClaim"
ADD CONSTRAINT "CouponCampaignClaim_walletItemId_fkey"
FOREIGN KEY ("walletItemId") REFERENCES "CouponWalletItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
