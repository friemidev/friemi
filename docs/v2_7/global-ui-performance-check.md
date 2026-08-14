# Friemi v2.7 全局三项检测报告

日期：2026-08-11

分支：`dev`

检测范围：

- 背景底色与阴影：`apps/web/app`、`apps/web/components`、`apps/web/features`
- 字体、字号、排布：`apps/web/app/globals.css`、`apps/web/tailwind.config.ts` 与页面组件
- APP 操作速度与用户容量：动态页面、轮询刷新、服务端查询、构建体积

## 结论总览

| 检测项 | 当前结论 | 是否可验收 |
| --- | --- | --- |
| 页面背景底色 / 阴影全局检查 | 页面壳和 body 已强制白色，Tailwind shadow/drop-shadow 已被全局清零；源码中仍有大量非白功能色块和弹窗遮罩，需要按功能用途保留或继续清理 | 部分通过 |
| 字体 / 字号 / 排布全局检查 | 字体接入、字体 token、Tailwind `font-sans`、字重清理已完成；仍存在大量页面级局部字号和小字，需要移动端截图验收 | 部分通过 |
| APP 操作速度 / 用户容量检查 | 构建通过，已有性能埋点；但动态页面、轮询、`router.refresh()` 和疑似无分页查询较多，不能认定容量已充分验证 | 未通过容量验收 |

## 1. 背景底色与阴影检测

### 已落实

- `html`、`body` 已设置 `background: #ffffff`。
- `.app-layout-shell`、`.app-mobile-page-shell`、`.auth-page-shell`、`.route-loading-shell` 已被全局压成白色背景。
- 全局规则已将 Tailwind `shadow*` / `drop-shadow*` 的变量清零。
- `.app-orientation-lock`、`.friemi-shimmer` 等旧渐变和阴影也有全局覆盖。

关键位置：

- `apps/web/app/globals.css:181`
- `apps/web/app/globals.css:1607`
- `apps/web/app/globals.css:1647`

### 静态扫描结果

- 非白背景 / 阴影 / 渐变相关源码命中：`2255`
- 其中阴影相关命中：`1007`
- 其中非白背景相关命中：`1647`
- 当前 App 页面文件数：`76`

命中最多的文件：

- `apps/web/features/game-tools/components/AvalonRoomLobby.tsx`
- `apps/web/features/game-tools/components/AvalonPrivateRoleCard.tsx`
- `apps/web/features/profile/components/ProfilePrivateSubpages.tsx`
- `apps/web/features/moments/components/FootprintsMobilePage.tsx`
- `apps/web/features/activities/components/ActivityCard.tsx`
- `apps/web/features/game-tools/components/WerewolfPrivateSeatCard.tsx`
- `apps/web/features/game-tools/components/WerewolfRoomOverview.tsx`
- `apps/web/features/activity-room-chat/components/ActivityRoomChatPage.tsx`

### 判断

页面级底色和旧阴影已经有全局兜底，可以满足“页面背景白、不要旧阴影”的基础要求。

但如果验收标准是“所有组件、卡片、按钮、标签、游戏界面、弹窗遮罩也全部白色”，当前还没有完全实现。源码中大量非白背景是功能状态色、品牌按钮、游戏阵营色、标签色、遮罩色，不应直接全局抹掉，否则会影响状态表达。

### 下一步建议

- 先确认验收口径：页面底色全白，还是所有 UI 容器也全白。
- 如果要求更严格，应分批处理：
  - P0：页面 shell、列表页、profile、search、messages 的背景和普通卡片。
  - P1：活动卡片、通知、商城、弹窗。
  - P2：狼人杀 / Avalon 游戏工具的特殊背景，保留必要阵营色。

## 2. 字体、字号、排布检测

### 已落实

- 已接入 `Friemi Latin` 和 `Friemi CJK` WOFF2。
- `body` 使用 `var(--font-sans)`。
- Tailwind `font-sans` 已映射到 `var(--font-sans)`。
- 已有字体 token：Display、Title、Body、Caption、Overline。
- TS/TSX 中 `font-black`、`font-extrabold`、`font-mono` 已清零。
- `tabular-nums` 已收敛到 `.friemi-tabular`。
- 剩余 `tracking-[...]` 基本集中在房号、好友号、二维码 code 等编码场景。

### 静态扫描结果

- `font-black` / `font-extrabold` / `font-mono`：`0`
- `.woff2` 首屏字体资源：
  - Latin：`47,852 B`
  - CJK Regular：`172,564 B`
  - CJK Medium：`173,888 B`
  - CJK Bold：`174,480 B`
- `text-[...]` 任意文本类命中：`1946`，主要包含任意颜色和少量任意字号。
- `text-xs` / `text-[8-11px]` 小字命中：`953`
- `font-medium` / `font-semibold` / `font-bold` 命中：`2033`

小字命中较多的文件：

- `apps/web/features/profile/components/ProfilePrivateSubpages.tsx`
- `apps/web/features/profile/components/ProfileDashboardView.tsx`
- `apps/web/features/game-tools/components/AvalonRoomLobby.tsx`
- `apps/web/features/friends/components/FriendsDashboard.tsx`
- `apps/web/features/activities/pages/ActivityDetailPageContent.tsx`
- `apps/web/features/activity-room-chat/components/ActivityRoomChatPage.tsx`

### 判断

字体基础设施已经落实，技术上可以认为“全局字体已切换”。但“字体全部调整，包括大小排布”还不能只靠静态扫描打满，因为大量页面仍有局部字号、局部行高和小字。它们可能合理，也可能在 320px 宽度下过小或拥挤，需要移动端截图逐页验收。

### 下一步建议

- 按 `docs/v2_7/manual-page-test-plan.md` 对高频页面做 320px、393px、430px、desktop 截图。
- 优先复核：
  - `/mobile-home`
  - `/activities`
  - `/activities/new`
  - `/profile`
  - `/profile/shop`
  - `/profile/achievements`
  - `/search`
  - `/messages`
  - `/notifications`
  - `/game-tools/werewolf`
  - 狼人杀房间 / seat / screen

## 3. APP 操作速度与用户容量检测

### 已通过验证

- `npm run typecheck --workspace=apps/web`：通过
- `npm test --workspace=apps/web`：通过，`188` 个测试全部通过
- `npm run build --workspace=apps/web`：通过

构建 warning：

- `app/[locale]/activities/[activityId]/edit/page.tsx` 有一个未使用变量 `t`。
- 狼人杀卡片预览和 share route 仍有 `<img>` 性能提示。
- `components/navigation/IntentPrefetchLink.tsx` 有一个 `useEffect` dependency warning。

### 静态性能扫描结果

- App 页面数：`76`
- `force-dynamic` 页面数：`41`
- `force-dynamic` 文件命中：`71`，包含页面和 API routes
- `setInterval`：`13` 处，分布在 `10` 个文件
- `router.refresh()`：`42` 处，分布在 `24` 个文件
- `no-store`：`21` 处，分布在 `12` 个文件
- 疑似 `findMany` 附近没有 `take` 的查询：`66` 处

构建首载 JS 体积较高的页面：

- `/[locale]/profile`：`247 kB`
- `/[locale]/profile/[profileId]`：`246 kB`
- `/[locale]/activities/[activityId]`：`242 kB`
- `/[locale]/lobby/[activityId]`：`242 kB`
- `/[locale]/mobile-home`：`227 kB`
- `/[locale]/lobby`：`225 kB`
- `/[locale]/activities`：`209 kB`
- `/[locale]/search`：`206 kB`

高风险热点：

- 群聊：`ActivityRoomChatPage.tsx` 有 9 个 `router.refresh()`，多人同时操作时容易触发整页刷新。
- 狼人杀：`WerewolfRoomOverview.tsx` 有轮询和 `no-store` sync，人数多时请求密度会放大。
- 活动列表：`getActivities.ts` 查询复杂度最高，命中 `40` 个查询 / 聚合相关点。
- 活动首页：`getActivityLobby.ts` 命中 `35` 个查询 / 聚合相关点。
- Profile：`getProfileDashboard.ts` 命中 `28` 个查询 / 聚合相关点。
- 搜索：`getGlobalSearchResults.ts` 命中 `14` 个查询 / 聚合相关点。

### 判断

当前只能确认“项目可构建、基础测试通过、已有性能埋点”，不能确认“APP 操作速度和用户容量已经达标”。主要原因是还没有真实压测或预览环境指标，且代码层仍有明显会随用户数放大的模式。

### 下一步建议

- 增加预览环境压测：
  - 20 / 50 / 100 并发用户打开 `/mobile-home`、`/activities`、`/profile`、`/messages`。
  - 狼人杀单房间 12 人、20 人，10 个房间并发 sync。
  - 群聊 20 人同时发送消息、打开管理弹窗、退出返回。
- 加监控指标：
  - 路由 TTFB P50 / P95 / P99。
  - API latency P50 / P95 / P99。
  - Prisma query duration P95。
  - DB connection pool 使用率。
  - Vercel/Node memory 和 CPU。
- 优先优化：
  - 降低 `router.refresh()` 整页刷新，改为局部 optimistic state 或局部 fetch。
  - 对所有列表型 `findMany` 明确 `take` / cursor。
  - 将高频未读数、presence、房间 sync 合并请求或退避轮询。
  - 对活动、profile、search 的稳定数据拆 cache，减少 `force-dynamic` 范围。

## 验收状态

- [x] 技术验证：typecheck / test / build 通过。
- [x] 字体基础设施：全局字体、Tailwind 字体族、WOFF2 子集已接入。
- [x] 背景基础设施：页面壳白底、全局阴影清零已接入。
- [ ] 背景视觉验收：所有目标页面截图确认没有灰底、旧阴影、异常渐变。
- [ ] 字体视觉验收：所有目标页面截图确认字号、行高、换行、按钮文本不挤压。
- [ ] 性能容量验收：预览环境完成并发压测并记录 P95 / P99、DB 连接、CPU、内存。
