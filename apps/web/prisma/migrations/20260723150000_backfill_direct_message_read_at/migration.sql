UPDATE "public"."DirectMessage"
SET "readAt" = "createdAt"
WHERE "readAt" IS NULL;

CREATE INDEX "DirectMessage_conversationId_senderId_readAt_idx"
ON "public"."DirectMessage"("conversationId", "senderId", "readAt");
