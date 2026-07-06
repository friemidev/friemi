# Android APP 技术架构方案

## 方案结论

当前建议采用：

```text
Android Studio WebView 壳 + Kotlin 原生模块 + 原生桥接 + 现有移动 Web 页面复用
```

这个方案适合 Friemi 当前阶段，因为移动端网页、微信 WebView、Android / iOS 浏览器适配已经投入较多，直接完全原生重写会导致开发成本和维护成本明显上升。Android APP 首发应优先把“安装、登录、推送、Deep Link、返回键、分享、扫码、上传”等 APP 体验补齐，而不是重写所有页面。

首发路线：

```text
Android 壳工程
  -> 加载 Friemi 移动端 Web
  -> 原生桥接处理 APP 特有能力
  -> 用 Kotlin 逐步原生化高频页面和系统能力
```

## Android 语言策略

后续 Android 产品化开发采用 **Kotlin 优先**。现有 Java WebView 壳可以继续保留和维护，但不再把 Java 作为新增原生能力的默认语言。

约定：

- 现有 `MainActivity.java`、`FriemiAndroidBridge.java` 等 Java 壳代码可以在短期内继续维护，避免为了语言迁移影响当前可用壳工程。
- 新增原生模块默认使用 Kotlin，包括 FCM 推送、扫码签到、原生通知中心、原生聊天、图片选择 / 上传增强、桌游工具原生化和后续高频原生页面。
- 新增 Android 业务逻辑优先拆成 Kotlin 类 / module，不继续把复杂逻辑堆进 Java `MainActivity`。
- 只有在修补现有 Java 壳的小 bug 时，才继续直接改 Java。
- 当 Kotlin 模块稳定后，再单独评估是否把 `MainActivity.java` 迁移为 Kotlin；迁移不阻塞当前 WebView 壳使用。

原因：

- 扫码签到需要 CameraX / ML Kit、权限流和生命周期处理，Kotlin 更适合。
- 原生通知中心、FCM、Deep Link 和后台状态同步会有较多异步逻辑，Kotlin coroutine / Flow 更清晰。
- 原生聊天、图片上传、进度反馈和缓存更适合 Kotlin 的现代 Android 生态。
- 桌游工具如果继续向原生化、图形化和动效化推进，Kotlin + Jetpack Compose 会比 Java + XML 更适合长期维护。

## 技术边界

当前分支只做文档，不创建 Android 工程。

后续真正开发时建议独立分支：

```text
feature/v2-android-webview-shell
```

不建议把 Android 壳、FCM、后端 device token、登录回跳和 Deep Link 一次性混在一个大 PR 里。可以先做“能打开、能登录、能返回、能 Deep Link”的壳，再接推送和接口。

## 架构组成

### Android 原生层

职责：

- 提供 WebView 容器
- 控制启动页、加载态、错误页和返回键
- 管理外部链接和文件下载
- 管理 Android App Links / Deep Links
- 接入 Firebase Cloud Messaging
- 接入相机、相册、扫码、地图和系统分享
- 通过 JavaScript bridge 把原生能力暴露给 Web

建议技术：

- Android Studio
- Kotlin 优先；Java 仅用于维护既有壳代码
- AndroidX
- Firebase Cloud Messaging
- WebView + WebViewClient + WebChromeClient
- Android App Links

### Web 层

职责：

- 继续承载 Friemi 的主 UI 和业务页面
- 复用现有 `/zh-CN/mobile-home`、活动详情、组局详情、通知中心等移动端页面
- 根据是否处于 APP 环境调整少量 UI，例如隐藏浏览器提示、使用 APP 下载 / 分享入口
- 通过 JS bridge 调用原生能力

建议保留现有路径：

- `/zh-CN/mobile-home`
- `/zh-CN/home`
- `/zh-CN/activities`
- `/zh-CN/activities/:activityId`
- `/zh-CN/lobby`
- `/zh-CN/messages`
- `/zh-CN/notifications`
- `/zh-CN/game-tools/avalon`

### 后端接口层

首发可以继续复用现有 Next.js 页面和 Server Actions。

以下能力建议补专用接口：

- 绑定 / 更新 Android FCM device token
- 解除 device token
- 通知点击后的跳转解析
- APP 环境检查 / 配置下发
- 后续扫码签到
- 后续聊天图片和表情包上传

建议接口命名：

```text
POST /api/mobile/devices/register
POST /api/mobile/devices/unregister
GET  /api/mobile/config
POST /api/mobile/check-in/scan
```

## WebView 壳实施步骤

### 1. 创建 Android 壳工程

目标：

- 创建 `com.friemi.app`
- 启动后加载生产或预览域名
- 默认打开 `/zh-CN/mobile-home`

建议首发配置：

```text
Production: https://www.friemi.com/{locale}/mobile-home
Preview:    https://<vercel-preview-domain>/{locale}/mobile-home
```

需要支持 debug 切换环境：

- Production
- Vercel Preview
- Local LAN，例如 `http://192.168.x.x:3000`

### 语言选择

APP 首次启动时由原生层读取 Android 系统语言，并映射到 Friemi 支持的 locale：

```text
zh* -> zh-CN
en* -> en
其他 -> fr
```

示例：

- `zh-CN`、`zh-Hans`、`zh-TW` -> `zh-CN`
- `en-US`、`en-GB` -> `en`
- `fr-FR`、`es-ES`、`de-DE`、`ja-JP`、`ko-KR` -> `fr`

语言优先级：

1. Deep Link URL 自带的 locale，用于本次打开，不自动覆盖用户保存语言
2. 用户在 APP 内手动选择的语言
3. Android 系统语言映射结果
4. 兜底 `fr`

实现建议：

- 原生层保存用户选择，例如 `SharedPreferences.friemi_locale`
- 首次打开构造 `/{locale}/mobile-home`
- Web 端语言切换后，通过 JS bridge 通知原生层保存 locale
- 打开无 locale 的外链时，由原生层补当前 locale
- 打开已有 locale 的链接时，尊重链接本身，不强行改写

### 2. WebView 基础设置

必须处理：

- JavaScript enabled
- DOM storage enabled
- Cookie 持久化
- SameSite / third-party cookie 兼容测试
- 文件选择器 / 图片上传
- 下载链接交给系统下载器或外部浏览器
- 外部地图、电话、邮件、Instagram、Google Maps 等链接跳出 APP
- 页面加载失败时展示 Friemi 风格错误页

不建议：

- WebView 内无限打开所有外部域名
- 把 OAuth、支付、地图等高风险流程强行留在 WebView 内

### 3. 返回键和导航

返回键规则：

- WebView 有历史记录：返回上一页
- 当前是 `/mobile-home`：二次确认退出 APP
- 当前是登录 / OAuth 回调中：避免直接退出导致半登录状态
- 当前是弹窗或 sheet：优先关闭 Web 内弹窗

需要 Web 和 Native 协作：

- Web 可通过 `window.FriemiAndroid?.setBackBehavior(...)` 告诉原生当前是否有弹窗
- 原生返回键先询问 Web，Web 不处理时再 `webView.goBack()`

## 登录与回跳

### 当前判断

实机验证后，Google 登录在 WebView 内触发 `403: disallowed_useragent`。这不是普通配置错误，而是 Google 对 embedded WebView OAuth 的限制；Clerk 使用 Google OAuth 时同样会受到影响。

因此首发策略调整为：

```text
Friemi 页面保留在 WebView
  -> Clerk / Google OAuth 主流程使用 Chrome Custom Tabs
  -> 登录成功后通过 Android App Link / Deep Link 回到 APP
  -> 如果 App Link 未接管，用户回到 APP 后自动续跑一次 pending auth URL
  -> 如果 WebView 没有拿到 session，再补 Web 侧 session handoff
```

### 必测场景

- 邮箱登录
- Google 登录
- Clerk session 是否在 WebView 内保持
- 登录后刷新 APP 是否仍登录
- 退出登录后 Cookie 是否清理
- Google 登录是否稳定打开 Chrome Custom Tabs，不再出现 `disallowed_useragent`
- 关闭 APP 再打开是否保持登录
- 从推送点击进入详情页时是否保留登录态

### 回跳方案

优先使用 HTTPS App Links：

```text
https://www.friemi.com/zh-CN/mobile-home
https://www.friemi.com/zh-CN/activities/:activityId
https://www.friemi.com/zh-CN/lobby
```

必要时补自定义 scheme：

```text
friemi://mobile-home
friemi://activities/:activityId
```

建议优先 App Links，因为未安装 APP 时可以自然落回网页。

注意：

- 不通过修改 WebView user-agent 绕过 Google 限制
- 不把 Google / Clerk OAuth 主流程留在 WebView
- 自动续跑 pending auth URL 只作为 App Links 不完整时的过渡兜底，并且必须限制次数，避免取消登录后反复弹出认证页
- Chrome Custom Tabs 与 WebView 的 Cookie 存储可能不同；如果登录成功后 WebView 仍未登录，需要补专门的 session handoff，而不是退回 WebView OAuth

## Deep Link / App Links

目标：

- 用户点击分享链接、推送通知、搜索结果时，如果安装 APP，直接打开 APP 对应页面
- 未安装 APP 时继续打开网页

首发路径：

```text
/zh-CN/mobile-home
/zh-CN/home
/zh-CN/activities
/zh-CN/activities/:activityId
/zh-CN/lobby
/zh-CN/messages
/zh-CN/notifications
```

Android 侧：

- `AndroidManifest.xml` 配置 `intent-filter`
- 使用 `android:autoVerify="true"`
- 支持 `https://www.friemi.com`
- debug 版本可额外支持 preview 域名或 custom scheme

Web 侧：

- 增加 `/.well-known/assetlinks.json`
- 配置 Android package name 和 SHA-256 certificate fingerprint
- 确保生产域名 HTTPS 可访问

## FCM 推送

### 建议

使用 Firebase Cloud Messaging。

原因：

- Android 推送事实标准
- 你之前项目已经使用过 Firebase，迁移理解成本低
- 适合报名审核、好友申请、聊天、活动变更和系统通知

### 原生侧流程

1. Android APP 启动
2. 获取 FCM registration token
3. WebView 登录后，原生层把 token 交给 Web 或直接调后端接口
4. 后端把 token 绑定到当前 `UserProfile`
5. 用户退出登录时解绑 token
6. token refresh 时重新上报

### 后端数据模型建议

新增表候选：

```text
MobileDevice
```

字段候选：

- `id`
- `userProfileId`
- `platform`：`ANDROID`
- `fcmToken`
- `deviceId`
- `appVersion`
- `locale`
- `timezone`
- `lastSeenAt`
- `disabledAt`
- `createdAt`
- `updatedAt`

约束：

- `fcmToken` 唯一
- 一个用户可以有多个设备
- 退出登录或 token 失效时软删除 / disable

### 推送类型候选

P0：

- 报名被通过 / 拒绝
- 有新的报名待审核
- 好友申请
- 私聊消息
- 活动取消 / 时间地点变化

P1：

- 活动开始前提醒
- 线下签到提醒
- 桌游工具开局提醒
- 周报 / 月报

### 推送点击跳转

推送 payload 应包含：

```json
{
  "type": "ACTIVITY_APPROVED",
  "url": "https://www.friemi.com/zh-CN/activities/activity_id",
  "activityId": "activity_id"
}
```

原生层点击后打开对应 URL，交给 WebView / App Links 统一处理。

## JavaScript Bridge

建议暴露一个最小 bridge：

```ts
window.FriemiAndroid = {
  getAppInfo(): Promise<AppInfo>;
  registerPushToken(): Promise<void>;
  openExternal(url: string): void;
  share(payload: SharePayload): void;
  scanQrCode?(): Promise<string>;
  pickImage?(): Promise<ImageResult>;
  setBackBehavior?(state: BackBehaviorState): void;
};
```

首发只做必要能力：

- `getAppInfo`
- `openExternal`
- `share`
- `registerPushToken`

扫码、相册和文件上传可以后续补。

安全要求：

- 只允许 Friemi 域名页面访问 bridge
- bridge 方法参数必须校验
- 不允许 Web 任意执行原生危险操作
- 外部 URL 必须白名单或明确跳系统浏览器

## 权限声明

首发可能需要：

- `INTERNET`：加载网页
- `POST_NOTIFICATIONS`：Android 13+ 推送通知
- `CAMERA`：后续扫码签到 / 扫二维码入局
- `READ_MEDIA_IMAGES`：Android 13+ 图片选择
- `READ_EXTERNAL_STORAGE`：旧 Android 图片读取兼容

暂不建议首发就申请：

- 精准定位
- 通讯录
- 麦克风
- 后台定位

权限策略：

- 能不用就不用
- 需要时再弹权限，不在启动时一次性索取
- 权限文案要说清楚用途，例如“用于扫码签到”而不是泛泛说“需要相机”

## 隐私政策需要覆盖

至少需要说明：

- 账号登录和身份信息
- 邮箱、电话、微信号等绑定字段
- 活动报名和参与记录
- 聊天消息和图片
- 通知推送 token
- 相机 / 相册用途
- 地图和地址信息
- 线下签到记录
- 数据删除和账号注销路径
- 联系方式

## 开发里程碑

### A0：技术验证

目标：确认 WebView 壳路线可行。

任务：

- 创建最小 Android WebView demo
- 加载 preview `/zh-CN/mobile-home`
- 测试 Cookie、Clerk 登录、Google 登录
- 测试返回键
- 测试外部链接
- 测试文件上传

验收：

- 能登录并保持会话
- Google 登录不阻塞；如果阻塞，能切 Custom Tabs 回跳
- 返回键不会让用户卡死
- 移动端页面在 APP 壳内无明显缩放和遮挡问题

### A1：壳工程首版

目标：形成可内部测试 APK。

任务：

- 使用 package name `com.friemi.app`
- 接入启动页和 APP 图标
- 接入生产 / 预览环境切换
- 接入加载态、错误态和无网提示
- 接入基础 JS bridge
- 接入 Android App Links

验收：

- APK 可安装
- 打开默认进入大厅
- Logo 仍可进入 `/home`
- 分享链接可打开对应 APP 页面
- 未安装 APP 时链接仍回网页

### A2：登录和 Deep Link 稳定

任务：

- Clerk 登录链路实机测试
- Google 登录链路实机测试
- Custom Tabs fallback
- 登录后 deep link 回到原页面
- 退出登录清理本地状态

验收：

- 登录、退出、重新打开 APP 都符合预期
- 从通知 / 外链进入详情页时登录态保持
- 登录失败有清楚提示，不出现白屏

### A3：FCM 推送

任务：

- 接 Firebase
- 获取和刷新 FCM token
- 新增 device token 后端接口和数据表
- 绑定 token 到当前用户
- 实现一类推送闭环，例如报名审核结果

验收：

- Android 13+ 权限请求时机合理
- 登录用户能收到测试推送
- 点击推送进入对应页面
- 退出登录后不再收到该账号通知

### A4：APP 化体验补强

任务：

- 系统分享
- 图片上传体验
- 下载海报
- 打开地图
- 扫码签到预研
- 桌游工具入口 APP 内体验检查

验收：

- APP 内高频路径不像浏览器套壳
- 外部能力跳转自然
- 弱网和无网有清楚反馈

### A5：内部测试与上架准备

任务：

- 生成内部测试 APK / AAB，流程见 `apps/android/docs/internal-testing-release.md`
- 准备 Play Store 素材
- 补隐私政策和权限声明，草案见 `apps/android/docs/privacy-permissions.md`
- 小屏、大屏、平板、低性能设备测试
- 收集崩溃和反馈

验收：

- 内测用户能完成登录、报名、查看通知和打开分享链接
- 无明显白屏、登录丢失和返回键问题
- 权限声明和隐私政策可用于上架审核

## 风险清单

### Google 登录 WebView 风险

Google 和 Clerk 文档都明确提醒：Google OAuth 不推荐或不允许直接在 WebView 内做认证。你之前项目能成功，不代表当前 Friemi 生产环境一定不触发限制。

处理策略：

- 不把“WebView 内 Google 登录一定可行”作为架构前提
- A0 阶段必须实机验证
- 准备 Chrome Custom Tabs / 外部浏览器登录回跳作为兜底

### WebView 观感风险

如果只是打开网页，用户会觉得不是 APP。

处理策略：

- 启动页、加载态、错误态、返回键、推送、分享、扫码、图片上传都由原生层补齐
- Web 页面继续保持 APP 风格移动端 UI
- 对高频路径逐步原生化，而不是一次性重写

### 推送绑定风险

WebView 登录态和原生 FCM token 是两套状态。

处理策略：

- 登录完成后主动上报 token
- 退出登录解绑 token
- token refresh 重新上报
- 后端以 `UserProfile + token + deviceId` 管理设备

## 官方参考

- Google Developers Blog：OAuth embedded WebView 安全策略  
  `https://developers.googleblog.com/upcoming-security-changes-to-googles-oauth-20-authorization-endpoint-in-embedded-webviews/`
- Google Help：OAuth via WebView remediation  
  `https://support.google.com/faqs/answer/12284343`
- Clerk Docs：Google social connection，说明 Google OAuth 2.0 不允许 WebView 认证  
  `https://clerk.com/docs/guides/configure/auth-strategies/social-connections/google`
- Firebase Docs：Get started with Firebase Cloud Messaging in Android apps  
  `https://firebase.google.com/docs/cloud-messaging/android/get-started`
- Android Developers：Verify Android App Links and `assetlinks.json`  
  `https://developer.android.com/training/app-links/verify-applinks`
