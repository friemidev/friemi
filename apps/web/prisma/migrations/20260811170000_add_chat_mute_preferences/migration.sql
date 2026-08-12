-- Add per-user mute settings for direct conversations and activity room chats.

ALTER TABLE "ActivityRoomReadState"
ADD COLUMN "mutedAt" TIMESTAMP(3);

CREATE INDEX "ActivityRoomReadState_profileId_mutedAt_idx"
ON "ActivityRoomReadState"("profileId", "mutedAt");

CREATE TABLE "ConversationPreference" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "mutedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ConversationPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConversationPreference_conversationId_profileId_key"
ON "ConversationPreference"("conversationId", "profileId");

CREATE INDEX "ConversationPreference_profileId_mutedAt_idx"
ON "ConversationPreference"("profileId", "mutedAt");

CREATE INDEX "ConversationPreference_conversationId_mutedAt_idx"
ON "ConversationPreference"("conversationId", "mutedAt");

ALTER TABLE "ConversationPreference"
ADD CONSTRAINT "ConversationPreference_conversationId_fkey"
FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ConversationPreference"
ADD CONSTRAINT "ConversationPreference_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "UserProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
