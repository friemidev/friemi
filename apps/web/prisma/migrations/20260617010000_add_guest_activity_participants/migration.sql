ALTER TABLE "public"."UserProfile" ADD COLUMN "wechatId" TEXT;
ALTER TABLE "public"."UserProfile" ADD COLUMN "normalizedWechatId" TEXT;
ALTER TABLE "public"."UserProfile" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

CREATE TABLE "public"."GuestActivityParticipant" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "phone" TEXT,
    "normalizedPhone" TEXT,
    "email" TEXT,
    "normalizedEmail" TEXT,
    "wechatId" TEXT,
    "normalizedWechatId" TEXT,
    "message" TEXT,
    "status" "public"."ParticipantStatus" NOT NULL DEFAULT 'APPROVED',
    "sourceLocale" TEXT,
    "sourceUserAgent" TEXT,
    "sourceFingerprint" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),
    "linkedAt" TIMESTAMP(3),
    "linkedUserProfileId" TEXT,
    "linkedParticipantId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestActivityParticipant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GuestActivityParticipant_linkedParticipantId_key" ON "public"."GuestActivityParticipant"("linkedParticipantId");
CREATE UNIQUE INDEX "GuestActivityParticipant_activityId_normalizedEmail_key" ON "public"."GuestActivityParticipant"("activityId", "normalizedEmail");
CREATE UNIQUE INDEX "GuestActivityParticipant_activityId_normalizedPhone_key" ON "public"."GuestActivityParticipant"("activityId", "normalizedPhone");
CREATE UNIQUE INDEX "GuestActivityParticipant_activityId_normalizedWechatId_key" ON "public"."GuestActivityParticipant"("activityId", "normalizedWechatId");
CREATE INDEX "UserProfile_normalizedWechatId_idx" ON "public"."UserProfile"("normalizedWechatId");
CREATE INDEX "GuestActivityParticipant_activityId_status_idx" ON "public"."GuestActivityParticipant"("activityId", "status");
CREATE INDEX "GuestActivityParticipant_linkedUserProfileId_idx" ON "public"."GuestActivityParticipant"("linkedUserProfileId");
CREATE INDEX "GuestActivityParticipant_normalizedEmail_idx" ON "public"."GuestActivityParticipant"("normalizedEmail");
CREATE INDEX "GuestActivityParticipant_normalizedWechatId_idx" ON "public"."GuestActivityParticipant"("normalizedWechatId");
CREATE INDEX "GuestActivityParticipant_sourceFingerprint_createdAt_idx" ON "public"."GuestActivityParticipant"("sourceFingerprint", "createdAt");

ALTER TABLE "public"."GuestActivityParticipant" ADD CONSTRAINT "GuestActivityParticipant_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "public"."Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."GuestActivityParticipant" ADD CONSTRAINT "GuestActivityParticipant_linkedUserProfileId_fkey" FOREIGN KEY ("linkedUserProfileId") REFERENCES "public"."UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."GuestActivityParticipant" ADD CONSTRAINT "GuestActivityParticipant_linkedParticipantId_fkey" FOREIGN KEY ("linkedParticipantId") REFERENCES "public"."ActivityParticipant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
