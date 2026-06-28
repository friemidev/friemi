ALTER TYPE "public"."NotificationType" ADD VALUE 'DIRECT_MESSAGE';

ALTER TABLE "public"."DirectMessage" ADD COLUMN "activityId" TEXT;

CREATE INDEX "DirectMessage_activityId_idx" ON "public"."DirectMessage"("activityId" ASC);

ALTER TABLE "public"."DirectMessage"
  ADD CONSTRAINT "DirectMessage_activityId_fkey"
  FOREIGN KEY ("activityId") REFERENCES "public"."Activity"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
