# v1.4 登录态性能优化分析

对应 checklist：

```text
3. 网页性能优化：登录后预览环境加载慢
```

建议分支：

```text
feature/preview-auth-performance
```

## 背景

线上预览环境登录后偶发页面加载明显变慢，甚至超过 10 秒。v1.3 已经增加了 `createPerformanceTracker` 和主要页面 loading / shimmer，本轮先做额外分析，把可以提升速度的地方拆成可执行任务。

本轮重点是先区分慢点来源，再做低风险、可验证的首屏优化：

- 哪些慢来自 Vercel Preview 冷启动或 Clerk / 数据库网络链路
- 哪些慢来自全局 layout 每页必跑的数据
- 哪些慢来自页面查询串行等待
- 哪些慢来自非首屏数据被放进首屏 SSR
- 哪些慢只是缺少更稳定的加载反馈

## 当前已有基础

- `docs/v1_3/performance-baseline.md` 已记录性能计时工具和基础判断方式。
- `apps/web/lib/performance.ts` 支持分段记录页面耗时。
- 主要页面已有 `[perf]` 日志：layout、home、activities、lobby、search、messages、notifications、activity detail、public event detail。
- Preview / Production 可以通过环境变量打开性能日志：

```text
PERFORMANCE_DEBUG=1
```

## 本轮验证范围

已验证：

- 静态检查了登录态全局 layout、认证、管理员判断、通知 badge、首页、活动发现、组队大厅、搜索、消息、通知的数据读取路径。
- 对照了 Prisma schema 中与通知、好友、收藏、报名、消息相关的现有索引。
- 确认可观测基础已经存在，可以通过 `[perf]` 日志记录分段耗时。

尚未验证：

- 未接入 Vercel Preview 真实请求日志。
- 未对登录前 / 登录后、冷启动 / warm request 做实际耗时对比。
- 已完成第一批本地代码优化，但还没有 Preview 真实前后对比数据。

结论边界：

- 第 3 项已经完成第一阶段实现：全局 layout、通知 badge、首页、搜索页、组队大厅首屏均有优化。
- checklist 中仍保留 Preview 真实日志和关键页面前后耗时对比，避免把冷启动、数据库区域延迟或线上认证链路问题误判为已彻底解决。

## 执行任务映射

| 阶段 | 任务 | 主要文件 | 目标 |
| --- | --- | --- | --- |
| 1 | 并行 layout i18n 和 viewer state | `apps/web/app/[locale]/layout.tsx` | 降低所有登录态页面公共耗时 |
| 1 | 合并 profile / admin 查询 | `apps/web/lib/auth.ts`, `apps/web/lib/admin-auth.ts` | 减少重复 `auth()` 和重复 profile 查询 |
| 1 | layout 改只读 profile snapshot | `apps/web/lib/auth.ts` | 避免首屏读取路径触发写入 |
| 1 | 延迟通知 badge 首屏刷新 | `NotificationBadgeProvider.tsx` | 减少页面刚加载时的额外 API 请求 |
| 2 | 首页公共数据和用户态装饰拆分 | `home/page.tsx`, `getActivities.ts` | 让首页先出公共内容 |
| 2 | 活动发现 base list 和 viewer state 拆分 | `activities/page.tsx`, `getActivities.ts` | 降低登录后活动列表首屏等待 |
| 2 | 搜索综合结果和主结果并行 | `search/page.tsx`, `getGlobalSearchResults.ts` | 减少搜索页串行等待 |
| 2 | 组队大厅非默认 tab 延迟加载 | `lobby/page.tsx`, `getActivityLobby.ts` | 降低大厅首屏 SSR 数据量 |
| 3 | 消息页好友活动信号延迟加载 | `messages/page.tsx`, `getDirectMessages.ts` | 改善好友多的用户首屏体验 |
| 3 | 增加好友和报名相关组合索引 | `prisma/schema.prisma` | 降低高数据量用户查询成本 |

## 本轮已实施优化

### 已完成：layout i18n 和 viewer state 并行

文件：

```text
apps/web/app/[locale]/layout.tsx
```

变更：

- `getMessages()` 和 `getOptionalLayoutViewerState()` 改为 `Promise.all` 并行执行。
- layout 总耗时不再固定等于 i18n 和 viewer identity 两段相加。

### 已完成：合并 layout 的 profile / admin 查询

文件：

```text
apps/web/lib/auth.ts
apps/web/app/[locale]/layout.tsx
```

变更：

- 新增 `getOptionalLayoutViewerState()`。
- layout 使用一次 `auth()` 和一次轻量 `userProfile.findUnique()` 获取：
  - `profile.id`
  - `profile.nickname`
  - `profile.friendCode`
  - `profile.role`
  - `profile.status`
- 从同一条 profile 记录得出头像菜单、通知入口和管理员入口需要的数据。
- 数据库角色为 `ADMIN` 时不再额外调用 Clerk `currentUser()`。
- 非 admin profile 仍保留 Clerk/env 管理员 fallback，避免破坏紧急管理员判断。

### 已完成：延迟通知 badge 首屏刷新

文件：

```text
apps/web/features/notifications/components/NotificationBadgeProvider.tsx
```

变更：

- 登录态页面挂载后不再立刻请求 `/api/notifications/unread-count`。
- 首次 badge 刷新延迟 1.5 秒执行。
- 通知页自身仍通过 `NotificationCountHydrator` 同步服务端 unread count。

预期收益：

- 页面刚进入时减少一个立即发起的 API 请求。
- 降低 Preview 环境下首屏后瞬间的网络和数据库并发压力。

### 已完成：通用活动列表的活动 / 公共活动并行读取

文件：

```text
apps/web/features/activities/queries/getActivities.ts
```

变更：

- `getActivities()` 中 `prisma.activity.findMany()` 和 `prisma.publicEvent.findMany()` 改为并行。
- 首页等使用通用活动预览的页面不再串行等待两类活动读取。

预期收益：

- 首页和部分活动预览区域的数据读取耗时接近两类查询中的较慢者，而不是两者相加。

### 已完成：搜索页 primary results 并行读取

文件：

```text
apps/web/app/[locale]/search/page.tsx
```

变更：

- `getGlobalSearchResults()` 和 `getGlobalSearchMainActivityResults()` 改为并行执行。
- related 结果仍保留在主结果之后，避免改变现有相关结果判定逻辑。

预期收益：

- 搜索页首屏减少一次串行等待。
- 搜索结果和主活动列表可以同时开始查库。

### 已完成：组队大厅非默认分区按需加载

文件：

```text
apps/web/app/[locale]/lobby/page.tsx
apps/web/app/api/lobby/section/route.ts
apps/web/features/activities/components/ActivityLobbyView.tsx
apps/web/features/activities/queries/getActivityLobby.ts
```

变更：

- `/lobby` 登录态首屏改用 `getActivityLobbyInitial()`，只读取默认大厅、开放局、我发起、我参加等更可能首屏使用的数据。
- 收藏、好友发起、好友参加改为用户点击对应筛选后通过 `/api/lobby/section` 按需加载。
- 未加载分区的筛选数量显示为 `...`，点击后显示稳定加载态；失败时可以重试。
- 保留 `getActivityLobby()` 完整查询，避免已有服务端调用场景被破坏。

预期收益：

- 登录后进入组队大厅时，SSR 不再等待收藏和好友相关分区查询完成。
- 好友较多、收藏较多的用户首屏压力下降，非默认内容仍可访问。

## P0：最优先优化的全局阻塞点

### 1. 全局 layout 的 i18n 和用户身份查询串行执行

位置：

```text
apps/web/app/[locale]/layout.tsx
```

当前流程：

```text
await getMessages()
await Promise.all([isCurrentUserAdmin(), getOptionalCurrentUserProfileSnapshot()])
```

问题：

- `getMessages()` 和用户身份查询互不依赖，但当前是串行。
- 登录态每个页面都会经过 layout，这个耗时会叠加到所有页面首屏。

建议：

- 改为并行：

```text
Promise.all([
  getMessages(),
  getLayoutViewerState()
])
```

预期收益：

- layout 总耗时从 `i18n + viewer.identity` 变为 `max(i18n, viewer.identity)`。
- 对所有登录态页面生效。

验收：

- `[perf] route=/[locale]/layout` 中 `total` 明显接近最慢单项，而不是两项相加。

### 2. 管理员判断和用户 profile 查询可以合并

位置：

```text
apps/web/lib/admin-auth.ts
apps/web/lib/auth.ts
apps/web/app/[locale]/layout.tsx
```

当前流程：

- `isCurrentUserAdmin()` 调用 `auth()`，再查 `userProfile.role/status`。
- `getOptionalCurrentUserProfileSnapshot()` 也调用 `auth()`，再查完整 `userProfile`。
- layout 中这两个函数并行，但仍可能对同一个用户做两次 auth / DB 查询。

建议：

- 新增轻量函数，例如 `getLayoutViewerState()`：

```text
auth() -> userProfile.findUnique(select: id, nickname, friendCode, role, status)
```

- 从同一条 profile 记录得出：
  - `viewerProfile`
  - `showAdminNav`
  - `showNotificationNav`
  - `viewerNickname`
  - `viewerFriendCode`

注意：

- Clerk metadata / env 管理员兜底只在数据库角色不是 admin 时再查 `currentUser()`。
- layout 不需要每次同步 Clerk 用户全部字段；完整同步应放到登录后关键路径之外，或只在 profile 缺失时执行。

预期收益：

- 所有登录态页面减少一次重复用户态查询。
- Preview 环境下对 Clerk 和 Supabase 的串行/重复等待减少。

验收：

- layout 日志中 `viewer.identity` 降低。
- 登录后切换多个页面时，头部头像、通知入口和管理员入口仍正确。

### 3. 避免 layout 里隐式执行 profile 写入

位置：

```text
apps/web/lib/auth.ts
apps/web/lib/user-profile-identity.ts
```

当前风险：

- `getOptionalCurrentUserProfileSnapshot()` 如果发现 profile 存在但没有 `friendCode`，会调用 `ensureUserProfileFriendCode()`，触发数据库写入。
- 这在正常成熟数据里不常发生，但如果线上有旧用户缺少 friendCode，会把首屏读取变成读写路径。

建议：

- layout 使用只读 profile snapshot。
- 缺失 friendCode 的补齐放到：
  - 登录后后台修复
  - profile 页面
  - 单独 migration / repair script

预期收益：

- 降低登录首屏遇到写入锁、唯一冲突重试或 Prisma 写入延迟的风险。

## P0：关键页面串行等待优化

### 4. 首页先等用户 profile，再查活动

位置：

```text
apps/web/app/[locale]/home/page.tsx
```

当前流程：

```text
viewer.profile -> home.activities
```

问题：

- 首页活动列表的基础数据不依赖 viewer。
- 登录态只是为了补收藏状态等个性化信息。

建议：

- 拆分公共活动读取和用户态装饰：
  - 先并行读取 `viewerProfile` 和公共活动基础列表
  - profile 返回后再补收藏状态
- 或在首页首屏只展示非个性化活动列表，收藏状态客户端渐进补齐。

预期收益：

- 首页首屏不再被用户 profile 查询完全阻塞。

### 5. 活动发现页的用户态装饰阻塞公共列表

位置：

```text
apps/web/app/[locale]/activities/page.tsx
apps/web/features/activities/queries/getActivities.ts
```

当前流程：

```text
viewer.profile -> activity.data(getActivityList + filterOptions)
```

问题：

- `getActivityFilterOptions()` 已缓存，不依赖 viewer。
- 公共活动资讯列表本身大部分不依赖 viewer。
- 目前因为收藏状态、好友信号等 viewer 装饰，整体等待 profile 后才开始。

建议：

- 将 `getActivityList()` 拆为：
  - `getActivityListBase()`：只读公共列表
  - `attachActivityListViewerState()`：补收藏、参与、好友信号
- 首屏优先返回 base 列表，用户态状态可以并行或客户端渐进加载。

预期收益：

- `/activities` 登录后首屏接近未登录速度。
- Preview 冷启动下，用户看到内容更快，收藏状态稍后稳定出现。

### 6. 组队大厅登录态数据一次性过重

位置：

```text
apps/web/app/[locale]/lobby/page.tsx
apps/web/features/activities/queries/getActivityLobby.ts
```

当前优点：

- v1.3 已经把多个 section 的装饰查询合并去重，避免了大量重复查询。

当前问题：

- 登录后仍然需要一次性加载：
  - 全部 feed
  - 开放局
  - 我发起的
  - 我参加的
  - 我收藏的
  - 好友发起
  - 好友参加
- 这些内容都放在首屏 SSR 路径里。

建议：

- 首屏只返回：
  - 当前默认 tab / 全部 feed
  - section 计数
  - 空态需要的最少数据
- 其他 tab 内容切换时再通过 route handler / server action 加载。
- 好友发起、好友参加可以延迟，因为它们依赖 friendIds 和更多关系查询。

预期收益：

- `/lobby` 登录后首屏显著更快。
- 大厅默认 tab 不再被所有 tab 的数据拖慢。

## P1：搜索、消息、通知的体感优化

### 7. 搜索页执行三段串行查询

位置：

```text
apps/web/app/[locale]/search/page.tsx
apps/web/features/search/queries/getGlobalSearchResults.ts
```

当前流程：

```text
viewer.profile
-> getGlobalSearchResults()
-> getGlobalSearchMainActivityResults()
-> getGlobalSearchMainActivityResults(mode: related)
```

问题：

- 综合结果和主活动结果都基于同一个 query，可以并行。
- related 结果是补充内容，不应该阻塞初始搜索结果。
- 两个 search 函数内部都查 activity/publicEvent 并补 favorite state，存在重复。

建议：

- `getGlobalSearchResults()` 和 `getGlobalSearchMainActivityResults()` 并行。
- related 结果改为客户端滚动后加载，或只在主结果确实不足时走单独 API。
- 后续可以合并公共搜索基础查询，减少重复 count / findMany。

预期收益：

- 搜索结果首屏减少一次到两次串行等待。

### 8. 消息页好友列表包含非首屏活动信号

位置：

```text
apps/web/app/[locale]/messages/page.tsx
apps/web/features/direct-messages/queries/getDirectMessages.ts
apps/web/features/friends/queries/getFriendNearestActivitySignals.ts
```

当前流程：

- 读取最多 80 个好友。
- 读取对应 conversations。
- 同时读取好友近期活动信号，最多查到 500 条 participation。
- 页面首屏同时需要 incoming friend requests。

问题：

- 好友近期活动信号是增强信息，不一定需要阻塞消息列表首屏。
- `friendship.findMany` 按 `createdAt` 排序，但 schema 只有 `@@unique([userAId, userBId])` 和 `@@index([userBId])`，对 `userAId/userBId + createdAt` 的 roster 查询不够理想。

建议：

- 首屏先加载好友 + conversation + last message。
- 好友近期活动信号延迟加载。
- 初始好友数从 80 降到 30，滚动或搜索时再加载更多。
- 考虑增加索引：

```text
Friendship @@index([userAId, createdAt])
Friendship @@index([userBId, createdAt])
ActivityParticipant @@index([userProfileId, status, activityId])
```

预期收益：

- `/messages` 首屏更快，尤其是好友较多的用户。

### 9. 通知中心 count 可以降低阻塞成本

位置：

```text
apps/web/features/notifications/queries/getNotifications.ts
```

当前流程：

```text
findMany(take 50) + count(unread)
```

当前索引：

```text
Notification @@index([recipientId, readAt, createdAt])
```

问题：

- 索引已有，查询本身不算最危险。
- 但对于通知很多的用户，精确 unread count 仍是额外查询。

建议：

- 首屏只用已加载 50 条里的未读数量作为页面展示。
- 顶部全局 badge 继续走轻量 API，或者用 `NotificationCountHydrator` 同步服务端已知值。
- 如果需要精确 unread count，保留现状即可，优先级低于 layout / search / lobby。

## P1：客户端请求和体感反馈

### 10. 通知 badge 每个登录页面都会在客户端再请求一次

位置：

```text
apps/web/features/notifications/components/NotificationBadgeProvider.tsx
apps/web/app/api/notifications/unread-count/route.ts
```

当前行为：

- layout 传入 `initialUnreadNotificationCount={0}`。
- 登录态页面挂载后，客户端调用 `/api/notifications/unread-count`。
- 该请求不阻塞 SSR，但会在页面刚加载时占用网络和数据库。

建议：

- 如果 layout 已经有轻量 viewer state，可选择：
  - 不在首屏立即请求，延迟到 idle / 2 秒后
  - 页面切换时用内存状态，不每页立即刷新
  - 在通知页通过 `NotificationCountHydrator` 精准同步

预期收益：

- 降低首屏后立即发起的并发请求数量。
- 减少 Preview 环境中用户刚进入页面时的网络抖动。

### 11. loading 状态还可以按真实页面形态细化

当前已有：

```text
activities/loading.tsx
lobby/loading.tsx
messages/loading.tsx
notifications/loading.tsx
public-events/[id]/loading.tsx
search/loading.tsx
```

建议：

- 首页 `/home` 增加专属 loading，而不是只依赖 `[locale]/loading.tsx`。
- `/profile`、`/friends` 如果后续反馈慢，也补专属 skeleton。
- 对 Preview 冷启动不可避免的慢，优先保证用户马上看到稳定结构。

## P2：缓存和数据模型优化

### 12. 公共活动和筛选项缓存策略继续收紧

已有：

- `getActivityFilterOptions()` 已使用 `unstable_cache`。
- 组队大厅开放局有 cached open lobby activities。

建议：

- 对 `/home` 的公共活动基础列表加短缓存。
- 对 `/activities` public info only 的基础列表按 filter key 做短缓存。
- 用户态装饰单独读取，不污染公共缓存。

风险：

- 活动状态、结束时间和收藏状态必须和缓存拆开，否则会出现过期 UI。

### 13. 进一步减少列表页字段

建议检查：

- `activityCardSelect`
- `publicEventCardSelect`
- 搜索结果 select
- 消息好友 select

原则：

- 首屏卡片不展示的字段不要查。
- 详情页字段不要混进列表 select。
- 大文本字段在列表页只取摘要或控制长度。

## 建议执行顺序

### 第一阶段：低风险、全站收益

1. 并行 layout 的 `getMessages` 和 viewer state。
2. 合并 layout 用户 profile / admin 查询。
3. layout 使用只读 profile snapshot，避免隐式写入。
4. 延迟通知 badge 首屏客户端刷新。

### 第二阶段：页面首屏收益

1. 首页公共活动基础数据和 viewer state 拆分。
2. 活动发现页 base list 和 viewer decoration 拆分。
3. 搜索页综合结果和主结果并行，related 延迟。
4. 组队大厅按 tab 延迟加载非默认数据。

### 第三阶段：高数据量用户优化

1. 消息页好友近期活动信号延迟加载。
2. 好友 roster 增加组合索引。
3. ActivityParticipant 增加适合好友近期活动查询的组合索引。
4. 通知 unread count 根据实际数据量决定是否简化。

## Preview 排查操作

在 Vercel Preview 临时开启：

```text
PERFORMANCE_DEBUG=1
```

建议记录这些页面的登录前后日志：

```text
/zh-CN/home
/zh-CN/activities
/zh-CN/lobby
/zh-CN/search?q=...
/zh-CN/messages
/zh-CN/notifications
```

每个页面至少记录：

- 第一次冷启动
- 刷新第二次 warm request
- 登录前
- 登录后

判断方式：

- 如果第一次很慢、第二次明显变快：主要是 Preview 冷启动。
- 如果 `layout viewer.identity` 每次都慢：优先处理全局 viewer state。
- 如果页面数据段每次都慢：进入对应页面查询优化。
- 如果 SSR 日志不慢但用户仍觉得慢：检查客户端请求、图片、hydration 和 loading 反馈。

## 本轮结论

最值得先做的是全局 layout 和登录态 viewer state，因为它影响所有页面。其次是搜索页和组队大厅，它们当前的首屏 SSR 包含较多非首屏数据。消息页的好友近期活动信号适合延迟加载，能改善好友较多用户的体验。

本轮只输出分析文档，后续实现时应按阶段拆小 PR，避免一次性重构全站数据层。
