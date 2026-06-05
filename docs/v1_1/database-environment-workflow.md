# Database and Environment Workflow

本文档说明在 Supabase Free 版不能使用 Branching 时，如何用两个独立 Supabase 项目维护 Preview 和 Production，并用 Prisma migrations 同步数据库结构。

核心原则：

- Preview 和 Production 必须使用不同 Supabase 项目。
- Preview 和 Production 必须使用不同 Clerk 环境。
- 本地日常开发只连接 Preview/Staging，不连接 Production。
- Production 数据库结构只通过 Prisma migration 更新，不用 `prisma db push`。
- Production 密钥不长期存放在项目目录内。

## 1. 环境划分

| 环境       | Vercel Environment         | Supabase            | Clerk                 | 用途             |
| ---------- | -------------------------- | ------------------- | --------------------- | ---------------- |
| Local      | 本地 `.env` / `.env.local` | Preview Supabase    | Clerk test/dev keys   | 本地开发         |
| Preview    | Vercel Preview             | Preview Supabase    | Clerk test/dev keys   | PR、dev 分支测试 |
| Production | Vercel Production          | Production Supabase | Clerk production keys | 真实用户         |

## 2. Vercel 环境变量

Preview 和 Production 变量要分开配置，不要共用数据库和 secret。

### Preview

```text
DATABASE_URL=preview Supabase pooler URL
DIRECT_URL=preview Supabase direct URL
NEXT_PUBLIC_SUPABASE_URL=preview Supabase project URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=preview anon/publishable key
SUPABASE_SERVICE_ROLE_KEY=preview service role key
SUPABASE_STORAGE_BUCKET=preview bucket name
CLERK_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CRON_SECRET=preview cron secret
```

### Production

```text
DATABASE_URL=production Supabase pooler URL
DIRECT_URL=production Supabase direct URL
NEXT_PUBLIC_SUPABASE_URL=production Supabase project URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=production anon/publishable key
SUPABASE_SERVICE_ROLE_KEY=production service role key
SUPABASE_STORAGE_BUCKET=production bucket name
CLERK_SECRET_KEY=sk_live_xxx
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxx
CRON_SECRET=production cron secret
```

Supabase 连接建议：

```text
# 应用运行时，使用 pooler
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Prisma migration，使用 direct connection
DIRECT_URL="postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres"
```

## 3. 本地 env 文件规则

项目里可以保留 Preview/Staging 配置：

```text
apps/web/.env
.env.local
```

Production 配置不要长期写进项目目录。需要临时操作生产数据库时，只在当前 shell 中临时导出：

```bash
export DATABASE_URL="production-pooler-url"
export DIRECT_URL="production-direct-url"
```

操作结束后清理：

```bash
unset DATABASE_URL
unset DIRECT_URL
```

如果团队必须保存 Production 密钥，放在项目外的密码管理器或项目外目录，例如：

```text
~/secrets/nextfunclub.production.env
```

不要提交任何真实 env 文件。

## 4. 当前项目从 `db push` 迁移到 migrations

当前项目早期使用了 `schema.prisma + db push`，还没有 migration 历史。因此需要先建立一条 baseline migration。

确认当前结构文件：

```bash
cd ~/Bureau/nextfunclub/apps/web
npx prisma validate
```

从当前 schema 生成初始 migration：

```bash
cd ~/Bureau/nextfunclub/apps/web

mkdir -p prisma/migrations/20260601000000_init_current_schema

npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/20260601000000_init_current_schema/migration.sql
```

生成后检查：

```bash
sed -n '1,220p' prisma/migrations/20260601000000_init_current_schema/migration.sql
```

然后提交 migration 文件：

```bash
git add prisma/migrations/20260601000000_init_current_schema/migration.sql
git commit -m "chore: baseline prisma migrations"
```

## 5. 对已有 Preview 数据库登记 baseline

如果 Preview 数据库已经通过 `db push` 拥有这些表，不要再次执行初始 migration，否则会尝试重复建表。

先检查 schema 是否和当前 Prisma schema 一致：

```bash
cd ~/Bureau/nextfunclub/apps/web

npx prisma migrate diff \
  --from-url "$DIRECT_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --exit-code
```

如果没有差异，登记 baseline 已应用：

```bash
npx prisma migrate resolve --applied 20260601000000_init_current_schema
```

然后生成 Prisma Client：

```bash
npx prisma generate
```

如果有差异，不要强行 resolve。先确认差异来自哪里，再决定是补 migration、修 schema，还是手动清理预览库。

## 6. 初始化新的 Production 数据库

如果 Production Supabase 是全新空库，可以直接应用 baseline：

```bash
cd ~/Bureau/nextfunclub/apps/web

export DATABASE_URL="production-pooler-url"
export DIRECT_URL="production-direct-url"

npx prisma migrate deploy
npx prisma generate

unset DATABASE_URL
unset DIRECT_URL
```

如果 Production 已经不是空库：

1. 先备份。
2. 用 `migrate diff` 比较 Production 与当前 schema。
3. 如果完全一致，用 `migrate resolve --applied` 登记 baseline。
4. 如果不一致，不要直接 deploy，先整理差异方案。

比较命令：

```bash
export DATABASE_URL="production-pooler-url"
export DIRECT_URL="production-direct-url"

npx prisma migrate diff \
  --from-url "$DIRECT_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > /tmp/production-drift.sql

unset DATABASE_URL
unset DIRECT_URL
```

查看差异：

```bash
sed -n '1,260p' /tmp/production-drift.sql
```

## 7. 之后每次修改数据库结构

不要直接改完 schema 后对 Production `db push`。

正确流程：

1. 新建功能分支。
2. 修改 `apps/web/prisma/schema.prisma`。
3. 生成 migration，并应用到 Preview 数据库。
4. 本地测试。
5. PR 合并到 `dev`。
6. Vercel Preview 部署验证。
7. 准备上线时，对 Production 执行 `migrate deploy`。

生成 migration：

```bash
cd ~/Bureau/nextfunclub/apps/web

npx prisma migrate dev --name add_feature_name
npx prisma generate
```

本地验证：

```bash
npm run typecheck
npm run build
```

提交：

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add feature database migration"
git push
```

## 8. Preview 测试通过后同步到 Production

确认 Preview 已经通过：

```bash
npm run typecheck
npm run build
```

切到最新 `dev`：

```bash
git switch dev
git pull origin dev
```

临时设置 Production 数据库连接：

```bash
cd ~/Bureau/nextfunclub/apps/web

export DATABASE_URL="production-pooler-url"
export DIRECT_URL="production-direct-url"
```

查看待应用 migration 状态：

```bash
npx prisma migrate status
```

应用 migration：

```bash
npx prisma migrate deploy
```

生成 Prisma Client：

```bash
npx prisma generate
```

清理环境变量：

```bash
unset DATABASE_URL
unset DIRECT_URL
```

然后重新部署 Production：

```bash
cd ~/Bureau/nextfunclub
vercel --prod
```

也可以在 Vercel Dashboard 里对 Production 手动 redeploy。

## 9. 只迁移公开内容数据到 Production

Production 空库同步结构后，不建议整库复制 Preview 数据。Preview 里的测试用户、好友、聊天、通知和报名不应该进入生产。

只迁移这三类公开内容：

```text
Merchant
Activity
ActivitySourceLink
```

不要迁移：

```text
UserProfile
ActivityParticipant
Comment
Notification
UserFollow
FriendRequest
Friendship
Conversation
DirectMessage
```

项目提供脚本：

```text
apps/web/prisma/copy-public-content.ts
```

脚本特点：

- 默认 dry-run，不写入目标数据库。
- 只有显式传入 `--write` 才会写入 Production。
- 只复制 `visibility = PUBLIC` 的活动。
- 不复制 Preview 的 `organizerId`，活动会统一挂到 Production 的系统运营账号。
- 如果 Production 已有相同商家、活动或来源链接，会更新而不是重复创建。

先 dry-run：

```bash
cd ~/Bureau/nextfunclub/apps/web

export CONTENT_SOURCE_DATABASE_URL="preview-direct-url"
export CONTENT_TARGET_DATABASE_URL="production-direct-url"

npm run db:copy-public-content

unset CONTENT_SOURCE_DATABASE_URL
unset CONTENT_TARGET_DATABASE_URL
```

确认输出合理后正式写入：

```bash
cd ~/Bureau/nextfunclub/apps/web

export CONTENT_SOURCE_DATABASE_URL="preview-direct-url"
export CONTENT_TARGET_DATABASE_URL="production-direct-url"

npm run db:copy-public-content -- --write

unset CONTENT_SOURCE_DATABASE_URL
unset CONTENT_TARGET_DATABASE_URL
```

如果希望活动挂到某个 Production 已存在用户下面，先查这个用户的 `UserProfile.id`，然后执行：

```bash
export CONTENT_SOURCE_DATABASE_URL="preview-direct-url"
export CONTENT_TARGET_DATABASE_URL="production-direct-url"
export CONTENT_TARGET_ORGANIZER_ID="production-user-profile-id"

npm run db:copy-public-content -- --write

unset CONTENT_SOURCE_DATABASE_URL
unset CONTENT_TARGET_DATABASE_URL
unset CONTENT_TARGET_ORGANIZER_ID
```

如果不提供 `CONTENT_TARGET_ORGANIZER_ID`，脚本会在 Production 创建或复用系统运营账号：

```text
clerkUserId: system_content_migration_next_fun_club
nickname: Next Fun Club
```

可自定义：

```bash
export CONTENT_TARGET_ORGANIZER_CLERK_ID="system_content_next_fun_club"
export CONTENT_TARGET_ORGANIZER_NICKNAME="Next Fun Club"
```

如果确实要复制非公开活动，额外加：

```bash
npm run db:copy-public-content -- --write --include-non-public
```

默认不建议这样做。

### 9.1 迁移旧导入活动到 `PublicEvent`

早期导入脚本可能把 API / 爬虫活动直接写入了 `Activity` 表。它们不是用户组队，不应该显示报名人数、名额和报名按钮。

项目提供一次性迁移脚本：

```text
apps/web/prisma/migrate-legacy-activity-info-to-public-events.ts
```

脚本规则：

- 默认 dry-run，不写数据库。
- `--write` 才会创建或更新 `PublicEvent`。
- 正式写入时，默认只创建或更新 `PublicEvent`，不删除也不隐藏旧 `Activity`。
- 前端会把已知 API/爬虫来源的旧 `Activity` 兼容渲染为活动信息，不再按组队显示报名人数和报名按钮。
- 已经有人报名或评论的旧 `Activity` 会跳过，避免把真实组队误迁移。
- 只有 `source/sourceUrl`、没有强导入标记的记录默认跳过，需要确认后加 `--include-source-url-only`。

Preview 先 dry-run：

```bash
cd ~/Bureau/nextfunclub

npm run db:migrate-legacy-public-events
```

确认输出后，在 Preview 正式写入：

```bash
npm run db:migrate-legacy-public-events -- --write
```

如果迁移后确认需要隐藏旧 `Activity`，避免它们和 `PublicEvent` 重复展示，才显式追加：

```bash
npm run db:migrate-legacy-public-events -- --write --hide-legacy-activities
```

如果 dry-run 输出里 `sourceUrlOnlyRequiresFlag` 很多，且确认这些记录确实是旧导入活动信息，再执行：

```bash
npm run db:migrate-legacy-public-events -- --write --include-source-url-only
```

Production 执行前，必须临时切换到 Production 数据库连接：

```bash
cd ~/Bureau/nextfunclub/apps/web

export DATABASE_URL="production-pooler-url"
export DIRECT_URL="production-direct-url"

npm run db:migrate-legacy-public-events
npm run db:migrate-legacy-public-events -- --write

unset DATABASE_URL
unset DIRECT_URL
```

如果需要迁移 `source/sourceUrl` 旧数据：

```bash
export DATABASE_URL="production-pooler-url"
export DIRECT_URL="production-direct-url"

npm run db:migrate-legacy-public-events -- --write --include-source-url-only

unset DATABASE_URL
unset DIRECT_URL
```

## 10. Vercel 和第三方链接放在哪里

### Vercel Production 域名

如果没有自定义域名，先用 Vercel Production 域名：

```text
https://your-project.vercel.app
```

如果有自定义域名，生产环境统一用：

```text
https://nextfunclub.com
```

### Vercel Environment Variables

在 Vercel Project Settings -> Environment Variables 中：

Production:

```text
NEXT_PUBLIC_APP_URL=https://your-production-domain
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/zh-CN/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/zh-CN/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/zh-CN
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/zh-CN
```

Preview:

```text
NEXT_PUBLIC_APP_URL=https://your-preview-domain
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/zh-CN/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/zh-CN/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/zh-CN
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/zh-CN
```

如果 Preview 有多个临时 Vercel URL，`NEXT_PUBLIC_APP_URL` 可以先使用主要 dev preview 地址，或等需要生成绝对链接和二维码时再按环境补全。

### Clerk Dashboard

Production Clerk 应用中配置 Production 域名：

```text
https://your-production-domain
https://your-production-domain/zh-CN/sign-in
https://your-production-domain/zh-CN/sign-up
```

Preview Clerk 应用中配置 Preview 域名：

```text
https://your-preview-domain
https://your-preview-domain/zh-CN/sign-in
https://your-preview-domain/zh-CN/sign-up
```

如果 Clerk 有 Authorized domains / Allowed origins / Redirect URLs / After sign-in URL / After sign-up URL，保持和对应 Vercel 环境一致。不要把 Production Clerk keys 放到 Preview。

### Supabase Dashboard

在 Supabase Production 项目中，如果使用 Auth URL / Site URL / Redirect URLs，则填写 Production 域名。

当前项目登录主要使用 Clerk，不使用 Supabase Auth；Supabase URL 主要放在 Vercel 环境变量：

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET
```

这些也要区分 Preview 和 Production。

## 11. 同事同步数据库结构

同事拉取最新代码：

```bash
git switch dev
git pull origin dev
npm install
```

如果团队共享 Preview 数据库，并且 migration 已经由负责人执行过，同事只需要：

```bash
cd ~/Bureau/nextfunclub/apps/web
npx prisma generate
```

如果同事使用自己的 Preview 数据库，需要执行：

```bash
cd ~/Bureau/nextfunclub/apps/web
npx prisma migrate deploy
npx prisma generate
```

本地启动：

```bash
npm run dev
```

## 12. 遇到 Prisma 警告时怎么处理

### Enum 删除警告

例如：

```text
The values [THEATER] on the enum ActivityCategory will be removed.
```

不要直接输入 `y`。

先判断这个 enum 是否仍然需要。如果需要保留，就加回 `schema.prisma`：

```prisma
enum ActivityCategory {
  BOARD_GAME
  MOVIE
  MUSIC
  SPORTS
  TRAVEL
  FOOD
  EXHIBITION
  THEATER
  OTHER
}
```

如果确实要删除，必须先迁移数据，把旧值改成新值，再删除 enum。

### Vercel 提示 enum 找不到

如果数据库里已有 enum 值，但 Vercel 报：

```text
Value 'FRIEND_REQUEST' not found in enum 'NotificationType'
```

优先怀疑 Vercel 旧构建缓存或 Prisma Client 没更新。

处理：

1. 确认 `schema.prisma` 已提交。
2. 确认 `turbo.json` 已把 schema 纳入缓存依赖。
3. 重新部署 Vercel，必要时不要复用 build cache。

不要为了这个错误盲目 `db push`。

## 13. 禁止事项

- 不要把 Production `DATABASE_URL` 写进 Git。
- 不要在 Production 上随手执行 `prisma db push`。
- 不要在不知道数据影响时接受 Prisma data loss 警告。
- 不要让 Preview 和 Production 共用 Supabase service role key。
- 不要让 Preview 和 Production 共用 Clerk secret key。

## 14. 推荐负责人流程

每次涉及数据库结构变更时，由一个负责人执行：

```text
1. 生成 migration
2. 在 Preview 执行并测试
3. PR review
4. 合并 dev
5. 准备上线窗口
6. Production 备份
7. Production migrate deploy
8. Production redeploy
9. 通知团队 pull 最新 dev
```
