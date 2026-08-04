ALTER TYPE "public"."NotificationType" ADD VALUE 'CHARM_GIFT_RECEIVED';

ALTER TABLE "public"."Notification"
ADD COLUMN "charmGiftEventId" TEXT;

CREATE INDEX "Notification_charmGiftEventId_idx"
ON "public"."Notification"("charmGiftEventId");

ALTER TABLE "public"."Notification"
ADD CONSTRAINT "Notification_charmGiftEventId_fkey"
FOREIGN KEY ("charmGiftEventId") REFERENCES "public"."CharmGiftEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
