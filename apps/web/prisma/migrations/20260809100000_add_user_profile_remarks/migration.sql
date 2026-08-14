-- CreateTable
CREATE TABLE "UserProfileRemark" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "remarkName" VARCHAR(32) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfileRemark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProfileRemark_ownerId_targetId_key" ON "UserProfileRemark"("ownerId", "targetId");

-- CreateIndex
CREATE INDEX "UserProfileRemark_targetId_idx" ON "UserProfileRemark"("targetId");

-- AddForeignKey
ALTER TABLE "UserProfileRemark" ADD CONSTRAINT "UserProfileRemark_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfileRemark" ADD CONSTRAINT "UserProfileRemark_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
