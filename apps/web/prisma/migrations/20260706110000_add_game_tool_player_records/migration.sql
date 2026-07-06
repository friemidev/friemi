-- CreateTable
CREATE TABLE "GameToolPlayerRecord" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "kind" "GameToolKind" NOT NULL,
  "variantKey" TEXT,
  "variantName" TEXT,
  "seatNumber" INTEGER,
  "roleKey" TEXT,
  "roleAlignment" TEXT,
  "result" TEXT,
  "isJudge" BOOLEAN NOT NULL DEFAULT false,
  "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "GameToolPlayerRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GameToolPlayerRecord_roomId_profileId_key" ON "GameToolPlayerRecord"("roomId", "profileId");

-- CreateIndex
CREATE INDEX "GameToolPlayerRecord_profileId_kind_playedAt_idx" ON "GameToolPlayerRecord"("profileId", "kind", "playedAt");

-- CreateIndex
CREATE INDEX "GameToolPlayerRecord_roomId_idx" ON "GameToolPlayerRecord"("roomId");

-- AddForeignKey
ALTER TABLE "GameToolPlayerRecord" ADD CONSTRAINT "GameToolPlayerRecord_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "GameToolRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameToolPlayerRecord" ADD CONSTRAINT "GameToolPlayerRecord_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
