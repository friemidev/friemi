CREATE TYPE "public"."GameToolKind" AS ENUM ('AVALON');

CREATE TYPE "public"."GameToolRoomStatus" AS ENUM (
    'LOBBY',
    'IN_PROGRESS',
    'FINISHED',
    'CANCELLED'
);

CREATE TYPE "public"."GameToolSubmissionKind" AS ENUM (
    'TEAM_VOTE',
    'MISSION_CARD',
    'ASSASSINATION_TARGET'
);

CREATE TABLE "public"."GameToolRoom" (
    "id" TEXT NOT NULL,
    "kind" "public"."GameToolKind" NOT NULL DEFAULT 'AVALON',
    "status" "public"."GameToolRoomStatus" NOT NULL DEFAULT 'LOBBY',
    "code" VARCHAR(8) NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'zh-CN',
    "title" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'identity',
    "playerCount" INTEGER NOT NULL DEFAULT 7,
    "hostId" TEXT NOT NULL,
    "config" JSONB,
    "state" JSONB,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameToolRoom_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."GameToolSeat" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "profileId" TEXT,
    "privateToken" VARCHAR(32) NOT NULL,
    "seatNumber" INTEGER NOT NULL,
    "displayName" TEXT NOT NULL,
    "guestName" TEXT,
    "roleKey" TEXT,
    "roleAlignment" TEXT,
    "privatePayload" JSONB,
    "readyAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "GameToolSeat_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."GameToolEvent" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameToolEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."GameToolSubmission" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "seatId" TEXT,
    "profileId" TEXT,
    "roundIndex" INTEGER NOT NULL DEFAULT 0,
    "kind" "public"."GameToolSubmissionKind" NOT NULL,
    "value" TEXT NOT NULL,
    "metadata" JSONB,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameToolSubmission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GameToolRoom_code_key"
    ON "public"."GameToolRoom"("code");

CREATE INDEX "GameToolRoom_hostId_createdAt_idx"
    ON "public"."GameToolRoom"("hostId", "createdAt");

CREATE INDEX "GameToolRoom_kind_status_updatedAt_idx"
    ON "public"."GameToolRoom"("kind", "status", "updatedAt");

CREATE INDEX "GameToolRoom_code_idx"
    ON "public"."GameToolRoom"("code");

CREATE UNIQUE INDEX "GameToolSeat_roomId_seatNumber_key"
    ON "public"."GameToolSeat"("roomId", "seatNumber");

CREATE UNIQUE INDEX "GameToolSeat_roomId_profileId_key"
    ON "public"."GameToolSeat"("roomId", "profileId");

CREATE UNIQUE INDEX "GameToolSeat_privateToken_key"
    ON "public"."GameToolSeat"("privateToken");

CREATE INDEX "GameToolSeat_profileId_joinedAt_idx"
    ON "public"."GameToolSeat"("profileId", "joinedAt");

CREATE INDEX "GameToolSeat_roomId_readyAt_idx"
    ON "public"."GameToolSeat"("roomId", "readyAt");

CREATE INDEX "GameToolEvent_roomId_createdAt_idx"
    ON "public"."GameToolEvent"("roomId", "createdAt");

CREATE INDEX "GameToolEvent_actorId_createdAt_idx"
    ON "public"."GameToolEvent"("actorId", "createdAt");

CREATE INDEX "GameToolEvent_type_createdAt_idx"
    ON "public"."GameToolEvent"("type", "createdAt");

CREATE UNIQUE INDEX "GameToolSubmission_roomId_roundIndex_kind_seatId_key"
    ON "public"."GameToolSubmission"("roomId", "roundIndex", "kind", "seatId");

CREATE INDEX "GameToolSubmission_roomId_kind_roundIndex_idx"
    ON "public"."GameToolSubmission"("roomId", "kind", "roundIndex");

CREATE INDEX "GameToolSubmission_profileId_submittedAt_idx"
    ON "public"."GameToolSubmission"("profileId", "submittedAt");

ALTER TABLE "public"."GameToolRoom"
    ADD CONSTRAINT "GameToolRoom_hostId_fkey"
    FOREIGN KEY ("hostId") REFERENCES "public"."UserProfile"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."GameToolSeat"
    ADD CONSTRAINT "GameToolSeat_roomId_fkey"
    FOREIGN KEY ("roomId") REFERENCES "public"."GameToolRoom"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."GameToolSeat"
    ADD CONSTRAINT "GameToolSeat_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "public"."UserProfile"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."GameToolEvent"
    ADD CONSTRAINT "GameToolEvent_roomId_fkey"
    FOREIGN KEY ("roomId") REFERENCES "public"."GameToolRoom"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."GameToolEvent"
    ADD CONSTRAINT "GameToolEvent_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "public"."UserProfile"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."GameToolSubmission"
    ADD CONSTRAINT "GameToolSubmission_roomId_fkey"
    FOREIGN KEY ("roomId") REFERENCES "public"."GameToolRoom"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."GameToolSubmission"
    ADD CONSTRAINT "GameToolSubmission_seatId_fkey"
    FOREIGN KEY ("seatId") REFERENCES "public"."GameToolSeat"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."GameToolSubmission"
    ADD CONSTRAINT "GameToolSubmission_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "public"."UserProfile"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
