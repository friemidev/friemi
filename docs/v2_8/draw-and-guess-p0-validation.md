# 你画我猜 P0 验证记录

更新于 2026-09-28。P0 的本地数据库、Preview 独立调度、真实 Clerk 多会话对局和故障通知演练均已通过；按测试环境功能验收，P0 已闭环。接龙仅在画猜分支的 Preview 开启，生产环境尚未发布。

复核于 2026-09-28：用户打开的 Frieme.Dev Chrome 会话可读取 `friemi` Vercel 项目；当前 Vercel CLI 登录的是另一账号，不能操作该项目。画猜分支 `codex/draw-and-guess` 已推送并产生独立的 Ready Preview：`https://friemi-git-codex-draw-and-guess-friemi.vercel.app`。Vercel Preview 的数据库项目标识与仓库测试配置一致，Production 为不同项目；已只对 Preview 测试库应用画猜的 3 个新增迁移，72 个迁移均为最新。`DRAW_GUESS_CHAIN_ENABLED=true` 仅配置于该画猜分支的 Preview 环境并已随新部署生效。Preview Supabase Cron 已启用独立的 5 秒截止扫描，实测能让全员离线的过期测试房间自动跨阶段。与 Preview 页面一致的 Clerk development 实例中创建了 8 个 `+clerk_test` 临时账号；完成独立会话验收后，这些账号、测试房间和数据库资料均已删除。接龙新局默认关闭，其他分支和生产环境不受画猜分支开关影响。

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
| Preview 独立扫描与通知 | Supabase Cron 中 `draw_guess_preview_deadlines` 为 Active，按 `5 seconds` 执行，仅在存在过期画猜房间时通过 `pg_net` 调用稳定的画猜分支 Preview 域名；Vault 保存端点和鉴权密钥。任务运行记录连续成功，网络响应均为 200。创建 5 个临时资料与房间、设置过期截止时间后，未调用任何玩家 API，房间约 5 秒后自动从 `CHAIN_WORD` 进入 `CHAIN_STEP`，自动推进事件仅 1 条；Preview 服务的 Supabase Broadcast 到达已订阅客户端。测试房间和资料已删除，剩余数量为 0。健康接口把任务停用和最近成功时间纳入判断；短暂停用 Preview 截止扫描时返回 503，GitHub [Site Monitoring #22](https://github.com/friemidev/friemi/actions/runs/36438779487) 以 `Received: 503` 失败，TiantianTitan 的 Gmail 收到失败通知。随即恢复扫描，确认任务 Active、最新运行 succeeded、健康接口 200。首次正常监控 [#21](https://github.com/friemidev/friemi/actions/runs/36438042536) 成功。 |
| Preview 真实身份完整对局 | 5、6、7、8 人分别使用独立 Clerk 会话完成出词、所有画猜棒次、全员投票、作者选画、排行榜和再来一局。最终每人分数依次为 320、320、400、400；最后猜词者与起始词作者不同。8 人测试最初逐人提交曾超过 20 秒猜词截止时间，系统按规则自动补位；改为并发提交后全程通过。 |
| Preview 权限与恢复 | 非成员读取房间被拒；新会话恢复草稿；模拟房主离线后在线成员接任；归档 PNG 仅房间成员能读取，匿名与非成员均被拒；历史页在再来一局后仍展示旧局词和分数。Supabase 房间客户端实际连接到 Preview 项目，页面断线时有轮询提示。 |
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

本次 Preview 使用了 [Supabase Cron](https://supabase.com/docs/guides/cron) 的秒级任务和 [pg_net](https://supabase.com/docs/guides/database/extensions/pg_net) HTTP 请求。部署脚本 `apps/web/scripts/configure-draw-guess-preview-cron.mjs` 需显式提供 Preview 数据库项目标识、稳定 Preview 主机、端点及其匹配的 `CRON_SECRET`；执行前先要求端点返回 200，随后把端点和密钥保存在 [Supabase Vault](https://supabase.com/docs/guides/database/vault)，安装扩展、注册 5 秒截止任务、每日数据维护任务，以及每天清理 7 天前任务运行记录。截止任务只在数据库发现过期房间时发出 HTTP 请求。具备这些变量后，在 `apps/web` 中运行 `node scripts/configure-draw-guess-preview-cron.mjs`；本机 `.env` 可用 `node --env-file=.env` 加载，但必须提供与 Vercel Preview 一致的密钥，不能直接使用不匹配的本地值。复测全员离线自动推进和 Broadcast 时，在 `apps/web` 中运行 `DRAW_GUESS_PREVIEW_DB_REF=... node --env-file=../../.env.local --conditions=react-server --import tsx scripts/probe-draw-guess-preview-cron.ts`；所加载配置需含 Preview Supabase 公开密钥，探针会清理自己创建的房间和临时资料。部署脚本不写入生产数据库，也不在日志输出密钥。

## 发布前补充验收

1. 真机弱网与后台切换可在灰度前再补一次人工体验验收；当前 5–8 人使用的是独立 Clerk 身份与浏览器会话，并非 8 台物理设备。自动化已覆盖草稿换会话恢复、房主失联、过期自动补位和轮询降级。
2. 正式数据库迁移、功能开关与监控目标切换仍走发布流程。当前仓库监控变量指向隔离的画猜 Preview；若删除该 Preview 或改为生产监控，须同步更新目标地址。
