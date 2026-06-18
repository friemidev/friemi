# Next Fun Club

> What's next? Fun begins. / 下一场，Fun 开场。

Next Fun Club 是一个面向海外中文用户的活动发现、组队和找搭子工具。当前首发市场是法国巴黎，产品已经从早期 MVP 进入 v1.4：核心能力包括公开活动导入、活动发现、组队大厅、游客报名、好友关系、消息通知、分享海报、微信分享卡片、天气、翻译和 Playwright 预览环境监控。

## 当前能力

- 活动发现：公开活动列表、筛选、搜索、收藏、卡片视图和按日期视图。
- 组队大厅：公开组局、好友相关组局、我的发起 / 参与 / 收藏、移动端滑一滑发现活动。
- 活动详情：活动介绍、时间地点、地图、Google Maps 跳转、天气、订票链接、复制信息和活动分享。
- 组队详情：报名、游客报名、参与人头像、活动关联入口、组队分享和宣传图下载。
- 游客报名：未登录用户可先报名，之后通过已验证邮箱或微信号自动关联到正式账号。
- 社交能力：好友号、扫码加好友、关注 / 粉丝 / 好友、私聊、通知中心。
- 多语言与翻译：`zh-CN`、`en`、`fr` 界面，DeepL 手动翻译活动内容和评论并缓存结果。
- 运营与监控：公共活动导入、性能日志、Playwright 站点监控、数据看板和举报处理。

## 技术栈

- Monorepo：Turborepo + npm workspaces
- Web：Next.js App Router + React 19 + TypeScript
- UI：Tailwind CSS + lucide-react + 共享 UI 包
- 认证：Clerk
- 数据库：PostgreSQL + Prisma
- 存储：Supabase Storage，用于活动封面等公开图片
- 国际化：next-intl
- 测试与监控：Node tests + Playwright monitoring
- 部署：Vercel

## 项目结构

```text
nextfunclub/
├── apps/
│   └── web/                 # Next.js Web 应用
├── packages/
│   ├── scraper-core         # 公共活动抓取 / 解析共享逻辑
│   ├── shared               # 共享类型、日期格式化等工具
│   └── ui                   # 基础 UI 组件
├── docs/                    # 版本清单、导入、监控和流程文档
├── scripts/                 # 测试脚本与辅助工具
├── package.json
├── package-lock.json
└── turbo.json
```

## 本地启动

需要 Node.js `20.19+` 和 npm `10+`。

```bash
npm install
cp .env.example apps/web/.env.local
npm run db:generate
npm run dev
```

访问：

- 首页：`http://localhost:3000/zh-CN/home`
- 活动页：`http://localhost:3000/zh-CN/activities`
- 组队大厅：`http://localhost:3000/zh-CN/lobby`
- 更新公告：`http://localhost:3000/zh-CN/updates`
- 健康检查：`http://localhost:3000/api/health`

如果本地需要 Prisma CLI 直接读取环境变量，也可以把同一份变量放到 `apps/web/.env`。不要把真实密钥提交到 Git。

## 环境变量

参考根目录 `.env.example`，常用变量如下：

```bash
# Database
DATABASE_URL=
DIRECT_URL=

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SIGNING_SECRET=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/zh-CN/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/zh-CN/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/zh-CN
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/zh-CN

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_CLERK_USER_IDS=
ADMIN_EMAILS=
CRON_SECRET=

# Public activity import
PARIS_OPEN_DATA_API_KEY=

# Translation
DEEPL_API_KEY=

# Weather
WEATHER_PROVIDER=open-meteo
METEOFRANCE_API_KEY=
METEOFRANCE_APPLICATION_ID=

# Supabase storage
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=activity-covers
```

说明：

- `DATABASE_URL`：运行时连接串，线上建议使用 Supabase / Neon pooler。
- `DIRECT_URL`：迁移和 `db push` 用的直连串；本地可以和 `DATABASE_URL` 相同。
- `NEXT_PUBLIC_APP_URL`：生成分享链接、二维码和 Open Graph 图片时使用，预览和生产环境需要填公网 HTTPS 域名。
- `DEEPL_API_KEY`：只在服务端使用，不要加 `NEXT_PUBLIC_`。
- 当前天气默认使用 Open-Meteo，不需要 API key；Meteo-France 变量只作为后续切换预留。

## 数据库与 Prisma

Prisma schema 位于：

```text
apps/web/prisma/schema.prisma
```

常用命令：

```bash
npm run db:generate   # 生成 Prisma Client
npm run db:push       # 将 schema 同步到当前数据库
npm run db:migrate    # 创建并执行开发迁移
npm run db:seed       # 写入本地测试数据
```

如果直接使用 Prisma CLI：

```bash
cd apps/web
npx prisma generate
npx prisma db push
```

本项目约定：结构变更可以通过 Prisma 或 SQL 变更文件提交；对已有数据的修复、回填和导入，优先提供 SQL Editor 脚本或 dry-run 脚本，由操作者确认后手动执行。

## 公共活动导入

本地开发环境启动后，可以手动调用 Open Data 导入接口：

```bash
export LOCAL_URL="http://localhost:3000"
export CRON_SECRET="your-local-cron-secret"

curl -i -sS \
  -H "x-cron-secret: ${CRON_SECRET}" \
  "${LOCAL_URL}/api/cron/import-public-activities?limit=50"

unset LOCAL_URL
unset CRON_SECRET
```

预览或生产环境把 `LOCAL_URL` 换成对应 HTTPS 域名。`limit` 可以按测试需要调整，先用小批量确认日志和数据结果，再扩大导入量。

订票链接历史回填：

```bash
npm run db:backfill-ticket-links --workspace=apps/web
npm run db:backfill-ticket-links --workspace=apps/web -- --write
```

第一条是 dry-run，第二条才会写库。

## 测试与质量检查

常规检查：

```bash
npm run typecheck
npm run test
```

Playwright 站点监控：

```bash
PLAYWRIGHT_MONITOR_BASE_URL="https://your-preview-url.vercel.app/zh-CN/home" \
PLAYWRIGHT_MONITOR_WORKERS=1 \
PLAYWRIGHT_MONITOR_MAX_LOAD_MS=15000 \
npm run monitor:site --workspace=apps/web
```

打开报告：

```bash
npm run monitor:site:report --workspace=apps/web
```

监控重点看首页、活动页、组队大厅、搜索页和登录态页面是否出现 500、客户端异常、长时间 loading 或明显超时。性能优化记录见 `docs/v1_4/playwright-performance-optimization-log.md`。

## 部署检查

部署到 Vercel 前至少确认：

- `npm run typecheck` 通过。
- Prisma schema 已同步到目标数据库。
- Vercel 环境变量和目标数据库一致，特别是 `DATABASE_URL`、`DIRECT_URL`、Clerk、`NEXT_PUBLIC_APP_URL`、`CRON_SECRET`。
- 新增字段已经在预览数据库执行过结构同步。
- 公开活动导入、天气、翻译、分享卡片等辅助能力失败时不会影响主页面浏览。
- 预览环境用 Playwright 跑过基础监控。

## 版本文档

- v1.4 实现清单：`docs/v1_4/implementation-checklist.md`
- v1.4 Playwright 教程：`docs/v1_4/playwright-testing-guide.md`
- v1.4 性能分析：`docs/v1_4/preview-auth-performance-analysis.md`
- v1.4 性能优化记录：`docs/v1_4/playwright-performance-optimization-log.md`
- 站内更新公告数据：`apps/web/features/updates/versionUpdates.ts`

更多历史文档位于 `docs/v1_0`、`docs/v1_1`、`docs/v1_2`、`docs/v1_3`。
