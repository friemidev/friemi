# Git 分支协作规范

## 核心原则

不要针对每一张任务卡片都开一个分支。

推荐按“可交付模块”开分支，而不是按“小任务”开分支。

一个好的分支应该能交付一个可以测试的结果，例如：

- 活动列表接数据库
- 活动详情页接数据库
- 创建活动流程
- 报名参加活动
- 个人空间数据展示

不建议这样拆：

- `feature/add-title-input`
- `feature/add-date-input`
- `feature/add-submit-button`
- `feature/add-error-text`

建议这样拆：

- `feature/activity-create`

这个分支内部可以包含多张任务卡：

- 创建活动表单 UI
- zod 校验
- server action
- 写入数据库
- 成功后跳转详情页
- 错误提示

## 分支职责

### `main`

稳定分支。

只放已经确认可运行、可演示、可上线的代码。

规则：

- 不直接开发
- 不随意 push
- 只接受从 `dev` 合并过来的稳定版本
- 合并前必须通过 `typecheck` 和 `build`

### `dev`

团队集成开发分支。

大家的新功能先合到 `dev`，用于集成测试、Vercel Preview 测试和团队联调。

规则：

- 每个人从 `dev` 拉自己的功能分支
- 功能完成后 PR 回 `dev`
- `dev` 可以频繁更新
- `dev` 不直接代表生产环境

### `feature/*`

个人或模块功能分支。

用于开发一个可测试模块。

示例：

```text
feature/activity-list-db
feature/activity-detail-db
feature/activity-create-db
feature/join-activity
feature/profile-dashboard
feature/clerk-webhook
```

## 推荐开发流程

开发前先更新 `dev`：

```bash
git switch dev
git pull origin dev
```

创建功能分支：

```bash
git switch -c feature/activity-create-db
```

开发完成后运行检查：

```bash
npm run typecheck
npm run build
```

提交代码：

```bash
git add .
git commit -m "feat: add activity create flow"
git push -u origin feature/activity-create-db
```

然后在 GitHub 开 PR：

```text
feature/activity-create-db → dev
```

## `dev` 什么时候合并到 `main`

不建议每天自动合并。

建议满足以下条件后再合并：

- `dev` 上的功能完成一轮集成测试
- `npm run typecheck` 通过
- `npm run build` 通过
- 数据库 schema 变更已经确认
- Clerk / Supabase / Vercel 环境变量确认可用
- Vercel Preview 测试没有明显问题
- 项目负责人确认该版本可以作为稳定版本

推荐通过 GitHub PR 合并：

```text
dev → main
```

如果用命令行：

```bash
git switch main
git pull origin main
git merge origin/dev
git push origin main
```

## Vercel Preview 使用方式

可以在 `dev` 分支开发时使用 Vercel Preview。

Vercel 默认行为：

- Production Branch 的 push 会生成 Production Deployment
- 其他分支的 push 会生成 Preview Deployment

推荐设置：

```text
main 或 production → Production
dev → Preview
feature/* → Preview
```

如果希望更安全，可以使用单独的 `production` 分支：

```text
production → Production
main → 稳定候选
dev → Preview 测试
feature/* → Preview 测试
```

早期阶段也可以简化为：

```text
main → Production
dev → Preview
feature/* → Preview
```

但必须保护 `main`，不要随意合并。

## Vercel 环境变量

Vercel 有三类环境：

```text
Production
Preview
Development
```

`dev` 和 `feature/*` 的 Preview 环境也需要配置必要变量：

```bash
DATABASE_URL=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SIGNING_SECRET=
NEXT_PUBLIC_APP_URL=
```

否则可能出现：

- Preview 部署成功，但登录不可用
- 数据库连接失败
- Clerk webhook 验证失败
- OAuth redirect 不正确

## 分支粒度规则

### 合适的分支粒度

一个分支对应一个可测试模块。

示例：

```text
feature/activity-create-db
```

包含任务卡：

- 创建活动表单
- 字段校验
- 写入数据库
- 登录用户作为 organizer
- 创建成功跳转
- 错误提示

### 不合适的分支粒度

过碎：

```text
feature/add-button
feature/add-input
feature/change-title
```

问题：

- PR 太多
- review 成本高
- 合并冲突增加
- 很难单独测试业务闭环

过大：

```text
feature/activity-management
```

如果这个分支同时包含：

- 创建活动
- 编辑活动
- 删除活动
- 报名活动
- 评论活动

就太大了，应该拆成多个模块分支。

## 卡片、分支、PR 的关系

建议：

```text
一个分支 = 一个 Epic / 模块
一个 PR = 一个可测试交付
一个卡片 = 一个具体任务
```

例如：

```text
Epic: 活动创建
分支: feature/activity-create-db
PR: feature/activity-create-db → dev

卡片:
- 创建 Activity 表单 UI
- 增加 createActivity schema
- 接 Prisma create
- 登录用户作为 organizer
- 提交成功跳转
- 错误提示
```

## 团队建议

当前阶段建议使用以下分支：

```text
main
dev
feature/activity-list-db
feature/activity-detail-db
feature/activity-create-db
feature/join-activity
feature/profile-dashboard
feature/clerk-webhook
```

项目负责人主要维护：

- `main`
- `dev`
- 发布节奏
- PR 合并标准

开发成员负责：

- 自己的 `feature/*` 分支
- 保持分支跟随 `dev`
- 提交前通过检查
- PR 描述清楚改了什么、如何测试

