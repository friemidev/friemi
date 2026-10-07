ALTER TYPE "NotificationType" ADD VALUE 'INVENTORY_TICKET_RECEIVED';

ALTER TABLE "InventoryItem"
  ADD COLUMN "redemptionToken" VARCHAR(64),
  ADD COLUMN "redemptionTokenExpiresAt" TIMESTAMP(3),
  ADD COLUMN "redeemedAt" TIMESTAMP(3),
  ADD COLUMN "redeemedByProfileId" TEXT;

CREATE UNIQUE INDEX "InventoryItem_redemptionToken_key" ON "InventoryItem"("redemptionToken");
CREATE INDEX "InventoryItem_redeemedByProfileId_redeemedAt_idx" ON "InventoryItem"("redeemedByProfileId", "redeemedAt");
CREATE INDEX "InventoryItem_redemptionTokenExpiresAt_idx" ON "InventoryItem"("redemptionTokenExpiresAt");

ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_redeemedByProfileId_fkey"
  FOREIGN KEY ("redeemedByProfileId") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Notification" ADD COLUMN "inventoryItemDefinitionId" TEXT;
CREATE INDEX "Notification_inventoryItemDefinitionId_idx" ON "Notification"("inventoryItemDefinitionId");
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_inventoryItemDefinitionId_fkey"
  FOREIGN KEY ("inventoryItemDefinitionId") REFERENCES "InventoryItemDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
