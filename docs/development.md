# Development

## 环境要求

- Node.js 20
- pnpm 9
- Git
- PostgreSQL，或 Neon / Supabase 远程开发库

启用 pnpm：

```bash
corepack enable
corepack prepare pnpm@9.15.4 --activate
```

## 安装和启动

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

## 分支命名

- `feat/activity-list`
- `feat/activity-create`
- `fix/auth-redirect`
- `docs/update-readme`

## Commit 建议

建议使用简洁的 conventional commit：

- `feat: add activity list page`
- `fix: protect profile route`
- `docs: document prisma workflow`

## PR 流程

1. 从主分支拉新分支。
2. 完成单一范围的改动。
3. 本地运行 `pnpm typecheck` 和 `pnpm build`。
4. 提交 PR，说明改动范围、验证方式和未完成事项。
5. 至少一人 review 后合并。

## 环境变量管理

- `.env.example` 保留变量名，不写真实密钥。
- 本地使用 `.env.local`。
- 线上在 Vercel 中配置。
- 不提交 `.env`、`.env.local`。

## 数据库流程

开发阶段：

```bash
pnpm db:generate
pnpm db:push
pnpm db:seed
```

正式进入多人协作后：

```bash
pnpm db:migrate
```

## 代码风格

- TypeScript strict mode
- 优先小模块、清晰命名
- 不引入与 MVP 无关的大型依赖
- 不同时使用多个 UI 框架
- 业务权限判断放在服务端逻辑中
