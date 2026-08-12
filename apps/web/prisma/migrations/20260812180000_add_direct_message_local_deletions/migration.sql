-- Keep direct-message deletion local to the profile that performed it.

CREATE TABLE "DirectMessageDeletion" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DirectMessageDeletion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DirectMessageDeletion_messageId_profileId_key"
ON "DirectMessageDeletion"("messageId", "profileId");

CREATE INDEX "DirectMessageDeletion_profileId_deletedAt_idx"
ON "DirectMessageDeletion"("profileId", "deletedAt");

ALTER TABLE "DirectMessageDeletion"
ADD CONSTRAINT "DirectMessageDeletion_messageId_fkey"
FOREIGN KEY ("messageId") REFERENCES "DirectMessage"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DirectMessageDeletion"
ADD CONSTRAINT "DirectMessageDeletion_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "UserProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
