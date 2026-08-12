-- Add per-user pin settings for direct conversations and activity room chats.

ALTER TABLE "ActivityRoomReadState"
ADD COLUMN "pinnedAt" TIMESTAMP(3);

CREATE INDEX "ActivityRoomReadState_profileId_pinnedAt_idx"
ON "ActivityRoomReadState"("profileId", "pinnedAt");

ALTER TABLE "ConversationPreference"
ADD COLUMN "pinnedAt" TIMESTAMP(3);

CREATE INDEX "ConversationPreference_profileId_pinnedAt_idx"
ON "ConversationPreference"("profileId", "pinnedAt");
