ALTER TABLE "Coupon" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "InventoryItemDefinition" ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "Coupon_merchantId_archivedAt_createdAt_idx"
ON "Coupon"("merchantId", "archivedAt", "createdAt");

CREATE INDEX "InventoryItemDefinition_kind_archivedAt_createdAt_idx"
ON "InventoryItemDefinition"("kind", "archivedAt", "createdAt");
