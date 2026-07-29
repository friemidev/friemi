CREATE TYPE "public"."UserPresenceStatus" AS ENUM (
  'ONLINE',
  'AWAY',
  'INVISIBLE'
);

ALTER TABLE "public"."UserProfile"
ADD COLUMN "presenceStatus" "public"."UserPresenceStatus" NOT NULL DEFAULT 'ONLINE',
ADD COLUMN "lastActiveAt" TIMESTAMP(3);

CREATE INDEX "UserProfile_presenceStatus_lastActiveAt_idx"
ON "public"."UserProfile"("presenceStatus", "lastActiveAt");
