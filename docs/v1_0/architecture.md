# Architecture

## 架构选择

新项目采用 Next.js 单体全栈架构，搭配 monorepo。这样可以保持与旧项目 `old-6` 的工程方向接近，同时避免复制旧项目过多历史依赖和复杂业务模块。

当前阶段不拆独立后端。活动 CRUD、报名、个人空间等业务可以先通过 Server Actions 和 Route Handlers 完成。等商家系统、支付、通知、爬虫和后台任务复杂后，再考虑拆分服务。

## Monorepo

```text
apps/web
packages/shared
packages/ui
```

`apps/web` 是唯一运行中的应用。

`packages/shared` 存共享常量、类型和工具函数，例如活动分类、状态、路由常量。

`packages/ui` 存基础 UI 组件，例如 Button、Card、Badge、Input、Textarea。

## Web 应用

Web 使用 Next.js App Router，默认路由带 locale：

- `/zh-CN`
- `/zh-CN/activities`
- `/zh-CN/activities/new`
- `/zh-CN/activities/[activityId]`
- `/zh-CN/profile`
- `/zh-CN/sign-in`
- `/zh-CN/sign-up`

## 数据库

数据库使用 PostgreSQL，ORM 使用 Prisma。

核心模型：

- `UserProfile`
- `Activity`
- `ActivityParticipant`
- `UserFollow`

`UserFollow` 用于预留好友/熟人关系，MVP 阶段可以先不做完整 UI。

## 认证

认证使用 Clerk。Clerk 负责登录、注册、用户会话和用户头像菜单。

需要登录的页面：

- 创建活动
- 个人空间

## 国际化

国际化使用 next-intl。当前默认语言是 `zh-CN`，预留 `en`。

MVP 阶段只需要中文文案完整可用，英文用于验证结构。

## 部署

推荐：

- Web：Vercel
- PostgreSQL：Neon 或 Supabase
- 环境变量：Vercel Project Settings

部署前需要配置：

- `DATABASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
