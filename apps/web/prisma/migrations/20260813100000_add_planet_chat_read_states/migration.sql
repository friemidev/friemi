CREATE TABLE "public"."PlanetChatReadState" (
  "id" TEXT NOT NULL,
  "planetId" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "mutedAt" TIMESTAMP(3),
  "pinnedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PlanetChatReadState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlanetChatReadState_planetId_profileId_key"
ON "public"."PlanetChatReadState"("planetId", "profileId");

CREATE INDEX "PlanetChatReadState_profileId_mutedAt_idx"
ON "public"."PlanetChatReadState"("profileId", "mutedAt");

CREATE INDEX "PlanetChatReadState_profileId_pinnedAt_idx"
ON "public"."PlanetChatReadState"("profileId", "pinnedAt");

CREATE INDEX "PlanetChatReadState_profileId_updatedAt_idx"
ON "public"."PlanetChatReadState"("profileId", "updatedAt");

CREATE INDEX "PlanetChatReadState_planetId_lastReadAt_idx"
ON "public"."PlanetChatReadState"("planetId", "lastReadAt");

ALTER TABLE "public"."PlanetChatReadState"
ADD CONSTRAINT "PlanetChatReadState_planetId_fkey"
FOREIGN KEY ("planetId") REFERENCES "public"."Planet"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."PlanetChatReadState"
ADD CONSTRAINT "PlanetChatReadState_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "public"."UserProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
