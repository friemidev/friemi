# W0 / W1 性能验证报告

更新时间：2026-08-12

## 1. 结论

- **W0 状态：部分完成，不能标记为完整预览环境基线。** 已完成本机 Next.js 生产构建连接当前 Preview Supabase 数据库的 20/50/100 CCU 可重复基线；当前 Vercel CLI 账号下没有 Friemi 项目，无法部署或读取 Friemi Vercel Preview Function 指标。
- **W1 状态：代码实现与本地对照完成，远端灰度未批准。** 正确性测试通过，同脚本 p95 未触发 `>20%` 回滚线；但 100 CCU 仍有数据库连接池 `P2024`，不能据此批准 W2。
- **灰度比例：0%。** 本轮没有部署到 Preview 或 Production，也没有对生产域名压测。
- **W2 状态：未批准、未实施。** 必须先补齐 Friemi Vercel Preview 权限、远端指标和至少一个高峰观察窗口。

## 2. 测试边界

测试目标：本机 `next start` 生产构建，数据库连接使用当前项目配置的 Preview Supabase transaction pooler。

测试路径：

- `GET /zh-CN/mobile-home`
- `GET /api/lobby/swipe?limit=8`

固定参数：每档 30 秒，20/50/100 个虚拟用户，思考时间 400 至 1200 ms，请求超时 15 秒。脚本包含生产域名拒绝保护，远端地址还需要显式设置 `PERF_ALLOW_REMOTE_TARGET=preview-only`。

原始指标：

- [W0 修改前 JSON](./performance-baselines/w0-before-local-preview-db.json)
- [W1 修改后 JSON](./performance-baselines/w1-after-local-preview-db.json)
- [压测脚本](../../apps/web/scripts/run-http-load-baseline.mjs)

本报告不是 Vercel Preview 容量结论，也不覆盖登录态消息发送、Presence 心跳和完整用户行为比例。首页与大厅路径用于复现当前公共读取在连接池压力下的排队趋势。

## 3. 修改前后指标

| CCU | 修改前 RPS | 修改后 RPS | 修改前 p50 | 修改后 p50 | 修改前 p95 | 修改后 p95 | p95 变化 | HTTP 错误率 |
| ---: | ---------: | ---------: | ---------: | ---------: | ---------: | ---------: | -------: | ----------: |
| 20 | 23.40 | 23.25 | 31.9 ms | 31.3 ms | 137.3 ms | 144.5 ms | +5.2% | 0% -> 0% |
| 50 | 44.60 | 38.69 | 54.8 ms | 56.0 ms | 1068.0 ms | 1085.8 ms | +1.7% | 0% -> 0% |
| 100 | 50.54 | 56.26 | 1481.9 ms | 411.2 ms | 2812.3 ms | 2518.9 ms | -10.4% | 0% -> 0% |

50 CCU 修改后有一个约 8.8 秒的尾部请求，使测试档实际完成时间延长至 35.5 秒，RPS 因此不能单独解释为容量下降。两轮公共路径均存在缓存状态和网络抖动，且并不直接命中 W1 的登录态热点，不能把 100 CCU 的改善全部归因于 W1。

HTTP 200 不能代表数据库无错误：修改前服务端已反复出现 `P2024`；修改后日志精确记录 69 次，均来自匿名首页热门聚吧缓存重算。当前页面 fallback 掩盖了这些连接池超时，因此 W0 容量门禁仍判定为未通过。

## 4. W1 实施结果

### Presence

- 生产路径从“完整 Profile 读取、`finalizeUserProfile`、更新”改为 Clerk `userId` 对 `clerkUserId + ACTIVE` 的一次 `updateMany`。
- `count=0` 继续返回 401；online/offline 响应和 90 秒客户端节奏不变。
- Presence 不再触发 guest participation link。

### Analytics

- 浏览器端按 1.5 秒窗口聚合，单批最多 20 条；隐藏页面或 `pagehide` 使用 best-effort beacon flush。
- API 兼容原单事件格式，并支持最多 25 条批量写入；同批只解析一次用户身份，使用一次 `createMany`。
- `page_load_timed` 和 `operation_latency_recorded` 在 Vercel Preview 默认按 10% 采样，Production 默认 100%，可通过 `ANALYTICS_SAMPLE_RATE` 显式调整。列表与滑动曝光已列为可采样事件，但在 Dashboard 完成加权前运行时固定保留 100%，避免发现漏斗失真。
- 服务端队列默认普通深度 250、重要事件保留 100 个额外槽位，达到硬上限或发生 `P2024` 时丢弃 Analytics，不阻断业务操作。

### Profile

- 狼人杀统计由加载全部历史记录改为数据库 `groupBy(isJudge, result)`，返回行数固定。
- 关注总数改为单条固定大小聚合 SQL，三类预览列表分别保持 `take=12`，不再为计数把全部关注边加载到 Node.js。
- 当前 Preview 数据库 36 个 Profile 的新旧关注分类总数全量比对，mismatch 为 0。
- 提供 `PROFILE_AGGREGATE_SHADOW_COMPARE=1` 和 `PROFILE_FOLLOW_NETWORK_SHADOW_COMPARE=1`，供真实 Vercel Preview 灰度期继续核对旧算法。

### 索引审计

| 查询 | 当前数据量 | 执行结果 | 决策 |
| ---- | ---------: | -------- | ---- |
| 游客邮箱/手机/微信关联 | 112 行 | 顺序扫描，约 2.87 ms | 暂不新增手机号索引 |
| 群聊增量 | 41 行 | 使用 `activityId, createdAt` 索引，约 3.58 ms | 保留现有索引 |
| 私聊未读 | 61 行 | 使用会话未读索引，约 1.30 ms | 保留现有索引 |
| 通知未读 | 108 行 | 使用 recipient/readAt 索引，约 3.03 ms | 保留现有索引 |
| 关注网络 | 34 行 | 当前顺序扫描约 3.18 ms | 数据量不足以证明新索引收益 |
| 最新游戏事件 | 214 行 | 使用 roomId/createdAt 索引，约 3.46 ms | 保留现有索引 |

没有执行 Prisma migration。当前数据规模和执行计划不足以证明新增索引的读取收益能覆盖写放大。

## 5. 正确性与构建

- `npm test --workspace=apps/web`：207/207 通过。
- `npm run typecheck --workspace=apps/web`：通过。
- `npm run build --workspace=apps/web`：通过；仅保留项目原有 `<img>` 和 Hook lint warning。
- Analytics 批量 API 冒烟：单请求接收 2 条并写入 2 条，验证数据随后按专用 session ID 清理。
- 公共 Profile 生产构建冒烟：HTTP 200。
- 匿名 Presence：继续返回 HTTP 401。

## 6. 灰度与回滚

| 项目 | 当前值 |
| ---- | ------ |
| 部署环境 | 未部署，仅本机生产构建 + Preview DB |
| 灰度比例 | 0% |
| 回滚动作 | 未触发；没有远端版本需要回滚 |
| p95 回滚条件 | 本地对照未触发 `>20%` |
| 阻塞条件 | 缺少 Friemi Vercel Preview 项目权限；50/100 CCU 仍有连接池排队，修改后记录 69 次 `P2024` |

取得 Preview 项目权限后，使用同一 commit、脚本和数据库数据量部署，开启两个 Profile shadow flag，按“内部账号 -> 5% -> 25% -> 100%”逐档验证。W1 远端验收前不得开始 W2。
