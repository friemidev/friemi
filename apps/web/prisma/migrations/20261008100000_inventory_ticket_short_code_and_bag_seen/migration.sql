ALTER TABLE "InventoryItem"
  ADD COLUMN "redemptionCode" VARCHAR(10),
  ADD COLUMN "bagSeenAt" TIMESTAMP(3);

UPDATE "InventoryItem"
SET "bagSeenAt" = NOW()
WHERE "bagSeenAt" IS NULL;

CREATE UNIQUE INDEX "InventoryItem_redemptionCode_key" ON "InventoryItem"("redemptionCode");
CREATE INDEX "InventoryItem_ownerProfileId_bagSeenAt_idx" ON "InventoryItem"("ownerProfileId", "bagSeenAt");
