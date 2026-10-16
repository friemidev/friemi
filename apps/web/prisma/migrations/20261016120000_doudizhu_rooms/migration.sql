-- Fixed three-player Dou Dizhu. No production data is rewritten by this migration.
ALTER TYPE "GameToolKind" ADD VALUE IF NOT EXISTS 'DOUDIZHU';
ALTER TABLE "GameToolRoom" ADD COLUMN "ddzDeadlineAt" TIMESTAMP(3);
ALTER TABLE "GameToolSeat" ADD COLUMN "appearance" JSONB;
CREATE INDEX "GameToolRoom_kind_status_ddzDeadlineAt_idx" ON "GameToolRoom"("kind", "status", "ddzDeadlineAt");
CREATE TABLE "DdzCommand" (
  "id" TEXT NOT NULL, "roomId" TEXT NOT NULL, "commandId" VARCHAR(64) NOT NULL, "createKey" VARCHAR(160),
  "actorProfileId" TEXT NOT NULL, "actionHash" VARCHAR(64) NOT NULL, "gameNo" INTEGER NOT NULL,
  "result" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DdzCommand_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DdzCommand_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "GameToolRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "DdzCommand_roomId_commandId_key" ON "DdzCommand"("roomId", "commandId");
CREATE UNIQUE INDEX "DdzCommand_createKey_key" ON "DdzCommand"("createKey");
CREATE INDEX "DdzCommand_actorProfileId_createdAt_idx" ON "DdzCommand"("actorProfileId", "createdAt");
CREATE TABLE "DdzRound" (
  "id" TEXT NOT NULL, "roomId" TEXT NOT NULL, "gameNo" INTEGER NOT NULL, "participantProfileIds" TEXT[] NOT NULL,
  "summary" JSONB NOT NULL, "finishedAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DdzRound_pkey" PRIMARY KEY ("id")
);
-- Summaries intentionally outlive room deletion; authorization uses participant accounts.
CREATE UNIQUE INDEX "DdzRound_roomId_gameNo_key" ON "DdzRound"("roomId", "gameNo");
CREATE INDEX "DdzRound_roomId_finishedAt_idx" ON "DdzRound"("roomId", "finishedAt");
CREATE INDEX "DdzRound_finishedAt_idx" ON "DdzRound"("finishedAt");
CREATE TABLE "DdzEvent" (
  "id" TEXT NOT NULL, "roomId" TEXT NOT NULL, "eventSeq" INTEGER NOT NULL, "gameNo" INTEGER NOT NULL,
  "payload" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DdzEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DdzEvent_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "GameToolRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "DdzEvent_roomId_eventSeq_key" ON "DdzEvent"("roomId", "eventSeq");
CREATE INDEX "DdzEvent_roomId_gameNo_idx" ON "DdzEvent"("roomId", "gameNo");

-- Private state and identities may only be accessed through authenticated server APIs.
ALTER TABLE "DdzCommand" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DdzRound" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DdzEvent" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE "DdzCommand", "DdzRound", "DdzEvent" FROM PUBLIC;
DO $$ DECLARE browser_role text; BEGIN
  FOR browser_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated') LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE "DdzCommand", "DdzRound", "DdzEvent" FROM %I', browser_role);
  END LOOP;
END $$;
CREATE POLICY ddz_server_only_room ON "GameToolRoom" AS RESTRICTIVE FOR ALL TO PUBLIC
  USING (kind::text <> 'DOUDIZHU') WITH CHECK (kind::text <> 'DOUDIZHU');
ALTER TABLE "GameToolRoom" ENABLE ROW LEVEL SECURITY;
CREATE POLICY ddz_server_only_seats ON "GameToolSeat" AS RESTRICTIVE FOR ALL TO PUBLIC
  USING (EXISTS (SELECT 1 FROM "GameToolRoom" r WHERE r.id = "roomId" AND r.kind::text <> 'DOUDIZHU'))
  WITH CHECK (EXISTS (SELECT 1 FROM "GameToolRoom" r WHERE r.id = "roomId" AND r.kind::text <> 'DOUDIZHU'));
CREATE POLICY ddz_server_only_members ON "GameToolRoomMember" AS RESTRICTIVE FOR ALL TO PUBLIC
  USING (EXISTS (SELECT 1 FROM "GameToolRoom" r WHERE r.id = "roomId" AND r.kind::text <> 'DOUDIZHU'))
  WITH CHECK (EXISTS (SELECT 1 FROM "GameToolRoom" r WHERE r.id = "roomId" AND r.kind::text <> 'DOUDIZHU'));
ALTER TABLE "GameToolSeat" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GameToolRoomMember" ENABLE ROW LEVEL SECURITY;
