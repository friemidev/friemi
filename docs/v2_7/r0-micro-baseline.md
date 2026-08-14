# R0 Supabase Micro 基线报告

更新时间：2026-08-14  
分支：`perf/v2-7-micro-page-loading-analysis`

## 1. 结论

- **R0 远端基线已完成，容量门禁未通过。** Vercel Preview 已按 20/50/100 CCU 各执行 3 次，三轮共 17,083 个请求，客户端观察到的 HTTP 错误为 0。
- **100 CCU 中位数为 107.65 RPS，P75 127.3ms，P95 246.8ms。** 这比升级前的本地生产构建基线稳定，但环境和代码版本不同，不能将全部改善归因于 Micro。
- **HTTP 200 掩盖了连接池错误。** Preview 日志至少返回 150 个包含 `P2024` 的日志条目，集中在 100 CCU 阶段的 `/zh-CN/mobile-home` 缓存重算，响应仍为 200 并使用旧缓存结果。
- **本次瓶颈更接近 Vercel 实例内的 Prisma `connection_limit=1` 与缓存重算并发，而不是 Micro PostgreSQL 执行能力。** 定向 100 CCU 窗口内 PostgreSQL 仅增加约 172ms 累计语句执行时间，0 回滚、0 物理块读取、0 死锁；`P2024` 发生在 Prisma 取得连接之前。
- **Production 仍运行旧版本。** Production 是 2026-08-05 的 `0a29c21`，每 15 秒分别请求两个旧 unread API；当前 Preview 才是 2026-08-14 的 `f0fe38e` 聚合实现。
- **R1 可以继续开发，但不能批准连接池或套餐调整。** 还缺真实登录慢导航 trace、核心路由 Vercel Duration/TTFB/Throttle、Supabase CPU/RAM/IO 图和聚合 unread 的登录态延迟分布。

## 2. 固定版本与时间窗

| 项目 | 值 |
| --- | --- |
| Preview commit | `f0fe38ecadbbc06e9a2a3d36cc4bbee280e37cab` |
| Preview URL | `friemi-7gbyailcx-friemi.vercel.app` |
| Preview 创建/Ready | 2026-08-14 10:43:07 / 10:47:26 CEST |
| 三轮测试窗口 | 2026-08-14 11:23 至 11:29 CEST |
| Production commit | `0a29c21b3b8d236c3bb3eb1db68b50d8d3082b4a` |
| Production 创建/Ready | 2026-08-05 19:22:34 / 19:26:25 CEST |
| PostgreSQL 版本 | 17.6 |
| 数据库重启时间 | 2026-08-14 10:07:47 CEST |
| 数据库连接方式 | Supabase transaction pooler `:6543`, `pgbouncer=true`, `connection_limit=1` |

数据库重启时间与用户报告的 Micro 升级发生在同日上午，但仍需 Supabase Dashboard 的升级记录确认它就是准确升级时间。

## 3. 方法

- 目标为 Vercel Preview，不请求 Production 域名。
- 路由为 `GET /zh-CN/mobile-home` 与 `GET /api/lobby/swipe?limit=8`，交替发送。
- 每档 30 秒；20、50、100 个虚拟用户；思考时间 400 至 1200ms；超时 15 秒。
- 每档连续执行 3 次；表格取逐指标中位数，不选择最好的一次。
- 测试前后读取 `pg_stat_database` 与 `pg_stat_statements`，同时查询 Preview Runtime Logs。
- 这是公共匿名读取基线，不覆盖登录态 unread、消息发送、Presence 写入和真实用户行为比例。

## 4. 三轮中位数

### 总体

| CCU | RPS | P50 | P75 | P95 | P99 | 中位最大值 | HTTP 错误 |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 20 | 22.26 | 85.2ms | 107.3ms | 196.0ms | 670.4ms | 1,245.4ms | 0% |
| 50 | 54.48 | 82.7ms | 114.9ms | 226.6ms | 449.6ms | 3,044.2ms | 0% |
| 100 | 107.65 | 84.5ms | 127.3ms | 246.8ms | 529.1ms | 958.2ms | 0% |

### 分路由

| CCU | 路由 | P50 | P75 | P95 | P99 |
| ---: | --- | ---: | ---: | ---: | ---: |
| 20 | `/mobile-home` | 100.7ms | 120.9ms | 209.7ms | 382.2ms |
| 20 | `/api/lobby/swipe` | 53.3ms | 61.4ms | 160.5ms | 836.3ms |
| 50 | `/mobile-home` | 110.7ms | 146.7ms | 264.2ms | 454.3ms |
| 50 | `/api/lobby/swipe` | 50.4ms | 57.7ms | 179.3ms | 1,074.3ms |
| 100 | `/mobile-home` | 117.5ms | 165.4ms | 285.4ms | 608.3ms |
| 100 | `/api/lobby/swipe` | 49.5ms | 55.9ms | 111.1ms | 480.7ms |

原始结果：

- [第 1 轮](./performance-baselines/r0-micro-preview-run-1.json)
- [第 2 轮](./performance-baselines/r0-micro-preview-run-2.json)
- [第 3 轮](./performance-baselines/r0-micro-preview-run-3.json)
- [三轮中位数](./performance-baselines/r0-micro-preview-median.json)

## 5. 与升级前基线的方向性对比

旧基线是“本机 Next.js 生产构建 + Preview DB”，当前基线是“Vercel Preview + Micro DB”；同时代码已经变化。因此以下数据只能说明现状方向，不能作为 Micro 单变量 A/B。

| CCU | 旧 RPS | 当前 RPS | 变化 | 旧 P95 | 当前 P95 | 变化 |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 20 | 23.25 | 22.26 | -4.3% | 144.5ms | 196.0ms | +35.6% |
| 50 | 38.69 | 54.48 | +40.8% | 1,085.8ms | 226.6ms | -79.1% |
| 100 | 56.26 | 107.65 | +91.3% | 2,518.9ms | 246.8ms | -90.2% |

50/100 CCU 的墙钟延迟明显改善，但 `P2024` 仍存在，因此不能把 HTTP P95 单独当作数据库容量通过。

## 6. 数据库与 P2024

### 三轮总窗口

| 指标 | 前 | 后 | 增量 |
| --- | ---: | ---: | ---: |
| `xact_commit` | 2,694,293 | 2,695,503 | +1,210 |
| `xact_rollback` | 1,499 | 1,499 | 0 |
| `blks_read` | 3,555 | 3,557 | +2 |
| `blks_hit` | 42,674,741 | 42,763,825 | +89,084 |
| pg_stat statement calls | 1,875,819 | 1,881,085 | +5,266 |
| pg_stat total exec | 306,565.677ms | 306,989.100ms | +423.423ms |
| 后端连接 | 6 | 16 | +10，结束快照仅 1 active |
| 死锁 | 0 | 0 | 0 |

数据库连接峰后为 16/60，不足以证明数据库最大连接数触顶。该总窗口包含项目同期真实流量，因此又执行了一次不计入三轮中位数的 100 CCU 定向样本。

### 定向 100 CCU

| 指标 | 结果 |
| --- | ---: |
| 请求 / RPS | 3,328 / 107.30 |
| P75 / P95 / P99 | 139.9 / 269.4 / 577.3ms |
| DB commits / rollbacks | +303 / 0 |
| pg_stat statement calls | +1,504 |
| pg_stat total exec | +172.034ms |
| 物理块读取 / 死锁 | 0 / 0 |
| 最重应用 query | 107 calls / 58.648ms total |

`temp_files/temp_bytes` 的增量来自快照脚本对 `pg_stat_statements` 的排序，已通过 query ID 和 SQL 文本确认，不归因于页面负载。诊断原始指标见 [定向 HTTP](./performance-baselines/r0-micro-preview-db-diagnostic.json) 与 [数据库增量](./performance-baselines/r0-micro-db-diagnostic-delta.json)。

### 被 200 掩盖的错误

Vercel 日志在 2026-08-14 11:28:36 至 11:32:21 CEST 返回至少 150 个包含 `P2024` 的日志条目，均位于 `/zh-CN/mobile-home` 且响应状态为 200。失败点包括：

- `Activity.findMany()`；
- `ActivityParticipant.findMany()`；
- `PublicEvent.findMany()`；
- `TopNewsItem.findMany()`；
- `anonymous-mobile-home-trending-team-activities` 与 `anonymous-lobby-swipe-mixed-activities` 的缓存重算。

日志明确显示连接池超时 10 秒、连接上限 1。页面继续返回旧缓存，所以压测脚本无法从 HTTP 状态发现故障。日志查询存在返回上限，`150` 是下限而非精确事件总数。

## 7. 未读接口取证

### Production

Production commit `0a29c21` 的客户端逻辑：

- 生产环境每 15 秒分别请求两个旧接口，即静止可见用户固定约 `8 unread GET/分钟`；
- 首次加载约 1.2 秒后再请求 2 次；
- 每次 pathname 变化、focus 和重新 visible 时再请求 2 次；
- 没有 `/api/navigation/unread-counts` 调用者。

2026-08-14 10:40 至 11:39 CEST 的 Production 日志仍能看到两个旧接口，而聚合接口为 0 条；用户提供的 12 小时截图也显示旧接口分别约 266/259 次。结论是旧流量来自当前旧 Production 部署，不是当前聚合接口的 404/405 fallback。

### Preview

Preview commit `f0fe38e` 已变为：

- 一个 `/api/navigation/unread-counts` 聚合请求；
- 基础周期 45 秒并加入不超过 5 秒 jitter，约 1.2 至 1.33 GET/分钟；
- 页面隐藏暂停、失败退避和 in-flight 去重；
- pathname、focus、visible、online 仍会立即刷新，尚无 30 秒 freshness guard。

只按固定周期计算，Preview 相比 Production 从 8 降至约 1.2 至 1.33 GET/分钟，减少约 83% 至 85%。频繁切页时仍会额外请求，正是 R1 的处理范围。

当前没有登录态 Preview 聚合请求样本，因此不能填写聚合接口 P50/P75/P95。只读 Prisma query event 审计显示常见为 9 条业务 SQL，有 Activity room 和 Planet 时约 11 条；该结果不是远端 API 延迟分布。

## 8. 构建一致性问题

Preview 构建日志显示 `web#build` 命中 Turbo 远端缓存，导致包含 `prisma generate` 的 package build 整体跳过。生成的 Prisma Client 位于 `node_modules`，不在 `.next/**` 缓存输出中，随后 `/footprints` 出现 `Unknown argument mentionedProfileIds`。

本轮已做两项构建保护：

- `turbo.json` 将不可缓存的 `db:generate` 设为 `build` 前置任务；
- `verify-prisma-client.cjs` 增加 Activity/Planet message 三个 mention 字段检查。

需要重新部署 Preview 后验证 `/footprints` 不再出现该错误，再将新版本作为后续远端基线。

## 9. 门禁与下一步

| 项目 | 状态 | 说明 |
| --- | --- | --- |
| 固定 Preview commit 三轮基线 | 通过 | 17,083 requests，原始 JSON 已保存 |
| HTTP 5xx | 通过 | 0 |
| `P2024` | **失败** | 至少 150 个日志条目，HTTP 200 fallback 掩盖 |
| 数据库最大连接触顶 | 未发现 | 快照 16/60，仍缺 Supabase Dashboard 峰值图 |
| Production unread 频率取证 | 通过 | 旧部署固定 8 GET/分钟 + 导航/焦点触发 |
| 聚合 unread P50/P75/P95 | 未完成 | 缺登录态 Preview 样本 |
| 慢导航端到端分解 | 未完成 | 缺浏览器 Network/Performance trace |
| 核心路由 CPU/TTFB/Throttle | 未完成 | CLI 不提供 Observability route detail |

下一步顺序：

1. 重新部署带 Prisma/Turbo 修复的 Preview，验证部署不再使用旧 Client。
2. 实施 R1 freshness guard；它不解决匿名首页 P2024，但能减少登录用户连续切页的固定负载。
3. 单独分析首页缓存重算的 single-flight、并行 Prisma 查询与 `connection_limit=1`，不要直接调连接数。
4. 收集登录慢导航和 Supabase/Vercel Dashboard 同时间窗指标后，再决定是否做 `connection_limit=2` Preview A/B。
5. R4 read model 与 R5 基础设施调整继续保持未批准。

本轮没有修改连接池、数据库结构或业务返回结果，也没有触发回滚。

## 10. 验证记录

- `npm test --workspace=apps/web`：241/241 通过。
- `npx turbo run build --filter=@chill-club/web --force`：4/4 tasks 通过。
- 再次执行缓存命中 build：`web#build` 命中缓存时，`web#db:generate` 仍 cache bypass 并成功校验 Prisma Client。
- 三个观测脚本均通过 `node --check`；三轮中位数重新生成后与保存结果一致。
- 所有 R0 JSON 均通过 `jq` 解析，附件未包含数据库密码、service role 或 Clerk secret。
