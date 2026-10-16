ALTER TYPE "GameToolKind" ADD VALUE IF NOT EXISTS 'UNO';

ALTER TABLE "GameToolRoom" ADD COLUMN "unoDeadlineAt" TIMESTAMP(3);
CREATE INDEX "GameToolRoom_kind_status_unoDeadlineAt_idx" ON "GameToolRoom"("kind", "status", "unoDeadlineAt");

CREATE TABLE "UnoCommand" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "matchNumber" INTEGER NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "commandId" VARCHAR(64) NOT NULL,
    "actorProfileId" TEXT NOT NULL,
    "actionHash" VARCHAR(64) NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UnoCommand_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UnoCommand_roomId_commandId_key" ON "UnoCommand"("roomId", "commandId");
CREATE INDEX "UnoCommand_roomId_matchNumber_roundNumber_createdAt_idx" ON "UnoCommand"("roomId", "matchNumber", "roundNumber", "createdAt");
CREATE INDEX "UnoCommand_actorProfileId_createdAt_idx" ON "UnoCommand"("actorProfileId", "createdAt");
ALTER TABLE "UnoCommand" ADD CONSTRAINT "UnoCommand_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "GameToolRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "UnoRound" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "matchNumber" INTEGER NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "summary" JSONB NOT NULL,
    "finishedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UnoRound_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UnoRound_roomId_matchNumber_roundNumber_key" ON "UnoRound"("roomId", "matchNumber", "roundNumber");
CREATE INDEX "UnoRound_roomId_finishedAt_idx" ON "UnoRound"("roomId", "finishedAt");
ALTER TABLE "UnoRound" ADD CONSTRAINT "UnoRound_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "GameToolRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
