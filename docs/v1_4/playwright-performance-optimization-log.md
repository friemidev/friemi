# Playwright 性能优化记录

本文记录本轮围绕 Playwright 监管和 Preview 性能观察所做的优化。表格里的耗时来自本对话中的 Playwright report、Playwright Trace、Vercel Logs 和本地验证结果。

## 结论摘要

- Playwright 已能稳定覆盖公开页、移动端关键页和健康接口。
- `/search?q=paris` 的慢点已确认在 Vercel Function 服务端执行；首轮优化后 Preview 明显改善，第二轮日志确认主要瓶颈是精确 `count` 查询。
- `/activities` 的慢点同样主要在 SSR 数据查询，不是 JS/CSS/图片资源；候选池策略已撤回，移除公开活动列表首屏精确 count 后 Preview 复测明显改善。
- `/home` 桌面首页已改为首页专用未开始活动预览，避免只展示 4 个和不必要的用户态卡片装饰；首次 Preview 仍显示 `home.activities` 波动，已继续改为轻量 select。
- `/lobby` 登录态首屏再次确认不应等待收藏和好友相关分区；已改为只取首屏必要分区，其余筛选点开后按需加载。
- analytics 写入曾因数据库连接池 `connection limit: 1` 报 `P2024`；已改为串行后台队列并对连接池忙做降级处理。

## 优化记录表

| 阶段 | Commit | 优化目标 | 优化前现象 | 改动内容 | 优化后结果 | 验证方式 | 状态 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 登录态首屏性能 | `c24f098` `feature/preview-auth-performance` | 降低登录后页面公共阻塞 | Preview 登录后页面偶发超过 10s；全局 layout、通知 badge、首页、搜索、组队大厅存在首屏串行或非首屏数据阻塞 | layout 并行读取 i18n 和 viewer state；合并 profile/admin 查询；通知 badge 延迟首屏刷新；首页公共数据和用户态装饰拆分；搜索 primary results 并行；组队大厅非默认分区按需加载 | 本地日志显示 layout 可并行完成，`/lobby` warm 约 0.99s；`/home`、`/search` 有明确分段日志可观测 | `npm run typecheck`、`npm run test`、本地 curl、dev `[perf]` 日志 | 已合并到 `dev` |
| Playwright 监管接入 | `b484a0d` `feature/playwright-site-monitoring` | 建立 Preview/线上自动化监管能力 | 只能手动观察页面和 Vercel Logs，缺少自动发现白屏、Application error、移动端异常的机制 | 新增 Playwright 配置、公开页 smoke、移动端 smoke、健康接口、可选登录态测试、GitHub Actions 定时监管、报告教程 | 可生成 HTML report；完整监管能给出每页耗时和 trace；后续性能优化有统一测量方式 | `PLAYWRIGHT_MONITOR_BASE_URL=... npm run monitor:site --workspace=apps/web` | 已合并到 `dev` |
| Playwright 误报收敛 | `5ac7d82` `playwright improve` | 降低监管误报，确认真实慢点 | 初次 Preview report 中公开页失败 7 个，原因是 Next.js 预取受保护页面 `/profile`、`/activities/new` 时出现 `Failed to fetch RSC payload ... Falling back to browser navigation`；页面本身正常 | 只忽略 Next RSC prefetch fallback 这一类特定 console error；保留 `Application error`、`pageerror`、`ReferenceError`、`TypeError`、`Hydration failed`、`ChunkLoadError` 拦截；降低默认并发并补文档 | 同一 Preview 重新跑通过：`8 passed / 14 skipped`；误报消失 | Playwright Preview run、HTML report、Trace console | 已合并到 `dev` |
| 搜索页首屏性能 | `5ac7d82` `playwright improve` | 优化 `/zh-CN/search?q=paris` | Playwright report：desktop search 约 7.0s，mobile search 约 7.6s；Trace Network 显示最终 `GET /zh-CN/search?q=paris` HTML 响应约 6.8s；Vercel Function `/[locale]/search` execution 约 6.45s | 移除综合搜索里未展示的 activities/publicEvents 列表查询和 favorite 装饰；主活动查询返回 activity/publicEvent count，避免重复 count；首屏主活动结果从 18 条降到 10 条；增加 `search.summary`、`search.mainActivityResults` 分段日志 | 新 Preview：desktop search 5.6s，mobile search 5.8s；约快 1.4s 到 1.8s | `PLAYWRIGHT_MONITOR_WORKERS=1 ... -- --grep search`；Vercel Logs；Playwright report | 已合并到 `dev` |
| 搜索页 count 去阻塞 | 待提交 `feature/playwright-performance-up-v1.1` | 继续优化 `/zh-CN/search?q=paris` SSR 首屏 | Vercel Logs：`search.mainActivityResults total=4707ms`，其中 `publicEvent.count:4706ms`、`activity.list:4356ms`、`publicEvent.list:3722ms`、`activity.count:3370ms`；`search.summary total=3018ms`，其中 `hiddenEnded.publicEvent.count:3018ms`、`hiddenEnded.activity.count:2667ms`、`merchant.count:2313ms`、`user.list:1956ms` | 首屏搜索不再等待精确 activity/publicEvent/user/merchant/hidden-ended count；改用 `limit + 1` probe 判断是否还有更多；related 初始加载改为基于 `hasMore`，避免主结果还有下一页时额外查询 related | Preview 复测通过：desktop search 3.3s，mobile search 3.3s；较最初 desktop 约 7.0s、mobile 约 7.6s 明显改善 | `npm run typecheck --workspace=apps/web`、`npm run test --workspace=apps/web`、Preview Playwright report 2026-06-16 11:13:38 | Preview 验证通过 |
| 活动页首屏性能 | `903dcb8` `feature/playwright-performance-up-v1.1 step1` | 优化 `/zh-CN/activities` 移动端首屏 | Playwright report：mobile activities 约 5.7s；Trace Network 显示最终 `GET /zh-CN/activities` 约 4.4s；JS/CSS/图片多为几十 ms，说明慢点在 SSR 数据查询 | 尝试 `publicInfoOnly + recommended + 无筛选 + 第 1 页` 候选池排序，并增加 `activities.publicInfoList` 分段日志 | Preview 复测反而变慢：desktop activities 6.5s，mobile activities 9.3s；判断候选池/fallback 在真实数据下增加了额外查询或排序成本 | Playwright Preview report | 候选池策略撤回，保留分段日志继续观测 |
| 活动页 count 去阻塞 | 待提交 `feature/playwright-performance-up-v1.1` | 优化 `/zh-CN/activities` 首屏 SSR | Vercel Logs：`activities.publicInfoList total=6484ms`，其中 `activity.count:2205ms`、`publicEvent.count:2557ms`、`publicEvent.list:3560ms`、`activity.list:3919ms` | 公开活动列表不再等待精确 `activity.count/publicEvent.count`；直接基于取回候选结果推导 `totalCount/totalPages`；保留 recommended 全量排序，避免再次引入候选池回归 | Preview 复测通过：desktop activities 3.3s，mobile activities 2.7s；较回归版本 desktop 6.5s、mobile 9.3s 明显恢复 | `npm run typecheck --workspace=apps/web`、`npm run test --workspace=apps/web`、Preview Playwright report 2026-06-16 11:13:38 | Preview 验证通过 |
| 非核心日志降级 | 待提交 `feature/playwright-performance-up-v1.1` | 避免 analytics 和 API 鉴权噪声影响性能判断 | Vercel Logs 出现 `Failed to track analytics event P2024`，数据库连接池 `connection limit: 1`；`/api/search/activity-results` 出现 Clerk middleware 未覆盖错误 | analytics 写入改为串行后台队列，连接池忙时降级为 warn；middleware 加入 `/api/search/:path*`，让搜索分页 API 可安全读取游客/用户状态 | Preview Playwright 全量公开/移动监管通过：8 passed、0 failed、14 skipped；仍需在 Vercel Logs 里确认 P2024 和 Clerk middleware error 是否消失 | Preview Playwright report 2026-06-16 11:13:38 | Playwright 通过，日志待复核 |
| 首页未开始活动预览 | 待提交 `feature/playwright-performance-up-v1.1` | 优化桌面 `/fr/home` 首页速度和活动数量 | 桌面首页体感慢；活动预览只展示 4 个；用户期望展示更多未开始活动；该页面主要面向网页端 | 新增首页专用 `getUpcomingHomeActivities` 查询，只展示 `startAt > now` 的未开始活动/组局；展示数量从 4 提高到 8；移除首页卡片首屏收藏/参与状态装饰，隐藏收藏按钮；loading skeleton 同步到 8 个；中英法文案改为“即将开始/未开始” | Preview 复测：desktop home 4.5s；Vercel Logs 显示 `home.activities` 仍有 1.976s 到 10.32s 波动，说明查询仍偏重 | 本地验证、Preview Playwright report 2026-06-16 11:38:49、Vercel Logs `[perf] route=/home` | Preview 后继续优化 |
| 首页轻量 select | 待提交 `feature/playwright-performance-up-v1.1` | 继续压缩 `/home` 的 `home.activities` | Vercel Logs：`activityCount=7 previewLimit=8`，但 `home.activities` 仍出现 3063ms、4281ms、9275ms、9676ms、10217ms、10320ms，说明不是展示数量问题，而是首页查询 select/count 偏重 | 首页预览查询改用轻量 select；不再查询参与者头像、收藏数、公开活动 team count；activity 表只取 legacy public activity info，避免普通组局参与者/count 进入首页；返回纯公开活动卡片数据 | Preview 复测通过：desktop home 2.1s；Vercel Logs 显示近期 `/home` 多数在 0.929s 到 3.171s，`/fr/home` 约 1.613s 到 2.351s，未再出现 9-10s 波动 | `npm run typecheck --workspace=apps/web`、`npm run test --workspace=apps/web`、Preview Playwright report 2026-06-16 11:51:18、Vercel Logs `[perf] route=/home` | Preview 验证通过 |
| 登录态组队大厅首屏按需加载 | 待提交 `feature/playwright-performance-up-v1.1` | 解决登录后首次进入 `/lobby` 偶发 10s+ loading | 用户反馈：登录后切到组队大厅加载超过 10 秒，随后切活动页和主页瞬间完成；后续 Preview logs 仍出现 `/fr/lobby total=18338ms`，且同一秒并发出现 `/fr/activities`、`/fr/profile`、`/fr/messages`、`/fr/activities/new`，说明还有导航层预取把重量页面一起拉起 | `/lobby` 登录态 SSR 从 `getActivityLobby()` 改为 `getActivityLobbyInitial()`；首屏只取默认大厅、开放局、我发起、我参加；我收藏、好友发起、好友参加通过 `deferredFilters` 和 `/api/lobby/section` 在用户点击对应筛选时加载；日志标签从 `lobby.fullData` 改为 `lobby.initialData`；导航层不再页面一加载就自动预取重路由，改为 `IntentPrefetchLink` 在 `hover/focus/touchstart` 时预取一次，移除 `MobileNav` 的无条件 `router.prefetch()`；新增 `IdleRoutePrefetcher`，登录态页面稳定后仅在空闲时预取一个最可能下一跳 | 本地验证通过：typecheck、32 个测试通过、lobby Playwright 2 passed；下一轮 Preview 需重点看是否不再出现“同一秒拉起多条重量路由”以及 `[perf] route=/lobby` 是否明显低于 18s，同时确认单路由 idle prefetch 能否把单页 6-7s 再压低 | `npm run typecheck --workspace=apps/web`、`npm run test --workspace=apps/web`、`PLAYWRIGHT_MONITOR_WORKERS=1 npm run monitor:site --workspace=apps/web -- --grep lobby`、Vercel Logs `deploymentId` 过滤、后续 Preview Playwright / 手动登录验证 | 本地完成，待 Preview 复测 |

## 最新 Playwright 复测记录

| 时间 | 环境 | 总耗时 | 结果 | health | desktop home | desktop activities | desktop lobby | desktop search | mobile lobby | mobile activities | mobile search |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-06-16 11:13:38 | Preview | 24.8s | 8 passed / 0 failed / 14 skipped | 762ms | 2.7s | 3.3s | 2.7s | 3.3s | 2.9s | 2.7s | 3.3s |
| 2026-06-16 11:38:49 | Preview | 32.5s | 8 passed / 0 failed / 14 skipped | 581ms | 4.5s | 2.8s | 6.6s | 3.3s | 5.7s | 2.6s | 3.4s |
| 2026-06-16 11:51:18 | Preview | 28.0s | 8 passed / 0 failed / 14 skipped | 610ms | 2.1s | 3.5s | 5.0s | 3.6s | 4.2s | 2.7s | 3.2s |
| 2026-06-16 本地 | Local dev | 34.9s | 8 passed / 0 failed / 14 skipped | 2.1s | 4.4s | 4.4s | 4.1s | 4.4s | 2.6s | 2.4s | 2.3s |

## 页面级前后对比

| 页面 | 优化前 Playwright/Trace 观察 | 优化后观察 | 当前判断 | 下一步 |
| --- | --- | --- | --- | --- |
| `/zh-CN/search?q=paris` desktop | 约 7.0s；第一轮后约 5.5s 到 6.5s | Preview 3.3s | count 去阻塞有效 | 继续观察 Vercel `search.mainActivityResults`，避免 `activity.list/publicEvent.list` 回升 |
| `/zh-CN/search?q=paris` mobile | 约 7.6s；第一轮后约 5.8s 到 6.4s | Preview 3.3s | 移动端明显改善 | 继续观察 |
| `/zh-CN/activities` desktop | 约 4.0s 到 4.5s；候选池版本 6.5s | Preview 3.3s | count 去阻塞有效，候选池回归已恢复 | 继续确认 Vercel `activities.publicInfoList` 不再有 `activity.count/publicEvent.count` |
| `/zh-CN/activities` mobile | 约 5.7s 到 6.6s；候选池版本 9.3s | Preview 2.7s | 移动端活动页明显改善 | 如果后续仍波动，再优化 `publicEvent.list/activity.list` 的 select 或索引 |
| `/zh-CN/lobby` mobile | 约 6.1s，部分 report 中约 3.6s 到 4.3s | Preview 2.9s | 已进入较流畅区间 | 继续观察 `lobby.preview` |
| 登录态 `/zh-CN/lobby` | 用户反馈登录后首次进入大厅偶发 10s+，随后其他页面瞬间完成；后续 Preview logs 实测 `/fr/lobby total=18338ms` | 本地已改为首屏 `lobby.initialData`，并把登录态常驻导航从激进自动预取改成意图预取和单路由 idle prefetch | 慢点不只是页面资源或大厅数据，还叠加了导航层并发预取 | 部署后在 Vercel Logs 搜 `[perf] route=/lobby`，确认 `lobby.initialData` 和同秒并发路由数量是否下降；再看意图预取和 idle prefetch 是否能降低下一跳等待 |
| `/zh-CN/home` desktop | Preview 约 2.6s 到 2.7s；用户反馈 `/fr/home` 桌面体感仍慢且只展示 4 个；第一版首页预览优化后仍出现 9-10s 波动 | 轻量 select 后 Preview desktop home 2.1s；Vercel `/home` 多数 0.929s 到 3.171s，`/fr/home` 1.613s 到 2.351s | 首页数量/未开始展示已完成；轻量 select 有效，9-10s 波动消失 | 继续观察 `[perf] route=/home`，确认 `activityCount=2` 是否符合当前未开始活动数据量 |
| `/api/health` | 约 12ms 到 762ms，受冷启动/区域影响 | Preview 762ms | 健康接口可用 | 仅做基础存活检查 |

## 提交与性能提升映射

| Commit | 主要提升点 | 对应文件 | 可观察指标 |
| --- | --- | --- | --- |
| `c24f098` | 全站登录态公共耗时、首页、搜索、组队大厅首屏阻塞 | `layout.tsx`、`auth.ts`、`NotificationBadgeProvider.tsx`、`home/page.tsx`、`search/page.tsx`、`getActivityLobby.ts` | `[perf] route=/[locale]/layout`、`[perf] route=/home`、`[perf] route=/search`、`[perf] route=/lobby` |
| `b484a0d` | 建立自动化监控和报告，不直接提升页面速度，但让性能问题可重复测量 | `playwright.monitoring.config.ts`、`apps/web/e2e/monitoring/*`、`.github/workflows/site-monitoring.yml` | Playwright HTML report、Trace Network、GitHub Actions artifact |
| `5ac7d82` | 搜索页 SSR 查询减少重复工作；监管误报减少 | `getGlobalSearchResults.ts`、`search/page.tsx`、`monitoringAssertions.ts` | `/search` desktop 7.0s -> 5.6s；mobile 7.6s -> 5.8s |
| 待提交 | 搜索页首屏去掉精确 count 阻塞，改用 `limit + 1` probe 判断更多结果 | `getGlobalSearchResults.ts`、`search/page.tsx` | Preview report：desktop search 3.3s，mobile search 3.3s |
| `903dcb8` | 活动页候选池优化尝试；增加活动列表查询分段日志 | `getActivities.ts` | Preview 变慢，候选池策略撤回；保留 `[perf-action] action=activities.publicInfoList` 作为下一轮诊断依据 |
| 待提交 | 活动页公开列表首屏去掉精确 count；analytics 串行写入；搜索 API middleware 覆盖 | `getActivities.ts`、`analytics/server.ts`、`middleware.ts` | Preview report：desktop activities 3.3s，mobile activities 2.7s；公开/移动监管 8 passed / 0 failed |
| 待提交 | 首页桌面预览只展示未开始活动，数量从 4 提高到 8，并移除首页卡片用户态装饰 | `home/page.tsx`、`home/loading.tsx`、`getActivities.ts`、`copy.ts` | Local dev report：desktop home 4.4s；完整监管 8 passed / 0 failed / 14 skipped；Preview 待测 |
| 待提交 | 首页预览改用轻量 select，去掉参与者头像、收藏数、公开活动 team count 等首屏不展示的数据 | `getActivities.ts` | Preview report：desktop home 2.1s；Vercel `/home` 多数 0.929s 到 3.171s，`/fr/home` 1.613s 到 2.351s |
| 待提交 | 登录态组队大厅首屏只加载 initial 分区，收藏和好友相关分区延迟到点击后请求；常驻导航改为意图预取；登录态页面稳定后只 idle 预取一个最可能下一跳 | `lobby/page.tsx`、`IntentPrefetchLink.tsx`、`IdleRoutePrefetcher.tsx`、`layout.tsx`、`DesktopNav.tsx`、`MobileNav.tsx`、`NotificationHeaderLink.tsx`、`AccountMenu.tsx`、`AppHeader.tsx` | 下一轮 Preview 应不再出现 `/fr/lobby total=18338ms` 且同秒并发拉起多条重量路由；用户 hover/touch 常用入口时可提前热身，页面空闲后也可低优先级热一个下一跳 |

## 后续验证命令

### 搜索页

```bash
PLAYWRIGHT_MONITOR_WORKERS=1 PLAYWRIGHT_MONITOR_MAX_LOAD_MS=15000 PLAYWRIGHT_MONITOR_BASE_URL=https://your-preview-url npm run monitor:site --workspace=apps/web -- --grep search
```

Vercel Logs 搜：

```text
[perf-action] action=search.mainActivityResults
```

### 活动页

```bash
PLAYWRIGHT_MONITOR_WORKERS=1 PLAYWRIGHT_MONITOR_MAX_LOAD_MS=15000 PLAYWRIGHT_MONITOR_BASE_URL=https://your-preview-url npm run monitor:site --workspace=apps/web -- --grep activities
```

Vercel Logs 搜：

```text
[perf-action] action=activities.publicInfoList
```

### 组队大厅

```bash
PLAYWRIGHT_MONITOR_WORKERS=1 PLAYWRIGHT_MONITOR_MAX_LOAD_MS=15000 PLAYWRIGHT_MONITOR_BASE_URL=https://your-preview-url npm run monitor:site --workspace=apps/web -- --grep lobby
```

Vercel Logs 搜：

```text
[perf] route=/lobby
lobby.initialData
```

## 注意

- 本地 Playwright 用于快速判断“改动是否安全”和“是否明显回归”。
- Preview Playwright 才能判断真实用户环境是否变快，因为它包含 Vercel Function、数据库网络、Clerk、CDN 和构建产物等因素。
- 表中 `903dcb8` 的活动页候选池优化已经由 Preview 证明不适合当前真实数据分布，处理方式是撤回策略、保留分段日志，再依据真实 `activity.count`、`publicEvent.count`、`activity.list`、`publicEvent.list`、`viewerState` 继续优化。
