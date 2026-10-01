ALTER TABLE "public"."GameToolRoom"
ADD COLUMN "drawGuessDeadlineAt" TIMESTAMP(3);

UPDATE "public"."GameToolRoom"
SET "drawGuessDeadlineAt" = (("state"->>'deadlineAt')::timestamptz AT TIME ZONE 'UTC')
WHERE "kind" = 'DRAW_GUESS'
  AND "status" = 'IN_PROGRESS'
  AND "state"->>'deadlineAt' IS NOT NULL;

CREATE INDEX "GameToolRoom_kind_status_drawGuessDeadlineAt_idx"
ON "public"."GameToolRoom"("kind", "status", "drawGuessDeadlineAt");

CREATE TABLE "public"."DrawGuessRound" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "mode" TEXT NOT NULL,
    "state" JSONB NOT NULL,
    "finishedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DrawGuessRound_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DrawGuessRound_roomId_roundNumber_key"
ON "public"."DrawGuessRound"("roomId", "roundNumber");

CREATE INDEX "DrawGuessRound_roomId_finishedAt_idx"
ON "public"."DrawGuessRound"("roomId", "finishedAt");

ALTER TABLE "public"."DrawGuessRound"
ADD CONSTRAINT "DrawGuessRound_roomId_fkey"
FOREIGN KEY ("roomId") REFERENCES "public"."GameToolRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
