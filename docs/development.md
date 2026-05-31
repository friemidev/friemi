# Development

## 环境要求

- Node.js 20.19+
- npm 10
- Git
- PostgreSQL，或 Neon / Supabase 远程开发库

检查 npm：

```bash
npm --version
```

## 安装和启动

```bash
npm install
cp .env.example .env.local
npm run dev
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
3. 本地运行 `npm run typecheck` 和 `npm run build`。
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
npm run db:generate
npm run db:push
npm run db:seed
```

正式进入多人协作后：

```bash
npm run db:migrate
```

## 活动链接导入

功能说明、支持站点、fixture 贡献方式与测试命令见 [activity-link-import.md](./activity-link-import.md)。

## 代码风格

- TypeScript strict mode
- 优先小模块、清晰命名
- 不引入与 MVP 无关的大型依赖
- 不同时使用多个 UI 框架
- 业务权限判断放在服务端逻辑中
