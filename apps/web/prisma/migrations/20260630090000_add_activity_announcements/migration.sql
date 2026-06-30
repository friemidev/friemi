ALTER TYPE "public"."NotificationType" ADD VALUE 'ACTIVITY_ANNOUNCEMENT';

CREATE TABLE "public"."ActivityAnnouncement" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityAnnouncement_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."Notification"
ADD COLUMN "activityAnnouncementId" TEXT;

ALTER TABLE "public"."ActivityAnnouncement"
ADD CONSTRAINT "ActivityAnnouncement_activityId_fkey"
FOREIGN KEY ("activityId") REFERENCES "public"."Activity"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ActivityAnnouncement"
ADD CONSTRAINT "ActivityAnnouncement_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "public"."UserProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."Notification"
ADD CONSTRAINT "Notification_activityAnnouncementId_fkey"
FOREIGN KEY ("activityAnnouncementId") REFERENCES "public"."ActivityAnnouncement"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ActivityAnnouncement_activityId_createdAt_idx"
ON "public"."ActivityAnnouncement"("activityId", "createdAt");

CREATE INDEX "ActivityAnnouncement_authorId_createdAt_idx"
ON "public"."ActivityAnnouncement"("authorId", "createdAt");

CREATE INDEX "Notification_activityAnnouncementId_idx"
ON "public"."Notification"("activityAnnouncementId");
