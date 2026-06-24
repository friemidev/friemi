-- Friemi manual real group import for PRODUCTION database
-- Source: chat group notes and signup chains for June 19-22, 2026.
-- Generated locally. Contains participant display names and known WeChat IDs; do not commit this file.
--
-- Production checklist before running:
-- 1. Confirm the SQL Editor is connected to the production Supabase project.
-- 2. Create a production database backup/snapshot first.
-- 3. Confirm v1.4 migrations have been applied, especially GuestActivityParticipant.
-- 4. Run the full file at once. If Supabase warns about staging tables/RLS, choose "Run without RLS".
-- 5. This script is idempotent for this batch: it deletes and recreates rows with the same source markers.
--
-- Time convention:
-- The source text uses Paris local time. The existing import convention stores UTC-like timestamps
-- in timestamp columns, so Paris summer time is converted by subtracting 2 hours.
--
-- Important:
-- These rows are real team activities. Keep Activity.importedAt, Activity.sourcePayload,
-- Activity.externalUrl, Activity.externalSource and Activity.externalId NULL. The lobby
-- intentionally hides Activity rows with those public-import markers to avoid showing
-- copied public-event info as real team plans.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public."Activity"') IS NULL THEN
    RAISE EXCEPTION 'Activity table does not exist';
  END IF;
  IF to_regclass('public."GuestActivityParticipant"') IS NULL THEN
    RAISE EXCEPTION 'GuestActivityParticipant table does not exist. Apply v1.4 guest signup migration first.';
  END IF;
END $$;

DROP TABLE IF EXISTS manual_import_guest_participants;
DROP TABLE IF EXISTS manual_import_activities;
DROP TABLE IF EXISTS manual_import_organizers;

-- Clean the previous run first. These are real team activities, not PublicEvent rows.
DELETE FROM "GuestActivityParticipant"
WHERE "sourceUserAgent" = 'manual-group-import:june-2026-wave-1';

DELETE FROM "Activity"
WHERE "source" = 'manual-nextfun-june-2026';

DELETE FROM "UserProfile" u
WHERE u."clerkUserId" LIKE 'manual-production-organizer:%'
  AND NOT EXISTS (SELECT 1 FROM "Activity" a WHERE a."organizerId" = u."id");

CREATE TABLE manual_import_organizers (
  organizer_key text PRIMARY KEY,
  profile_id text NOT NULL,
  nickname text NOT NULL,
  clerk_user_id text NOT NULL
);

INSERT INTO manual_import_organizers (organizer_key, profile_id, nickname, clerk_user_id) VALUES
  ('hoting', 'manual_prod_org_hoting', 'Hoting', 'manual-production-organizer:hoting'),
  ('zhangganggang', 'manual_prod_org_zhangganggang', '张杠杠', 'manual-production-organizer:zhangganggang'),
  ('louise', 'manual_prod_org_louise', 'Louise', 'manual-production-organizer:louise'),
  ('james', 'manual_prod_org_james', 'James', 'manual-production-organizer:james'),
  ('lcj', 'manual_prod_org_lcj', 'lcj', 'manual-production-organizer:lcj');

CREATE TABLE manual_import_activities (
  activity_id text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  activity_type text NOT NULL,
  category text NOT NULL,
  city text NOT NULL,
  address text NOT NULL,
  start_at timestamp NOT NULL,
  end_at timestamp,
  capacity integer NOT NULL,
  price_type text NOT NULL,
  price_text text NOT NULL,
  status text NOT NULL,
  visibility text NOT NULL,
  organizer_key text NOT NULL,
  organizer_profile_id text NOT NULL,
  organizer_nickname text NOT NULL,
  external_url text,
  source_payload jsonb NOT NULL
);

INSERT INTO manual_import_activities (
  activity_id, title, description, activity_type, category, city, address, start_at, end_at,
  capacity, price_type, price_text, status, visibility, organizer_key, organizer_profile_id,
  organizer_nickname, external_url, source_payload
) VALUES
  (
    'manual_group_20260620_dage_bbq',
    '大哥私房菜烧烤',
    $desc$6月20日本周六 18:00 大哥私房菜烧烤。$desc$,
    'LOCAL', 'FOOD', 'Paris', '4 Rue Louis Armand, 75015 Paris, France',
    '2026-06-20 16:00:00', NULL,
    8, 'AA', '费用自理', 'RECRUITING', 'PUBLIC',
    'hoting', 'manual_prod_org_hoting', 'Hoting', NULL,
    '{"importBatch":"june-2026-wave-1","sourceKind":"wechat-chain","declaredParticipantCount":3,"importedParticipantCount":2,"needsReview":false,"reviewNotes":["发起人由 Activity.organizer 单独展示，不再重复导入为游客参与者。"]}'::jsonb
  ),
  (
    'manual_group_20260620_lac_en_scene',
    'Lac en Scene 湖畔夏夜音乐会与烟花',
    $desc$6月20日，巴黎近郊 Enghien-les-Bains 湖畔迎来 Lac en Scene 夏日特别夜。今年登场的是法国致敬乐队 The Goldmen，现场重现 Jean-Jacques Goldman 的经典作品。观众可以在湖边步道和观景栈桥自由停留观看，晚上 23:00 有湖上烟花秀。

地点：Lac d'Enghien, 3 avenue de la Ceinture, 95880 Enghien-les-Bains
交通：Gare Enghien-les-Bains
时间：2026年6月20日 20:30-23:30；The Goldmen 演唱会 21:00；烟花 23:00
费用：免费入场，无需预约，现场开放，位置有限。$desc$,
    'LOCAL', 'MUSIC', 'Paris', '3 avenue de la Ceinture, 95880 Enghien-les-Bains, France',
    '2026-06-20 18:30:00', '2026-06-20 21:30:00',
    10, 'FREE', '免费', 'RECRUITING', 'PUBLIC',
    'zhangganggang', 'manual_prod_org_zhangganggang', '张杠杠', NULL,
    '{"importBatch":"june-2026-wave-1","sourceKind":"group-note","declaredParticipantCount":6,"importedParticipantCount":5,"needsReview":false,"reviewNotes":["发起人由 Activity.organizer 单独展示，不再重复导入为游客参与者。"]}'::jsonb
  ),
  (
    'manual_group_20260621_bords_de_marne_hike',
    '逃离酷暑：历史纪念、马恩河畔与森林徒步',
    $desc$Fuir la canicule : randonnée mémorielle, bords de Marne et forêt。

马恩河流域在法国历史上，尤其是第一次世界大战和马恩河战役中具有重要意义。徒步沿途可能经过历史遗迹、纪念碑、战役遗址或相关纪念场所。

原始链接：https://meetu.ps/e/Q6ctL/1f9Y2y/i

导入复核：原文没有给出集合时间和精确集合地点，SQL 暂按巴黎时间 09:00 和 Bords de Marne 兜底。$desc$,
    'LOCAL', 'SPORTS', 'Paris', 'Bords de Marne, France',
    '2026-06-21 07:00:00', NULL,
    6, 'AA', '以活动原页面为准', 'RECRUITING', 'PUBLIC',
    'louise', 'manual_prod_org_louise', 'Louise', 'https://meetu.ps/e/Q6ctL/1f9Y2y/i',
    '{"importBatch":"june-2026-wave-1","sourceKind":"wechat-chain","declaredParticipantCount":1,"importedParticipantCount":0,"needsReview":true,"reviewNotes":["原文没有给出集合时间，暂按巴黎时间 09:00 导入。","原文没有给出精确集合地点，暂按 Bords de Marne 兜底。","发起人由 Activity.organizer 单独展示，不再重复导入为游客参与者。"]}'::jsonb
  ),
  (
    'manual_group_20260622_toy_story_5_ugc',
    '玩具总动员5 VOSTF',
    $desc$6月22日下周一晚上 19:30，UGC Chatelet 看《玩具总动员5》VOSTF（英语原声，法语字幕）。$desc$,
    'LOCAL', 'MOVIE', 'Paris', 'UGC Chatelet - Les Halles, Paris',
    '2026-06-22 17:30:00', NULL,
    6, 'AA', '电影票自理', 'RECRUITING', 'PUBLIC',
    'zhangganggang', 'manual_prod_org_zhangganggang', '张杠杠', NULL,
    '{"importBatch":"june-2026-wave-1","sourceKind":"group-note","declaredParticipantCount":3,"importedParticipantCount":2,"needsReview":true,"reviewNotes":["原文写作 UCG Chatelet，SQL 按 UGC Chatelet - Les Halles 兜底。","发起人由 Activity.organizer 单独展示，不再重复导入为游客参与者。"]}'::jsonb
  ),
  (
    'manual_group_20260619_suresnes_balavoine_concert',
    'Suresnes 露天音乐会：向 Daniel Balavoine 致敬',
    $desc$6月19日周五，Suresnes 在能俯瞰巴黎天际线的 Terrasse du Fecheray 举办露天音乐会，向法国歌手 Daniel Balavoine 致敬。

19:00 开放入场，可以提前占位置、看日落、聊天吃东西；21:00 正式开唱。现场有汉堡、热狗、饮料、小食和甜品餐车。

地点：Terrasse du Fecheray, Suresnes
交通：Mont Valerien
费用：免费，无需预约。
注意：禁止携带烟花、危险物品、大型电池、金属水壶；可带普通双肩包；除导盲犬外不能携带宠物。$desc$,
    'LOCAL', 'MUSIC', 'Paris', 'Terrasse du Fecheray, Suresnes, France',
    '2026-06-19 17:00:00', NULL,
    8, 'FREE', '免费', 'RECRUITING', 'PUBLIC',
    'james', 'manual_prod_org_james', 'James', NULL,
    '{"importBatch":"june-2026-wave-1","sourceKind":"wechat-chain","declaredParticipantCount":3,"importedParticipantCount":2,"needsReview":false,"reviewNotes":["发起人由 Activity.organizer 单独展示，不再重复导入为游客参与者。"]}'::jsonb
  ),
  (
    'manual_group_20260620_luxembourg_pingpong',
    '卢森堡公园乒乓球',
    $desc$20/06 卢森堡公园乒乓球。

导入复核：原文没有给出具体时间，SQL 暂按巴黎时间 17:00 导入。$desc$,
    'LOCAL', 'SPORTS', 'Paris', 'Jardin du Luxembourg, Paris',
    '2026-06-20 15:00:00', NULL,
    6, 'AA', '费用自理', 'RECRUITING', 'PUBLIC',
    'lcj', 'manual_prod_org_lcj', 'lcj', NULL,
    '{"importBatch":"june-2026-wave-1","sourceKind":"wechat-chain","declaredParticipantCount":3,"importedParticipantCount":2,"needsReview":true,"reviewNotes":["原文没有给出具体时间，暂按巴黎时间 17:00 导入。","地点按 Jardin du Luxembourg 兜底。","发起人由 Activity.organizer 单独展示，不再重复导入为游客参与者。"]}'::jsonb
  );

CREATE TABLE manual_import_guest_participants (
  guest_id text PRIMARY KEY,
  activity_id text NOT NULL,
  display_name text NOT NULL,
  wechat_id text,
  normalized_wechat_id text,
  message text,
  status text NOT NULL,
  joined_at timestamp NOT NULL
);

INSERT INTO manual_import_guest_participants (
  guest_id, activity_id, display_name, wechat_id, normalized_wechat_id, message, status, joined_at
) VALUES
  ('manual_guest_20260620_dage_bbq_002', 'manual_group_20260620_dage_bbq', 'NickJY', NULL, NULL, '手动组局导入', 'APPROVED', '2026-06-20 16:00:00'),
  ('manual_guest_20260620_dage_bbq_003', 'manual_group_20260620_dage_bbq', 'lcj', 'MeowCoDing', 'meowcoding', '手动组局导入', 'APPROVED', '2026-06-20 16:00:00'),

  ('manual_guest_20260620_lac_002', 'manual_group_20260620_lac_en_scene', 'Louise', 'P555-555-555', 'p555-555-555', '手动组局导入', 'APPROVED', '2026-06-20 18:30:00'),
  ('manual_guest_20260620_lac_003', 'manual_group_20260620_lac_en_scene', 'James', 'univasity', 'univasity', '手动组局导入', 'APPROVED', '2026-06-20 18:30:00'),
  ('manual_guest_20260620_lac_004', 'manual_group_20260620_lac_en_scene', '二十八君', 'GodinNutshell', 'godinnutshell', '手动组局导入', 'APPROVED', '2026-06-20 18:30:00'),
  ('manual_guest_20260620_lac_005', 'manual_group_20260620_lac_en_scene', '荼蘼', 'uneshrish', 'uneshrish', '手动组局导入', 'APPROVED', '2026-06-20 18:30:00'),
  ('manual_guest_20260620_lac_006', 'manual_group_20260620_lac_en_scene', 'Yoush', 'Gyx17318053630', 'gyx17318053630', '手动组局导入', 'APPROVED', '2026-06-20 18:30:00'),

  ('manual_guest_20260622_toy_story_002', 'manual_group_20260622_toy_story_5_ugc', '荼蘼', 'uneshrish', 'uneshrish', '手动组局导入', 'APPROVED', '2026-06-22 17:30:00'),
  ('manual_guest_20260622_toy_story_003', 'manual_group_20260622_toy_story_5_ugc', '二十八君', 'GodinNutshell', 'godinnutshell', '手动组局导入', 'APPROVED', '2026-06-22 17:30:00'),

  ('manual_guest_20260619_suresnes_002', 'manual_group_20260619_suresnes_balavoine_concert', '张杠杠', 'fightingzgg918', 'fightingzgg918', '手动组局导入', 'APPROVED', '2026-06-19 17:00:00'),
  ('manual_guest_20260619_suresnes_003', 'manual_group_20260619_suresnes_balavoine_concert', 'Louise', 'P555-555-555', 'p555-555-555', '手动组局导入', 'APPROVED', '2026-06-19 17:00:00'),

  ('manual_guest_20260620_pingpong_002', 'manual_group_20260620_luxembourg_pingpong', 'Hoting', 'qhan017', 'qhan017', '手动组局导入；具体时间待复核', 'APPROVED', '2026-06-20 15:00:00'),
  ('manual_guest_20260620_pingpong_003', 'manual_group_20260620_luxembourg_pingpong', 'Jin', 'FuhaiPARIS1et2', 'fuhaiparis1et2', '手动组局导入；具体时间待复核', 'APPROVED', '2026-06-20 15:00:00');

-- 1) Create production organizer placeholder profiles only when no active profile with the same nickname exists.
INSERT INTO "UserProfile" (
  "id", "clerkUserId", "nickname", "status", "role", "syncedAt", "createdAt", "updatedAt"
)
SELECT
  o.profile_id,
  o.clerk_user_id,
  o.nickname,
  'ACTIVE'::"UserProfileStatus",
  'USER'::"UserRole",
  NOW(), NOW(), NOW()
FROM manual_import_organizers o
WHERE NOT EXISTS (
  SELECT 1
  FROM "UserProfile" u
  WHERE u."status" = 'ACTIVE'::"UserProfileStatus"
    AND LOWER(TRIM(u."nickname")) = LOWER(TRIM(o.nickname))
)
ON CONFLICT ("id") DO UPDATE SET
  "nickname" = EXCLUDED."nickname",
  "updatedAt" = NOW();

-- 2) Upsert manual group activities as real Activity rows.
INSERT INTO "Activity" (
  "id", "title", "description", "itinerary", "type", "category", "city", "destination",
  "address", "latitude", "longitude", "startAt", "endAt", "capacity", "minParticipants",
  "requiresApproval", "priceType", "priceText", "coverImageUrl", "ticketUrl", "ticketLabel",
  "source", "sourceUrl", "externalSource", "externalId", "externalUrl", "sourcePayload",
  "importedAt", "status", "visibility", "shareEnabled", "shareToken", "organizerId",
  "publicEventId", "merchantId", "createdAt", "updatedAt"
)
SELECT
  a.activity_id,
  a.title,
  a.description,
  NULL,
  a.activity_type::"ActivityType",
  a.category::"ActivityCategory",
  a.city,
  NULL,
  a.address,
  NULL,
  NULL,
  a.start_at,
  a.end_at,
  a.capacity,
  NULL,
  FALSE,
  a.price_type::"PriceType",
  a.price_text,
  NULL,
  NULL,
  NULL,
  'manual-nextfun-june-2026',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  a.status::"ActivityStatus",
  a.visibility::"ActivityVisibility",
  FALSE,
  NULL,
  COALESCE(
    (SELECT u."id"
     FROM "UserProfile" u
     WHERE u."status" = 'ACTIVE'::"UserProfileStatus"
       AND LOWER(TRIM(u."nickname")) = LOWER(TRIM(a.organizer_nickname))
     ORDER BY CASE WHEN u."clerkUserId" LIKE 'manual-production-organizer:%' THEN 1 ELSE 0 END, u."createdAt" ASC
     LIMIT 1),
    a.organizer_profile_id
  ),
  NULL,
  NULL,
  NOW(),
  NOW()
FROM manual_import_activities a
ON CONFLICT ("id") DO UPDATE SET
  "title" = EXCLUDED."title",
  "description" = EXCLUDED."description",
  "type" = EXCLUDED."type",
  "category" = EXCLUDED."category",
  "city" = EXCLUDED."city",
  "address" = EXCLUDED."address",
  "startAt" = EXCLUDED."startAt",
  "endAt" = EXCLUDED."endAt",
  "capacity" = EXCLUDED."capacity",
  "priceType" = EXCLUDED."priceType",
  "priceText" = EXCLUDED."priceText",
  "source" = EXCLUDED."source",
  "sourceUrl" = EXCLUDED."sourceUrl",
  "externalSource" = EXCLUDED."externalSource",
  "externalId" = EXCLUDED."externalId",
  "externalUrl" = EXCLUDED."externalUrl",
  "sourcePayload" = EXCLUDED."sourcePayload",
  "importedAt" = EXCLUDED."importedAt",
  "status" = EXCLUDED."status",
  "visibility" = EXCLUDED."visibility",
  "organizerId" = EXCLUDED."organizerId",
  "updatedAt" = NOW();

-- 3) Insert participant rows as guest participants. They can be linked later by matching WeChat ID.
INSERT INTO "GuestActivityParticipant" (
  "id", "activityId", "displayName", "phone", "normalizedPhone", "email", "normalizedEmail",
  "wechatId", "normalizedWechatId", "message", "status", "sourceLocale", "sourceUserAgent",
  "sourceFingerprint", "joinedAt", "cancelledAt", "linkedAt", "linkedUserProfileId",
  "linkedParticipantId", "createdAt", "updatedAt"
)
SELECT
  p.guest_id,
  p.activity_id,
  p.display_name,
  NULL,
  NULL,
  NULL,
  NULL,
  p.wechat_id,
  p.normalized_wechat_id,
  p.message,
  p.status::"ParticipantStatus",
  'zh-CN',
  'manual-group-import:june-2026-wave-1',
  'manual-group:june-2026-wave-1',
  p.joined_at,
  NULL,
  NULL,
  NULL,
  NULL,
  NOW(),
  NOW()
FROM manual_import_guest_participants p
JOIN "Activity" a ON a."id" = p.activity_id
WHERE NOT EXISTS (
  SELECT 1
  FROM "GuestActivityParticipant" g
  WHERE g."activityId" = p.activity_id
    AND (
      (p.normalized_wechat_id IS NOT NULL AND g."normalizedWechatId" = p.normalized_wechat_id)
      OR (p.normalized_wechat_id IS NULL AND g."displayName" = p.display_name)
      OR g."id" = p.guest_id
    )
)
ON CONFLICT DO NOTHING;

-- 4) Final summary. Supabase SQL Editor usually displays only the last result set.
-- Expected:
-- - manual activities = 6
-- - manual guest participants = 13
-- - visible to lobby strict query = 6
-- - blocked by lobby import marker = 0
WITH manual_activity_summary AS (
  SELECT
    COUNT(*) AS manual_activity_count,
    COUNT(*) FILTER (
      WHERE a."visibility" = 'PUBLIC'
        AND a."type" <> 'PUBLIC_EVENT'
        AND a."status" IN ('OPEN', 'RECRUITING', 'CONFIRMED', 'ENDED')
        AND a."publicEventId" IS NULL
        AND a."externalSource" IS NULL
        AND a."externalId" IS NULL
        AND a."externalUrl" IS NULL
        AND a."importedAt" IS NULL
        AND u."status" = 'ACTIVE'
    ) AS visible_to_lobby_query,
    COUNT(*) FILTER (
      WHERE a."externalSource" IS NOT NULL
         OR a."externalId" IS NOT NULL
         OR a."externalUrl" IS NOT NULL
         OR a."importedAt" IS NOT NULL
    ) AS blocked_by_lobby_import_marker
  FROM "Activity" a
  LEFT JOIN "UserProfile" u ON u."id" = a."organizerId"
  WHERE a."source" = 'manual-nextfun-june-2026'
),
manual_guest_summary AS (
  SELECT COUNT(*) AS manual_guest_participant_count
  FROM "GuestActivityParticipant"
  WHERE "sourceUserAgent" = 'manual-group-import:june-2026-wave-1'
)
SELECT item, count, expected
FROM (
  SELECT 1 AS sort_order, 'manual activities' AS item, manual_activity_count::bigint AS count, '6' AS expected
  FROM manual_activity_summary
  UNION ALL
  SELECT 2, 'manual guest participants', manual_guest_participant_count::bigint, '13'
  FROM manual_guest_summary
  UNION ALL
  SELECT 3, 'visible to lobby strict query', visible_to_lobby_query::bigint, '6'
  FROM manual_activity_summary
  UNION ALL
  SELECT 4, 'blocked by lobby import marker', blocked_by_lobby_import_marker::bigint, '0'
  FROM manual_activity_summary
) summary
ORDER BY sort_order;

DROP TABLE IF EXISTS manual_import_guest_participants;
DROP TABLE IF EXISTS manual_import_activities;
DROP TABLE IF EXISTS manual_import_organizers;

COMMIT;

-- Optional rollback, only run manually if you need to remove this import batch:
-- BEGIN;
-- DELETE FROM "GuestActivityParticipant" WHERE "sourceUserAgent" = 'manual-group-import:june-2026-wave-1';
-- DELETE FROM "Activity" WHERE "source" = 'manual-nextfun-june-2026';
-- DELETE FROM "UserProfile" u WHERE u."clerkUserId" LIKE 'manual-production-organizer:%' AND NOT EXISTS (SELECT 1 FROM "Activity" a WHERE a."organizerId" = u."id");
-- COMMIT;
