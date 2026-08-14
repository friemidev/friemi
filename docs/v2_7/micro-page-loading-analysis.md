# Supabase Micro 后的页面加载性能分析

更新时间：2026-08-14  
工作分支：`perf/v2-7-micro-page-loading-analysis`

## 1. 本轮目标

Supabase 已从 Nano 升级为 Micro。本轮先回答以下问题：

1. 数据库升级后，页面加载慢是否已经改善。
2. 剩余等待发生在浏览器、Vercel Function、认证、数据库还是网络。
3. 哪些优化可以在不改变现有功能和交互结果的前提下实施。
4. 后续是否需要升级 Vercel，或继续升级 Supabase 计算规格。

本轮不凭单张截图修改数据库连接数、删除轮询或取消动态渲染。先建立 Micro 基线，再逐项处理已证实的瓶颈。

## 2. 当前结论

### 2.1 一句话结论

Micro 对数据库 RAM 和持续 I/O 能力有明确提升，但当前截图仍显示 Vercel CPU 节流、冷启动、动态 SSR、数据库往返和旧未读接口流量等独立问题。因此，Micro 可能改善数据库排队，却不会自动解决所有页面切换需要数秒的问题。

### 2.2 当前判断等级

| 判断 | 状态 | 说明 |
| --- | --- | --- |
| Vercel Function 内存不足 | 暂不支持 | 平均仅使用 `267 MB / 2.05 GB` |
| Vercel CPU 节流影响耗时 | 高概率 | 全局 `CPU Throttle P75 = 17.6%`，需看具体路由 |
| 冷启动影响部分首次打开 | 已确认存在 | `Cold Start = 7.3%`，但还不知道各路由分布 |
| Prisma 连接池等待是主要风险之一 | 已确认 | 100 CCU 下至少 150 个 `P2024` 日志条目；DB 语句执行本身未显示饱和 |
| Micro 已彻底解决数据库容量问题 | 不支持 | Micro 与 Nano 的最大数据库连接数及 pooler clients 相同 |
| 页面路由本身 CPU 很重 | 部分成立 | `/activities`、`/lobby`、`/mobile-home` 的平均 Active CPU 高于两个未读接口 |
| 未读轮询仍制造明显固定流量 | 已确认来自旧 Production | Production `0a29c21` 每 15 秒请求两个旧接口；Preview `f0fe38e` 才使用聚合接口 |

## 3. Vercel 截图分析

截图范围：Production，最近 12 小时。

### 3.1 总览

| 指标 | 截图值 | 解读 |
| --- | ---: | --- |
| Invocations | `1.4K` | 样本量可用于发现流量结构，但不足以推导高并发容量 |
| Error Rate | `<0.1%` | HTTP 层错误较少，不代表没有慢请求或被 fallback 掩盖的数据库错误 |
| Timeout | `0%` | 当前窗口没有 Function 超时 |
| Active CPU P75 | `246 ms` | 75% 的调用 Active CPU 不高，但不包含数据库和外部服务等待 |
| Memory Usage Avg | `267 MB / 2.05 GB` | 当前没有明显 Function 内存压力 |
| CPU Throttle P75 | `17.6%` | 需要进一步定位具体路由；节流会延长墙钟耗时 |
| Cold Start | `7.3%` | 约每 14 次调用中有 1 次冷启动，需要检查低频大 bundle 路由 |
| TTFB P75 | 当前方案未展示 | 这是本轮最关键的缺失数据之一 |

Vercel 官方说明，Active CPU 只统计代码实际执行时间；Function 等待数据库或外部 API 时不计入 Active CPU。因此 `246 ms` 不能证明页面能在 246 ms 内返回。

Vercel 官方还说明，CPU throttle 低于约 10% 的平均值通常不是问题。当前截图是 P75 `17.6%`，已经值得调查，但不能仅凭全局值决定升级套餐或内存。

### 3.2 路由表换算

截图中的 `Active CPU` 是所选时间窗内的累计值，不是单次请求耗时。按 `累计 Active CPU / Invocations` 粗略换算：

| 路由 | 调用数 | 累计 Active CPU | 粗略 CPU/次 | 优先级 |
| --- | ---: | ---: | ---: | --- |
| `/[locale]/public-events/[publicEventId]` | 255 | 25 s | 约 98 ms | 高频，先查 TTFB/DB |
| `/[locale]/public-events/[publicEventId]/teams/new` | 155 | 11 s | 约 71 ms | 调用量异常醒目，查来源和耗时 |
| `/[locale]/activities` | 45 | 10 s | 约 222 ms | 单次 CPU 偏高，P0 路由 |
| `/[locale]/lobby` | 37 | 10 s | 约 270 ms | 单次 CPU 最高，P0 路由 |
| `/api/direct-messages/unread-count` | 266 | 6 s | 约 23 ms | 单次便宜但频率高 |
| `/api/notifications/unread-count` | 259 | 3.56 s | 约 14 ms | 单次便宜但频率高 |
| `/sitemap.xml` | 15 | 2.54 s | 约 169 ms | 可缓存候选 |
| `/[locale]/mobile-home` | 12 | 2.34 s | 约 195 ms | 样本较少，仍需查 TTFB |

这些换算只能评价 CPU 消耗，不能用于评价用户看到的页面加载时间。例如路由可能只消耗 100 ms CPU，却等待数据库 2 秒。

### 3.3 截图暴露出的未读接口问题

两个旧接口合计调用：

`266 + 259 = 525` 次，约占 `1,400` 次总调用的 `37.5%`。

当前代码行为是：

1. 首先请求 `/api/navigation/unread-counts`。
2. 只有聚合接口返回 `404` 或 `405` 时，才回退请求两个旧接口。
3. 聚合接口发生 `500/503` 时不会继续放大为两个旧请求。
4. 可见页面生产环境基础校准间隔为 45 秒，并有失败退避和请求去重。

Vercel CLI 已确认当前 Production 仍是 2026-08-05 的 `0a29c21`。该版本没有聚合调用者，生产环境每 15 秒分别请求两个旧接口；同一 Production 日志窗口内聚合接口为 0。因此截图中的主要旧接口流量来自旧 Production 部署，不是当前 `f0fe38e` 的 `404/405` fallback。完整取证见 [R0 Micro 基线报告](./r0-micro-baseline.md)。

## 4. Nano 升级 Micro 的实际影响

Supabase 官方规格中：

| 指标 | Nano | Micro | 变化 |
| --- | ---: | ---: | --- |
| 内存 | 最高 0.5 GB | 1 GB | 约 2 倍 |
| 基线磁盘吞吐 | 5 MB/s | 11 MB/s | 约 2.2 倍 |
| 基线 IOPS | 250 | 500 | 2 倍 |
| Database max connections | 60 | 60 | 不变 |
| Connection pooler max clients | 200 | 200 | 不变 |

Micro 的直接收益：

- 更大的 Postgres 内存，缓存命中和复杂查询余量更好。
- 持续磁盘吞吐和 IOPS 基线提高。
- 付费项目避免免费实例暂停等生产限制。

Micro 不会直接改善：

- Vercel Function 的 CPU throttle 和 cold start。
- 客户端 JavaScript、图片体积、React hydration 和页面渲染。
- Clerk 认证或其他外部服务延迟。
- Vercel `cdg1` 到数据库 `eu-west-1` 的每次网络往返。
- `connection_limit=1` 导致的单个 Function 实例内部查询排队。
- 高频轮询和 `router.refresh()` 造成的请求数量。

Nano、Micro、Small、Medium 都允许短时 burst，持续负载耗尽 burst 后会回到基线。因此必须观察升级后至少一个真实高峰窗口，不能只在低流量时判断。

## 5. 当前代码与页面加载的对应关系

### 5.1 动态 SSR 比例仍然高

当前静态扫描结果：

- `42` 个页面显式设置 `force-dynamic`。
- `30` 个 API route 显式设置 `force-dynamic`。
- 截图中的 `/activities`、`/lobby`、`/mobile-home`、public event detail、team create 和 `/sitemap.xml` 都是 `force-dynamic`。

动态渲染本身不是错误。登录态、个人关系和实时状态需要动态数据，但公共内容与用户专属字段完全绑在一次 SSR 中，会让每次导航都重新进入 Function、认证并访问数据库。

### 5.2 当前数据库连接策略

项目使用 Supabase transaction pooler，文档记录当前 Prisma URL 为 `connection_limit=1`。这能控制 serverless 实例抢占连接，但也意味着一个 Function 实例中的多个数据库操作可能在客户端连接池排队。

已有 100 CCU 本地生产构建压测曾记录 `P2024` 连接池超时。Micro 升级后必须重跑相同脚本，才能判断是数据库资源不足、单实例连接限制，还是查询数量造成的排队。

本轮不能直接将连接数改为 2 或 3。Micro 的数据库最大连接数仍是 60；Vercel 扩容出更多实例后，每实例连接数相乘可能反而耗尽连接。

### 5.3 页面内部已有分段计时，但生产日志需要取证

`/activities`、`/lobby`、`/public-events/[publicEventId]` 等页面已经使用 `createPerformanceTracker()` 记录分段时间。生产环境默认不输出 `[perf]` 日志，但会将部分页面延迟写入项目 Analytics。

下一步应优先复用这些分段，而不是再引入一个新的监控体系。建议在 Preview 临时启用：

```text
PERFORMANCE_DEBUG=1
```

然后采集同一路由的 `viewer.profile`、详情查询、列表查询、推荐查询及总时间。生产环境不建议长期全量开启详细日志。

### 5.4 当前优先排查路由

1. `/[locale]/lobby`：粗略 CPU/次最高，且同时读取 viewer、列表、滑动推荐等数据。
2. `/[locale]/activities`：动态筛选、列表和筛选项加载，需要对照各步骤耗时。
3. `/[locale]/mobile-home`：用户体感最重要，需区分服务端等待与客户端渲染。
4. `/[locale]/public-events/[publicEventId]`：调用最多，但 CPU/次不高，更像数据库/认证/网络或访问频率问题。
5. `/api/navigation/unread-counts`：确认生产聚合接口已经取代两个旧接口。
6. `/sitemap.xml`：公共内容可考虑增量缓存，不应在普通页面优化之前抢占优先级。

## 6. 需要补充的截图和数据

请尽量选择与当前截图相同的 Production 时间窗，并保留时间范围。敏感 URL、项目 ID、SQL 参数和用户信息可以遮挡。

### 6.1 Vercel，最高优先级

- [ ] Functions 中分别点开 `/activities`、`/lobby`、`/mobile-home`、public event detail 的详情，截图 `Duration/TTFB`、Active CPU、CPU Throttle、Cold Start 和时间曲线。
- [ ] 搜索并截图 `/api/navigation/unread-counts` 与两个旧 unread 接口的调用数、状态码、部署版本和时间曲线。
- [ ] External APIs 页面按 P75 latency 排序，截图 Supabase/Postgres/Clerk 相关上游请求。
- [ ] Runtime Logs 中筛选一次用户实际等待 4 至 5 圈的请求，截图同一 request 的 `[perf]` 步骤或耗时信息。
- [ ] Project Settings 的 Functions 区域、Fluid Compute、Node runtime 和内存设置截图。
- [ ] 若已启用 Web Analytics / Speed Insights，提供 `/mobile-home`、`/lobby`、`/activities` 的 LCP、INP、TTFB 路由明细。

### 6.2 Supabase，最高优先级

- [ ] Database Reports 同一时间窗的 CPU usage。
- [ ] Memory usage，尤其 free、cache/buffers 和 swap。
- [ ] Disk IOPS、Disk IO % consumed、throughput。
- [ ] Database connections、Shared/Dedicated Pooler connections。
- [ ] Query Performance 按 `total_exec_time`、`mean_exec_time`、`calls` 各排序一次，截图前 10 条。
- [ ] Index Advisor / Performance Advisor 当前告警。
- [ ] 明确 Micro 升级完成的准确时间，便于在图上做升级前后分界。

### 6.3 浏览器或 App WebView

- [ ] Chrome DevTools Network 录制一次慢切换，保留 Document/RSC 请求的 Waiting TTFB、Content Download 和总耗时。
- [ ] Performance 录制相同操作，确认等待期间主线程是空闲还是有长任务。
- [ ] 标记测试网络、设备、是否首次打开、是否登录、目标路径和实际等待秒数。

这些数据中，最先需要的是“Vercel 慢路由详情 + Supabase Database Reports + 浏览器 Network”。三组时间线对齐后，才能判断下一笔钱应花在 Vercel、Supabase，还是代码优化上。

## 7. Micro 后的对照测试

### P0：不改功能，只建立基线

- [ ] 记录 Micro 升级 Dashboard 准确时间；已知数据库在 2026-08-14 10:07:47 CEST 重启。
- [x] 固定 Preview commit `f0fe38e`，对照窗口中未混入新版本。
- [x] 使用现有脚本重跑 20/50/100 CCU，每档 3 次。
- [ ] 同时记录 Vercel Duration/TTFB/CPU throttle/cold start。
- [ ] 同时记录 Supabase CPU/RAM/IO/connections。
- [x] 记录 `P2024`、HTTP 5xx 和 fallback：HTTP 5xx 为 0，但至少 150 个 `P2024` 日志条目被 HTTP 200 旧缓存 fallback 掩盖；仍需登录态业务正确性验收。
- [x] 对比 Nano 的 [W0/W1 报告](./w0-w1-performance-report.md)，输出中位数而不是选择最好的一次。结果见 [R0 Micro 基线报告](./r0-micro-baseline.md)。

### P1：基线后允许实施的低风险优化

- [ ] 确认生产聚合未读接口有效；旧 bundle 存量消失后，评估删除兼容回退。
- [ ] 给聚合未读接口和核心 SSR 路由补齐可关联的 request ID 与 Server-Timing。
- [ ] 对公共详情的基础数据和用户专属 overlay 分开计时，先不改变返回内容。
- [ ] 审查 metadata 与页面主体是否重复读取同一 public event 数据。
- [ ] 将 `/sitemap.xml` 改为明确的增量更新策略，避免每次动态计算。
- [ ] 审查低频路由 Function bundle，减少冷启动初始化依赖。
- [ ] 只对已证明不含用户专属内容的数据增加短时缓存。

### P2：必须经过 Preview 压测后才决定

- [ ] 是否将 Preview 的 Prisma `connection_limit` 从 1 小步测试到 2，再决定是否继续。
- [ ] 是否移除部分 `force-dynamic`，改为公共缓存层加用户 overlay。
- [ ] 是否提高 Vercel Function 内存/CPU，要求目标路由 throttle 与 Duration 同时改善。
- [ ] 是否将 Vercel Function 区域迁到更接近数据库的位置，要求认证和主要用户地理延迟不恶化。
- [ ] 是否从 Micro 升级 Small，要求 Supabase CPU、RAM、IO 或连接指标明确触顶。

## 8. 预期和验收标准

以下是目标，不是当前截图已经达到的结论。

### 技术验收

- [ ] 聚合未读接口正常时，每个校准周期只有 1 个 unread 请求，不再固定产生 2 个旧接口请求。
- [ ] 20/50 CCU 不出现 `P2024`；100 CCU 的数据库错误率低于 `0.1%` 且无业务 fallback 掩盖。
- [ ] 核心路由可以将总耗时拆分为认证、数据库、服务端计算、网络和客户端渲染。
- [ ] Vercel 全局及核心路由 CPU throttle 回落至可接受范围，目标平均低于 `10%`。
- [ ] 任何缓存调整都不泄漏用户专属数据，不造成关注、报名、未读和权限状态串号。

### 用户体验验收

- [ ] 已访问过的核心页面 warm navigation P75 小于 1.5 秒，P95 小于 2.5 秒。
- [ ] 冷启动页面 P95 小于 4 秒，并且有统一 loading 反馈，不阻塞返回操作。
- [ ] `/mobile-home`、`/lobby`、`/activities` 和活动详情连续切换不再普遍出现 4 至 5 圈等待。
- [ ] 页面内容、权限、实时消息、未读数和现有布局保持一致。

### 容量验收

- [x] 20/50/100 CCU 每档 3 次，报告 p50/p75/p95/p99、RPS、错误率和数据库指标。
- [ ] 100 CCU 下 P95 相比 Nano 基线不恶化，并明确改善来自 Micro 还是代码版本。
- [ ] 高峰窗口结束后无持续连接堆积、swap、IO budget 耗尽或队列恢复缓慢。
- [ ] 只有监控证明资源触顶时，才批准下一档付费升级。

## 9. 风险与边界

| 动作 | 风险 | 影响 |
| --- | --- | --- |
| 仅采集同时间窗指标 | 极低 | 无功能变化 |
| 增加 request ID / Server-Timing | 极低 | 少量响应头和日志开销 |
| 修复未读聚合部署或旧客户端回退 | 低 | 需验证 badge 及时性和离线恢复 |
| 缓存 sitemap、纯公共数据 | 低 | 可能短时间显示旧公共内容 |
| 拆分公共数据与用户 overlay | 中 | 权限或用户状态合并错误会造成显示问题 |
| 调大 Prisma 连接数 | 中高 | Vercel 扩容时可能耗尽数据库连接 |
| 移除 `force-dynamic` | 中高 | 可能缓存用户专属信息或显示旧状态 |
| 迁移部署区域 | 中高 | 对不同地区用户、Clerk 和数据库延迟的影响不同 |
| 仅靠升级套餐继续扩容 | 高 | 成本增加但请求放大和查询结构保持不变 |

## 10. 官方参考

- [Supabase Compute and Disk](https://supabase.com/docs/guides/platform/compute-and-disk)
- [Supabase Performance Tuning](https://supabase.com/docs/guides/platform/performance)
- [Supabase Reports](https://supabase.com/docs/guides/telemetry/reports)
- [Supabase pg_stat_statements](https://supabase.com/docs/guides/database/extensions/pg_stat_statements)
- [Supabase Transaction Pooler 与 prepared statements](https://supabase.com/docs/guides/troubleshooting/disabling-prepared-statements-qL8lEL)
- [Prisma Client 与 PgBouncer](https://www.prisma.io/docs/orm/v6/prisma-client/setup-and-configuration/databases-connections/pgbouncer)
- [Vercel Observability Insights](https://vercel.com/docs/observability/insights)
- [Vercel Fluid Compute](https://vercel.com/docs/fluid-compute)
- [Vercel Fluid Compute Usage and Pricing](https://vercel.com/docs/functions/usage-and-pricing)
- [Debugging Slow Vercel Functions](https://vercel.com/docs/functions/debug-slow-functions)

## 11. 未读接口专项代码审计

审计日期：2026-08-14。

本节针对“未读 API 是否查询过多、是否每次刷新调用、是否每 1 至 3 秒轮询”的外部建议进行源码和只读数据库验证。

### 11.1 对外部建议的判断

| 建议或判断 | 结论 | 依据 |
| --- | --- | --- |
| 检查 direct unread 内部执行多少 SQL | 完全正确，最高优先级 | 旧接口不只统计私聊，还统计聚吧群聊 |
| 检查 notification unread 是否每次页面刷新调用 | 方向正确，但要区分旧接口与新聚合接口 | 当前正常路径调用聚合接口；旧接口只在聚合接口 `404/405` 时回退 |
| 检查 unread 是否每 1/2/3 秒请求 | 已排除固定高频轮询 | 生产基础周期是 45 秒，不是 1 至 3 秒 |
| 截图说明 direct unread 单次慢到 6 秒 | 错误 | `6s` 是 266 次调用在 12 小时内的累计 Active CPU，约 23ms CPU/次 |
| 80% 概率是 API/页面请求策略 | 方向上很有道理，但概率无法由截图计算 | 代码和只读测试确认存在查询放大；仍缺 Production TTFB/DB 指标 |
| 服务器配置不足不是主因 | 尚不能完全排除 | Vercel throttle 和 cold start 仍存在，但 Micro 无法消除多次数据库往返 |

结论：这位同事抓到了正确的排查对象，但误读了 Vercel 的 `6s` 指标。当前可以确认 API 结构和触发策略存在优化空间，不能确认单次旧接口真的耗时 6 秒。

### 11.2 `/api/direct-messages/unread-count` 实际执行内容

生产登录态路径依次执行：

1. 根据 Clerk user ID 查询 ACTIVE `UserProfile`。
2. 查询该用户所有开启勿扰的私聊会话 ID。
3. 统计未读私聊消息，排除本人发送、已删除和勿扰会话。
4. 查询最多 100 个用户可访问的聚吧房间。
5. 查询这些房间对应的 `ActivityRoomReadState`。
6. 对未静音房间按各自 `lastReadAt` 组装 OR 条件，对 `ActivityRoomMessage` 执行 `groupBy`。

所以它不是简单的 `SELECT COUNT(*)`，也没有查询好友列表；但它会顺便查询聚吧房间和群聊未读。它不查询 Planet，Planet 是新聚合接口额外统计的内容。

按用户状态，业务 SQL 数量为：

| 用户状态 | 业务 SQL |
| --- | ---: |
| 没有可访问聚吧房间 | 通常 4 条 |
| 有房间但无需群聊 groupBy | 通常 5 条 |
| 有未静音房间并统计群聊未读 | 通常 6 条 |

### 11.3 只读 query event 验证

测试连接：当前 `.env.local` 配置的 Supabase transaction pooler，端口 `6543`，`pgbouncer=true`，`connection_limit=1`。测试只读取一个 ACTIVE 用户，不修改数据，不输出用户 ID 或 SQL 参数。

有可访问聚吧房间的旧 direct unread 等价路径：

| 步骤 | 业务 SQL | protocol statements | 单次样本数据库事件时间 |
| --- | ---: | ---: | ---: |
| Profile lookup | 1 | 4 | 102 ms |
| 勿扰私聊查询 | 1 | 4 | 102 ms |
| 私聊未读 count | 1 | 4 | 101 ms |
| 聚吧房间和 read states | 2 | 5 | 146 ms |
| 聚吧群聊未读 groupBy | 1 | 4 | 100 ms |
| **合计** | **6** | **21** | **551 ms** |

旧 notification unread 等价路径：

| 步骤 | 业务 SQL | protocol statements | 单次样本数据库事件时间 |
| --- | ---: | ---: | ---: |
| 通知未读 count | 1 | 4 | 约 105 ms |

一条普通 Prisma 查询在当前 transaction pooler 日志中通常表现为：

```text
BEGIN
DEALLOCATE ALL
SELECT ...
COMMIT
```

因此业务 SQL 数量和线上 protocol statements 数量必须分开统计。这个样本反映的是当前开发机到所配置数据库的只读往返，不是 Vercel Production P75/P95；但 SQL 数量和查询结构与生产代码一致。

Supabase 官方要求 transaction mode 禁用 prepared statements，Prisma 使用 `pgbouncer=true` 是当前连接方式的兼容配置，不能为了减少 `DEALLOCATE ALL` 直接删除。可以在 Preview 对 Supabase Pro 的 Dedicated Pooler 做独立 A/B，但必须先验证 IPv4/IPv6、连接上限和正确性。

### 11.4 当前真正执行的新聚合接口

正常情况下客户端请求的是 `/api/navigation/unread-counts`。该接口一次返回：

- 通知未读。
- 私聊未读。
- 聚吧群聊未读。
- Planet 群聊未读。

只读样本中，一个有 Planet membership、但没有当前可统计聚吧房间的用户执行了：

| 指标 | 单次样本 |
| --- | ---: |
| 业务 SQL | 9 条 |
| protocol statements | 30 条 |
| 累计数据库事件时间 | 787 ms |

若用户同时有可统计聚吧房间和 Planet，当前路径最高还会增加房间 read state 和群聊 groupBy，常见上界约 11 条业务 SQL、35 条 protocol statements。具体数量随房间、Planet 和勿扰状态变化。

代码使用 `Promise.all()` 同时启动四组统计，但当前 Prisma `connection_limit=1`，这些 SQL 不会获得四条数据库连接并行执行，仍会在单实例连接池内排队。

### 11.5 请求频率核对

当前 `NotificationBadgeProvider` 的生产行为：

- 首次登录态页面加载后约 1.2 秒请求一次聚合接口。
- 普通可见页面基础周期为 45 秒，并增加最多 5 秒随机抖动。
- 失败后约 45、90、180 秒退避，最大 5 分钟。
- 页面切换导致 pathname 改变时会立即校准一次。
- 页面重新获得 focus、从后台恢复可见或恢复联网时会立即校准一次。
- 页面隐藏或离线时暂停。
- 同一时刻的并发触发会复用同一个 in-flight Promise。

因此：

- [x] 不存在每 1、2、3 秒固定轮询 unread count。
- [x] 硬刷新普通登录页面会在约 1.2 秒后调用聚合接口。
- [x] 客户端每次切换到新的 pathname 都会触发一次聚合校准。
- [x] 正常部署时不会每次都调用两个旧接口。
- [x] Vercel 已确认当前 Production 没有聚合接口流量，旧接口来自 `0a29c21` 自身的 15 秒双请求，不是 `f0fe38e` 的 `404/405` fallback。
- [ ] 需要确认 Android WebView 是否异常重复派发 focus/visibility 事件。

### 11.6 优化优先级

#### P0：低风险，请求策略

- [ ] 在 Production 对齐 `/api/navigation/unread-counts` 和两个旧接口的状态码、部署版本与时间线。
- [ ] 为 pathname/focus/visibility 校准增加“最近成功时间”保护，例如 30 秒内不重复访问数据库；业务事件仍可直接更新本地角标。
- [ ] 保留首次加载、恢复联网和 45 秒兜底，避免未读数永久不更新。
- [ ] 使用现有 `Server-Timing` 测量聚合接口 Production P50/P75/P95。

#### P1：低至中风险，减少 SQL

- [ ] 将“查询勿扰会话 ID + direct message count”合并为一条带 `conversation.preferences.none` 的 COUNT，并用新旧结果 shadow compare。
- [ ] 对聚吧/Planet 房间读取与 groupBy 保存真实 `EXPLAIN (ANALYZE, BUFFERS)`，不要凭感觉增加索引。
- [ ] 评估一条参数化 SQL/CTE 聚合现有四类未读，先在 Preview 双算对比。

#### P2：中高风险，正确的长期方案

- [ ] 建立用户级 unread read model，消息发送、已读、勿扰、删除和退群时事务性更新。
- [ ] 新旧算法双写/影子读取，达到约定 mismatch 门槛后再切换角标读取。
- [ ] 保留低频 reconciliation 和旧查询 fallback，避免漏事件后永久错误。

### 11.7 本次专项结论

1. `/api/notifications/unread-count` 本身很简单，有匹配 `recipientId + readAt + createdAt` 的索引，不是首要 SQL 优化对象。
2. 旧 `/api/direct-messages/unread-count` 命名与职责不一致，同时统计私聊和聚吧群聊，单次查询链明显偏重。
3. 当前真正的聚合接口减少了 HTTP 和认证次数，但没有减少底层 SQL，且加入 Planet 后单次数据库工作更多。
4. 页面切换立即校准没有阻塞已经完成的那次导航，但会在用户连续切换时与后续页面查询竞争数据库资源。
5. Micro 主要增加数据库资源；它不会减少 21 至 35 次 protocol statements，也不会消除跨区域往返。
6. 所以“优先优化 API 写法和页面请求策略”是正确决策，但仍需 Production TTFB、登录态聚合接口延迟分布和 Supabase 报表完成归因。
