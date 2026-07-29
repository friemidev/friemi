CREATE TABLE "public"."ActivityRoomReadState" (
  "id" TEXT NOT NULL,
  "activityId" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ActivityRoomReadState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ActivityRoomReadState_activityId_profileId_key"
ON "public"."ActivityRoomReadState"("activityId", "profileId");

CREATE INDEX "ActivityRoomReadState_profileId_updatedAt_idx"
ON "public"."ActivityRoomReadState"("profileId", "updatedAt");

CREATE INDEX "ActivityRoomReadState_activityId_lastReadAt_idx"
ON "public"."ActivityRoomReadState"("activityId", "lastReadAt");

ALTER TABLE "public"."ActivityRoomReadState"
ADD CONSTRAINT "ActivityRoomReadState_activityId_fkey"
FOREIGN KEY ("activityId") REFERENCES "public"."Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ActivityRoomReadState"
ADD CONSTRAINT "ActivityRoomReadState_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "public"."UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
