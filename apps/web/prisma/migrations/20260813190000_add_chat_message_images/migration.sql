-- Add image attachments to activity-room and planet chat messages.

ALTER TABLE "public"."ActivityRoomMessage"
ADD COLUMN "imageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "public"."PlanetMessage"
ADD COLUMN "imageUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
