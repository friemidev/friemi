CREATE TABLE "public"."DrawGuessArtwork" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "ownerSeat" INTEGER NOT NULL,
    "stage" INTEGER NOT NULL,
    "artistSeat" INTEGER NOT NULL,
    "strokes" JSONB NOT NULL,
    "previewPng" BYTEA,
    "previewBytes" INTEGER NOT NULL DEFAULT 0,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DrawGuessArtwork_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."DrawGuessCommand" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "commandId" TEXT NOT NULL,
    "actorProfileId" TEXT,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DrawGuessCommand_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."DrawGuessReport" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "reporterProfileId" TEXT NOT NULL,
    "targetKind" TEXT NOT NULL,
    "ownerSeat" INTEGER NOT NULL,
    "stage" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "snapshot" JSONB NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewerProfileId" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DrawGuessReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DrawGuessArtwork_roomId_roundNumber_ownerSeat_stage_key"
ON "public"."DrawGuessArtwork"("roomId", "roundNumber", "ownerSeat", "stage");
CREATE INDEX "DrawGuessArtwork_roomId_roundNumber_submittedAt_idx"
ON "public"."DrawGuessArtwork"("roomId", "roundNumber", "submittedAt");
CREATE UNIQUE INDEX "DrawGuessCommand_roomId_roundNumber_commandId_key"
ON "public"."DrawGuessCommand"("roomId", "roundNumber", "commandId");
CREATE INDEX "DrawGuessCommand_roomId_roundNumber_createdAt_idx"
ON "public"."DrawGuessCommand"("roomId", "roundNumber", "createdAt");
CREATE UNIQUE INDEX "DrawGuessReport_roomId_roundNumber_reporterProfileId_targetKind_ownerSeat_stage_key"
ON "public"."DrawGuessReport"("roomId", "roundNumber", "reporterProfileId", "targetKind", "ownerSeat", "stage");
CREATE INDEX "DrawGuessReport_status_createdAt_idx" ON "public"."DrawGuessReport"("status", "createdAt");
CREATE INDEX "DrawGuessReport_roomId_roundNumber_idx" ON "public"."DrawGuessReport"("roomId", "roundNumber");

ALTER TABLE "public"."DrawGuessArtwork" ADD CONSTRAINT "DrawGuessArtwork_roomId_fkey"
FOREIGN KEY ("roomId") REFERENCES "public"."GameToolRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."DrawGuessCommand" ADD CONSTRAINT "DrawGuessCommand_roomId_fkey"
FOREIGN KEY ("roomId") REFERENCES "public"."GameToolRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."DrawGuessReport" ADD CONSTRAINT "DrawGuessReport_roomId_fkey"
FOREIGN KEY ("roomId") REFERENCES "public"."GameToolRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
