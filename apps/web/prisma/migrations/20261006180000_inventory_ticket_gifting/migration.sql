CREATE TYPE "InventoryItemKind" AS ENUM ('EVENT_TICKET', 'GENERAL');
CREATE TYPE "InventoryGiftMethod" AS ENUM ('FRIEMI_CODE', 'FRIEND_QR');

CREATE TABLE "InventoryItemDefinition" (
    "id" TEXT NOT NULL,
    "kind" "InventoryItemKind" NOT NULL DEFAULT 'EVENT_TICKET',
    "title" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "isGiftable" BOOLEAN NOT NULL DEFAULT false,
    "totalSupply" INTEGER NOT NULL,
    "issuedCount" INTEGER NOT NULL DEFAULT 0,
    "createdByProfileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InventoryItemDefinition_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "InventoryItemDefinition_supply_check" CHECK ("totalSupply" > 0 AND "issuedCount" >= 0 AND "issuedCount" <= "totalSupply")
);

CREATE TABLE "InventoryIssueBatch" (
    "id" TEXT NOT NULL,
    "requestId" VARCHAR(100) NOT NULL,
    "definitionId" TEXT NOT NULL,
    "recipientProfileId" TEXT NOT NULL,
    "actorProfileId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InventoryIssueBatch_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "InventoryIssueBatch_quantity_check" CHECK ("quantity" > 0)
);

CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "ownerProfileId" TEXT NOT NULL,
    "issueBatchId" TEXT NOT NULL,
    "serialNumber" INTEGER NOT NULL,
    "giftedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "InventoryItem_serial_check" CHECK ("serialNumber" > 0)
);

CREATE TABLE "InventoryItemGift" (
    "id" TEXT NOT NULL,
    "requestId" VARCHAR(100) NOT NULL,
    "itemId" TEXT NOT NULL,
    "senderProfileId" TEXT NOT NULL,
    "recipientProfileId" TEXT NOT NULL,
    "method" "InventoryGiftMethod" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InventoryItemGift_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "InventoryItemGift_no_self_gift" CHECK ("senderProfileId" <> "recipientProfileId")
);

CREATE INDEX "InventoryItemDefinition_kind_createdAt_idx" ON "InventoryItemDefinition"("kind", "createdAt");
CREATE UNIQUE INDEX "InventoryIssueBatch_requestId_key" ON "InventoryIssueBatch"("requestId");
CREATE INDEX "InventoryIssueBatch_definitionId_createdAt_idx" ON "InventoryIssueBatch"("definitionId", "createdAt");
CREATE INDEX "InventoryIssueBatch_recipientProfileId_createdAt_idx" ON "InventoryIssueBatch"("recipientProfileId", "createdAt");
CREATE UNIQUE INDEX "InventoryItem_definitionId_serialNumber_key" ON "InventoryItem"("definitionId", "serialNumber");
CREATE INDEX "InventoryItem_ownerProfileId_definitionId_giftedAt_idx" ON "InventoryItem"("ownerProfileId", "definitionId", "giftedAt");
CREATE INDEX "InventoryItem_issueBatchId_idx" ON "InventoryItem"("issueBatchId");
CREATE UNIQUE INDEX "InventoryItemGift_requestId_key" ON "InventoryItemGift"("requestId");
CREATE UNIQUE INDEX "InventoryItemGift_itemId_key" ON "InventoryItemGift"("itemId");
CREATE INDEX "InventoryItemGift_senderProfileId_createdAt_idx" ON "InventoryItemGift"("senderProfileId", "createdAt");
CREATE INDEX "InventoryItemGift_recipientProfileId_createdAt_idx" ON "InventoryItemGift"("recipientProfileId", "createdAt");

ALTER TABLE "InventoryItemDefinition" ADD CONSTRAINT "InventoryItemDefinition_createdByProfileId_fkey" FOREIGN KEY ("createdByProfileId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryIssueBatch" ADD CONSTRAINT "InventoryIssueBatch_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "InventoryItemDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryIssueBatch" ADD CONSTRAINT "InventoryIssueBatch_recipientProfileId_fkey" FOREIGN KEY ("recipientProfileId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryIssueBatch" ADD CONSTRAINT "InventoryIssueBatch_actorProfileId_fkey" FOREIGN KEY ("actorProfileId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "InventoryItemDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_ownerProfileId_fkey" FOREIGN KEY ("ownerProfileId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_issueBatchId_fkey" FOREIGN KEY ("issueBatchId") REFERENCES "InventoryIssueBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryItemGift" ADD CONSTRAINT "InventoryItemGift_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryItemGift" ADD CONSTRAINT "InventoryItemGift_senderProfileId_fkey" FOREIGN KEY ("senderProfileId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryItemGift" ADD CONSTRAINT "InventoryItemGift_recipientProfileId_fkey" FOREIGN KEY ("recipientProfileId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
