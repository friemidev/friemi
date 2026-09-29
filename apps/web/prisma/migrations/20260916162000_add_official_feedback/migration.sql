CREATE TABLE "OfficialFeedback" (
    "id" TEXT NOT NULL,
    "senderProfileId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfficialFeedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OfficialFeedback_createdAt_idx" ON "OfficialFeedback"("createdAt");
CREATE INDEX "OfficialFeedback_readAt_createdAt_idx" ON "OfficialFeedback"("readAt", "createdAt");
CREATE INDEX "OfficialFeedback_senderProfileId_createdAt_idx" ON "OfficialFeedback"("senderProfileId", "createdAt");

ALTER TABLE "OfficialFeedback"
ADD CONSTRAINT "OfficialFeedback_senderProfileId_fkey"
FOREIGN KEY ("senderProfileId") REFERENCES "UserProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
