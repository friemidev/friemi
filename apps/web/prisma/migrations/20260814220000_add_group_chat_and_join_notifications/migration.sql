-- Add new notification types for group chat (planet + activity room) and planet join requests
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PLANET_MESSAGE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ACTIVITY_ROOM_MESSAGE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PLANET_JOIN_REQUEST';

-- Link notifications to a planet (for planet chat + join-request pushes)
ALTER TABLE "Notification" ADD COLUMN "planetId" TEXT;

CREATE INDEX "Notification_planetId_idx" ON "Notification"("planetId");

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_planetId_fkey"
  FOREIGN KEY ("planetId") REFERENCES "Planet"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
