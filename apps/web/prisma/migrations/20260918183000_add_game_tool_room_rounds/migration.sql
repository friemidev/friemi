ALTER TABLE "public"."GameToolPlayerRecord"
ADD COLUMN "roundNumber" INTEGER NOT NULL DEFAULT 1;

DROP INDEX "public"."GameToolPlayerRecord_roomId_profileId_key";

CREATE UNIQUE INDEX "GameToolPlayerRecord_roomId_profileId_roundNumber_key"
ON "public"."GameToolPlayerRecord"("roomId", "profileId", "roundNumber");
