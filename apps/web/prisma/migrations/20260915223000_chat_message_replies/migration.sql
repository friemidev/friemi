ALTER TABLE "DirectMessage"
ADD COLUMN "replyToMessageId" TEXT,
ADD COLUMN "replyToSenderName" TEXT,
ADD COLUMN "replyToBody" TEXT,
ADD COLUMN "replyToHasImage" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ActivityRoomMessage"
ADD COLUMN "replyToMessageId" TEXT,
ADD COLUMN "replyToSenderName" TEXT,
ADD COLUMN "replyToBody" TEXT,
ADD COLUMN "replyToHasImage" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "PlanetMessage"
ADD COLUMN "replyToMessageId" TEXT,
ADD COLUMN "replyToSenderName" TEXT,
ADD COLUMN "replyToBody" TEXT,
ADD COLUMN "replyToHasImage" BOOLEAN NOT NULL DEFAULT false;
