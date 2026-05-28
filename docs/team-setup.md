# Team Setup Guide

先把项目在本地跑起来，再连接 Clerk、数据库和 Vercel。

## 1. 准备工具

需要安装：

- Git
- Node.js 20.19+
- VS Code
- 一个 PostgreSQL 数据库，本地或远程都可以
- （可选）`just`，用于更短命令启动和清理

检查版本：

```bash
node --version
git --version
```

检查 npm：

```bash
npm --version
```

如果安装了 `just`，也可以检查：

```bash
just --version
```

期望 `node --version` 输出 `v20.19.x` 或更高的 Node 20 版本，`npm --version` 输出 `10.x`。npm 会随 Node.js 一起安装，不需要额外启用。

## 2. 拉取项目

```bash
git clone <REPO_URL>
cd chill-club
npm install
```

如果你使用 `just`，也可以：

```bash
just install
```

`package-lock.json` 必须提交到 Git。不要删除或忽略它。

## 3. 先本地跑通

复制环境变量模板：

```bash
just env-init
```

等价命令（不使用 `just` 时）：

```bash
cp .env.example apps/web/.env.local
```

当前框架支持 Clerk 未配置时本地预览，所以第一次可以先不填 Clerk key。

启动：

```bash
just run
```

等价命令：

```bash
npm run dev
```

访问：

- 首页：`http://localhost:3000/zh-CN`
- 活动列表：`http://localhost:3000/zh-CN/activities`
- 健康检查：`http://localhost:3000/api/health`

如果这些页面能打开，本地基础环境就已经跑通。

## 4. 连接 Clerk

Clerk 用于登录、注册和用户会话。

### 创建 Clerk 应用

1. 打开 Clerk Dashboard。
2. 创建一个新应用，例如 `next-fun-club-dev`。
3. 选择需要的登录方式，开发阶段可以先启用 Email。
4. 进入 API Keys 页面，复制：
   - Publishable key
   - Secret key

### 写入 `.env.local`

请写入 `apps/web/.env.local`：

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/zh-CN/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/zh-CN/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/zh-CN
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/zh-CN
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

重启 dev server：

```bash
just run
```

等价命令：

```bash
npm run dev
```

验证：

- 打开 `http://localhost:3000/zh-CN/sign-in`
- 能看到 Clerk 登录组件
- 登录后能进入 `http://localhost:3000/zh-CN/profile`

### Clerk URL 设置

本地开发至少确认这些 URL 可用：

```text
http://localhost:3000/zh-CN/sign-in
http://localhost:3000/zh-CN/sign-up
http://localhost:3000/zh-CN
```

上线后需要在 Clerk Dashboard 中补充 Vercel 域名，例如：

```text
https://your-project.vercel.app/zh-CN/sign-in
https://your-project.vercel.app/zh-CN/sign-up
https://your-project.vercel.app/zh-CN
```

## 5. 连接数据库

项目使用 PostgreSQL + Prisma。

### 方案 A：使用团队共享远程数据库

负责人提供一个开发数据库连接，例如 Neon 或 Supabase：

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
```

Supabase 需要两条连接（`db push` 不能用 Transaction pooler `:6543`，否则会一直卡住）：

```bash
# 应用运行时（Transaction pooler，端口 6543）
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Prisma 迁移（Direct connection，端口 5432）
DIRECT_URL="postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres?sslmode=require"
```

写入 `apps/web/.env`（Prisma CLI 只读 `.env`，不读 `.env.local`）：

```bash
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
```

初始化 Prisma：

```bash
just db-generate
just db-push
just db-seed
```

等价命令：

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

### 方案 B：使用本地 PostgreSQL

如果本机已有 PostgreSQL，可以创建数据库：

```bash
createdb chill_club_dev
```

`apps/web/.env.local` 示例：

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/chill_club_dev"
```

然后执行：

```bash
just db-generate
just db-push
just db-seed
```

### 方案 C：使用 Docker 本地数据库

如果使用 Docker：

```bash
docker run --name chill-club-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=chill_club_dev \
  -p 5432:5432 \
  -d postgres:16
```

`apps/web/.env.local`：

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/chill_club_dev"
```

初始化：

```bash
just db-generate
just db-push
just db-seed
```

## 6. 连接 Vercel

Vercel 用于部署 Web 应用。

### Dashboard 方式

1. 在 Vercel 创建项目。
2. 选择 GitHub 仓库。
3. Framework 选择 Next.js。
4. Root Directory 设置为：

```text
apps/web
```

5. Build Command 可以使用默认，也可以设置：

```bash
cd ../.. && npm run build
```

6. Install Command：

```bash
cd ../.. && npm ci
```

7. 在 Environment Variables 中配置：

```bash
DATABASE_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/zh-CN/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/zh-CN/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/zh-CN
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/zh-CN
NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
```

### CLI 方式

```bash
npx vercel login
npx vercel link
npx vercel env pull apps/web/.env.local
```

拉取环境变量后，本地运行：

```bash
just run
```

## 7. 常用命令

优先推荐 `just`：

```bash
just run          # 启动本地开发
just clean        # 清理 .next / .turbo 缓存
just env-init     # 初始化 apps/web/.env.local
just lint         # 当前等价于类型级检查
just typecheck    # TypeScript 检查
just build        # 生产构建
just db-generate  # 生成 Prisma Client
just db-push      # 将 schema 推到开发数据库
just db-seed      # 写入 seed 数据
```

等价 npm 命令：

```bash
npm run dev
npm run lint
npm run typecheck
npm run build
npm run db:generate
npm run db:push
npm run db:seed
```

## 8. 提交前检查

提交 PR 前至少运行：

```bash
just lint
just typecheck
just build
```

等价命令：

```bash
npm run lint
npm run typecheck
npm run build
```

不要提交：

- `.env`
- `.env.local`
- `.env.*.local`
- `node_modules`
- `.next`
- `.turbo`
- `.clerk`

必须提交：

- `package-lock.json`
- `.env.example`
- Prisma schema
- 相关文档

## 9. 常见问题

### npm 命令不存在

重新安装 Node.js 20.19+。npm 会随 Node.js 一起安装。

### 登录页显示 Clerk 未配置

这是正常的本地占位状态。填写 `apps/web/.env.local` 中的 Clerk key 后重启 `just run`（或 `npm run dev`）。

### 数据库命令失败

先检查 `DATABASE_URL` 是否存在：

```bash
cat apps/web/.env.local
```

再确认数据库服务可连接。远程数据库通常需要 `sslmode=require`。

### 页面 404

项目默认使用 locale 路由，请访问：

```text
http://localhost:3000/zh-CN
```

不是：

```text
http://localhost:3000
```
