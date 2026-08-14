CREATE TABLE "OfficialMessage" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "content" TEXT NOT NULL,
    "authorProfileId" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfficialMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OfficialMessageReadState" (
    "profileId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfficialMessageReadState_pkey" PRIMARY KEY ("profileId")
);

CREATE INDEX "OfficialMessage_publishedAt_idx" ON "OfficialMessage"("publishedAt");
CREATE INDEX "OfficialMessage_authorProfileId_publishedAt_idx" ON "OfficialMessage"("authorProfileId", "publishedAt");
CREATE INDEX "OfficialMessageReadState_lastReadAt_idx" ON "OfficialMessageReadState"("lastReadAt");

ALTER TABLE "OfficialMessage"
ADD CONSTRAINT "OfficialMessage_authorProfileId_fkey"
FOREIGN KEY ("authorProfileId") REFERENCES "UserProfile"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OfficialMessageReadState"
ADD CONSTRAINT "OfficialMessageReadState_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "UserProfile"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
