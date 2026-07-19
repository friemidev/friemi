CREATE TYPE "public"."TrustScoreEventType" AS ENUM (
  'ACTIVITY_CHECK_IN',
  'INVITE_FRIEND',
  'PHONE_VERIFIED',
  'CLEAN_HALF_YEAR',
  'NO_SHOW',
  'USER_REPORT',
  'MASS_REPORT',
  'HARASSMENT_DM',
  'ORGANIZER_REPORT'
);

ALTER TABLE "public"."ActivityParticipant"
ADD COLUMN "checkInRequestedAt" TIMESTAMP(3),
ADD COLUMN "checkedInAt" TIMESTAMP(3),
ADD COLUMN "checkInCancelledAt" TIMESTAMP(3),
ADD COLUMN "checkInReviewedById" TEXT;

CREATE TABLE "public"."TrustScoreEvent" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "type" "public"."TrustScoreEventType" NOT NULL,
  "delta" INTEGER NOT NULL,
  "activityId" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrustScoreEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TrustScoreEvent_profileId_type_activityId_key" ON "public"."TrustScoreEvent"("profileId", "type", "activityId");
CREATE INDEX "TrustScoreEvent_profileId_createdAt_idx" ON "public"."TrustScoreEvent"("profileId", "createdAt");
CREATE INDEX "TrustScoreEvent_activityId_idx" ON "public"."TrustScoreEvent"("activityId");
CREATE INDEX "ActivityParticipant_checkInReviewedById_idx" ON "public"."ActivityParticipant"("checkInReviewedById");

ALTER TABLE "public"."TrustScoreEvent"
ADD CONSTRAINT "TrustScoreEvent_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "public"."UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."TrustScoreEvent"
ADD CONSTRAINT "TrustScoreEvent_activityId_fkey"
FOREIGN KEY ("activityId") REFERENCES "public"."Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."ActivityParticipant"
ADD CONSTRAINT "ActivityParticipant_checkInReviewedById_fkey"
FOREIGN KEY ("checkInReviewedById") REFERENCES "public"."UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
