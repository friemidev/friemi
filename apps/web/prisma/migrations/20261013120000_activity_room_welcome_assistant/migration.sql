ALTER TABLE "Activity" ADD COLUMN "roomWelcomeTemplate" TEXT;
ALTER TABLE "ActivityRoomMessage" ALTER COLUMN "senderId" DROP NOT NULL;
ALTER TABLE "ActivityRoomMessage" ADD COLUMN "assistantWelcomeKey" TEXT;
CREATE UNIQUE INDEX "ActivityRoomMessage_assistantWelcomeKey_key"
  ON "ActivityRoomMessage"("assistantWelcomeKey");
ALTER TABLE "ActivityRoomMessage" ADD CONSTRAINT "ActivityRoomMessage_sender_identity_check"
  CHECK (("senderId" IS NOT NULL AND "assistantWelcomeKey" IS NULL)
    OR ("senderId" IS NULL AND "assistantWelcomeKey" IS NOT NULL));
