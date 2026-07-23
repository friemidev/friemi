CREATE TYPE "public"."CharmGiftSurface" AS ENUM (
  'PROFILE',
  'ACTIVITY',
  'MOMENT',
  'PLANET',
  'DIRECT_MESSAGE',
  'SYSTEM',
  'OTHER'
);

CREATE TYPE "public"."FriemiCheckType" AS ENUM (
  'WELCOME',
  'BLIND_BOX'
);

CREATE TYPE "public"."FriemiCheckStatus" AS ENUM (
  'AVAILABLE',
  'REDEEMED',
  'EXPIRED'
);

CREATE TYPE "public"."BlindBoxFragmentEventType" AS ENUM (
  'SUCCESSFUL_ACTIVITY',
  'MANUAL_ADJUSTMENT'
);

CREATE TABLE "public"."UserCharmBalance" (
  "profileId" TEXT NOT NULL,
  "score" INTEGER NOT NULL DEFAULT 0,
  "giftCount" INTEGER NOT NULL DEFAULT 0,
  "lastGiftAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserCharmBalance_pkey" PRIMARY KEY ("profileId")
);

CREATE TABLE "public"."CharmGiftEvent" (
  "id" TEXT NOT NULL,
  "senderProfileId" TEXT,
  "recipientProfileId" TEXT NOT NULL,
  "giftId" TEXT NOT NULL,
  "giftEmoji" TEXT NOT NULL,
  "giftLabel" TEXT NOT NULL,
  "charmDelta" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "totalCharmDelta" INTEGER NOT NULL,
  "coinCost" INTEGER,
  "sourceSurface" "public"."CharmGiftSurface" NOT NULL DEFAULT 'PROFILE',
  "sourceContextId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CharmGiftEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."FriemiCheck" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "type" "public"."FriemiCheckType" NOT NULL,
  "status" "public"."FriemiCheckStatus" NOT NULL DEFAULT 'AVAILABLE',
  "sourceKey" TEXT,
  "note" TEXT,
  "redeemedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FriemiCheck_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."UserBlindBoxFragmentBalance" (
  "profileId" TEXT NOT NULL,
  "fragmentCount" INTEGER NOT NULL DEFAULT 0,
  "redeemedBlindBoxCount" INTEGER NOT NULL DEFAULT 0,
  "lastEarnedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserBlindBoxFragmentBalance_pkey" PRIMARY KEY ("profileId")
);

CREATE TABLE "public"."BlindBoxFragmentEvent" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "type" "public"."BlindBoxFragmentEventType" NOT NULL,
  "delta" INTEGER NOT NULL,
  "activityId" TEXT,
  "sourceKey" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BlindBoxFragmentEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CharmGiftEvent_recipientProfileId_createdAt_idx"
ON "public"."CharmGiftEvent"("recipientProfileId", "createdAt");

CREATE INDEX "CharmGiftEvent_senderProfileId_createdAt_idx"
ON "public"."CharmGiftEvent"("senderProfileId", "createdAt");

CREATE INDEX "CharmGiftEvent_giftId_createdAt_idx"
ON "public"."CharmGiftEvent"("giftId", "createdAt");

CREATE INDEX "CharmGiftEvent_sourceSurface_sourceContextId_idx"
ON "public"."CharmGiftEvent"("sourceSurface", "sourceContextId");

CREATE UNIQUE INDEX "FriemiCheck_profileId_sourceKey_key"
ON "public"."FriemiCheck"("profileId", "sourceKey");

CREATE INDEX "FriemiCheck_profileId_status_createdAt_idx"
ON "public"."FriemiCheck"("profileId", "status", "createdAt");

CREATE UNIQUE INDEX "BlindBoxFragmentEvent_profileId_sourceKey_key"
ON "public"."BlindBoxFragmentEvent"("profileId", "sourceKey");

CREATE INDEX "BlindBoxFragmentEvent_profileId_createdAt_idx"
ON "public"."BlindBoxFragmentEvent"("profileId", "createdAt");

CREATE INDEX "BlindBoxFragmentEvent_activityId_idx"
ON "public"."BlindBoxFragmentEvent"("activityId");

ALTER TABLE "public"."UserCharmBalance"
ADD CONSTRAINT "UserCharmBalance_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "public"."UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."CharmGiftEvent"
ADD CONSTRAINT "CharmGiftEvent_senderProfileId_fkey"
FOREIGN KEY ("senderProfileId") REFERENCES "public"."UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."CharmGiftEvent"
ADD CONSTRAINT "CharmGiftEvent_recipientProfileId_fkey"
FOREIGN KEY ("recipientProfileId") REFERENCES "public"."UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."FriemiCheck"
ADD CONSTRAINT "FriemiCheck_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "public"."UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."UserBlindBoxFragmentBalance"
ADD CONSTRAINT "UserBlindBoxFragmentBalance_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "public"."UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."BlindBoxFragmentEvent"
ADD CONSTRAINT "BlindBoxFragmentEvent_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "public"."UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
