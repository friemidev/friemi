-- Hide a chat from one user's roster without deleting shared history.

ALTER TABLE "ConversationPreference"
ADD COLUMN "hiddenAt" TIMESTAMP(3);

CREATE INDEX "ConversationPreference_profileId_hiddenAt_idx"
ON "ConversationPreference"("profileId", "hiddenAt");

ALTER TABLE "ActivityRoomReadState"
ADD COLUMN "hiddenAt" TIMESTAMP(3);

CREATE INDEX "ActivityRoomReadState_profileId_hiddenAt_idx"
ON "ActivityRoomReadState"("profileId", "hiddenAt");

ALTER TABLE "PlanetChatReadState"
ADD COLUMN "hiddenAt" TIMESTAMP(3);

CREATE INDEX "PlanetChatReadState_profileId_hiddenAt_idx"
ON "PlanetChatReadState"("profileId", "hiddenAt");
