# v2.1 生产数据库发布说明

适用范围：

- 全局活动 / 组局分类统一为 9+1 分类
- 私信关联活动上下文和 `DIRECT_MESSAGE` 通知类型
- 当前分支 `feature/v2-1-account-identity-bindings` 的账号绑定字段结构迁移
- 共创主理人身份字段 `UserProfile.isCoCreator`
- 清理旧项目迁移遗留的幽灵账号邮箱验证占用

执行原则：

- 先迁移生产数据库，再部署生产代码。
- 全程确认当前 Supabase project 是 Production，不是 Preview。
- 不要对生产库执行 `prisma db push`、`prisma migrate dev`、`prisma migrate reset`。
- 执行前确认 Supabase Dashboard 已有可回滚备份。

## 0. 发布前确认

在 Supabase SQL Editor 确认当前连接的是生产库。

```sql
SELECT
  current_database() AS database_name,
  current_schema() AS schema_name,
  now() AS checked_at;
```

检查 Prisma migration 记录，避免重复 resolve。

```sql
SELECT migration_name, finished_at
FROM "_prisma_migrations"
WHERE migration_name IN (
  '20260628010000_unify_activity_categories',
  '20260628020000_add_direct_message_activity_notifications',
  '20260629010000_add_user_profile_contact_bindings',
  '20260629020000_add_co_creator_profile_identity'
)
ORDER BY migration_name;
```

## 1. 分类迁移前检查

目标：将活动 / 组局分类统一为 9+1 分类。

新分类：

- `FOOD`：饭局
- `WANDER`：闲逛
- `AUDIO_VISUAL`：视听
- `ART`：艺术
- `BOARD_GAME`：桌游
- `GROWTH`：进步
- `TRAVEL`：旅行
- `MUSIC`：音乐
- `SPORTS`：运动
- `OTHER`：其它

旧分类迁移规则：

- `MOVIE` -> `AUDIO_VISUAL`
- `THEATER` -> `AUDIO_VISUAL`
- `EXHIBITION` -> `ART`
- `OTHER` 保持 `OTHER`

先查看当前 enum。如果已经没有 `MOVIE`、`EXHIBITION`、`THEATER`，跳过第 2 步分类迁移。

```sql
SELECT enumlabel
FROM pg_enum
JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace
WHERE pg_namespace.nspname = 'public'
  AND pg_type.typname = 'ActivityCategory'
ORDER BY enumsortorder;
```

执行前查询旧分类数量：

```sql
SELECT category, COUNT(*)
FROM "Activity"
WHERE category::text IN ('MOVIE', 'EXHIBITION', 'THEATER')
GROUP BY category;

SELECT category, COUNT(*)
FROM "PublicEvent"
WHERE category::text IN ('MOVIE', 'EXHIBITION', 'THEATER')
GROUP BY category;
```

## 2. 执行分类 enum 迁移

只执行一次。执行前再次确认当前是生产库。

```sql
BEGIN;

CREATE TYPE "public"."ActivityCategory_new" AS ENUM (
  'FOOD',
  'WANDER',
  'AUDIO_VISUAL',
  'ART',
  'BOARD_GAME',
  'GROWTH',
  'TRAVEL',
  'MUSIC',
  'SPORTS',
  'OTHER'
);

ALTER TABLE "public"."Activity" ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "public"."PublicEvent" ALTER COLUMN "category" DROP DEFAULT;

ALTER TABLE "public"."Activity"
  ALTER COLUMN "category" TYPE "public"."ActivityCategory_new"
  USING (
    CASE "category"::text
      WHEN 'MOVIE' THEN 'AUDIO_VISUAL'
      WHEN 'THEATER' THEN 'AUDIO_VISUAL'
      WHEN 'EXHIBITION' THEN 'ART'
      ELSE "category"::text
    END
  )::"public"."ActivityCategory_new";

ALTER TABLE "public"."PublicEvent"
  ALTER COLUMN "category" TYPE "public"."ActivityCategory_new"
  USING (
    CASE "category"::text
      WHEN 'MOVIE' THEN 'AUDIO_VISUAL'
      WHEN 'THEATER' THEN 'AUDIO_VISUAL'
      WHEN 'EXHIBITION' THEN 'ART'
      ELSE "category"::text
    END
  )::"public"."ActivityCategory_new";

ALTER TABLE "public"."Activity"
  ALTER COLUMN "category" SET DEFAULT 'OTHER'::"public"."ActivityCategory_new";
ALTER TABLE "public"."PublicEvent"
  ALTER COLUMN "category" SET DEFAULT 'OTHER'::"public"."ActivityCategory_new";

DROP TYPE "public"."ActivityCategory";
ALTER TYPE "public"."ActivityCategory_new" RENAME TO "ActivityCategory";

COMMIT;
```

## 3. 执行私信活动上下文结构迁移

目标：

- `NotificationType` 增加 `DIRECT_MESSAGE`
- `DirectMessage` 增加可选 `activityId`
- 私信可以保留来源活动 / 组局上下文

先检查是否已经存在：

```sql
SELECT enumlabel
FROM pg_enum
JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace
WHERE pg_namespace.nspname = 'public'
  AND pg_type.typname = 'NotificationType'
  AND enumlabel = 'DIRECT_MESSAGE';

SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'DirectMessage'
  AND column_name = 'activityId';
```

如果缺失，执行：

```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
    JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace
    WHERE pg_namespace.nspname = 'public'
      AND pg_type.typname = 'NotificationType'
      AND enumlabel = 'DIRECT_MESSAGE'
  ) THEN
    ALTER TYPE "public"."NotificationType" ADD VALUE 'DIRECT_MESSAGE';
  END IF;
END $$;

ALTER TABLE "public"."DirectMessage"
ADD COLUMN IF NOT EXISTS "activityId" TEXT;

CREATE INDEX IF NOT EXISTS "DirectMessage_activityId_idx"
ON "public"."DirectMessage"("activityId" ASC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'DirectMessage_activityId_fkey'
  ) THEN
    ALTER TABLE "public"."DirectMessage"
      ADD CONSTRAINT "DirectMessage_activityId_fkey"
      FOREIGN KEY ("activityId") REFERENCES "public"."Activity"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
```

## 4. 执行账号绑定字段结构迁移

当前分支新增用户绑定字段：

- `contactEmail`
- `normalizedContactEmail`
- `phone`
- `normalizedPhone`

这一步可以重复执行，因为使用了 `IF NOT EXISTS`。

```sql
ALTER TABLE "public"."UserProfile"
ADD COLUMN IF NOT EXISTS "contactEmail" TEXT,
ADD COLUMN IF NOT EXISTS "normalizedContactEmail" TEXT,
ADD COLUMN IF NOT EXISTS "phone" TEXT,
ADD COLUMN IF NOT EXISTS "normalizedPhone" TEXT;

CREATE INDEX IF NOT EXISTS "UserProfile_normalizedContactEmail_idx"
ON "public"."UserProfile"("normalizedContactEmail");

CREATE INDEX IF NOT EXISTS "UserProfile_normalizedPhone_idx"
ON "public"."UserProfile"("normalizedPhone");
```

这一步暂时不加唯一索引。唯一性由服务端事务校验控制，避免生产历史数据有重复值时迁移失败。等幽灵账号和重复绑定数据清理完成后，可以单独评估是否补数据库唯一约束。

## 5. 执行共创主理人身份字段结构迁移

当前 v2.1 共创主理人展示依赖：

- `UserProfile.isCoCreator`
- `UserProfile_isCoCreator_status_idx`

如果生产库缺少这个字段，个人主页、用户预览弹窗、好友列表等读取 `isCoCreator` 的页面会报错。

执行：

```sql
ALTER TABLE "public"."UserProfile"
ADD COLUMN IF NOT EXISTS "isCoCreator" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "UserProfile_isCoCreator_status_idx"
ON "public"."UserProfile"("isCoCreator", "status");
```

如需授予某个用户共创主理人身份，按邮箱或 friendCode 精确更新。执行前先 SELECT 核对用户。

```sql
SELECT id, email, nickname, "friendCode", "isCoCreator"
FROM "UserProfile"
WHERE LOWER(TRIM(email)) = LOWER(TRIM('user@example.com'))
   OR "friendCode" = '123456';

UPDATE "UserProfile"
SET "isCoCreator" = true,
    "updatedAt" = NOW()
WHERE id = '确认后的用户 id';
```

## 6. 幽灵账号邮箱占用清理

背景：

项目从旧 Clerk / 旧数据库迁移后，生产库里可能同时存在旧项目幽灵账号和新 Friemi 真实账号。两者邮箱相同时，旧账号如果还保留 `emailVerifiedAt`，会被当前绑定逻辑视为“该邮箱已被 ACTIVE 账号占用”，从而影响真实用户绑定邮箱。

本步骤不删除 `email`，只清理旧账号的邮箱验证占用和联系邮箱绑定字段，保留审计线索。

### 6.1 查询重复邮箱

规则：同一邮箱下保留 `createdAt` 最新的账号作为 keeper；更早账号先视为 ghost 候选。执行更新前必须人工检查结果。

```sql
WITH ranked AS (
  SELECT
    id,
    LOWER(TRIM(email)) AS email_key,
    "clerkUserId",
    nickname,
    role,
    status,
    email,
    "emailVerifiedAt",
    "createdAt",
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(TRIM(email))
      ORDER BY "createdAt" DESC, id DESC
    ) AS rn,
    COUNT(*) OVER (
      PARTITION BY LOWER(TRIM(email))
    ) AS profile_count
  FROM "UserProfile"
  WHERE email IS NOT NULL
    AND TRIM(email) <> ''
)
SELECT *
FROM ranked
WHERE profile_count > 1
ORDER BY email_key, rn;
```

### 6.2 备份将要清理的 ghost 候选

如需重复演练，请改备份表日期后缀。

```sql
CREATE TABLE IF NOT EXISTS "_backup_userprofile_ghost_email_bindings_20260629" AS
WITH ranked AS (
  SELECT
    *,
    LOWER(TRIM(email)) AS email_key,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(TRIM(email))
      ORDER BY "createdAt" DESC, id DESC
    ) AS rn,
    COUNT(*) OVER (
      PARTITION BY LOWER(TRIM(email))
    ) AS profile_count
  FROM "UserProfile"
  WHERE email IS NOT NULL
    AND TRIM(email) <> ''
)
SELECT *
FROM ranked
WHERE profile_count > 1
  AND rn > 1;
```

### 6.3 清理 ghost 邮箱验证占用

这一步只处理重复邮箱里的更早账号。

```sql
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(TRIM(email))
      ORDER BY "createdAt" DESC, id DESC
    ) AS rn,
    COUNT(*) OVER (
      PARTITION BY LOWER(TRIM(email))
    ) AS profile_count
  FROM "UserProfile"
  WHERE email IS NOT NULL
    AND TRIM(email) <> ''
),
ghosts AS (
  SELECT id
  FROM ranked
  WHERE profile_count > 1
    AND rn > 1
)
UPDATE "UserProfile" p
SET
  "emailVerifiedAt" = NULL,
  "contactEmail" = NULL,
  "normalizedContactEmail" = NULL,
  "updatedAt" = NOW()
FROM ghosts g
WHERE p.id = g.id
RETURNING
  p.id,
  p.email,
  p.nickname,
  p.status,
  p."createdAt",
  p."emailVerifiedAt",
  p."contactEmail",
  p."normalizedContactEmail";
```

如果已经确认某些 ghost 账号的所有内容、角色、参与记录和社交关系都已承接到新账号，可以在另一个单独 PR / SQL 中再考虑把它们标记为 `DELETED`。不要在本次发布里顺手删除账号。

## 7. 迁移后验证

验证分类已经没有旧 enum 值：

```sql
SELECT category, COUNT(*)
FROM "Activity"
GROUP BY category
ORDER BY category;

SELECT category, COUNT(*)
FROM "PublicEvent"
GROUP BY category
ORDER BY category;
```

结果中不应再出现：

```text
MOVIE
EXHIBITION
THEATER
```

验证账号绑定字段已存在：

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'UserProfile'
  AND column_name IN (
    'contactEmail',
    'normalizedContactEmail',
    'phone',
    'normalizedPhone'
  )
ORDER BY column_name;
```

应返回 4 行。

验证私信活动上下文结构已存在：

```sql
SELECT enumlabel
FROM pg_enum
JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
JOIN pg_namespace ON pg_namespace.oid = pg_type.typnamespace
WHERE pg_namespace.nspname = 'public'
  AND pg_type.typname = 'NotificationType'
  AND enumlabel = 'DIRECT_MESSAGE';

SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'DirectMessage'
  AND column_name = 'activityId';

SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'DirectMessage'
  AND indexname = 'DirectMessage_activityId_idx';

SELECT conname
FROM pg_constraint
WHERE conname = 'DirectMessage_activityId_fkey';
```

应分别返回 `DIRECT_MESSAGE`、`activityId`、索引名和外键名。

验证共创主理人字段已存在：

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'UserProfile'
  AND column_name = 'isCoCreator';

SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'UserProfile'
  AND indexname = 'UserProfile_isCoCreator_status_idx';
```

应返回 `isCoCreator` 字段和对应索引。

验证账号绑定索引已存在：

```sql
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'UserProfile'
  AND indexname IN (
    'UserProfile_normalizedContactEmail_idx',
    'UserProfile_normalizedPhone_idx'
  )
ORDER BY indexname;
```

应返回 2 行。

验证重复邮箱 ghost 不再占用 `emailVerifiedAt`：

```sql
WITH ranked AS (
  SELECT
    id,
    LOWER(TRIM(email)) AS email_key,
    email,
    "emailVerifiedAt",
    "createdAt",
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(TRIM(email))
      ORDER BY "createdAt" DESC, id DESC
    ) AS rn,
    COUNT(*) OVER (
      PARTITION BY LOWER(TRIM(email))
    ) AS profile_count
  FROM "UserProfile"
  WHERE email IS NOT NULL
    AND TRIM(email) <> ''
)
SELECT *
FROM ranked
WHERE profile_count > 1
  AND rn > 1
  AND "emailVerifiedAt" IS NOT NULL
ORDER BY email_key, rn;
```

应返回 0 行。

检查当前绑定字段是否已经有 ACTIVE 重复值：

```sql
SELECT 'normalizedContactEmail' AS field, "normalizedContactEmail" AS value, COUNT(*)
FROM "UserProfile"
WHERE status = 'ACTIVE'
  AND "normalizedContactEmail" IS NOT NULL
GROUP BY "normalizedContactEmail"
HAVING COUNT(*) > 1

UNION ALL

SELECT 'normalizedPhone' AS field, "normalizedPhone" AS value, COUNT(*)
FROM "UserProfile"
WHERE status = 'ACTIVE'
  AND "normalizedPhone" IS NOT NULL
GROUP BY "normalizedPhone"
HAVING COUNT(*) > 1

UNION ALL

SELECT 'normalizedWechatId' AS field, "normalizedWechatId" AS value, COUNT(*)
FROM "UserProfile"
WHERE status = 'ACTIVE'
  AND "normalizedWechatId" IS NOT NULL
GROUP BY "normalizedWechatId"
HAVING COUNT(*) > 1;
```

理想结果为 0 行。如果有结果，先人工确认是否还存在未合并账号，不要直接删除。

## 8. 标记 Prisma migration 已应用

如果生产库是通过 SQL Editor 手动执行上述 SQL，并且未来会在生产库运行：

```bash
npx prisma migrate deploy
```

则需要把对应 migration 标记为已应用。执行前先查询 `_prisma_migrations`，不要重复 resolve 已存在的 migration。

```bash
cd /home/ubuntu23/Bureau/friemi/apps/web
npx prisma migrate resolve --applied 20260628010000_unify_activity_categories
npx prisma migrate resolve --applied 20260628020000_add_direct_message_activity_notifications
npx prisma migrate resolve --applied 20260629010000_add_user_profile_contact_bindings
npx prisma migrate resolve --applied 20260629020000_add_co_creator_profile_identity
```

注意：本地 `.env` 可能指向 Preview 数据库。生产环境执行 `migrate resolve` 时必须显式使用 Production 的 `DATABASE_URL` / `DIRECT_URL`，否则只会把 Preview 标记为 applied。

如果不能在命令行安全连接 Production，也可以在 Production SQL Editor 手动插入 Prisma migration 记录。执行前必须确认对应结构已经完成，且 `_prisma_migrations` 中没有同名记录。

```sql
BEGIN;

INSERT INTO "_prisma_migrations" (
  id,
  checksum,
  finished_at,
  migration_name,
  logs,
  rolled_back_at,
  started_at,
  applied_steps_count
)
SELECT
  gen_random_uuid()::text,
  '9c706eaa1f8a60fc199bafbaea84e731fecc685bfed6efa00a2525d4f7b59b1b',
  now(),
  '20260628010000_unify_activity_categories',
  NULL,
  NULL,
  now(),
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM "_prisma_migrations"
  WHERE migration_name = '20260628010000_unify_activity_categories'
);

INSERT INTO "_prisma_migrations" (
  id,
  checksum,
  finished_at,
  migration_name,
  logs,
  rolled_back_at,
  started_at,
  applied_steps_count
)
SELECT
  gen_random_uuid()::text,
  '92f97bfa125b213981ded10daf8475376c46004e48d3b8fa7491c03795de56fc',
  now(),
  '20260628020000_add_direct_message_activity_notifications',
  NULL,
  NULL,
  now(),
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM "_prisma_migrations"
  WHERE migration_name = '20260628020000_add_direct_message_activity_notifications'
);

INSERT INTO "_prisma_migrations" (
  id,
  checksum,
  finished_at,
  migration_name,
  logs,
  rolled_back_at,
  started_at,
  applied_steps_count
)
SELECT
  gen_random_uuid()::text,
  '7bbd1e8d33c1e815dff07347c60406a08c0ad6555569202ef7bb93cc4831d0bd',
  now(),
  '20260629010000_add_user_profile_contact_bindings',
  NULL,
  NULL,
  now(),
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM "_prisma_migrations"
  WHERE migration_name = '20260629010000_add_user_profile_contact_bindings'
);

INSERT INTO "_prisma_migrations" (
  id,
  checksum,
  finished_at,
  migration_name,
  logs,
  rolled_back_at,
  started_at,
  applied_steps_count
)
SELECT
  gen_random_uuid()::text,
  '69e9da93b151ac630b9722ef30b8fedabbd0e989929bb77b8657b7bbf1417df5',
  now(),
  '20260629020000_add_co_creator_profile_identity',
  NULL,
  NULL,
  now(),
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM "_prisma_migrations"
  WHERE migration_name = '20260629020000_add_co_creator_profile_identity'
);

COMMIT;
```

插入后验证：

```sql
SELECT migration_name, finished_at, rolled_back_at
FROM "_prisma_migrations"
WHERE migration_name IN (
  '20260628010000_unify_activity_categories',
  '20260628020000_add_direct_message_activity_notifications',
  '20260629010000_add_user_profile_contact_bindings',
  '20260629020000_add_co_creator_profile_identity'
)
ORDER BY migration_name;
```

应返回 4 行，且 `finished_at` 有值、`rolled_back_at` 为 `NULL`。

如果当前生产部署流程不运行 `prisma migrate deploy`，这一步可以在准备引入 `migrate deploy` 前再做，但必须记录本次 SQL 已手动应用。

## 9. 部署生产代码

数据库验证全部通过后，再合并 / 推送 `main` 并触发 Vercel Production 部署。

部署后重点检查：

- `/home`
- `/mobile-home`
- `/activities`
- `/lobby`
- 任意活动 / 组局详情页
- 账号菜单中的“账号绑定”
- 任意用户个人主页和用户预览弹窗中的共创主理人徽章
- 私信页从活动 / 组局详情进入时的上下文保留
- 使用重复邮箱、重复电话、重复微信号时的错误提示

## 禁止事项

生产库不要执行：

```bash
npx prisma db push
npx prisma migrate dev
npx prisma migrate reset
```

不要在没有备份和人工核对的情况下执行：

```sql
DELETE FROM "UserProfile";
UPDATE "UserProfile" SET status = 'DELETED';
```
