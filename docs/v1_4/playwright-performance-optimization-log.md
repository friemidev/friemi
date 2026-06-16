# Playwright 性能优化记录

本文记录本轮围绕 Playwright 监管和 Preview 性能观察所做的优化。表格里的耗时来自本对话中的 Playwright report、Playwright Trace、Vercel Logs 和本地验证结果。

## 结论摘要

- Playwright 已能稳定覆盖公开页、移动端关键页和健康接口。
- `/search?q=paris` 的慢点已确认在 Vercel Function 服务端执行；首轮优化后 Preview 明显改善，第二轮日志确认主要瓶颈是精确 `count` 查询。
- `/activities` 的慢点同样主要在 SSR 数据查询，不是 JS/CSS/图片资源；已完成本地第一轮优化，仍需 Preview 复测。

## 优化记录表

| 阶段 | Commit | 优化目标 | 优化前现象 | 改动内容 | 优化后结果 | 验证方式 | 状态 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 登录态首屏性能 | `c24f098` `feature/preview-auth-performance` | 降低登录后页面公共阻塞 | Preview 登录后页面偶发超过 10s；全局 layout、通知 badge、首页、搜索、组队大厅存在首屏串行或非首屏数据阻塞 | layout 并行读取 i18n 和 viewer state；合并 profile/admin 查询；通知 badge 延迟首屏刷新；首页公共数据和用户态装饰拆分；搜索 primary results 并行；组队大厅非默认分区按需加载 | 本地日志显示 layout 可并行完成，`/lobby` warm 约 0.99s；`/home`、`/search` 有明确分段日志可观测 | `npm run typecheck`、`npm run test`、本地 curl、dev `[perf]` 日志 | 已合并到 `dev` |
| Playwright 监管接入 | `b484a0d` `feature/playwright-site-monitoring` | 建立 Preview/线上自动化监管能力 | 只能手动观察页面和 Vercel Logs，缺少自动发现白屏、Application error、移动端异常的机制 | 新增 Playwright 配置、公开页 smoke、移动端 smoke、健康接口、可选登录态测试、GitHub Actions 定时监管、报告教程 | 可生成 HTML report；完整监管能给出每页耗时和 trace；后续性能优化有统一测量方式 | `PLAYWRIGHT_MONITOR_BASE_URL=... npm run monitor:site --workspace=apps/web` | 已合并到 `dev` |
| Playwright 误报收敛 | `5ac7d82` `playwright improve` | 降低监管误报，确认真实慢点 | 初次 Preview report 中公开页失败 7 个，原因是 Next.js 预取受保护页面 `/profile`、`/activities/new` 时出现 `Failed to fetch RSC payload ... Falling back to browser navigation`；页面本身正常 | 只忽略 Next RSC prefetch fallback 这一类特定 console error；保留 `Application error`、`pageerror`、`ReferenceError`、`TypeError`、`Hydration failed`、`ChunkLoadError` 拦截；降低默认并发并补文档 | 同一 Preview 重新跑通过：`8 passed / 14 skipped`；误报消失 | Playwright Preview run、HTML report、Trace console | 已合并到 `dev` |
| 搜索页首屏性能 | `5ac7d82` `playwright improve` | 优化 `/zh-CN/search?q=paris` | Playwright report：desktop search 约 7.0s，mobile search 约 7.6s；Trace Network 显示最终 `GET /zh-CN/search?q=paris` HTML 响应约 6.8s；Vercel Function `/[locale]/search` execution 约 6.45s | 移除综合搜索里未展示的 activities/publicEvents 列表查询和 favorite 装饰；主活动查询返回 activity/publicEvent count，避免重复 count；首屏主活动结果从 18 条降到 10 条；增加 `search.summary`、`search.mainActivityResults` 分段日志 | 新 Preview：desktop search 5.6s，mobile search 5.8s；约快 1.4s 到 1.8s | `PLAYWRIGHT_MONITOR_WORKERS=1 ... -- --grep search`；Vercel Logs；Playwright report | 已合并到 `dev` |
| 搜索页 count 去阻塞 | 待提交 `feature/playwright-performance-up-v1.1` | 继续优化 `/zh-CN/search?q=paris` SSR 首屏 | Vercel Logs：`search.mainActivityResults total=4707ms`，其中 `publicEvent.count:4706ms`、`activity.list:4356ms`、`publicEvent.list:3722ms`、`activity.count:3370ms`；`search.summary total=3018ms`，其中 `hiddenEnded.publicEvent.count:3018ms`、`hiddenEnded.activity.count:2667ms`、`merchant.count:2313ms`、`user.list:1956ms` | 首屏搜索不再等待精确 activity/publicEvent/user/merchant/hidden-ended count；改用 `limit + 1` probe 判断是否还有更多；related 初始加载改为基于 `hasMore`，避免主结果还有下一页时额外查询 related | 本地验证：typecheck 和单元测试通过；本地 Playwright search 通过，mobile search 2.4s。真实收益待 Preview 部署后用 `[perf-action]` 复测 | `npm run typecheck --workspace=apps/web`、`npm run test --workspace=apps/web`、`PLAYWRIGHT_MONITOR_WORKERS=1 npm run monitor:site --workspace=apps/web -- --grep search` | 本地完成，待 Preview 复测 |
| 活动页首屏性能 | `903dcb8` `feature/playwright-performance-up-v1.1 step1` | 优化 `/zh-CN/activities` 移动端首屏 | Playwright report：mobile activities 约 5.7s；Trace Network 显示最终 `GET /zh-CN/activities` 约 4.4s；JS/CSS/图片多为几十 ms，说明慢点在 SSR 数据查询 | 尝试 `publicInfoOnly + recommended + 无筛选 + 第 1 页` 候选池排序，并增加 `activities.publicInfoList` 分段日志 | Preview 复测反而变慢：desktop activities 6.5s，mobile activities 9.3s；判断候选池/fallback 在真实数据下增加了额外查询或排序成本 | Playwright Preview report | 候选池策略撤回，保留分段日志继续观测 |

## 页面级前后对比

| 页面 | 优化前 Playwright/Trace 观察 | 优化后观察 | 当前判断 | 下一步 |
| --- | --- | --- | --- | --- |
| `/zh-CN/search?q=paris` desktop | 约 7.0s；第一轮后约 5.5s 到 6.5s | 第二轮本地已移除阻塞 count，Preview 待测 | 第一轮有效；第二轮针对日志里最慢的 `count` 查询 | 部署 Preview 后看 `search.mainActivityResults` 是否从约 4.7s 下降 |
| `/zh-CN/search?q=paris` mobile | 约 7.6s；第一轮后约 5.8s 到 6.4s | 第二轮本地 Playwright mobile search 2.4s | 移动端本地监控正常，真实环境待 Preview 复测 | 部署 Preview 后看 mobile search report 和 Vercel `[perf-action]` |
| `/zh-CN/activities` desktop | 约 4.0s 到 4.5s | 候选池版本 6.5s | 候选池优化在 Preview 真实环境里回退 | 撤回候选池，保留 `[perf-action] action=activities.publicInfoList` 后重新测 |
| `/zh-CN/activities` mobile | 约 5.7s 到 6.6s | 候选池版本 9.3s | 候选池优化在移动端 Preview 更慢 | 撤回候选池，下一轮只根据分段日志优化 count/list/viewerState |
| `/zh-CN/lobby` mobile | 约 6.1s，部分 report 中约 3.6s 到 4.3s | 组队大厅首屏已改为非默认分区按需加载 | 当前不是最高优先级 | 如果仍慢，查看 `lobby.preview` 或 `lobby.initialData` |
| `/zh-CN/home` desktop | 约 2.6s 到 2.7s | 当前可接受 | 暂不优先 | 继续观察 |
| `/api/health` | 约 12ms 到 619ms，受冷启动/区域影响 | 正常通过 | 健康接口可用 | 仅做基础存活检查 |

## 提交与性能提升映射

| Commit | 主要提升点 | 对应文件 | 可观察指标 |
| --- | --- | --- | --- |
| `c24f098` | 全站登录态公共耗时、首页、搜索、组队大厅首屏阻塞 | `layout.tsx`、`auth.ts`、`NotificationBadgeProvider.tsx`、`home/page.tsx`、`search/page.tsx`、`getActivityLobby.ts` | `[perf] route=/[locale]/layout`、`[perf] route=/home`、`[perf] route=/search`、`[perf] route=/lobby` |
| `b484a0d` | 建立自动化监控和报告，不直接提升页面速度，但让性能问题可重复测量 | `playwright.monitoring.config.ts`、`apps/web/e2e/monitoring/*`、`.github/workflows/site-monitoring.yml` | Playwright HTML report、Trace Network、GitHub Actions artifact |
| `5ac7d82` | 搜索页 SSR 查询减少重复工作；监管误报减少 | `getGlobalSearchResults.ts`、`search/page.tsx`、`monitoringAssertions.ts` | `/search` desktop 7.0s -> 5.6s；mobile 7.6s -> 5.8s |
| 待提交 | 搜索页首屏去掉精确 count 阻塞，改用 `limit + 1` probe 判断更多结果 | `getGlobalSearchResults.ts`、`search/page.tsx` | Vercel 日志中的 `publicEvent.count`、`activity.count`、`hiddenEnded.*.count` 不再阻塞首屏；Preview 待复测 |
| `903dcb8` | 活动页候选池优化尝试；增加活动列表查询分段日志 | `getActivities.ts` | Preview 变慢，候选池策略撤回；保留 `[perf-action] action=activities.publicInfoList` 作为下一轮诊断依据 |

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

## 注意

- 本地 Playwright 用于快速判断“改动是否安全”和“是否明显回归”。
- Preview Playwright 才能判断真实用户环境是否变快，因为它包含 Vercel Function、数据库网络、Clerk、CDN 和构建产物等因素。
- 表中 `903dcb8` 的活动页候选池优化已经由 Preview 证明不适合当前真实数据分布，处理方式是撤回策略、保留分段日志，再依据真实 `activity.count`、`publicEvent.count`、`activity.list`、`publicEvent.list`、`viewerState` 继续优化。
