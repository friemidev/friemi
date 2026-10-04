ALTER TYPE "NotificationType" ADD VALUE 'NOW_INTERESTED';
ALTER TYPE "NotificationType" ADD VALUE 'NOW_SELECTED';
ALTER TYPE "NotificationType" ADD VALUE 'NOW_MESSAGE';
ALTER TYPE "NotificationType" ADD VALUE 'NOW_CONVERTED';

ALTER TABLE "Notification" ADD COLUMN "nowInviteId" TEXT;
ALTER TABLE "Conversation" ADD COLUMN "nowInviteId" TEXT;

CREATE INDEX "Notification_nowInviteId_idx" ON "Notification"("nowInviteId");
CREATE INDEX "Conversation_nowInviteId_idx" ON "Conversation"("nowInviteId");

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_nowInviteId_fkey" FOREIGN KEY ("nowInviteId") REFERENCES "NowInvite"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_nowInviteId_fkey" FOREIGN KEY ("nowInviteId") REFERENCES "NowInvite"("id") ON DELETE SET NULL ON UPDATE CASCADE;
