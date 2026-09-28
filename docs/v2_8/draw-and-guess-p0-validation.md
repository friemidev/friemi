# 你画我猜 P0 验证记录

更新于 2026-09-28。P0 的本地数据库与服务端验证已通过；真实 Clerk 多账号、不同设备及 Preview 环境的验收仍待执行，因此接龙模式尚不能标记为 P0 完成或可发布。

复核于 2026-09-28：用户打开的 Frieme.Dev Chrome 会话可读取 `friemi` Vercel 项目；当前 Vercel CLI 登录的是另一账号，不能操作该项目。画猜分支 `codex/draw-and-guess` 已推送并产生独立的 Ready Preview：`https://friemi-git-codex-draw-and-guess-friemi.vercel.app`。Vercel Preview 的数据库项目标识与仓库测试配置一致，Production 为不同项目；已只对 Preview 测试库应用画猜的 3 个新增迁移，72 个迁移均为最新。`DRAW_GUESS_CHAIN_ENABLED=true` 仅配置于该画猜分支的 Preview 环境并已随新部署生效。Preview Supabase Cron 已启用独立的 5 秒截止扫描，实测能让全员离线的过期测试房间自动跨阶段。仍没有可复用的 5–8 个真实 Clerk 测试账号。接龙新局默认关闭，其他分支和生产环境不受画猜分支开关影响。

## 已完成的实现

- 新增独立的对局归档 `DrawGuessRound`，每局结束在同一数据库事务中保存最终状态；房主可发起下一局，旧局作品、投票汇总和排行只读可查。
- 房间保存可索引的截止时间。服务端到期扫描通过房间修订号比较后写入，重复扫描不会重复结算。房主 60 秒未在线且有其他在线玩家时，座位号最小的在线玩家接替。
- 命令附带局号、阶段、接龙棒次和普通模式回合号。过期提交、旧页面命令和旧局命令会被拒绝；相同命令 ID 重试返回原结果。8 人并发提交时的数据库冲突重试已补强。
- 普通抢猜默认关闭：`DRAW_GUESS_CLASSIC_ENABLED=true` 才开放创建入口和服务端创建命令；尚未把它宣称为正式实时模式。
- 新增需 `CRON_SECRET` 鉴权的 `/api/cron/draw-guess-deadlines`，以及独立调用脚本 `npm run draw-guess:deadlines --workspace=apps/web`。测试环境运行此脚本后，即使所有玩家离线也能继续推进。

## 本地验证证据

| 项目 | 结果 |
| --- | --- |
| 迁移 | 在独立 PostgreSQL 17 容器中应用全部 72 个迁移，全部成功。随后确认仓库测试数据库与 Vercel Preview 为同一项目、与 Production 不同，向 Preview 应用画猜新增的 3 个迁移；`prisma migrate status` 显示 72 个迁移均为最新。生产数据库未触碰。 |
| 5、6、7、8 人完整接龙 | 隔离数据库中为每人创建独立测试身份，逐棒提交作品与词、投票、作者选画、结算、查旧局并开始第二局；均通过。最后猜词者不是原作者。 |
| 并发和恢复 | 8 人并发占座、8 人同棒并发提交、重复命令、旧阶段/旧局命令、房主失联接替、全员离线后的超时补位与并发扫描，均通过。 |
| 权限和可见性 | 非成员无法查看房间或历史；未揭晓时只向当前玩家返回前一棒；投票进行中不暴露票数；均通过服务端检查。 |
| HTTP 定时入口 | 本地 Next 服务经独立脚本调用返回 200 并扫描到期房间；无凭证请求返回 401。 |
| Preview 独立扫描与通知 | Supabase Cron 中 `draw_guess_preview_deadlines` 为 Active，按 `5 seconds` 执行，仅在存在过期画猜房间时通过 `pg_net` 调用稳定的画猜分支 Preview 域名；Vault 保存端点和鉴权密钥。任务运行记录连续成功，网络响应均为 200。创建 5 个临时资料与房间、设置过期截止时间后，未调用任何玩家 API，房间约 5 秒后自动从 `CHAIN_WORD` 进入 `CHAIN_STEP`，自动推进事件仅 1 条；Preview 服务的 Supabase Broadcast 到达已订阅客户端。测试房间和资料已删除，剩余数量为 0。 |
| 静态检查 | TypeScript 类型检查、接龙规则测试和迁移验证通过。 |

复现隔离数据库测试：先在本机 PostgreSQL 上应用迁移，然后在 `apps/web` 目录执行：

```bash
DRAW_GUESS_TEST_DATABASE_URL='postgresql://本机测试账号:密码@127.0.0.1:端口/测试库' \
  node --conditions=react-server --import tsx scripts/test-draw-guess-p0.ts
```

脚本只接受 `localhost` 或 `127.0.0.1` 数据库地址，并创建测试用户、房间与归档。不要对共享或生产数据库运行。

不使用 Supabase Cron 的其他测试环境可运行独立扫描进程，使用该环境的 URL 和密钥：

```bash
DRAW_GUESS_DEADLINE_ENDPOINT='https://测试站点/api/cron/draw-guess-deadlines' \
CRON_SECRET='测试环境密钥' \
  npm run draw-guess:deadlines --workspace=apps/web
```

脚本默认每 5 秒调用一次；只运行一次可追加 `-- --once`。可部署为独立 worker 或由等效调度器调用同一路由。当前 `vercel.json` 没有注册高频 Cron：项目既有文档按 Vercel Hobby 每天一次的限制配置，分钟级 Cron 需要核实套餐，且一分钟的调度仍不能保证接龙倒计时的体验。见 [Vercel Cron 用量与限制](https://vercel.com/docs/cron-jobs/usage-and-pricing)。

本次 Preview 使用了 [Supabase Cron](https://supabase.com/docs/guides/cron) 的秒级任务和 [pg_net](https://supabase.com/docs/guides/database/extensions/pg_net) HTTP 请求。部署脚本 `apps/web/scripts/configure-draw-guess-preview-cron.mjs` 需显式提供 Preview 数据库项目标识、稳定 Preview 主机、端点及其匹配的 `CRON_SECRET`；执行前先要求端点返回 200，随后把端点和密钥保存在 [Supabase Vault](https://supabase.com/docs/guides/database/vault)，安装扩展、注册 5 秒任务和每天清理 7 天前的该任务运行记录。任务只在数据库发现过期房间时发出 HTTP 请求。具备这些变量后，在 `apps/web` 中运行 `node scripts/configure-draw-guess-preview-cron.mjs`；本机 `.env` 可用 `node --env-file=.env` 加载，但必须提供与 Vercel Preview 一致的密钥，不能直接使用不匹配的本地值。复测全员离线自动推进和 Broadcast 时，在 `apps/web` 中运行 `DRAW_GUESS_PREVIEW_DB_REF=... node --env-file=../../.env.local --conditions=react-server --import tsx scripts/probe-draw-guess-preview-cron.ts`；所加载配置需含 Preview Supabase 公开密钥，探针会清理自己创建的房间和临时资料。部署脚本不写入生产数据库，也不在日志输出密钥。

## P0 剩余验收

1. 持续观察 Preview 独立扫描的运行与错误记录，演练任务失败告警及重启恢复。当前已验证 5 秒调度、鉴权 HTTP 200 与离线自动推进，尚未证明持续运行和通知到人。
2. 使用真实 Clerk 账号在 5、6、7、8 台独立设备或会话中，各完成一整局并开始下一局；保存房间号、时间、请求和最终排行记录。覆盖断网重连、换设备、后台切换与房主关闭页面。
3. 验证实际页面与 API 权限：未登录、非成员、旧阶段、重复请求和并发提交；检查旧局只读页面与投票汇总的移动端显示。
4. 复核 Preview 的 Clerk 与 `CRON_SECRET` 均指向测试资源。数据库项目已确认隔离。P0 通过后再进入 P1 灰度准备，正式数据库迁移走发布流程。
