# Next Fun Club

> What's next? Fun begins. / 下一场，Fun 开场。

Next Fun Club 是一个面向海外中文用户的活动组织与找搭子平台。当前项目代号 `chill-club`，首发市场为法国巴黎，首发界面为中文。

当前仓库处于基础框架阶段：目标是先搭好干净、可维护、可扩展的工程骨架，再逐步实现活动发现、发起活动、报名参加和个人空间。

## 技术栈

- Monorepo：Turborepo + pnpm workspace
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
├── pnpm-workspace.yaml
└── turbo.json
```

## 本地启动

```bash
corepack enable
corepack prepare pnpm@9.15.4 --activate
pnpm install
cp .env.example .env.local
pnpm dev
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
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/zh-CN/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/zh-CN/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/zh-CN
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/zh-CN
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 常用命令

```bash
pnpm dev
pnpm build
pnpm typecheck
pnpm lint
pnpm db:generate
pnpm db:push
pnpm db:migrate
pnpm db:seed
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
