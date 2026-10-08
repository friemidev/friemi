CREATE TABLE "NowInvite" (
  "id" TEXT NOT NULL,
  "organizerId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "city" TEXT NOT NULL DEFAULT 'Paris',
  "area" TEXT NOT NULL,
  "note" TEXT,
  "visibilityHours" INTEGER NOT NULL DEFAULT 12,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "linkedActivityId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NowInvite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NowInterest" (
  "id" TEXT NOT NULL,
  "inviteId" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "note" TEXT,
  "withdrawnAt" TIMESTAMP(3),
  "selectedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NowInterest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NowInviteMessage" (
  "id" TEXT NOT NULL,
  "inviteId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NowInviteMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NowInvite_city_expiresAt_createdAt_idx" ON "NowInvite"("city", "expiresAt", "createdAt");
CREATE INDEX "NowInvite_organizerId_createdAt_idx" ON "NowInvite"("organizerId", "createdAt");
CREATE INDEX "NowInvite_linkedActivityId_idx" ON "NowInvite"("linkedActivityId");
CREATE UNIQUE INDEX "NowInterest_inviteId_profileId_key" ON "NowInterest"("inviteId", "profileId");
CREATE INDEX "NowInterest_profileId_withdrawnAt_createdAt_idx" ON "NowInterest"("profileId", "withdrawnAt", "createdAt");
CREATE INDEX "NowInviteMessage_inviteId_createdAt_idx" ON "NowInviteMessage"("inviteId", "createdAt");

ALTER TABLE "NowInvite" ADD CONSTRAINT "NowInvite_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NowInvite" ADD CONSTRAINT "NowInvite_linkedActivityId_fkey" FOREIGN KEY ("linkedActivityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "NowInterest" ADD CONSTRAINT "NowInterest_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "NowInvite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NowInterest" ADD CONSTRAINT "NowInterest_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NowInviteMessage" ADD CONSTRAINT "NowInviteMessage_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "NowInvite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NowInviteMessage" ADD CONSTRAINT "NowInviteMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
