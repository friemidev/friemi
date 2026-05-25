# 团队同步：登录与数据库环境

## 当前状态

目前项目基础登录和数据库链路已经跑通。

已完成：

- Node.js 统一到 `20.19.6`
- npm 使用 `10.8.2`
- 项目使用 npm workspaces
- Supabase PostgreSQL 已接入
- Prisma schema 已同步到数据库
- Clerk 登录已接入
- Clerk 登录后会同步用户资料到本地 `UserProfile`
- 已预留 Clerk webhook：`/api/webhooks/clerk`
- `npm run typecheck` 通过
- `npm run build` 通过

## 拉取代码

如果已经有本地仓库：

```bash
git pull
```

如果是第一次 clone：

```bash
git clone <repo-url>
cd nextfunclub
```

## Node 和 npm 版本

项目根目录已有 `.nvmrc`。

```bash
nvm use
```

如果本地没有该版本：

```bash
nvm install 20.19.6
nvm use
```

确认版本：

```bash
node -v
npm -v
```

期望结果：

```bash
v20.19.6
10.8.2
```

## 安装依赖

```bash
npm install
```

## 环境变量

复制模板：

```bash
cp .env.example .env.local
```

根目录 `.env.local` 至少需要：

```bash
DATABASE_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SIGNING_SECRET=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/zh-CN/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/zh-CN/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/zh-CN
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/zh-CN
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Prisma 当前从 `apps/web/.env` 读取数据库连接。需要把数据库连接同步到：

```text
apps/web/.env
```

至少包含：

```bash
DATABASE_URL=
```

如果要本地测试 Clerk 登录，也建议把以下 Clerk key 放到 `apps/web/.env`：

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SIGNING_SECRET=
```

不要提交 `.env.local` 或 `apps/web/.env`。

## Prisma 操作

推荐在项目根目录运行：

```bash
npm run db:generate
npm run db:push
```

如果习惯直接使用 Prisma CLI，也可以进入 web 应用目录：

```bash
cd apps/web
npx prisma generate
npx prisma db push
```

如果在项目根目录直接执行 `npx prisma`，必须显式指定 schema：

```bash
npx prisma generate --schema apps/web/prisma/schema.prisma
npx prisma db push --schema apps/web/prisma/schema.prisma
```

## 启动项目

在项目根目录运行：

```bash
npm run dev
```

访问：

```text
http://localhost:3000/zh-CN
http://localhost:3000/zh-CN/sign-in
```

## 登录测试

测试流程：

1. 打开 `/zh-CN/sign-in`
2. 使用 Google 登录
3. 登录成功后访问 `/zh-CN/profile`
4. 检查 Supabase 的 `UserProfile` 表是否出现对应用户记录

说明：

- 登录状态由 Clerk 负责。
- 数据库不存用户密码。
- `UserProfile` 只保存 Clerk 用户资料快照和业务关系。
- 如果 webhook 暂时没配，访问 `/profile` 时也会兜底同步当前用户。

## Clerk Webhook

Webhook endpoint：

```text
/api/webhooks/clerk
```

本地测试需要 tunnel，例如：

```bash
ngrok http 3000
```

Clerk Dashboard 中配置 endpoint：

```text
https://你的-ngrok-domain/api/webhooks/clerk
```

需要勾选事件：

```text
user.created
user.updated
user.deleted
session.created
```

配置完成后，把 Clerk Dashboard 提供的 signing secret 填入环境变量：

```bash
CLERK_WEBHOOK_SIGNING_SECRET=
```

## 提交前检查

提交 PR 前运行：

```bash
npm run typecheck
npm run build
```

两项都通过后再提交。

## 当前注意事项

- 当前活动列表和活动详情仍主要使用 mock 数据。
- 创建活动页面还没有完全写入数据库。
- 报名流程还没有接入真实数据库逻辑。
- `UserProfile` 已经可以通过 Clerk 登录或 webhook 同步。
- Prisma schema 中保留了一些旧 enum 值，目的是避免破坏已有测试数据，后续正式迁移时再清理。

