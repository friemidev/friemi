# v2.4 移动端页面切换性能优化 Checklist

> 分支：`feature/v2-4-mobile-navigation-performance`
> 状态：P0 已完成；P1 在不改 UI / 不改框架边界内已完成可安全项；P2 已进入，继续只做缓存、资源优先级和监控类优化
> 背景：移动端切换页面有时等待 5 秒以上，尤其在底部导航、组局大厅、组局详情、足迹/消息之间切换时体验明显不达标。

## 1. 目标

- 移动端主导航切换更快完成，但不新增可见过渡层、不重做骨架屏、不改变任何 UI。
- 常用页面首屏可交互时间控制在 1.5s 以内，弱网下不超过 3s。
- 组局大厅、足迹、消息、组局详情不再因为非首屏数据阻塞整页渲染。
- 保留现有 SEO、权限、通知能力、页面结构和交互框架，只做内部性能优化。

## 1.1 硬约束：不改 UI / 不改框架

本轮优化不是移动端 UI 重做，所有 checklist 项必须遵守：

- 不改页面布局、视觉样式、卡片结构、按钮位置、导航结构、文案层级和动效表现。
- 不新增全局 loading、顶部进度条、过渡遮罩、底部导航反馈或新的 skeleton 视觉。
- 不替换路由框架、状态管理框架、数据请求框架，不引入 Service Worker 路由缓存。
- 不把服务端页面整体改成客户端页面。
- 可以做的范围：预取、缓存、查询拆分、查询顺序调整、非首屏数据延后、索引、日志和监控。
- 如果必须触及组件代码，要求最终截图级 UI 与当前一致，DOM 改动只服务于性能，不引入新交互。

## 2. 当前问题定位

### 2.1 全局 layout 是每次导航的阻塞点

位置：`apps/web/app/[locale]/layout.tsx`

当前 layout 每次进入 locale 路由都会等待：

- `getMessages()`
- `getOptionalLayoutViewerState()`

`getOptionalLayoutViewerState()` 内部会查 Clerk auth、数据库 profile、Clerk `currentUser()`、未读通知数。移动端每次路由切换都可能被这些远程调用挡住。

风险：

- Clerk `currentUser()` 是外部服务调用，慢时会拖垮所有页面。
- 未读数属于导航附属信息，不应阻塞主内容。
- layout 阻塞时，页面自己的 `loading.tsx` 也可能出现得不够及时。

### 2.2 大量页面 `force-dynamic`，无法吃到静态或缓存收益

涉及页面包括：

- `/mobile-home`
- `/lobby`
- `/lobby/[activityId]`
- `/footprints`
- `/messages`
- `/messages/[conversationId]`

现状是每次导航都重新跑服务端查询。对移动端常用路径来说，很多数据其实可以短缓存、分段加载或只在用户动作后加载。

### 2.3 底部导航预取力度不够

位置：

- `apps/web/components/navigation/MobileNav.tsx`
- `apps/web/components/navigation/IntentPrefetchLink.tsx`
- `apps/web/components/navigation/IdleRoutePrefetcher.tsx`

现状：

- `IntentPrefetchLink` 关闭了默认 `prefetch`，移动端主要靠 `touchstart` 瞬间预取，通常来不及。
- `IdleRoutePrefetcher` 登录后 4 秒才开始，只预取少量路径，且没有覆盖 `/footprints`、`/activities/new`、`/planets` 等底部导航核心入口。
- 详情页列表卡片是否预取不稳定，用户点卡片时很可能才开始请求 RSC payload。

### 2.4 组局大厅一次性查询太多

位置：

- `apps/web/app/[locale]/lobby/page.tsx`
- `apps/web/features/activities/queries/getActivityLobby.ts`

当前登录用户进入大厅会拿：

- 全部 feed
- 开放组局
- 我发起
- 我参与
- starter activities
- favorite / friend signal / participation 等装饰状态

移动端首屏其实只需要当前 tab 的少量卡片。现在为了桌面和多 tab 复用，一次性查询过多数据，容易让 `/lobby` 切换变慢。

### 2.5 足迹页面一次性加载三个 tab

位置：`apps/web/app/[locale]/footprints/page.tsx`

当前会并行加载：

- Moment feed
- 消息好友列表
- 个人主页 dashboard

用户进入足迹默认只看 Moment，但消息和主页数据也会阻塞初始响应。这个页面应该按 tab 懒加载。

### 2.6 组局详情页查询链条偏长

位置：`apps/web/features/activities/pages/ActivityDetailPageContent.tsx`

当前详情页主渲染前会同步等待：

- viewer profile
- viewer friend ids
- activity primary
- favorite state
- notification mark read
- viewer participation
- comments
- friend signal
- co-manager dashboard
- organizer pending participants
- analytics summary
- private share token

其中 comments、friend signal、analytics、pending participants、mark read 都不应该阻塞移动端首屏详情展示。

### 2.7 loading 不是本轮优化重点

已有 loading：

- `/lobby/loading.tsx`
- `/lobby/[activityId]/loading.tsx`
- `/messages/loading.tsx`

虽然部分页面 loading 覆盖不完整，但本轮不通过补 UI 解决等待感。后续只允许保留或复用现有 loading 行为，不新增可见样式。真正要解决的是数据、预取、缓存和服务端阻塞链路。

### 2.8 数据库索引需要按真实查询补齐

已有基础索引，但大厅和详情页常见查询还缺少更贴合条件的复合索引。

重点候选：

- `Activity(visibility, status, startAt, type)`
- `Activity(type, visibility, startAt)`
- `Activity(organizerId, status, startAt, type)`
- `ActivityParticipant(userProfileId, status, joinedAt)`
- `ActivityParticipant(activityId, status, joinedAt)`
- `Notification(recipientId, type, readAt, createdAt)`

是否新增需要先用生产或预览数据库 `EXPLAIN ANALYZE` 验证，避免盲目加索引。

## 3. P0 Checklist：先解决 5 秒等待感

- [x] 扩展 `IdleRoutePrefetcher`：登录后优先预取 `/mobile-home`、`/lobby`、`/activities/new`、`/footprints`、`/planets`。
- [x] 对底部导航启用更主动的移动端预取：页面稳定后预取全部底部 tab，保持底部导航视觉和交互完全不变。
- [x] 首页和大厅卡片使用 `IntentPrefetchLink` 或统一的 detail prefetch，用户滑到/看到卡片时预取详情页。
- [x] 将 layout 里的未读通知数读取移到后台刷新，不阻塞页面主渲染；红点和数字样式保持现状。
- [x] 减少 layout 对 Clerk `currentUser()` 的依赖：能从 `auth()` + DB profile 拿到的导航信息不要每次调 Clerk。
- [x] 在 `createPerformanceTracker` 已有数据基础上，增加客户端 route transition 耗时记录，区分“点击到请求开始”和“点击到页面可交互”。
- [x] 为关键 server query 加 step timing 日志，先定位真实慢点，再做拆分或缓存。

## 4. P1 Checklist：拆首屏与非首屏数据

> P1 复查结论：在“不改 UI / 不改框架”的边界内，已经完成可安全落地的 P1 项。下列仍未勾选的项目需要 Suspense 边界、tab 数据懒加载交互、分享弹窗数据按需请求或页面数据结构拆分，都会触及现有渲染边界；本分支暂不强行推进。

### 4.1 大厅

- [ ] 在现有 `getActivityLobby()` 返回结构兼容的前提下，减少移动端首屏实际查询的数量和字段。
- [ ] 保持同一个大厅页面和同一套卡片组件，不新增移动端专属页面框架。
- [ ] 避免移动端首屏执行桌面筛选区和非当前 tab 所需的重查询。
- [ ] `favoriteActivities`、`friendHostedActivities`、`friendJoinedActivities` 可以延后到对应 tab 首次需要时读取，但最终展示样式不变。
- [ ] 卡片 favorite state / friend signal 的补齐必须保持现有占位和视觉，不新增徽章、提示或加载态。
- [ ] 对大厅公共开放组局保留短缓存，登录用户只叠加自己的参与状态，列表排序和卡片 UI 不变。

### 4.2 足迹

- [ ] `FootprintsPage` 保持现有 tab 和页面结构，只减少首屏不需要的数据查询。
- [ ] Moment tab 首屏只加载动态 feed。
- [ ] 消息 tab 的好友消息列表在用户进入该 tab 时再读取，列表样式不变。
- [ ] 主页 tab 的 profile dashboard 在用户进入该 tab 时再读取，主页样式不变。
- [ ] tab 切换时保持现有 tab UI，不新增 skeleton；通过懒加载和缓存避免整页等待。

### 4.3 组局详情

- [ ] 首屏只阻塞 activity primary、viewer participation、必要权限判断。
- [ ] comments 从首屏 critical path 移出，但保留现有评论区位置、样式和交互。
- [ ] friend signal 从首屏 critical path 移出，但保留现有展示效果。
- [x] co-manager dashboard、pending participants、analytics summary 只在操作者区域需要时加载，不改变操作者区域 UI。
- [x] 复用 activity primary 查询里已判断出的 `viewerCanManage`，普通登录用户不再重复查询管理人面板。
- [x] `notification.updateMany` 标记已读放入 `after()`，不阻塞首屏。
- [x] 将 `activity.viewerData` / `activity.organizerData` 聚合埋点拆成 `viewerParticipation`、`comments`、`friendSignal`、`coManagerDashboard`、`pendingParticipants`、`analyticsSummary` 独立 step，便于定位慢点，页面输出不变。
- [ ] private share token 只在分享弹窗打开时生成或读取，分享弹窗 UI 不变。

### 4.4 消息

- [ ] `/messages` 首屏只加载最近会话列表，不同时拉完整好友 roster。
- [x] 移动端消息列表的已有会话条目进入视口后预取 `/messages/[conversationId]`，不改变列表样式和点击路径。
- [ ] 新建聊天 / 添加好友入口打开时再加载完整好友列表，入口和弹窗样式不变。
- [x] `/messages/[conversationId]` 主线程只加载当前会话；移动端保持现有无侧栏视图，只避免查询不可见侧栏数据。
- [ ] 消息详情页切换会话时只优化数据请求和预取，不新增 header skeleton 或可见过渡。

## 5. P2 Checklist：缓存、数据库和资源优化

- [x] 给移动端公共活动 / 公开组局入口使用短缓存：开放组局、首页公共推荐、匿名大厅预览均走 `unstable_cache`，登录态继续叠加 viewer state。
- [x] 对 `/mobile-home` 的公共推荐活动使用短缓存，避免每个用户重复查相同数据。
- [x] 对 `getMessages()` 结果完成复查：当前由 next-intl 按 locale/request 加载完整 JSON；拆分会改变 `NextIntlClientProvider` 数据边界，超出本轮“不改框架”范围，暂不改代码。
- [x] 为活动卡片图片补齐首屏 priority 策略；移动首页第一张大活动图使用 `eager/high`，不改变尺寸和布局。
- [x] 检查 `HomeLuxuryMotion` 等动效组件是否引入过重 JS；该组件只是轻量 IntersectionObserver，保持现状，避免分包反而延后初始化。
- [ ] 对候选数据库索引用 `EXPLAIN ANALYZE` 验证，再建立迁移。
- [ ] 建立慢查询日志：记录 route、step label、duration、viewer 状态、移动端 UA。
- [x] 消息详情页接入 server step timing，记录 `viewer.profile`、`messages.thread`、`messages.activityContext` 和移动端 UA。

## 6. 验收标准

- [ ] `/mobile-home -> /lobby` 首屏可见不超过 1.5s。
- [ ] `/lobby -> 组局详情` 首屏可见不超过 1.5s。
- [ ] `/lobby -> /footprints` 首屏可见不超过 1.5s。
- [ ] `/footprints` 内 Moment / 消息 / 主页 tab 切换不整页白屏。
- [ ] 慢网模拟 Fast 3G 下，不出现 5 秒空等；等待期间只允许使用现有页面或现有 loading 行为。
- [ ] 移动端截图对比保持一致：底部导航、顶部导航、列表卡片、详情页、足迹 tab、消息页没有视觉变化。
- [ ] 不新增任何可见 loading、进度条、遮罩、骨架屏或导航反馈。
- [ ] 生产 analytics 能看到 `page_load_timed` 和客户端 route transition 的慢步骤。
- [ ] 不破坏 SEO：公开详情页 metadata 和 sitemap 行为保持。
- [ ] 不破坏权限：私密组局、好友可见动态、消息会话仍严格校验。

## 7. 建议实施顺序

1. 先做监控和 route timing，确认 5 秒等待发生在哪些页面和步骤。
2. 再做无感预取：底部导航、首页卡片、大厅卡片、常用详情页。
3. 再拆 `/lobby`、`/footprints`、详情页的首屏与非首屏数据，减少真实等待时间。
4. 最后做数据库索引和公共数据缓存，用监控数据验证收益。

## 8. 暂不做

- [ ] 不新增或重做任何移动端 UI、loading、skeleton、过渡层、顶部进度条、导航反馈。
- [ ] 不改底部导航顺序、按钮样式、页面排版、卡片视觉和交互路径。
- [ ] 不替换 Next.js 路由框架、React 数据流、现有状态管理方式。
- [ ] 不新增移动端专属页面框架或替换现有组件树；允许增加小型 helper，但输出必须兼容现有组件。
- [ ] 不引入完整离线缓存或 Service Worker 路由缓存。
- [ ] 不重写所有页面为纯客户端数据获取。
- [ ] 不为了速度取消权限校验。
- [ ] 不在没有 `EXPLAIN ANALYZE` 的情况下直接加大量索引。
