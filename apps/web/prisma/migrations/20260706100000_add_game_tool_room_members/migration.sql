CREATE TABLE "public"."GameToolRoomMember" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "profileId" TEXT,
    "guestName" TEXT,
    "memberToken" VARCHAR(32) NOT NULL,
    "seatedSeatId" TEXT,
    "readyAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameToolRoomMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GameToolRoomMember_memberToken_key" ON "public"."GameToolRoomMember"("memberToken");
CREATE UNIQUE INDEX "GameToolRoomMember_roomId_profileId_key" ON "public"."GameToolRoomMember"("roomId", "profileId");
CREATE UNIQUE INDEX "GameToolRoomMember_seatedSeatId_key" ON "public"."GameToolRoomMember"("seatedSeatId");
CREATE INDEX "GameToolRoomMember_roomId_lastSeenAt_idx" ON "public"."GameToolRoomMember"("roomId", "lastSeenAt");
CREATE INDEX "GameToolRoomMember_profileId_idx" ON "public"."GameToolRoomMember"("profileId");

ALTER TABLE "public"."GameToolRoomMember" ADD CONSTRAINT "GameToolRoomMember_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."GameToolRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."GameToolRoomMember" ADD CONSTRAINT "GameToolRoomMember_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."UserProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "public"."GameToolRoomMember" ADD CONSTRAINT "GameToolRoomMember_seatedSeatId_fkey" FOREIGN KEY ("seatedSeatId") REFERENCES "public"."GameToolSeat"("id") ON DELETE SET NULL ON UPDATE CASCADE;
