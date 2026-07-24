CREATE TABLE "public"."ActivityRoomMessage" (
  "id" TEXT NOT NULL,
  "activityId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "deletedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ActivityRoomMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."UserAchievement" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "achievementKey" TEXT NOT NULL,
  "sourceType" TEXT,
  "sourceId" TEXT,
  "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."UserReferral" (
  "id" TEXT NOT NULL,
  "inviterId" TEXT NOT NULL,
  "inviteeId" TEXT NOT NULL,
  "inviteCode" TEXT NOT NULL,
  "source" TEXT,
  "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "friendshipAcceptedAt" TIMESTAMP(3),
  "firstParticipationAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserReferral_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."ProfileVisit" (
  "id" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "visitorId" TEXT NOT NULL,
  "visitDate" DATE NOT NULL,
  "viewCount" INTEGER NOT NULL DEFAULT 1,
  "lastVisitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProfileVisit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ActivityRoomMessage_activityId_createdAt_idx"
ON "public"."ActivityRoomMessage"("activityId", "createdAt");

CREATE INDEX "ActivityRoomMessage_senderId_createdAt_idx"
ON "public"."ActivityRoomMessage"("senderId", "createdAt");

CREATE INDEX "ActivityRoomMessage_deletedById_idx"
ON "public"."ActivityRoomMessage"("deletedById");

CREATE UNIQUE INDEX "UserAchievement_profileId_achievementKey_key"
ON "public"."UserAchievement"("profileId", "achievementKey");

CREATE INDEX "UserAchievement_profileId_unlockedAt_idx"
ON "public"."UserAchievement"("profileId", "unlockedAt");

CREATE INDEX "UserAchievement_achievementKey_unlockedAt_idx"
ON "public"."UserAchievement"("achievementKey", "unlockedAt");

CREATE UNIQUE INDEX "UserReferral_inviteeId_key"
ON "public"."UserReferral"("inviteeId");

CREATE INDEX "UserReferral_inviterId_createdAt_idx"
ON "public"."UserReferral"("inviterId", "createdAt");

CREATE INDEX "UserReferral_inviteCode_createdAt_idx"
ON "public"."UserReferral"("inviteCode", "createdAt");

CREATE UNIQUE INDEX "ProfileVisit_profileId_visitorId_visitDate_key"
ON "public"."ProfileVisit"("profileId", "visitorId", "visitDate");

CREATE INDEX "ProfileVisit_profileId_lastVisitedAt_idx"
ON "public"."ProfileVisit"("profileId", "lastVisitedAt");

CREATE INDEX "ProfileVisit_visitorId_lastVisitedAt_idx"
ON "public"."ProfileVisit"("visitorId", "lastVisitedAt");

ALTER TABLE "public"."ActivityRoomMessage"
ADD CONSTRAINT "ActivityRoomMessage_activityId_fkey"
FOREIGN KEY ("activityId") REFERENCES "public"."Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ActivityRoomMessage"
ADD CONSTRAINT "ActivityRoomMessage_senderId_fkey"
FOREIGN KEY ("senderId") REFERENCES "public"."UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ActivityRoomMessage"
ADD CONSTRAINT "ActivityRoomMessage_deletedById_fkey"
FOREIGN KEY ("deletedById") REFERENCES "public"."UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."UserAchievement"
ADD CONSTRAINT "UserAchievement_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "public"."UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."UserReferral"
ADD CONSTRAINT "UserReferral_inviterId_fkey"
FOREIGN KEY ("inviterId") REFERENCES "public"."UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."UserReferral"
ADD CONSTRAINT "UserReferral_inviteeId_fkey"
FOREIGN KEY ("inviteeId") REFERENCES "public"."UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ProfileVisit"
ADD CONSTRAINT "ProfileVisit_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "public"."UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ProfileVisit"
ADD CONSTRAINT "ProfileVisit_visitorId_fkey"
FOREIGN KEY ("visitorId") REFERENCES "public"."UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
