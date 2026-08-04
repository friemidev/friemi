-- CreateTable
CREATE TABLE "UserEquippedAchievement" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "achievementKey" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserEquippedAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserEquippedAchievement_profileId_achievementKey_key" ON "UserEquippedAchievement"("profileId", "achievementKey");

-- CreateIndex
CREATE UNIQUE INDEX "UserEquippedAchievement_profileId_sortOrder_key" ON "UserEquippedAchievement"("profileId", "sortOrder");

-- CreateIndex
CREATE INDEX "UserEquippedAchievement_profileId_sortOrder_idx" ON "UserEquippedAchievement"("profileId", "sortOrder");

-- CreateIndex
CREATE INDEX "UserEquippedAchievement_achievementKey_idx" ON "UserEquippedAchievement"("achievementKey");

-- AddForeignKey
ALTER TABLE "UserEquippedAchievement" ADD CONSTRAINT "UserEquippedAchievement_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill current profiles with up to three latest unlocked achievements.
WITH ranked_achievements AS (
    SELECT
        "profileId",
        "achievementKey",
        ROW_NUMBER() OVER (
            PARTITION BY "profileId"
            ORDER BY "unlockedAt" DESC, "id" ASC
        ) - 1 AS "sortOrder"
    FROM "UserAchievement"
    WHERE "achievementKey" IN (
        'hello_world',
        'open_minded',
        'active_guest_20',
        'host_20',
        'co_creator',
        'trusted_profile'
    )
)
INSERT INTO "UserEquippedAchievement" (
    "id",
    "profileId",
    "achievementKey",
    "sortOrder",
    "createdAt",
    "updatedAt"
)
SELECT
    'equipped_' || md5("profileId" || ':' || "achievementKey"),
    "profileId",
    "achievementKey",
    "sortOrder",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM ranked_achievements
WHERE "sortOrder" < 3
ON CONFLICT DO NOTHING;
