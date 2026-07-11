# Friemi v2.3 移动端 UI 重做指南

> 分支：`feature/v2-3-mobile-ui-layout`  
> 设计参考：`apps/web/public/UIv2_3/`  
> 范围：本轮只重做移动端 Web / WebView 体验，桌面端先保持现状。  
> 原则：先建立统一移动端壳层，再逐页替换页面内容，避免每个页面单独打补丁。

---

## 1. 当前结论

`UIv2_3` 里的示意图不是现有 UI 的局部换肤，而是一套新的移动端信息架构。它把 Friemi 拆成五个移动端主入口：

| 设计入口 | 设计图名称 | 对应现有能力 | 当前代码位置 | v2.3 判断 |
| --- | --- | --- | --- | --- |
| Home / Hall | `UI new✌️_画板 1.png` | 移动端大厅、推荐、搜索、分类 | `/mobile-home`、`/home` | 应以 `/mobile-home` 为移动端主入口重做，桌面 `/home` 暂不动 |
| Hangout | `UI new✌️_画板 1 副本.png` | 组局大厅 | `/lobby` | 作为组局列表页重做目标 |
| Hangout Detail | `UI new✌️_画板 1 副本 2.png` | 组局详情 | `/lobby/[activityId]` | 作为组局详情页重做目标 |
| Create Hangout | `UI new✌️_画板 1 副本 3.png` | 发布入口、桌游工具入口 | `/activities/new`、`/game-tools` | 应新增移动端发布选择页，再进入创建表单或桌游工具 |
| Activity | `UI new✌️_画板 1 副本 4.png` | 活动大厅 / 正式活动列表 | `/activities`、`/public-events` | 作为活动列表页重做目标 |
| Moment | `UI new✌️_画板 1 副本 5.png` | 晒晒 / 动态流 | 暂无完整业务路由 | 当前只能规划占位，后续配合晒晒功能开发 |
| Profile | `UI new✌️_画板 1 副本 6.png` | 个人主页、我的组局、收藏、设置 | `/profile`、`/profile/[profileId]` | 作为个人页重做目标 |

截至本文档，项目里已有一些旧移动端适配和可替换组件。`/mobile-home` 已完成 v2.3 首页首版落地；移动端访问 `/home` 会分流到 `/mobile-home`，桌面端 `/home` 继续保留旧的共创介绍页。`/lobby` 已完成 v2.3 组局大厅首版落地。其余页面仍处于“可承接 v2.3 重做占位格”状态：`/lobby/[activityId]`、`/activities`、`/public-events/[publicEventId]`、`/activities/new`、`/profile`、`/messages`。

---

## 2. 新移动端全局结构

### 2.1 移动端壳层

当前移动端所有页面仍共用：

- `apps/web/app/[locale]/layout.tsx`
- `apps/web/components/layout/AppHeader.tsx`
- `apps/web/components/navigation/MobileNav.tsx`
- `apps/web/components/navigation/MobileScrollProgress.tsx`

v2.3 不建议继续让所有移动端页面都显示同一个传统顶部导航。示意图里是三类顶部结构：

| 顶部类型 | 使用页面 | 说明 |
| --- | --- | --- |
| 品牌顶部栏 | Home | Logo、城市、通知，不放完整桌面导航 |
| 标题顶部栏 | Hangout、Activity、Moment、Profile、Create | 大标题作为页面第一视觉，顶部系统栏下方留安全区 |
| 详情顶部栏 | Hangout Detail、Activity Detail | 返回按钮 + 标题或弱标题，内容主图更靠前 |

建议新增一层移动端专用壳层组件，例如：

```text
apps/web/components/mobile-v2_3/MobileV23Shell.tsx
apps/web/components/mobile-v2_3/MobileV23TopBar.tsx
apps/web/components/mobile-v2_3/MobileV23BottomNav.tsx
apps/web/components/mobile-v2_3/MobileV23Page.tsx
```

桌面端继续走现有 `AppHeader`、`DesktopNav`、`PageContainer`。

### 2.2 底部导航

设计图底部导航是五个固定入口：

| 设计入口 | 建议路由 | 当前路由差异 |
| --- | --- | --- |
| Home | `/mobile-home` | 当前 `MobileNav` 中间主入口已经是 `/mobile-home` |
| Hangout / Explore | `/lobby` | 当前已有 |
| Create | 新增移动端发布选择页，或复用 `/activities/new` 前置页 | 当前没有独立中间发布选择页 |
| Moment | 后续 `/moments` | 当前无完整晒晒路由 |
| Profile | `/profile` | 当前已有 |

当前 `MobileNav` 仍是：活动、组局、大厅、消息、主页。v2.3 需要重新确认“消息”是否退出主导航。如果消息不放底部主导航，应放到 Home 顶部通知 / Profile 菜单 / 会话入口中，不能直接删除功能。

### 2.3 安全区与 WebView

所有 v2.3 移动页必须遵守：

- 顶部使用 `padding-top: env(safe-area-inset-top)` 或统一 shell 处理。
- 底部内容不能被 `MobileV23BottomNav` 遮挡，列表页需要 `padding-bottom: calc(navHeight + env(safe-area-inset-bottom))`。
- Android WebView 顶部系统栏遮挡问题必须在壳层解决，不能每页单独补。
- 使用 `svh` / `dvh` 时要验证 iOS Safari、Android Chrome、Android WebView。

---

## 3. 视觉语言拆解

### 3.1 版式

- 移动端内容宽度以 390px - 430px 为主要基准。
- 页面背景保持干净奶白，不使用大面积彩色渐变。
- 列表页使用大标题 + 顶部 tab / 筛选 + 卡片列表。
- 详情页使用大图优先，信息分段紧凑展示，底部主 CTA 固定。
- 发布页使用大面积入口卡片，减少表单前的认知负担。

### 3.2 卡片

- Home：横向精选卡 + 小卡片瀑布。
- Hangout：列表行卡，图片左侧、信息右侧、时间突出。
- Activity：三列小卡片分组，按 Recent / Next Week / Next Month。
- Detail：顶部大图 + 标题 + 参与信息 + organizer + participants + sticky CTA。
- Profile：头像、统计、等级进度、菜单列表。

### 3.3 文案语气

本轮重做应把移动端文案改成真实用户语言：

- 不使用“管理后台”“MVP”“数据库”“流程验证”等开发语气。
- 组局叫“组局 / Hangout”，活动叫“活动 / Activity”，不要混用。
- 按钮尽量短：加入、发布、收藏、分享、查看、返回。
- 页面不解释产品能力，只呈现用户要做的动作。

---

## 4. 核心页面重做清单

状态说明：

- `未开始`：没有 v2.3 视觉落地。
- `有旧移动适配`：当前能在手机上用，但不是 v2.3 新布局。
- `有重做占位格`：设计图和现有路由已经对应清楚，可以开始逐页实现。
- `暂不处理`：本轮移动端主链路外，保持现状。

| 页面 | 路由 | 当前组件 / 文件 | v2.3 目标 | 状态 |
| --- | --- | --- | --- | --- |
| 移动大厅 | `/mobile-home` | `apps/web/app/[locale]/mobile-home/page.tsx` | 对齐 Home 图：Logo、城市、搜索、分类、精选卡、底部导航 | v2.3 首版已落地 |
| 桌面首页 | `/home` | `apps/web/app/[locale]/home/page.tsx` | 桌面暂不变，移动端分流到 `/mobile-home` | 移动端分流已完成 |
| 组局大厅 | `/lobby` | `MobileLobbyV23View`、`ActivityLobbyView` | 移动端对齐 Hangout 图：Nearby / Friends / Today / Popular 样式列表；桌面保留原视图 | v2.3 首版已落地 |
| 组局详情 | `/lobby/[activityId]` | `ActivityDetailPageContent` | 对齐 Hangout Detail 图：大图、标题、时间地点、组织者、参与者、底部 Join CTA | 有重做占位格 |
| 创建组局 | `/activities/new` | 创建表单页 | 前置 Create Hangout 选择页，再进入表单 | 有重做占位格 |
| 组局编辑 | `/activities/[activityId]/edit` | 编辑表单页 | 移动端表单压缩、底部保存 CTA；不在第一批视觉图中 | 有旧移动适配 |
| 活动大厅 | `/activities` | `apps/web/app/[locale]/activities/page.tsx` | 对齐 Activity 图：按近期 / 下周 / 下月分组的小卡片 | 有重做占位格 |
| 活动详情 | `/public-events/[publicEventId]` | `apps/web/app/[locale]/public-events/[publicEventId]/page.tsx` | 复用详情页规则，但区分“创建组局”和“购票 / 外链”动作 | 有重做占位格 |
| 从活动创建组局 | `/public-events/[publicEventId]/teams/new` | teams/new page | 作为活动详情的次级动作，不单独做主视觉 | 有旧移动适配 |
| 晒晒 / Moment | 建议新增 `/moments` | 暂无完整路由 | 对齐 Moment 图：动态卡片、点赞、评论、分享 | 未开始 |
| 晒晒发布 | 建议新增 `/moments/new` | 暂无完整路由 | 底部导航中相机入口或发布页二级入口 | 未开始 |
| 个人主页 | `/profile` | `ProfileDashboardView` | 对齐 Profile 图：个人信息、统计、等级、菜单 | 有重做占位格 |
| 用户主页 | `/profile/[profileId]` | profile detail page | 外部查看态，弱化设置菜单，保留关注 / 加好友 | 有旧移动适配 |
| 消息列表 | `/messages` | `MobileFriendChatRoster` | 若消息退出底部主导航，需要改成 Profile / 通知入口进入 | 有旧移动适配 |
| 消息详情 | `/messages/[conversationId]` | `DirectMessagesPanel` | 手机端已固定全屏聊天框，v2.3 可后置 | 有旧移动适配 |
| 通知中心 | `/notifications` | notifications page | Home 顶部铃铛入口；列表 UI 可后置 | 有旧移动适配 |
| 搜索 | `/search` | search page | Home 搜索框进入；移动端结果页需要轻量卡片 | 有旧移动适配 |
| 好友 | `/friends` | friends page | 可并入 Profile 菜单，不作为底部主入口 | 有旧移动适配 |
| 共创主理人 | `/co-creators` | co-creators page | 业务说明页，移动端可后置 | 暂不处理 |
| 商家主页 | `/merchants/[merchantId]` | merchant page | 非主链路，保留现状 | 暂不处理 |
| 账号安全 | `/account/security` | account page | Profile 设置进入，后置 | 暂不处理 |
| 登录 | `/sign-in` | Clerk auth page | 可后置，保持可用即可 | 暂不处理 |
| 注册 | `/sign-up` | Clerk auth page | 可后置，保持可用即可 | 暂不处理 |
| 隐私 | `/privacy` | privacy page | 静态页，保留现状 | 暂不处理 |
| 更新列表 | `/updates` | updates page | 静态信息页，后置 | 暂不处理 |
| 更新详情 | `/updates/[versionSlug]` | update detail page | 静态信息页，后置 | 暂不处理 |

---

## 5. 桌游工具页面

桌游工具不在这批 `UIv2_3` 示例图主链路里，但 Create Hangout 图里有 `Party Tools` 卡片，所以移动端应保留入口。

| 页面 | 路由 | v2.3 处理 |
| --- | --- | --- |
| 桌游工具大厅 | `/game-tools` | 从 Create Hangout 的 Party Tools 卡进入，当前 UI 可先保持 |
| Avalon 工具 | `/game-tools/avalon` | 不纳入第一批移动端主 UI 重做 |
| Avalon 房间 | `/game-tools/avalon/rooms/[roomId]` | 保持当前工具型 UI |
| Avalon 私密身份 | `/game-tools/avalon/seats/[token]` | 保持当前工具型 UI |
| Werewolf 工具 | `/game-tools/werewolf` | 保持当前工具型 UI，后续按桌游工具单独优化 |
| Werewolf 房间 | `/game-tools/werewolf/rooms/[roomId]` | 保持当前工具型 UI |
| Werewolf 私密身份 | `/game-tools/werewolf/seats/[token]` | 保持全屏卡片方向，不跟普通页面壳层强绑定 |
| Werewolf 卡牌预览 | `/game-tools/werewolf/card-preview` | 测试页，不进主导航 |

---

## 6. 后台与工具页

以下页面不是普通用户移动端主链路，本分支不优先重做，只保证不被新壳层破坏：

| 页面 | 路由 | v2.3 处理 |
| --- | --- | --- |
| Admin 首页 | `/admin` | 暂不处理 |
| 数据分析 | `/admin/analytics` | 暂不处理 |
| 数据抓取 | `/admin/data-scraper` | 暂不处理 |
| 商家管理 | `/admin/merchants` | 暂不处理 |
| 举报管理 | `/admin/reports` | 暂不处理 |
| Android 登录回跳 | `/android-auth-complete` | 保持逻辑稳定 |
| Loading 测试 | `/loading-test` | 测试页，不处理 |

---

## 7. 建议实施顺序

### P0：先做移动壳层

- [ ] 新增 `components/mobile-v2_3` 目录。
- [ ] 新增 v2.3 底部导航，不影响桌面端。
- [ ] 新增移动端顶部安全区处理，解决 Android WebView 顶部遮挡。
- [ ] 为页面提供 `hideDefaultMobileHeader` 或等价机制，让 v2.3 页面可以不显示旧 `AppHeader`。
- [ ] 明确底部导航最终入口：Home、Hangout、Create、Moment、Profile；消息入口另行安置。

### P1：重做主链路页面

- [x] `/mobile-home`：重做为 Home 图结构。
- [x] `/home`：移动端访问分流到 `/mobile-home`，桌面端保持旧首页。
- [x] `/lobby`：重做为 Hangout 列表图结构。
- [ ] `/lobby/[activityId]`：重做为 Hangout Detail 图结构。
- [ ] `/activities/new` 或新增发布选择页：重做为 Create Hangout 图结构。
- [ ] `/activities`：重做为 Activity 分组小卡结构。
- [ ] `/public-events/[publicEventId]`：重做活动详情移动版。
- [ ] `/profile`：重做 Profile 图结构。

### P2：补齐后续能力

- [ ] 新增 `/moments` 晒晒列表占位页。
- [ ] 新增 `/moments/new` 晒晒发布入口。
- [ ] 调整 `/messages` 入口归属。
- [ ] 统一移动端卡片组件、头像组件、横滑列表、底部 CTA。

---

## 8. 验收标准

每个 v2.3 移动页面完成后至少检查：

- [ ] 390px、430px、768px 视口截图。
- [ ] iOS Safari 顶部安全区和底部手势区不遮挡。
- [ ] Android Chrome / Android WebView 顶部系统栏不遮挡。
- [ ] 底部导航不会挡住主 CTA、输入框、分页按钮。
- [ ] 长标题、长城市名、长用户名不会挤破布局。
- [ ] 旧桌面端布局没有被移动端改动污染。
- [ ] 页面返回、登录跳转、收藏、报名、取消报名等原有业务动作仍可用。

---

## 9. 当前已确认的 v2.3 占位格

这些不是“已经完成新 UI”，而是“页面责任已经对齐，后续可以逐页实现”：

- [x] Home 首版：`/mobile-home`
- [x] Hangout 列表占位格：`/lobby`
- [x] Hangout 详情占位格：`/lobby/[activityId]`
- [x] Create Hangout 占位格：`/activities/new`，建议前置新移动选择页
- [x] Activity 列表占位格：`/activities`
- [x] Activity 详情占位格：`/public-events/[publicEventId]`
- [x] Profile 占位格：`/profile`
- [ ] Moment 占位格：待新增 `/moments`
- [ ] Moment 发布占位格：待新增 `/moments/new`

---

## 10. 本分支注意事项

- 不要在同一轮里重构桌面端首页。
- 不要把组局详情再放回 `/activities/[activityId]`，组局详情的移动端目标是 `/lobby/[activityId]`。
- 不要为了贴图直接把示意图 PNG 当作页面背景使用；示意图只作为布局参考。
- 不要在每个页面重复写安全区和底部导航逻辑，先抽移动端壳层。
- 不要在 v2.3 主 UI 文案里出现开发阶段词，例如 MVP、测试占位、数据库、管理端。
