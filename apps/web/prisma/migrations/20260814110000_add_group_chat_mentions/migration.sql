ALTER TABLE "ActivityRoomMessage"
ADD COLUMN "mentionedProfileIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "mentionLabels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "mentionsEveryone" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "PlanetMessage"
ADD COLUMN "mentionedProfileIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "mentionLabels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "mentionsEveryone" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "ActivityRoomMessage_activityId_mentionsEveryone_createdAt_idx"
ON "ActivityRoomMessage"("activityId", "mentionsEveryone", "createdAt");

CREATE INDEX "ActivityRoomMessage_mentionedProfileIds_idx"
ON "ActivityRoomMessage" USING GIN ("mentionedProfileIds");

CREATE INDEX "PlanetMessage_planetId_mentionsEveryone_createdAt_idx"
ON "PlanetMessage"("planetId", "mentionsEveryone", "createdAt");

CREATE INDEX "PlanetMessage_mentionedProfileIds_idx"
ON "PlanetMessage" USING GIN ("mentionedProfileIds");
