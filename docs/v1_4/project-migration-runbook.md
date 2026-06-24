# 项目搬迁 Runbook

## 目标

当前项目已经完成 phase 1 / MVP。由于后续开发团队即将拆分，需要把现有代码、开发流程、数据库结构、部署配置和第三方服务配置完整迁移到新的项目中。

这份文档用于指导搬迁，不直接决定数据和账号的归属。涉及真实用户数据、密钥、域名、生产数据库和第三方账号所有权时，先按双方确认的交接范围执行，再进行技术操作。

## 搬迁原则

- [ ] 不把 `.env`、数据库连接串、Supabase service role key、Clerk secret、DeepL key 等真实密钥提交到 Git
- [ ] 先复制代码和配置，再迁移数据库结构，最后再导入数据
- [ ] 预览环境先跑通，再切生产域名和正式 cron
- [ ] 任何会写生产数据的脚本都先 dry-run
- [ ] 每一步保留截图、命令输出或日志，方便之后排查责任边界
- [ ] 如果要复制真实用户数据，必须同步处理 Clerk 用户 ID 映射，否则登录后用户资料会对不上

## 阶段 0：冻结和盘点

### 0.1 代码冻结

建议先约定一个搬迁基线：

```bash
git switch dev
git pull origin dev
git status
git log --oneline -n 10
```

记录：

```text
源仓库：
源分支：
基线 commit：
搬迁日期：
搬迁负责人：
目标仓库：
```

冻结期内：

- [ ] 暂停非必要 feature 分支合并
- [ ] 暂停生产数据库结构变更
- [ ] 暂停手动导入大批量活动
- [ ] 暂停更换域名、Clerk、Supabase、Vercel 项目配置

### 0.2 资产清单

需要盘点并决定是否迁移：

- [ ] GitHub 仓库、分支、PR、Issue、Actions
- [ ] Vercel 项目、Preview、Production、Cron、域名
- [ ] Supabase / PostgreSQL 数据库
- [ ] Supabase Storage bucket：`activity-covers`
- [ ] Clerk 应用、用户、Webhook、OAuth 回调
- [ ] DeepL API key
- [ ] Paris Open Data 导入配置
- [ ] GitHub Actions monitoring 变量
- [ ] 本地 `.env.local` / `apps/web/.env.local`
- [ ] 文档、SQL 脚本、版本公告
- [ ] 生产域名和 DNS

## 阶段 1：创建新代码仓库

### 1.1 推荐方式：保留完整历史

如果新项目需要保留完整 Git 历史：

```bash
git clone --mirror git@github.com:OLD_ORG/OLD_REPO.git friemi-mirror.git
cd friemi-mirror.git
git remote set-url --push origin git@github.com:NEW_ORG/NEW_REPO.git
git push --mirror
cd ..
rm -rf friemi-mirror.git
```

然后重新克隆新仓库：

```bash
git clone git@github.com:NEW_ORG/NEW_REPO.git friemi-new
cd friemi-new
git switch dev
```

验收：

- [ ] `dev`、`main` 和必要 feature 分支都存在
- [ ] tag 和历史 commit 都存在
- [ ] `.gitignore` 生效，没有真实 `.env` 被提交
- [ ] `skills-folder/`、`node_modules/`、`.vercel/` 等本地文件没有进入新仓库

### 1.2 可选方式：只复制当前代码

如果双方约定不迁移历史，只保留当前代码：

```bash
rsync -av \
  --exclude .git \
  --exclude node_modules \
  --exclude .next \
  --exclude .turbo \
  --exclude .vercel \
  --exclude '.env*' \
  OLD_PROJECT_DIR/ NEW_PROJECT_DIR/

cd NEW_PROJECT_DIR
git init
git remote add origin git@github.com:NEW_ORG/NEW_REPO.git
git add .
git commit -m "chore: initialize migrated project"
git branch -M main
git push -u origin main
git switch -c dev
git push -u origin dev
```

这种方式会丢失历史 PR 和 commit 追踪，后续排查成本更高。

## 阶段 2：本地开发环境迁移

### 2.1 Node 和依赖

本项目要求：

```text
Node >=20.19 <21
npm >=10
```

检查：

```bash
node -v
npm -v
npm ci
```

### 2.2 环境变量

从模板创建本地环境文件：

```bash
cp .env.example .env.local
cp .env.example apps/web/.env.local
```

如果 Prisma CLI 需要读取 `apps/web/.env`：

```bash
cp apps/web/.env.local apps/web/.env
```

不要提交这些文件。

### 2.3 必填变量

Web 应用常用变量：

```text
DATABASE_URL
DIRECT_URL
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
CLERK_WEBHOOK_SIGNING_SECRET
NEXT_PUBLIC_CLERK_SIGN_IN_URL
NEXT_PUBLIC_CLERK_SIGN_UP_URL
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL
NEXT_PUBLIC_APP_URL
ADMIN_CLERK_USER_IDS
ADMIN_EMAILS
CRON_SECRET
PARIS_OPEN_DATA_API_KEY
DEEPL_API_KEY
DEEPL_API_BASE_URL
WEATHER_PROVIDER
METEOFRANCE_API_KEY
METEOFRANCE_APPLICATION_ID
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET
PERFORMANCE_DEBUG
NEXT_PUBLIC_PERFORMANCE_DEBUG
```

脚本 / 监控可选变量：

```text
PLAYWRIGHT_MONITOR_BASE_URL
PLAYWRIGHT_MONITOR_MAX_LOAD_MS
PLAYWRIGHT_MONITOR_WORKERS
PLAYWRIGHT_AUTH_STORAGE_STATE
PLAYWRIGHT_MONITOR_FAIL_ON_ANY_CONSOLE_ERROR
CONTENT_SOURCE_DATABASE_URL
CONTENT_TARGET_DATABASE_URL
CONTENT_TARGET_ORGANIZER_ID
CONTENT_TARGET_ORGANIZER_CLERK_ID
CONTENT_TARGET_ORGANIZER_NICKNAME
SCRAPERS_ENV_FILE
SCRAPER_ORGANIZER_CLERK_USER_ID
SCRAPER_ORGANIZER_NICKNAME
SCRAPER_MAX_SORTIR_PAGES
SCRAPER_MAX_SORTIR_ARTICLES
SCRAPER_MAX_PLAYIN_EVENTS
SCRAPER_TIMEOUT_MS
SCRAPER_DELAY_MS
SCRAPER_DEFAULT_CAPACITY
SCRAPER_DRY_RUN
```

验收：

```bash
npm run db:generate
npm run typecheck
npm run test
npm run dev
```

打开：

```text
http://localhost:3000/zh-CN/home
http://localhost:3000/zh-CN/activities
http://localhost:3000/zh-CN/lobby
http://localhost:3000/api/health
```

## 阶段 3：数据库迁移

数据库是搬迁中最容易出问题的部分。先决定迁移策略。

### 3.1 策略 A：只迁移结构，不迁移用户和业务数据

适合新团队从 MVP 代码重新开始运营。

1. 新建空 PostgreSQL / Supabase 数据库
2. 设置：

```bash
export DATABASE_URL="新数据库 pooler 连接串"
export DIRECT_URL="新数据库 direct 连接串"
```

3. 执行迁移：

```bash
cd apps/web
npx prisma generate
npx prisma migrate deploy
```

如果目标库不是空库，不要直接 `migrate deploy`。先用 diff 确认：

```bash
npx prisma migrate diff \
  --from-url "$DIRECT_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > /tmp/target-schema-diff.sql

sed -n '1,260p' /tmp/target-schema-diff.sql
```

验收：

- [ ] `npx prisma migrate status` 正常
- [ ] `npx prisma generate` 正常
- [ ] `/api/health` 正常
- [ ] 首页、活动页、组队大厅能打开

### 3.2 策略 B：迁移结构和业务数据

适合新项目要继承当前 MVP 的活动、组局、用户、消息、游客报名、收藏、通知等数据。

Supabase 项目不要直接全库恢复。全库 dump 里会包含 `auth`、`storage`、`realtime`、event trigger 等 Supabase 托管对象，普通 `postgres` 用户通常不是这些对象的 owner，直接 `pg_restore --clean` 会出现大量 `must be owner` 错误。本项目业务数据以 `public` schema 为主，数据库搬迁默认只恢复 `public` schema；Storage bucket 和文件按“阶段 4”单独处理。

先导出源库：

```bash
export SOURCE_DIRECT_URL="源数据库 direct 连接串"
export TARGET_DIRECT_URL="目标数据库 direct 连接串"

pg_dump "$SOURCE_DIRECT_URL" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file=/tmp/friemi-source.dump
```

恢复到目标库：

```bash
pg_restore --dbname="$TARGET_DIRECT_URL" \
  --schema=public \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  /tmp/friemi-source.dump
```

恢复后检查 schema 是否和代码一致：

```bash
cd apps/web
npx prisma migrate diff \
  --from-url "$TARGET_DIRECT_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > /tmp/target-schema-diff.sql

sed -n '1,260p' /tmp/target-schema-diff.sql
```

如果 diff 为空或只有明确可接受的小变更，才继续。

验收：

- [ ] `UserProfile`、`Activity`、`PublicEvent`、`ActivityParticipant`、`GuestActivityParticipant` 数量符合预期
- [ ] 活动封面 URL 能打开
- [ ] 组局详情能打开
- [ ] 搜索页能返回结果
- [ ] 游客报名数据还在
- [ ] 通知和私信数据按约定保留或清理

### 3.2.1 预览库和生产库双环境全量搬迁

本项目需要同时搬迁两套数据库：

- 旧预览数据库 -> 新预览数据库
- 旧生产数据库 -> 新生产数据库

原则：

- [ ] 预览和生产分开执行，不共用 dump 文件名
- [ ] 源库只做 `pg_dump`，不要对旧库执行 `pg_restore`、`migrate deploy` 或清理脚本
- [ ] 先完成预览库搬迁和验收，再执行生产库搬迁
- [ ] 生产搬迁前短暂冻结旧生产写入，避免导出后又产生新数据
- [ ] 所有连接串只放在本地临时 env 文件，不提交 Git，不粘贴到聊天或 PR

建议本地建立两个临时文件：

```bash
mkdir -p migration-backups
touch migration-backups/preview-db.env
touch migration-backups/production-db.env
chmod 600 migration-backups/preview-db.env migration-backups/production-db.env
```

`migration-backups/preview-db.env`：

```bash
SOURCE_DIRECT_URL="旧预览数据库 direct 连接串"
TARGET_DIRECT_URL="新预览数据库 direct 连接串"
```

如果新 Supabase 项目的 direct host 报 `Connection refused`、`Network is unreachable`，或当前网络不能访问 IPv6 direct endpoint，可以临时增加一个恢复专用连接串：

```bash
TARGET_RESTORE_URL="新预览数据库 Session pooler 连接串"
```

恢复时优先使用 `TARGET_RESTORE_URL`，没有时再使用 `TARGET_DIRECT_URL`。不要使用 Transaction pooler 做 schema restore，优先选择 Session pooler。

注意：PostgreSQL URL 里的密码如果包含 `@`、`:`、`#`、`/`、`?`、`&` 等特殊字符，必须使用 URL encode，否则 `pg_dump` / `pg_restore` 可能把密码片段误识别成 host 或 port。

常见替换：

```text
@ -> %40
: -> %3A
# -> %23
/ -> %2F
? -> %3F
& -> %26
```

`migration-backups/production-db.env`：

```bash
SOURCE_DIRECT_URL="旧生产数据库 direct 连接串"
TARGET_DIRECT_URL="新生产数据库 direct 连接串"
# 如果 direct endpoint 不可达，可以增加：
TARGET_RESTORE_URL="新生产数据库 Session pooler 连接串"
```

确认这些文件在 `.gitignore` 中被忽略：

```bash
git check-ignore migration-backups/preview-db.env migration-backups/production-db.env
```

如果没有被忽略，先补充 `.gitignore`：

```gitignore
migration-backups/*.env
migration-backups/*.dump
```

#### 预览库搬迁

导出旧预览库：

```bash
set -a
source migration-backups/preview-db.env
set +a

pg_dump "$SOURCE_DIRECT_URL" \
  --format=custom \
  --schema=public \
  --no-owner \
  --no-acl \
  --file="migration-backups/preview-source-$(date +%Y%m%d-%H%M%S).dump"
```

恢复到新预览库：

```bash
LATEST_PREVIEW_DUMP="$(ls -t migration-backups/preview-source-*.dump | head -1)"
RESTORE_URL="${TARGET_RESTORE_URL:-$TARGET_DIRECT_URL}"

pg_restore --dbname="$RESTORE_URL" \
  --schema=public \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  "$LATEST_PREVIEW_DUMP"
```

检查新预览库和 Prisma schema 是否一致：

```bash
cd apps/web

npx prisma migrate diff \
  --from-url "${TARGET_RESTORE_URL:-$TARGET_DIRECT_URL}" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > /tmp/preview-schema-diff.sql

sed -n '1,260p' /tmp/preview-schema-diff.sql
```

预览库验收：

- [ ] 新预览环境使用新预览库的 `DATABASE_URL` 和 `DIRECT_URL`
- [ ] 新预览环境首页、活动页、组队大厅、搜索页可打开
- [ ] 用户、活动、组局、报名、收藏、消息等核心数据数量接近旧预览库
- [ ] 上传封面、收藏、报名等写入动作写入新预览库，不再写旧预览库
- [ ] Cron dry-run 能读写新预览库配置，但不会影响生产库

#### 生产库搬迁

生产库搬迁前：

- [ ] 确认新预览库已经验收通过
- [ ] 记录旧生产当前部署版本和数据库连接信息归属
- [ ] 暂停旧生产 cron、人工导入脚本和高风险后台写入
- [ ] 选择访问低峰期执行

导出旧生产库：

```bash
cd /home/ubuntu23/Bureau/friemi

set -a
source migration-backups/production-db.env
set +a

pg_dump "$SOURCE_DIRECT_URL" \
  --format=custom \
  --schema=public \
  --no-owner \
  --no-acl \
  --file="migration-backups/production-source-$(date +%Y%m%d-%H%M%S).dump"
```

恢复到新生产库：

```bash
LATEST_PRODUCTION_DUMP="$(ls -t migration-backups/production-source-*.dump | head -1)"
RESTORE_URL="${TARGET_RESTORE_URL:-$TARGET_DIRECT_URL}"

pg_restore --dbname="$RESTORE_URL" \
  --schema=public \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  "$LATEST_PRODUCTION_DUMP"
```

检查新生产库和 Prisma schema 是否一致：

```bash
cd apps/web

npx prisma migrate diff \
  --from-url "${TARGET_RESTORE_URL:-$TARGET_DIRECT_URL}" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > /tmp/production-schema-diff.sql

sed -n '1,260p' /tmp/production-schema-diff.sql
```

生产库验收：

- [ ] 新生产 Vercel 项目使用新生产库的 `DATABASE_URL` 和 `DIRECT_URL`
- [ ] `NEXT_PUBLIC_APP_URL` 指向新生产域名
- [ ] Clerk webhook、cron、Supabase Storage 配置都指向新项目
- [ ] 首页、活动页、组队大厅、搜索页、个人空间、消息、后台可打开
- [ ] 登录用户能看到自己的资料、发起、参与、收藏和消息
- [ ] 旧生产库保留至少 7-14 天，不立即删除

收尾清理：

```bash
unset SOURCE_DIRECT_URL
unset TARGET_DIRECT_URL
unset TARGET_RESTORE_URL
unset DATABASE_URL
unset DIRECT_URL
```

### 3.3 Clerk 用户 ID 风险

`UserProfile.clerkUserId` 绑定的是 Clerk 的用户 ID。

当前搬迁策略：

- [ ] 本轮先沿用旧 Clerk Production 应用，优先跑通新 GitHub / Supabase / Vercel / Storage 部署
- [ ] 新 Vercel Preview / Production 先配置旧 Clerk 对应的 publishable key、secret key 和 webhook secret
- [ ] 在旧 Clerk Dashboard 里补充新预览域名和新生产域名的 allowed origins / redirect URLs
- [ ] 确认用户登录后仍能匹配旧数据库迁移过来的 `UserProfile.clerkUserId`
- [ ] 新 Clerk 应用和用户 ID 映射单独开后续分支处理，不和本次数据库 / Storage 搬迁混做
- [ ] 在新 Clerk 迁移完成前，不要删除旧 Clerk 应用、旧 OAuth 配置和旧 webhook

这样做的目的：

- 降低首轮搬迁风险，避免登录身份和业务数据归属同时变化
- 保留老用户无感登录能力
- 让新数据库里的好友、消息、活动发起、报名、收藏、通知继续按原用户 ID 工作
- 后续如果必须彻底独立，再通过 Clerk 用户导出 / 导入和 ID 映射迁移

如果新项目继续使用原 Clerk 应用：

- [ ] 用户登录后能继续匹配原 `clerkUserId`
- [ ] `ADMIN_CLERK_USER_IDS` 不需要批量重写，只需要确认管理员范围
- [ ] 风险较低，但双方需要明确 Clerk 应用所有权和短期访问权限

如果新项目使用新的 Clerk 应用：

- [ ] 原数据库里的 `clerkUserId` 不会自动匹配新 Clerk 用户
- [ ] 老用户重新登录会生成新的 Clerk ID
- [ ] 需要用户迁移和 ID 映射方案
- [ ] 或者只迁移公共活动 / 组局数据，不迁移个人用户数据

推荐先做一张映射表：

```text
old_clerk_user_id
new_clerk_user_id
verified_email
old_user_profile_id
new_user_profile_id
decision
```

没有映射前，不要在新 Clerk 应用上直接复制完整生产用户数据，否则会出现：

- 登录后看不到自己的活动
- 我的发起 / 我的参与为空
- 管理员权限丢失
- 通知、私信、好友关系指向旧用户
- 游客报名自动关联失败

## 阶段 4：Supabase Storage 迁移

当前活动 / 组局自定义封面使用：

```text
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET=activity-covers
```

目标项目需要：

- [ ] 新建 Supabase project 或确认沿用现有 project
- [ ] 创建 bucket：`activity-covers`
- [ ] bucket 允许公开读取，写入只通过服务端 service role
- [ ] 设置 Vercel 环境变量
- [ ] 本地上传一张测试封面，确认返回 public URL

如果要复制旧 bucket 对象：

- 可以用 Supabase Dashboard 批量下载 / 上传
- 或写脚本读取源 bucket 对象后上传到目标 bucket
- 如果对象 URL 域名变化，需要决定是否批量更新数据库里的 `coverImageUrl`

### 4.1 预览和生产 bucket 对象迁移

数据库搬迁只迁移了 `Activity.coverImageUrl` 和 `PublicEvent.coverImageUrl` 里的 URL 文本，不会迁移 Supabase Storage 里的真实图片对象。`activity-covers` 需要按环境单独复制：

- 旧 Preview Supabase Storage -> 新 Preview Supabase Storage
- 旧 Production Supabase Storage -> 新 Production Supabase Storage

准备两个本地临时 env 文件，不提交 Git：

```bash
touch migration-backups/preview-storage.env
touch migration-backups/production-storage.env
chmod 600 migration-backups/preview-storage.env migration-backups/production-storage.env
```

`migration-backups/preview-storage.env`：

```bash
SOURCE_SUPABASE_URL="旧预览 Supabase Project URL"
SOURCE_SUPABASE_SERVICE_ROLE_KEY="旧预览 service role key"
TARGET_SUPABASE_URL="新预览 Supabase Project URL"
TARGET_SUPABASE_SERVICE_ROLE_KEY="新预览 service role key"
SUPABASE_STORAGE_BUCKET="activity-covers"
```

`migration-backups/production-storage.env`：

```bash
SOURCE_SUPABASE_URL="旧生产 Supabase Project URL"
SOURCE_SUPABASE_SERVICE_ROLE_KEY="旧生产 service role key"
TARGET_SUPABASE_URL="新生产 Supabase Project URL"
TARGET_SUPABASE_SERVICE_ROLE_KEY="新生产 service role key"
SUPABASE_STORAGE_BUCKET="activity-covers"
```

先 dry-run 预览环境：

```bash
set -a
source migration-backups/preview-storage.env
set +a

DRY_RUN=1 node scripts/migrate-supabase-storage.mjs
```

确认对象数量合理后正式复制预览 bucket：

```bash
node scripts/migrate-supabase-storage.mjs
```

生产环境同理：

```bash
set -a
source migration-backups/production-storage.env
set +a

DRY_RUN=1 node scripts/migrate-supabase-storage.mjs
node scripts/migrate-supabase-storage.mjs
```

脚本会：

- 创建或更新目标 bucket：`activity-covers`
- 保持 bucket public
- 保留对象 path，例如 `user_xxx/file.webp`
- 使用 `upsert: true`，重复执行不会重复生成新文件

### 4.2 重写数据库中的 Storage public URL

如果新旧 Supabase Project URL 不同，复制完对象后，还需要把目标数据库里的旧 Storage public URL 改成新 URL。否则页面仍会访问旧 Supabase 项目的图片。

先在目标环境中计算两个前缀：

```bash
OLD_STORAGE_PUBLIC_BASE="${SOURCE_SUPABASE_URL%/}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/"
NEW_STORAGE_PUBLIC_BASE="${TARGET_SUPABASE_URL%/}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/"
```

对目标 Preview 数据库执行：

```bash
set -a
source migration-backups/preview-db.env
source migration-backups/preview-storage.env
set +a

RESTORE_URL="${TARGET_RESTORE_URL:-$TARGET_DIRECT_URL}"
OLD_STORAGE_PUBLIC_BASE="${SOURCE_SUPABASE_URL%/}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/"
NEW_STORAGE_PUBLIC_BASE="${TARGET_SUPABASE_URL%/}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/"

psql "$RESTORE_URL" -v ON_ERROR_STOP=1 \
  -v old="$OLD_STORAGE_PUBLIC_BASE" \
  -v new="$NEW_STORAGE_PUBLIC_BASE" <<'SQL'
UPDATE public."Activity"
SET "coverImageUrl" = replace("coverImageUrl", :'old', :'new')
WHERE "coverImageUrl" LIKE :'old' || '%';

UPDATE public."PublicEvent"
SET "coverImageUrl" = replace("coverImageUrl", :'old', :'new')
WHERE "coverImageUrl" LIKE :'old' || '%';
SQL
```

生产数据库同理，只是换成：

```bash
source migration-backups/production-db.env
source migration-backups/production-storage.env
```

重写后抽样检查：

```bash
psql "$RESTORE_URL" -v ON_ERROR_STOP=1 -Atc '
select "coverImageUrl"
from public."Activity"
where "coverImageUrl" like '\''%/storage/v1/object/public/activity-covers/%'\''
limit 5;
'
```

### 4.3 Storage 迁移验收

验收：

- [ ] `activity-covers` bucket 在新 Preview / 新 Production 都存在
- [ ] bucket 是 public
- [ ] 旧环境 bucket 对象数量和新环境对象数量一致或符合预期
- [ ] `Activity.coverImageUrl` 中旧 Supabase URL 已替换为新 Supabase URL
- [ ] `PublicEvent.coverImageUrl` 中旧 Supabase URL 已替换为新 Supabase URL
- [ ] 打开一条使用自定义封面的组局详情页，图片能显示
- [ ] 上传新封面能成功，返回的是新 Supabase 项目的 public URL

验收：

- [ ] 上传封面接口 `/api/uploads/activity-cover` 返回 200
- [ ] 组局详情页能显示自定义预览图
- [ ] 旧活动封面不会因为域名或 bucket 变化失效

## 阶段 5：Clerk 迁移

当前阶段不立即执行完整 Clerk 迁移。先用旧 Clerk 跑通新部署；下面内容作为后续独立迁移阶段使用。

### 5.0 旧 Clerk 过渡配置

适用场景：新数据库、Storage、Vercel 已经搬到新项目，但用户身份源暂时继续使用旧 Clerk。

需要配置到新 Vercel Preview / Production 的变量：

```text
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
CLERK_WEBHOOK_SIGNING_SECRET
NEXT_PUBLIC_CLERK_SIGN_IN_URL
NEXT_PUBLIC_CLERK_SIGN_UP_URL
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL
ADMIN_CLERK_USER_IDS
ADMIN_EMAILS
```

旧 Clerk Dashboard 需要补充：

- [ ] 新 Vercel Preview 域名加入 allowed origins
- [ ] 新生产域名加入 allowed origins
- [ ] 新域名下的 sign-in / sign-up / after sign-in redirect URL 可用
- [ ] Webhook endpoint 指向新生产域名：`https://新域名/api/webhooks/clerk`
- [ ] Webhook events 保留：`user.created`、`user.updated`、`user.deleted`、`session.created`

验收：

- [ ] 新 Preview 登录后能打开个人空间，并显示原来的发起 / 参与 / 收藏 / 好友 / 消息
- [ ] 新 Production 登录后能打开个人空间，并显示原来的发起 / 参与 / 收藏 / 好友 / 消息
- [ ] 管理员账号仍能访问 `/zh-CN/admin/analytics`
- [ ] Clerk webhook 调用新项目后不会生成重复或错误用户
- [ ] 新项目数据库中 `UserProfile.clerkUserId` 不被批量改写

### 5.1 新建 Clerk 应用

在 Clerk Dashboard 新建应用后配置：

- [ ] Allowed origins：本地、Vercel Preview、生产域名
- [ ] Redirect URLs：`/zh-CN/sign-in`、`/zh-CN/sign-up`、`/zh-CN/home`
- [ ] OAuth provider：Google 等当前启用的登录方式
- [ ] Webhook endpoint：`https://新域名/api/webhooks/clerk`
- [ ] Webhook events：`user.created`、`user.updated`、`user.deleted`、`session.created`

需要迁移的变量：

```text
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
CLERK_WEBHOOK_SIGNING_SECRET
NEXT_PUBLIC_CLERK_SIGN_IN_URL
NEXT_PUBLIC_CLERK_SIGN_UP_URL
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL
```

注意：

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` 和 `CLERK_SECRET_KEY` 必须属于同一个 Clerk 应用
- 本地如果出现 Clerk session redirect loop，先清理 localhost cookie，再检查 key 是否混用
- `CLERK_WEBHOOK_SIGNING_SECRET` 必须来自新 webhook endpoint

### 5.2 管理员权限

管理员权限来自：

```text
ADMIN_CLERK_USER_IDS
ADMIN_EMAILS
UserProfile.role = ADMIN
```

迁移后需要：

- [ ] 确认新 Clerk 用户 ID
- [ ] 更新 `ADMIN_CLERK_USER_IDS`
- [ ] 更新或确认 `ADMIN_EMAILS`
- [ ] 登录后访问 `/zh-CN/admin/analytics`
- [ ] 确认 `/zh-CN/admin/reports`、`/zh-CN/admin/data-scraper` 可访问

## 阶段 6：Vercel 迁移

### 6.1 新建 Vercel 项目

推荐配置：

```text
Root Directory: 仓库根目录
Install Command: npm ci
Build Command: npm run build
Framework: Next.js
Node: 20.x
Region: cdg1
```

当前仓库有两个 Vercel 配置文件：

```text
vercel.json
apps/web/vercel.json
```

两者都包含：

```json
{
  "regions": ["cdg1"],
  "crons": [
    {
      "path": "/api/cron/import-public-activities",
      "schedule": "0 3 * * *"
    }
  ]
}
```

如果 Vercel Root Directory 使用仓库根目录，根目录 `vercel.json` 会生效。不要只配置 `apps/web` 但忘记 monorepo workspace 依赖。

### 6.2 Vercel 环境变量

至少配置三个环境：

```text
Development
Preview
Production
```

每个环境单独填写：

- [ ] `DATABASE_URL`
- [ ] `DIRECT_URL`
- [ ] `NEXT_PUBLIC_APP_URL`
- [ ] Clerk 相关变量
- [ ] `CRON_SECRET`
- [ ] `ADMIN_CLERK_USER_IDS`
- [ ] `ADMIN_EMAILS`
- [ ] `DEEPL_API_KEY`
- [ ] Supabase Storage 相关变量
- [ ] 可选 Open Data / Weather 变量

`NEXT_PUBLIC_APP_URL` 必须对应当前环境域名：

```text
Preview: https://xxx-git-branch-new-org.vercel.app
Production: https://正式域名
Local: http://localhost:3000
```

### 6.3 Cron 验证

先检查健康状态：

```bash
export PROD_URL="https://新项目域名"
export CRON_SECRET="新项目 cron secret"

curl -sS \
  -H "Authorization: Bearer $CRON_SECRET" \
  "$PROD_URL/api/cron/import-public-activities?health=true"
```

再 dry-run：

```bash
curl -sS \
  -H "Authorization: Bearer $CRON_SECRET" \
  "$PROD_URL/api/cron/import-public-activities?limit=50&dryRun=true"
```

确认无误后小批量写入：

```bash
curl -sS \
  -H "Authorization: Bearer $CRON_SECRET" \
  "$PROD_URL/api/cron/import-public-activities?limit=20"
```

验收：

- [ ] `health.environment.cronSecret=true`
- [ ] `health.environment.databaseUrl=true`
- [ ] dry-run 有 `summary`
- [ ] 写入后数据库新增或更新公共活动
- [ ] Vercel Cron 后续能自动触发

## 阶段 7：GitHub Actions 和监控迁移

当前工作流：

```text
.github/workflows/ci.yml
.github/workflows/site-monitoring.yml
```

需要在新仓库配置 repository variables：

```text
PLAYWRIGHT_MONITOR_BASE_URL
PLAYWRIGHT_MONITOR_MAX_LOAD_MS
PLAYWRIGHT_MONITOR_WORKERS
PLAYWRIGHT_AUTH_STORAGE_STATE
```

验证：

```bash
npm run monitor:site --workspace=apps/web

PLAYWRIGHT_MONITOR_BASE_URL="https://新预览域名" \
PLAYWRIGHT_MONITOR_WORKERS=1 \
PLAYWRIGHT_MONITOR_MAX_LOAD_MS=15000 \
npm run monitor:site --workspace=apps/web
```

验收：

- [ ] CI 能跑 `npm ci`
- [ ] Prisma Client 能生成
- [ ] typecheck 通过
- [ ] node tests 通过
- [ ] Playwright monitoring 能访问新域名
- [ ] GitHub Actions 上传报告正常

## 阶段 8：生产切换

### 8.1 预览环境验收清单

- [ ] `/zh-CN/home` 正常
- [ ] `/zh-CN/activities` 正常
- [ ] `/zh-CN/lobby` 正常
- [ ] `/zh-CN/search?q=巴黎` 正常
- [ ] `/api/health` 正常
- [ ] 登录 / 注册正常
- [ ] 登录后能回到原目标页面
- [ ] 创建组局正常
- [ ] 游客报名正常
- [ ] 上传组局预览图正常
- [ ] 收藏正常
- [ ] 通知数字正常
- [ ] 私信入口正常
- [ ] 管理后台正常
- [ ] 公共活动导入 dry-run 正常
- [ ] Playwright monitoring 通过

### 8.2 域名切换

切换前：

- [ ] 新 Vercel Production 部署已成功
- [ ] 新 Clerk allowed origins 已包含正式域名
- [ ] 新 Clerk redirect URLs 已包含正式域名
- [ ] `NEXT_PUBLIC_APP_URL` 已改为正式域名
- [ ] `CRON_SECRET` 已配置
- [ ] 数据库结构和数据已确认
- [ ] Supabase Storage public URL 能访问

切换：

1. 在 Vercel 新项目绑定正式域名
2. 按 Vercel 提示修改 DNS
3. 等待 DNS 生效
4. 访问正式域名关键页面
5. 手动触发 cron health 和 dry-run

### 8.3 回滚方案

切换前必须保留：

- [ ] 旧 Vercel 项目未删除
- [ ] 旧数据库未删除
- [ ] 旧 Clerk 应用未删除
- [ ] 旧 DNS 配置截图
- [ ] 新旧环境变量备份
- [ ] 数据库 dump 文件或 Supabase backup

如果新项目出现严重问题：

1. DNS 切回旧 Vercel 项目
2. 暂停新项目 Vercel Cron
3. 停止新项目写数据库的人工脚本
4. 记录新项目切换期间新增的数据
5. 决定是否把新增数据补回旧库

## 阶段 9：交接完成后的安全动作

如果新旧团队独立运营：

- [ ] 新项目生成全新的 `CRON_SECRET`
- [ ] 新项目生成全新的 Supabase service role key
- [ ] 新项目生成全新的 Clerk secret 和 webhook secret
- [ ] 新项目生成全新的 DeepL key 或独立计费 key
- [ ] 新项目 Vercel、GitHub、Supabase、Clerk 权限只保留新团队成员
- [ ] 旧团队成员从新项目生产环境移除
- [ ] 新团队成员从旧项目生产环境移除
- [ ] GitHub branch protection 和 required checks 重新设置
- [ ] GitHub Actions repository variables 重新设置
- [ ] 删除本地临时 dump、SQL、`.env` 备份文件

临时文件清理示例：

```bash
rm -f /tmp/friemi-source.dump
rm -f /tmp/target-schema-diff.sql
unset SOURCE_DIRECT_URL
unset TARGET_DIRECT_URL
unset DATABASE_URL
unset DIRECT_URL
unset CRON_SECRET
```

## 最小成功标准

搬迁不能只看部署成功。至少满足：

- [ ] 新仓库能独立安装依赖、typecheck、test、build
- [ ] 新数据库 schema 与 `apps/web/prisma/schema.prisma` 一致
- [ ] 新 Vercel Preview 和 Production 都能打开核心页面
- [ ] 登录、报名、收藏、创建组局、上传封面、通知、管理后台核心路径可用
- [ ] 公共活动 cron 可手动触发并能自动触发
- [ ] Playwright monitoring 已指向新域名
- [ ] 密钥没有进入 Git 历史
- [ ] 旧项目可按约定保留或下线

## 常见问题

### `npx prisma migrate deploy` 报 P3005

目标数据库不是空库。不要强行 deploy。先执行：

```bash
npx prisma migrate diff \
  --from-url "$DIRECT_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > /tmp/target-schema-diff.sql
```

如果目标库是从旧生产库复制来的，应使用 baseline / restore 后的迁移状态策略，而不是把它当空库处理。

### 登录后用户资料为空

通常是新 Clerk 应用生成了新的 `clerkUserId`，而数据库里保存的是旧 Clerk ID。需要做用户映射，或重新决定是否迁移用户数据。

### 上传封面 500

检查：

```text
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET
```

并确认 bucket 已存在且允许 public read。

### Vercel cron 没有创建活动

检查：

- [ ] 根目录 `vercel.json` 是否被当前 Vercel 项目读取
- [ ] Vercel 项目 Root Directory 是否和 `vercel.json` 所在位置一致
- [ ] `CRON_SECRET` 是否配置在 Production
- [ ] 手动调用 `?health=true` 是否通过
- [ ] `DATABASE_URL` 是否指向目标生产库
- [ ] Vercel Logs 是否有 `/api/cron/import-public-activities`

### Prisma prepared statement 报错

典型日志：

```text
prepared statement "s18" does not exist
bind message supplies ... parameters, but prepared statement ... requires ...
```

这通常不是业务查询写错，而是 Prisma 通过 Supabase pooler / PgBouncer 连接时 prepared statement 被连接池复用打乱。

检查 Vercel Production / Preview 环境变量：

- [ ] `DATABASE_URL` 和 `DIRECT_URL` 必须属于同一个 Supabase project
- [ ] `DATABASE_URL` 如果使用 Supabase pooler，URL 需要带 `pgbouncer=true`
- [ ] `DATABASE_URL` 建议带 `connection_limit=1`
- [ ] `DIRECT_URL` 使用同一个 Supabase project 的 direct URL，不加 `pgbouncer=true`
- [ ] 修改 Vercel env 后需要重新部署，旧 deployment 不会自动读取新变量

推荐格式：

```text
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres"
```

如果生产仍然报 prepared statement 错误，可以临时把 `DATABASE_URL` 也切到同项目的 direct URL 验证问题是否来自 pooler；确认后再换回正确 pooler 配置。

### Clerk 本地出现 session redirect loop

通常是 publishable key 和 secret key 混用了不同 Clerk 应用，或者浏览器残留旧 cookie。

处理：

1. 确认 `.env.local` 里的 Clerk key 来自同一个应用
2. 清理 `localhost` 站点数据和 cookie
3. 重启 dev server
