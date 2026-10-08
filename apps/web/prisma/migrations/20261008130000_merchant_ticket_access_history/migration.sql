CREATE TYPE "TicketAccessRole" AS ENUM ('MANAGER', 'REDEEMER');
CREATE TYPE "TicketAccessStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED');
CREATE TYPE "TicketAccessSource" AS ENUM ('ADMIN', 'INVITATION', 'ALLOCATION');
CREATE TYPE "TicketRedemptionMethod" AS ENUM ('QR', 'MANUAL', 'UNKNOWN');
ALTER TYPE "NotificationType" ADD VALUE 'INVENTORY_TICKET_ACCESS_INVITED';

ALTER TABLE "InventoryItemDefinition" ADD COLUMN "merchantId" TEXT;
CREATE INDEX "InventoryItemDefinition_merchantId_kind_createdAt_idx"
  ON "InventoryItemDefinition"("merchantId", "kind", "createdAt");
ALTER TABLE "InventoryItemDefinition" ADD CONSTRAINT "InventoryItemDefinition_merchantId_fkey"
  FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "TicketAccess" (
  "id" TEXT NOT NULL,
  "definitionId" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "role" "TicketAccessRole" NOT NULL,
  "status" "TicketAccessStatus" NOT NULL,
  "source" "TicketAccessSource" NOT NULL,
  "invitedByProfileId" TEXT,
  "revokedByProfileId" TEXT,
  "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TicketAccess_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TicketAccess_definitionId_profileId_role_key"
  ON "TicketAccess"("definitionId", "profileId", "role");
CREATE INDEX "TicketAccess_profileId_status_role_idx"
  ON "TicketAccess"("profileId", "status", "role");
CREATE INDEX "TicketAccess_definitionId_role_status_idx"
  ON "TicketAccess"("definitionId", "role", "status");
ALTER TABLE "TicketAccess" ADD CONSTRAINT "TicketAccess_definitionId_fkey"
  FOREIGN KEY ("definitionId") REFERENCES "InventoryItemDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketAccess" ADD CONSTRAINT "TicketAccess_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketAccess" ADD CONSTRAINT "TicketAccess_invitedByProfileId_fkey"
  FOREIGN KEY ("invitedByProfileId") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TicketAccess" ADD CONSTRAINT "TicketAccess_revokedByProfileId_fkey"
  FOREIGN KEY ("revokedByProfileId") REFERENCES "UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Preserve every existing distributor's check-in access. Future check-ins use
-- TicketAccess exclusively, so a revoked grant cannot be restored implicitly.
INSERT INTO "TicketAccess" (
  "id", "definitionId", "profileId", "role", "status", "source",
  "invitedAt", "acceptedAt", "createdAt", "updatedAt"
)
SELECT
  md5(batch."definitionId" || ':' || batch."recipientProfileId" || ':REDEEMER'),
  batch."definitionId", batch."recipientProfileId", 'REDEEMER'::"TicketAccessRole",
  'ACTIVE'::"TicketAccessStatus", 'ALLOCATION'::"TicketAccessSource",
  MIN(batch."createdAt"), MIN(batch."createdAt"), MIN(batch."createdAt"), CURRENT_TIMESTAMP
FROM "InventoryIssueBatch" batch
JOIN "InventoryItemDefinition" definition ON definition."id" = batch."definitionId"
WHERE definition."kind" = 'EVENT_TICKET'
GROUP BY batch."definitionId", batch."recipientProfileId"
ON CONFLICT ("definitionId", "profileId", "role") DO NOTHING;

CREATE TABLE "TicketRedemptionEvent" (
  "id" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "definitionId" TEXT NOT NULL,
  "holderProfileId" TEXT NOT NULL,
  "redeemerProfileId" TEXT NOT NULL,
  "method" "TicketRedemptionMethod" NOT NULL,
  "redeemedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketRedemptionEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TicketRedemptionEvent_itemId_key"
  ON "TicketRedemptionEvent"("itemId");
CREATE INDEX "TicketRedemptionEvent_definitionId_redeemedAt_id_idx"
  ON "TicketRedemptionEvent"("definitionId", "redeemedAt", "id");
CREATE INDEX "TicketRedemptionEvent_redeemerProfileId_redeemedAt_idx"
  ON "TicketRedemptionEvent"("redeemerProfileId", "redeemedAt");
CREATE INDEX "TicketRedemptionEvent_holderProfileId_redeemedAt_idx"
  ON "TicketRedemptionEvent"("holderProfileId", "redeemedAt");
ALTER TABLE "TicketRedemptionEvent" ADD CONSTRAINT "TicketRedemptionEvent_itemId_fkey"
  FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketRedemptionEvent" ADD CONSTRAINT "TicketRedemptionEvent_definitionId_fkey"
  FOREIGN KEY ("definitionId") REFERENCES "InventoryItemDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketRedemptionEvent" ADD CONSTRAINT "TicketRedemptionEvent_holderProfileId_fkey"
  FOREIGN KEY ("holderProfileId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketRedemptionEvent" ADD CONSTRAINT "TicketRedemptionEvent_redeemerProfileId_fkey"
  FOREIGN KEY ("redeemerProfileId") REFERENCES "UserProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Historic rows did not retain the scan method. Mark that fact explicitly.
INSERT INTO "TicketRedemptionEvent" (
  "id", "itemId", "definitionId", "holderProfileId", "redeemerProfileId", "method", "redeemedAt"
)
SELECT md5(item."id" || ':redemption'), item."id", item."definitionId",
  item."ownerProfileId", item."redeemedByProfileId", 'UNKNOWN'::"TicketRedemptionMethod",
  item."redeemedAt"
FROM "InventoryItem" item
WHERE item."redeemedAt" IS NOT NULL AND item."redeemedByProfileId" IS NOT NULL
ON CONFLICT ("itemId") DO NOTHING;

CREATE FUNCTION prevent_ticket_redemption_event_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Ticket redemption history is append-only';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "TicketRedemptionEvent_append_only"
  BEFORE UPDATE OR DELETE ON "TicketRedemptionEvent"
  FOR EACH ROW EXECUTE FUNCTION prevent_ticket_redemption_event_change();
