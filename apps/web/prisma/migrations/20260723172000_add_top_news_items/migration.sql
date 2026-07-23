CREATE TABLE "public"."TopNewsItem" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "titleZh" TEXT NOT NULL,
  "titleEn" TEXT NOT NULL,
  "titleFr" TEXT NOT NULL,
  "href" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdByProfileId" TEXT,
  "updatedByProfileId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TopNewsItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TopNewsItem_slug_key" ON "public"."TopNewsItem"("slug");
CREATE INDEX "TopNewsItem_isActive_sortOrder_idx" ON "public"."TopNewsItem"("isActive", "sortOrder");
CREATE INDEX "TopNewsItem_updatedAt_idx" ON "public"."TopNewsItem"("updatedAt");

INSERT INTO "public"."TopNewsItem" (
  "id",
  "slug",
  "titleZh",
  "titleEn",
  "titleFr",
  "href",
  "imageUrl",
  "isActive",
  "sortOrder",
  "createdAt",
  "updatedAt"
) VALUES
  (
    'topnews-v2-4-release',
    'v2-4-release',
    'Friemi v2.4 更新',
    'Friemi v2.4 updates',
    'Nouveautes Friemi v2.4',
    '/updates/v2_4',
    '/readme/v2_4/game-tools.png',
    true,
    10,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'topnews-werewolf-tool',
    'werewolf-tool',
    '狼人杀房间工具',
    'Werewolf room tool',
    'Outil loup-garou',
    '/game-tools/werewolf',
    '/game-tools/werewolf/werewolf.jpeg',
    true,
    20,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );
