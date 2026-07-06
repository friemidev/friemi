# v2.3 项目结构梳理与原生移动端改革建议

## 背景结论

当前 Friemi 项目已经形成比较清晰的 monorepo 结构：`apps/web` 承载主要产品体验和后端页面逻辑，`apps/android` 是已落地的 Android WebView 壳，`packages/*` 承载共享类型、基础 UI 和抓取解析能力，`docs/*` 按版本记录产品与技术演进。

v2.2 阶段的移动端策略是：

```text
移动 Web 体验 -> Android WebView 壳 -> 通过 bridge 补原生能力 -> 逐步原生化高收益模块
```

新需求改变了这个前提。网站 UI 需要大改，并且后续可能加入聊天室、图片、表情、推送、未读、实时状态等高频能力。如果继续把这些体验压在 WebView 里，WebView 会同时承担页面渲染、复杂交互、键盘适配、媒体上传、登录态同步、推送回跳和实时消息，长期维护风险会明显上升。

v2.3 建议调整为：

```text
现有网站继续维护公开页面、SEO、分享页、管理后台和 Web fallback
现有 WebView 壳保持可用，但不继续承接重型新功能
Android / iOS 新增产品能力转向原生开发
Web、Android、iOS 共享同一套后端 API、数据模型、权限规则和设计 tokens
```

核心判断：以后不再追求“iOS 和 Android 套同一个网站”，而是追求“iOS、Android、Web 共用同一套业务平台”。

## 当前仓库结构

```text
friemi/
├── apps/
│   ├── web/                 # Next.js 主站：页面、API、Server Actions、Prisma、移动 Web
│   └── android/             # Android Studio WebView 壳工程
├── packages/
│   ├── shared/              # 共享常量、类型、格式化工具
│   ├── ui/                  # Web 侧基础 React UI 组件
│   └── scraper-core/        # 活动链接导入、地理解析、抓取解析共享逻辑
├── scrapers/                # 独立活动抓取脚本
├── docs/                    # 版本文档、发布 runbook、移动端规划和设计说明
├── scripts/                 # 测试与迁移辅助脚本
├── package.json             # npm workspaces + Turborepo 入口
├── turbo.json               # monorepo 任务编排
└── vercel.json              # Web 部署配置
```

根目录 `package.json` 的 workspaces 当前只包含：

```text
apps/web
packages/*
```

也就是说，Android 工程目前不属于 npm workspace，而是独立 Gradle 工程。这一点对后续原生化是合理的：原生客户端可以和 Web 放在同一个仓库中，但构建链路不需要强行并入 npm。

## Web 主站现状

`apps/web` 是当前业务主干，技术栈为 Next.js App Router、React、TypeScript、Prisma、Clerk、Supabase Storage、next-intl、Tailwind CSS。

主要页面路由包括：

```text
/{locale}/home
/{locale}/mobile-home
/{locale}/activities
/{locale}/activities/:activityId
/{locale}/activities/new
/{locale}/public-events
/{locale}/lobby
/{locale}/messages
/{locale}/messages/:conversationId
/{locale}/notifications
/{locale}/friends
/{locale}/profile
/{locale}/profile/:profileId
/{locale}/search
/{locale}/game-tools
/{locale}/game-tools/avalon
/{locale}/admin/*
/{locale}/sign-in
/{locale}/sign-up
```

现有 Web 能力已经覆盖：

- 多语言：`zh-CN`、`en`、`fr`
- 登录与用户资料：Clerk + `UserProfile`
- 活动发现：公开活动、组局、详情、筛选、搜索、收藏
- 组局和报名：发起、报名、游客报名、审核、共同管理人
- 好友关系：好友号、好友申请、好友列表
- 私信：`Conversation`、`DirectMessage`、消息页和发送逻辑
- 通知：站内通知、未读数、通知中心
- 移动设备：`MobileDevice`、FCM token 注册 / 解绑接口
- 分享传播：Open Graph、微信 JS-SDK、海报、二维码
- 游戏工具：Avalon 房间、座位、事件、复盘等模型和页面
- 运营管理：活动、商家、分析、举报、抓取导入

Web 层当前的特点是“页面和业务逻辑耦合较深”。大量业务能力通过 Server Actions、页面查询和 React 组件直接服务 Web 页面。这个模式对网站开发效率高，但对原生客户端不够理想，因为 Android / iOS 需要稳定的 API 契约，而不是依赖 Web 表单动作或页面结构。

## 数据模型现状

Prisma schema 已经覆盖大部分移动端原生化需要的核心实体：

```text
UserProfile
MobileDevice
Activity
ActivityParticipant
GuestActivityParticipant
PublicEvent
ActivityFavorite
PublicEventFavorite
Notification
FriendRequest
Friendship
Conversation
DirectMessage
Report
GameToolRoom
GameToolSeat
GameToolEvent
GameToolSubmission
AnalyticsEvent
```

这说明原生化不需要从零设计业务数据。更合理的工作是：

- 把现有 Web 业务逻辑抽成可复用 service
- 为原生客户端补稳定 API
- 对聊天室、媒体、未读、推送和消息状态做模型增强

其中聊天室是需要重点重构的部分。当前 `DirectMessage` 更像轻量私信：

```text
conversationId
senderId
activityId?
body
readAt
createdAt
```

如果要做真正聊天室，后续大概率需要补：

- message type：文字、图片、表情、系统消息、活动卡片
- attachments：图片、文件、缩略图、宽高、大小、存储 key
- per-user read state：每个会话成员的已读游标，而不是只在消息上放一个 `readAt`
- delivery state：发送中、已发送、失败重试
- soft delete / revoke：删除、撤回
- moderation：举报、屏蔽、风控
- pagination cursor：移动端历史消息分页
- push payload：通知点击后稳定回到会话

## Android WebView 壳现状

`apps/android` 已经是可运行的 Android Studio 工程，不是空文档规划。

当前能力包括：

- 默认加载 `https://www.friemi.com/{locale}/mobile-home`
- Android 系统语言映射到 Friemi locale
- 支持 HTTPS App Links 和 `friemi://` debug scheme
- 普通 Friemi 页面留在 WebView
- 外部链接打开系统浏览器
- Clerk / Google OAuth 走 Chrome Custom Tabs，避免 WebView OAuth 限制
- 提供 `window.FriemiAndroid` bridge
- 支持图片选择、下载、系统分享、复制、地图外跳
- 原生 loading / error 状态
- FCM token 获取和 Web 侧注册链路
- Kotlin FCM service 已存在，Java `MainActivity` 仍是壳主体

Web 侧也已有 `AndroidAppBridge`：

- 识别 `FriemiAndroid/<version>` user-agent
- 保存 locale
- 上报弹窗 / sheet 返回键状态
- 请求 Android push token
- 调用 `/api/mobile/devices/register`

这个壳适合继续作为过渡版本和 fallback，但不建议继续把它扩展成完整产品 App。尤其是聊天、复杂 UI、实时刷新、键盘输入、图片预览、长列表性能、通知跳转这些能力，原生承接会更稳。

## iOS 现状

当前仓库内没有看到独立 `apps/ios` 原生工程。Web 侧只有一个轻量 `IOSAppBridge`，用于识别 `FriemiIOS/` user-agent 并给 HTML 加环境标记。

如果已经有仓库外的 iOS 套壳工程，建议在 v2.3 阶段做一次归档决策：

- 要么把 iOS 工程纳入当前 monorepo，和 Android、Web 文档、API 契约放在一起
- 要么保持独立仓库，但必须共享同一份 API 文档、设计 tokens、Deep Link 规范和发布 checklist

不建议 iOS 继续长期只作为 WebView 套壳存在，同时 Android 走原生。两端产品能力会快速分叉，测试和客服成本会变高。

## 为什么新阶段不建议继续压 WebView

UI 大改和聊天室会让 WebView 承担以下高风险职责：

- 长列表、卡片流、图片和动效渲染
- 输入框、键盘、安全区、底部导航、手势返回
- 聊天实时收发、历史消息分页、滚动锚点
- 图片选择、压缩、上传、预览、重试
- 推送点击后的路由恢复和会话定位
- 登录态、Cookie、外部浏览器 OAuth 和 WebView session 同步
- Web、微信 WebView、Android WebView、iOS WebView 多环境样式分支

WebView 不是不能做这些事，而是这些能力会把网站变成一个“被 App 强行加载的移动端客户端”。当产品已经决定长期做 App 时，这种方式会让后续每个功能都同时处理 Web 约束和 App 约束。

v2.3 的更稳路线是：

```text
公开访问、分享传播、SEO、管理后台：继续 Web
高频移动端主体验、聊天、通知、媒体、系统能力：转原生
```

## 推荐目标架构

```text
                  ┌────────────────────┐
                  │  PostgreSQL/Prisma  │
                  └─────────┬──────────┘
                            │
                  ┌─────────▼──────────┐
                  │  Domain Services   │
                  │  activity/chat/... │
                  └─────────┬──────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼───────┐   ┌───────▼───────┐   ┌───────▼───────┐
│ Next.js Web   │   │ Mobile APIs   │   │ Realtime/Push │
│ pages/admin   │   │ REST/RPC v1   │   │ chat/FCM/APNs │
└───────┬───────┘   └───────┬───────┘   └───────┬───────┘
        │                   │                   │
┌───────▼───────┐   ┌───────▼───────┐   ┌───────▼───────┐
│ Web browser   │   │ Android native│   │ iOS native    │
│ WebView shell │   │ Kotlin/Compose│   │ Swift/SwiftUI │
└───────────────┘   └───────────────┘   └───────────────┘
```

关键变化：

- Web 页面不再是移动 App 的唯一 UI 来源
- Server Actions 继续服务 Web，但核心规则下沉到 domain services
- Android / iOS 通过稳定 Mobile API 访问同一套业务能力
- 聊天和推送要有独立实时通道，不依赖页面刷新
- 设计系统从“共享 React 组件”升级为“共享设计 tokens + 平台原生组件实现”

## 建议仓库演进

短期不建议直接重写或删除 `apps/android`。它是当前可用壳工程，应该保留。

建议新增原生工程时采用以下结构之一：

```text
apps/
├── web/                     # 现有 Next.js 主站
├── android/                 # 现有 WebView 壳，进入维护状态
├── android-native/          # 新 Kotlin / Jetpack Compose 客户端
└── ios/                     # 新 Swift / SwiftUI 客户端
```

或者：

```text
apps/
├── web/
├── android-webview/
├── android/
└── ios/
```

第二种命名更干净，但涉及移动现有工程路径。为了减少当前风险，可以先采用第一种：保留 `apps/android` 不动，新建 `apps/android-native` 和 `apps/ios`。等原生 App 稳定后，再决定是否重命名。

建议新增共享包：

```text
packages/
├── shared/                  # 继续放跨端常量和纯类型
├── api-contracts/           # Zod/OpenAPI schema、API 错误码、DTO 定义
└── design-tokens/           # 颜色、字号、间距、图标命名、品牌资源索引
```

注意：`packages/ui` 是 React UI 组件，只适合 Web，不应该被当成原生 UI 共享层。

## API 平台化建议

原生化之前，最先要做的是 API 契约，而不是先画原生页面。

建议在 Next.js 内先补 Mobile API v1：

```text
GET  /api/mobile/v1/config
GET  /api/mobile/v1/me
GET  /api/mobile/v1/home
GET  /api/mobile/v1/activities
GET  /api/mobile/v1/activities/:id
POST /api/mobile/v1/activities/:id/join
POST /api/mobile/v1/activities/:id/cancel-participation
GET  /api/mobile/v1/notifications
POST /api/mobile/v1/notifications/mark-read
GET  /api/mobile/v1/friends
GET  /api/mobile/v1/conversations
GET  /api/mobile/v1/conversations/:id/messages
POST /api/mobile/v1/conversations/:id/messages
POST /api/mobile/v1/uploads/chat-image
POST /api/mobile/v1/devices/register
POST /api/mobile/v1/devices/unregister
```

现有 `/api/mobile/devices/register` 和 `/api/mobile/devices/unregister` 可以保留兼容，但新 API 建议版本化。这样 Android / iOS 发布后，即使 Web 页面重构，也不会破坏 App。

API 设计原则：

- 所有响应使用稳定 DTO，不直接暴露 Prisma 内部结构
- 所有错误码稳定，例如 `UNAUTHORIZED`、`FORBIDDEN`、`ACTIVITY_FULL`、`NOT_FRIENDS`
- 所有列表使用 cursor pagination
- 所有时间统一 ISO string
- 所有图片返回多尺寸 URL 或可推导的 storage key
- 所有写操作返回更新后的关键状态，减少客户端二次请求
- 保留 `locale`，但不要让业务主键依赖 locale

## 聊天能力建议

聊天室不建议只在现有 `DirectMessage` 上继续加表单提交。建议按“即时通信产品能力”单独规划。

P0 聊天范围：

- 会话列表
- 文本消息
- 图片消息
- 未读数
- 发送失败重试
- 新消息推送
- 历史消息分页
- 基础举报 / 拉黑入口

P1 聊天范围：

- 表情包
- 已读回执
- 输入中状态
- 活动卡片消息
- 群聊或活动临时群
- 消息撤回

推荐实现策略：

```text
数据库仍以 PostgreSQL/Prisma 为主
消息写入走后端 API
实时分发使用独立实时通道
推送只做离线提醒和回跳，不作为消息同步主链路
移动端本地做短期缓存和乐观发送
```

实时通道可以先选托管方案，等规模起来再考虑自建 WebSocket。不要把聊天室实时性建立在页面轮询上，否则 App 端体验和耗电都会受影响。

## 原生客户端建议

Android 建议：

- 新客户端使用 Kotlin + Jetpack Compose
- 现有 Java WebView 壳保持维护，不继续堆业务
- 登录、主页、活动详情、报名、消息、通知优先原生化
- Camera、相册、推送、Deep Link、分享、地图跳转走原生能力

iOS 建议：

- 新客户端使用 Swift + SwiftUI
- 统一 Deep Link 规则和 API 契约
- 推送使用 APNs，后端用同一套 `MobileDevice` 或拆平台 token 表
- 不把 iOS 继续作为长期 WebView-only 客户端

跨端一致性建议：

- 共享业务 API，不共享 UI 代码
- 共享设计 tokens，不强求两个平台像素级相同
- 共享事件埋点命名和转化漏斗
- 共享错误码、空状态、权限说明、Deep Link path

## Web 后续定位

网站仍然重要，但定位需要调整：

继续保留：

- 公开首页和 SEO 页面
- 活动 / 组局分享详情页
- 微信 WebView 分享和游客报名
- 管理后台
- 活动导入、运营、分析、举报处理
- Web fallback：未安装 App 时仍可完成核心操作

减少投入：

- 为 WebView App 专门写复杂移动端分支
- 在 Web 里做完整聊天室级体验后再塞进壳
- 为 Android WebView 和 iOS WebView 分别写大量样式兼容

换句话说，Web 仍是增长和运营入口，原生 App 是高频留存入口。

## 分阶段迁移路线

### 阶段 0：冻结壳边界

目标：现有套壳不动，继续可发布、可回退。

- 明确 `apps/android` 是 WebView 维护线
- 不在 `MainActivity.java` 继续加入复杂业务
- 保留 OAuth、Deep Link、FCM token、分享、图片选择等现有能力
- 给 WebView 壳补必要 bugfix，但不把聊天室和新版主 UI 放进去

### 阶段 1：抽离业务服务和 API 契约

目标：让原生客户端可以不依赖 Web 页面工作。

- 把活动、报名、通知、好友、私信的核心规则从 Server Actions 下沉到 services
- 新增 `packages/api-contracts` 或 OpenAPI 文档
- 建立 `/api/mobile/v1/*`
- 统一 DTO、错误码、分页、鉴权
- 先用 Web 页面和测试脚本验证 API，不急着做原生 UI

### 阶段 2：建立原生 App 基座

目标：Android / iOS 都能登录、拉配置、打开首页、接收 Deep Link。

- Android 新建 Kotlin / Compose 工程
- iOS 新建 SwiftUI 工程
- 接入登录、token/session、API client、环境切换
- 接入 App Links / Universal Links
- 接入推送 token 注册
- 建立基础导航、主题、错误态、空状态、埋点

### 阶段 3：原生 MVP

目标：覆盖移动端最高频主路径。

- 首页 / 大厅
- 活动列表和活动详情
- 报名、取消报名、审核状态
- 通知中心
- 会话列表和文本私信
- 个人资料基础信息
- 分享、地图、图片上传

### 阶段 4：聊天室产品化

目标：把私信从“可用”推进到“像 App 聊天”。

- 实时消息
- 图片 / 表情
- 未读数和已读游标
- 本地缓存
- 失败重试
- 推送点击定位会话
- 举报、屏蔽、风控

### 阶段 5：灰度替换 WebView 壳

目标：从旧壳平滑切到新原生 App。

- 内测用户切原生客户端
- 保留旧壳下载包一段时间
- Deep Link 和推送逐步指向原生页面
- WebView 壳只保留兼容入口
- 稳定后再决定是否删除或重命名旧工程

## 关键风险

### 重写范围失控

不要一开始就追求全站原生重写。管理后台、SEO 页面、公开分享页、游客报名页继续 Web 更合适。

### 业务规则复制

如果 Android、iOS、Web 各自写报名、权限、好友、聊天规则，会很快出现不一致。规则必须在后端 service 收口。

### 聊天模型不足

现有私信模型足够轻量沟通，但不够完整聊天室。不要在客户端用补丁掩盖模型缺口，应先设计消息类型、附件、已读游标和推送回跳。

### 登录方案不稳定

WebView 时代已经遇到 OAuth 外部浏览器问题。原生 App 要尽早确定移动登录方案、session 续期、退出登录、账号删除和游客数据绑定策略。

### 设计系统误用

`packages/ui` 不能解决原生 UI 共享。原生端应该共享 tokens 和交互规范，不应该试图复用 React 组件。

### iOS 工程缺位

如果 Android 先原生、iOS 继续 WebView，产品和测试会分叉。建议 iOS 原生规划和 Android 同步启动，哪怕功能晚一点落地。

## 建议的第一批实际任务

1. 确认 v2.3 架构决策：WebView 壳维护，新移动 App 原生优先。
2. 新建 API 契约文档或 `packages/api-contracts`。
3. 先做 `/api/mobile/v1/me`、`/api/mobile/v1/home`、`/api/mobile/v1/activities/:id`。
4. 把报名、通知、私信发送的核心逻辑从 Web action 中抽到 service。
5. 设计聊天室 v1 数据模型变更。
6. 决定原生工程路径：优先保留 `apps/android`，新增 `apps/android-native` 和 `apps/ios`。
7. 做一版原生 App 信息架构和导航图，避免直接照搬网站页面层级。

## 最终建议

Friemi 的下一阶段不应该是“把网站套得更像 App”，而应该是“把 Web 已经验证过的业务沉淀成平台，然后用原生 App 承接高频移动体验”。

现有 WebView 壳有价值，应该保留；但它的价值是过渡、兼容和发布兜底，不是承载 UI 大改和聊天室的长期主战场。
