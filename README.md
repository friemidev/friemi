# Next Fun Club

> What's next? Fun begins. / 下一场，Fun 开场。

Next Fun Club 是一个面向海外中文用户的活动组织与找搭子平台。当前项目代号 `chill-club`，首发市场为法国巴黎，首发界面为中文。

当前仓库处于基础框架阶段：目标是先搭好干净、可维护、可扩展的工程骨架，再逐步实现活动发现、发起活动、报名参加和个人空间。

## 技术栈

- Monorepo：Turborepo + npm workspaces
- Web：Next.js App Router + TypeScript
- UI：Tailwind CSS + 基础共享 UI 包
- 图标：lucide-react
- 认证：Clerk
- 国际化：next-intl，默认 `zh-CN`，预留 `en`
- 数据库：PostgreSQL
- ORM：Prisma
- 表单和校验：react-hook-form + zod
- 部署目标：Vercel
- 数据库托管目标：Neon 或 Supabase Postgres

## 项目结构

```text
chill-club/
├── apps/
│   └── web/                 # Next.js Web 应用
├── packages/
│   ├── shared/              # 共享常量、类型、工具
│   └── ui/                  # 基础 UI 组件
├── docs/                    # 产品、架构、开发文档
├── package.json
├── package-lock.json
└── turbo.json
```

## 本地启动

完整团队环境搭建说明见 [docs/team-setup.md](/home/ubuntu23/Bureau/nextfunclub/docs/team-setup.md)。

需要 Node.js `20.19+` 和 npm `10+`。

```bash
npm install
cp .env.example .env.local
npm run dev
```

访问：

- Web 首页：`http://localhost:3000/zh-CN`
- 健康检查：`http://localhost:3000/api/health`

## 环境变量

参考 `.env.example`：

```bash
DATABASE_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SIGNING_SECRET=
ADMIN_CLERK_USER_IDS=
ADMIN_EMAILS=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/zh-CN/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/zh-CN/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/zh-CN
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/zh-CN
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

管理员后台访问控制支持三种方式（任意命中即可）：

- `ADMIN_CLERK_USER_IDS`：Clerk `user.id` 列表（逗号分隔）
- `ADMIN_EMAILS`：管理员邮箱列表（逗号分隔）
- Clerk metadata 中设置 `role=admin`（`publicMetadata` 或 `privateMetadata`）

管理员页面入口：`/{locale}/admin/data-scraper`（例如 `/zh-CN/admin/data-scraper`）。

## 数据库与 Prisma 操作

Prisma schema 位于：

```text
apps/web/prisma/schema.prisma
```

数据库连接串需要放在 `apps/web/.env` 中，Prisma CLI 会从这里读取：

```bash
DATABASE_URL="postgresql://..."
```

推荐使用根目录 npm scripts：

```bash
npm run db:generate   # 生成 Prisma Client
npm run db:push       # 将 schema 同步到数据库
npm run db:migrate    # 创建并执行开发迁移
npm run db:seed       # 写入测试种子数据
```

如果习惯直接使用 Prisma CLI，也可以进入 web 应用目录运行：

```bash
cd apps/web
npx prisma generate
npx prisma db push
```

如果在项目根目录运行 `npx prisma`，必须显式指定 schema 路径：

```bash
npx prisma generate --schema apps/web/prisma/schema.prisma
npx prisma db push --schema apps/web/prisma/schema.prisma
```

当前项目使用 Clerk 登录。用户密码不存入数据库；`UserProfile` 只保存 Clerk 用户资料快照和业务关系。Clerk webhook 需要在 `.env.local` 和生产环境中配置：

```bash
CLERK_WEBHOOK_SIGNING_SECRET=
```

## 常用命令

```bash
npm run dev
npm run build
npm run typecheck
npm run lint
npm run db:generate
npm run db:push
npm run db:migrate
npm run db:seed
```

## MVP 范围

第一阶段核心闭环：

- 用户注册 / 登录
- 首页活动列表
- 活动详情页
- 创建活动
- 编辑或取消自己发起的活动
- 报名参加活动
- 取消报名
- 活动人数统计
- 活动状态展示
- 个人空间：我发起的活动、我参与的活动
- 移动端基础适配

## 暂不做

- 商家入驻和商家后台
- Stripe 支付
- 推广套餐和 CPA 核销
- 智能链接导入
- 活动群聊
- 复杂通知系统
- 推荐算法
- 多城市运营
- 多语言完整运营

## 当前占位

- 首页、活动列表、活动详情使用静态 mock 数据
- 创建活动页面只完成表单 UI 和 zod schema
- 报名按钮还未接入数据库
- 个人空间还未接入真实用户活动数据
- 好友/熟人系统只在 Prisma 模型层预留
