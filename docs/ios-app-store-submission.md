# Friemi iOS App Store 提交准备

本文档用于把 iOS 上架工作拆成可执行清单。内容基于当前代码与 Android 隐私草案整理，提交前仍需要产品、运营和法务/负责人复核。

## 0. 当前结论

- App Bundle ID：`com.friemi.app`
- App 名称：`Friemi`
- 当前 iOS 壳：Capacitor WebView，线上入口为 `https://www.friemi.com/zh-CN/mobile-home`
- 当前 iOS 原生权限：未声明相机、定位、相册权限；推送改为运行时请求并通过 `App.entitlements` 启用 APNs capability
- 登录：Clerk / Google OAuth 相关域名已放入 iOS `allowNavigation`
- 隐私政策正式页：已补 Web 页面和 App 内入口，提审前确认 `https://www.friemi.com/privacy` 或多语言隐私页可访问
- 账号删除闭环：已补 App 内“账号与安全”入口、确认流程、服务端删除/匿名化逻辑和退出登录
- 社区安全页：建议提审前确认 `https://www.friemi.com/safety` 或多语言安全页可访问，并在 App 内可打开
- iOS 推送：已补 Capacitor Push Notifications、iOS 原生 APNs 注册回调、设备注册 API 对接和服务端 APNs 发送器；提交前仍需 Apple Push Key、Xcode Signing & Capabilities 和真机联调

## 1. App Store Connect 元数据草案

### App 名称

```text
Friemi
```

### 副标题

候选 1：

```text
发现活动，找到搭子
```

候选 2：

```text
海外生活活动与组局
```

候选 3：

```text
Find activities and friends nearby
```

建议首版用候选 1，中文用户识别成本最低。

### 关键词

中文市场倾向：

```text
活动,组局,搭子,交友,周末,巴黎,留学,海外,同城,聚会,展览,桌游,消息,报名
```

英文/国际倾向：

```text
events,friends,plans,local,weekend,meetup,Paris,students,activities,lobby,messages
```

App Store 关键词总长度限制通常按本地化分别填写。提交时不要重复 App 名称里的 `Friemi`。

### 描述

```text
Friemi 帮助海外中文用户发现附近活动、发起组局，并和朋友或新搭子一起安排下一场出行。

你可以在 Friemi 浏览近期活动，查看活动详情，收藏感兴趣的内容，也可以发起自己的组局，管理报名、审核参与者，并通过消息和通知跟进活动更新。

核心功能：
- 发现公开活动和真实组局
- 查看活动时间、地点、费用、详情和报名信息
- 发起组局并管理参与者
- 收藏活动，查看已加入和已发起的局
- 添加好友，使用消息和通知完成活动前沟通
- 使用桌游工具辅助线下聚会

Friemi 适合想找到周末安排、认识同城伙伴、组织线下活动或参与朋友组局的用户。
```

### 隐私政策 URL

目标 URL：

```text
https://www.friemi.com/privacy
```

如果先做多语言路径，建议至少保证下面任意一个稳定可访问：

```text
https://www.friemi.com/zh-CN/privacy
https://www.friemi.com/en/privacy
https://www.friemi.com/fr/privacy
```

### 支持 URL

建议首版：

```text
https://www.friemi.com/zh-CN/contact
```

如果还没有支持页，可先用一个公开页面承载：

```text
https://www.friemi.com/support
```

页面至少需要包含：产品说明、常见问题、联系邮箱、账号/数据删除请求方式。

### 营销 URL

可选。首版可填：

```text
https://www.friemi.com/zh-CN/home
```

没有单独营销站时可以留空。

## 2. 截图与预览清单

首版建议先准备 iPhone 6.9 英寸截图一组，必要时再补 6.5 英寸和 5.5 英寸。截图需要来自真实 App 或 TestFlight 构建，尽量不要包含调试条、浏览器地址栏、测试脏数据。

必拍画面：

- 登录页：展示 Friemi 登录入口，尽量使用稳定测试账号流程
- 首页 / 移动首页：展示活动发现和品牌第一印象
- 组队大厅：展示开放局、我发起的、我参加的、收藏等核心分区
- 活动详情：展示活动时间、地点、报名/加入按钮、组织者信息
- 消息：展示好友私聊或活动前沟通
- 通知中心：展示报名、审核、活动更新类通知
- 个人空间 / 账号菜单：展示个人资料、好友、通知、消息入口

建议截图顺序：

1. 首页：发现附近活动
2. 组队大厅：找到真实组局
3. 活动详情：查看信息并报名
4. 消息：和搭子沟通
5. 通知：不错过活动更新

截图文案可以后期叠加，但不要遮挡关键 UI。若 App Store 审核风险优先，第一版也可以直接上传无叠字截图。

## 3. 审核说明模板

### 审核账号

需要创建一个稳定测试账号：

```text
Email: app-review@friemi.com
Password / Code: 待确认
```

如果使用邮箱验证码登录，需要准备固定验证码或说明审核期间如何获取验证码。不要让审核员依赖私人邮箱或临时人工转发。

建议审核账号使用邮箱登录/验证码登录，不优先依赖 Google OAuth。这样审核员不需要离开 App 或处理第三方账号安全提示。

### Demo 流程

```text
1. Open Friemi.
2. Tap Sign in and log in with the review account.
3. Open the Home or Lobby tab to browse public activities and group plans.
4. Open any activity detail page to view time, location, organizer, and join flow.
5. Open Notifications to review activity updates and signup-related notifications.
6. Open Messages to view demo conversations.
7. Open Account / Profile to view user settings.
8. Open Account menu > Account & Security > Delete Account to verify the account deletion flow.
```

### 外部登录说明

当前 iOS 壳使用 WebView 加载 Friemi Web App，登录服务由 Clerk 提供。Friemi 和 Clerk 托管页面保留在 App WebView 内；若用户选择第三方 OAuth，提供商控制的页面可能会打开系统浏览器或外部认证页面，避免在内嵌 WebView 里完成第三方 OAuth。审核说明建议写：

```text
Friemi is a Capacitor-based iOS app that loads the Friemi web app in an in-app web session. Friemi uses Clerk for account authentication. Friemi and Clerk-hosted pages are allowed in the app web session. If a third-party OAuth provider is used, provider-controlled authentication pages may open outside the app web session for security and compliance. After authentication, the user is redirected back to the Friemi app session.
```

如果最终 iOS 登录没有跳出外部浏览器，只是在允许域名内完成，也可改成：

```text
Friemi uses Clerk-hosted authentication pages inside the app web session. The allowed navigation domains are limited to Friemi, Clerk, and OAuth callback domains needed for sign-in.
```

### UGC 与内容治理说明

Friemi 有用户发起组局、消息、举报等 UGC 场景，审核说明建议补：

```text
Users can create group plans, comments, profile content, and send messages. Friemi provides in-product reporting flows for inappropriate content or behavior. Reports are reviewed by administrators in an internal moderation queue with statuses such as pending, reviewing, resolved, and dismissed. Friemi also provides public Privacy Policy and Community Safety pages that explain reporting, moderation, and account/data handling.
```

当前代码层面的真实情况建议这样理解：

- 已有用户侧举报入口：用户资料、活动详情、组局详情、评论
- 已有管理端处理后台：`/admin/reports`
- 已有公开说明页：隐私政策、社区安全页
- 当前没有明确看到用户侧“拉黑 / 黑名单”独立入口，因此提审文案不要写成已有该能力
- 提审时重点强调“举报 + 管理员人工复核 + 处理状态记录”的治理闭环

### 账号删除说明

提交前需要 App 内真实可操作。完成后写：

```text
Users can delete their account from Account menu > Account & Security > Delete Account. The flow asks for confirmation, signs the user out, marks the Friemi profile as deleted, removes active device tokens, clears or anonymizes personal data, and deletes the Clerk user when server credentials are available. Some records may be retained or anonymized for safety, anti-abuse, dispute handling, and legal compliance as described in the Privacy Policy.
```

### 可复制 Review Notes

提交前把审核账号和验证码/密码替换成真实信息：

```text
Friemi is a Capacitor-based iOS app that loads the Friemi web app in an in-app web session.

Review account:
Email: app-review@friemi.com
Password / Verification code: [fill before submission]

Suggested review flow:
1. Open Friemi.
2. Tap Sign in.
3. Sign in with the review account.
4. Open Home to browse public activities.
5. Open Lobby / group plans to view user-created group activities.
6. Open an activity detail page to view time, location, organizer, and join flow.
7. Open Messages to view communication features.
8. Open Notifications to view activity and signup updates.
9. Open Account menu > Account & Security > Delete Account to verify the account deletion flow.

Authentication:
Friemi uses Clerk for account authentication. Friemi and Clerk-hosted pages are allowed in the app web session. If a third-party OAuth provider is used, provider-controlled authentication pages may open outside the app web session for security and compliance. After authentication, the user is redirected back to the Friemi app session.

Account deletion:
Users can delete their account from Account menu > Account & Security > Delete Account. The flow asks for confirmation, signs the user out, marks the Friemi profile as deleted, removes device tokens, clears or anonymizes personal data, and deletes the Clerk user when server credentials are available.

User-generated content and moderation:
Users can create group plans, comments, profile content, messages, and reports. Friemi provides report flows for inappropriate content or behavior. Reports are reviewed by administrators in an internal moderation queue, with review statuses recorded as pending, reviewing, resolved, or dismissed.

Privacy Policy:
https://www.friemi.com/privacy

Community Safety:
https://www.friemi.com/safety
```

## 4. 隐私与权限问卷草案

以下按 App Store Connect App Privacy 口径整理。最终答案必须以实际上线版本为准。

### 账号信息

- 收集：是
- 数据示例：邮箱、昵称、头像、第三方登录标识、Friemi 用户 ID、好友号
- 用途：App 功能、账号管理、用户识别、安全
- 是否关联用户：是
- 是否用于追踪：否

### 联系方式

- 收集：是，用户主动填写或登录提供
- 数据示例：邮箱、联系邮箱、手机号、微信号
- 用途：登录、报名联系、好友/活动沟通、客服支持
- 是否关联用户：是
- 是否用于追踪：否

### 用户生成内容

- 收集：是
- 数据示例：组局标题、描述、时间、地点、费用、封面、报名记录、消息、公告、举报内容
- 用途：App 功能、内容展示、消息沟通、内容审核
- 是否关联用户：是
- 是否用于追踪：否

### 设备标识

- 收集：是，启用移动设备注册/推送时
- 数据示例：App 生成的 device id、push token、platform、App version、locale、timezone、user agent、last seen time
- 用途：推送通知、设备管理、故障排查、安全
- 是否关联用户：是
- 是否用于追踪：否

### 推送 token

- 当前 Android 使用 FCM，iOS 使用 APNs token；现阶段都复用 `mobile_devices.fcmToken` 字段存储设备 token
- iOS 现已接入 APNs 注册，问卷里应按“已收集”填写
- 用途：活动更新、报名审核、好友请求、消息提醒

### 分析埋点

- 收集：是，代码中存在 analytics event API
- 数据示例：页面/功能行为事件、活动/内容 ID、时间、来源页面
- 用途：产品分析、功能优化、故障排查
- 是否关联用户：取决于事件 payload 和服务端保存方式；若绑定用户 ID，应填“关联用户”
- 是否用于追踪：否，除非接入跨 App/跨站广告追踪

### 图片上传

- 收集：是，当前有活动封面上传
- 数据示例：活动封面、未来可能包括头像/聊天图片
- 用途：App 功能、内容展示
- 是否关联用户：是
- 是否用于追踪：否

### 定位

- 当前 iOS 原生包未声明定位权限
- 当前活动地点主要来自用户输入、公开活动数据或 Web 地图/地址字段
- 若未来启用“附近活动”原生定位或签到距离校验，需要新增 `NSLocationWhenInUseUsageDescription` 并更新 App Privacy

### 相机 / 相册

- 当前 iOS 原生包未声明相机/相册权限
- 若未来启用扫码签到、扫码加入桌游房间，需要新增 `NSCameraUsageDescription`
- 若未来启用原生相册读取，需要新增对应 Photo Library 权限；优先使用系统图片选择器并只读取用户选择的图片

## 5. 必须补齐的工程任务

### A. 隐私政策正式页与 App 内入口

- 新增 Web 隐私政策页
- 在登录页、设置页、账号页放入口
- 确保 URL 未登录也能访问
- 内容至少覆盖收集数据、用途、第三方处理方、保留周期、删除账号方式、联系方式

### B. 账号删除闭环

- 新增“账号与安全”入口
- 新增删除账号确认页或对话框
- 服务端执行删除/停用逻辑
- 删除或禁用 mobile device token
- 明确软删除、数据保留、历史活动/消息的匿名化策略
- 删除后退出登录

### C. iOS 登录 / 回跳路径

- 提审期策略：优先使用审核账号邮箱登录/验证码登录
- 如果使用第三方 OAuth，提供商页面可外部打开，Review Notes 说明原因和回跳方式
- 确保 TestFlight 中能从登录成功回到 App 内会话
- 正式包执行 `npx cap sync ios`，不要带 `FRIEMI_IOS_SERVER_URL=http://192.168.x.x:3000/...`

### D. UGC 风险控制

- 确认举报入口在活动、用户、消息等关键 UGC 场景可见
- 确认后台举报处理页面可用
- 补审核说明：举报、屏蔽/限制、管理员处理机制

### E. iOS 推送和系统能力

- 已完成的代码侧内容：
  - 安装 `@capacitor/push-notifications`
  - iOS AppDelegate 补 APNs 注册成功/失败回调
  - `App.entitlements` 启用 `aps-environment`
  - Web 端 `IOSAppBridge` 请求权限、注册 token、点击通知后回到 App 内路径
  - token 接入 `/api/mobile/devices/register` 与 `/api/mobile/devices/unregister`
  - 后端发送器同时支持 Android FCM 与 iOS APNs
- 提交前必须手动完成：
  - Apple Developer 后台创建 Push Notifications Key
  - 配置环境变量：`APPLE_PUSH_TEAM_ID`、`APPLE_PUSH_KEY_ID`、`APPLE_PUSH_BUNDLE_ID`、`APPLE_PUSH_PRIVATE_KEY`
  - 按环境设置 `APPLE_PUSH_USE_SANDBOX=true|false`
  - Xcode `Signing & Capabilities` 中确认 Push Notifications 已开启
  - 真机安装后首次允许通知权限，并验证 token 已写入 `mobile_devices`
  - 用真实通知事件验证锁屏提醒、前台提醒、点按跳转

### F. iOS 推送联调步骤

开发真机联调：

1. 在 `apps/web` 启动本地服务，确保手机可访问你的局域网地址。
2. 执行：

```bash
cd apps/web
FRIEMI_IOS_SERVER_URL=http://你的局域网IP:3000/zh-CN/mobile-home npx cap sync ios
```

3. 用 Xcode 打开 `apps/ios/App/App.xcworkspace`
4. `Signing & Capabilities` 确认 Team、Bundle ID、Push Notifications
5. 运行到真机，第一次弹通知权限时点允许
6. 登录 Friemi 账号，检查服务端 `mobile_devices` 是否出现 `platform = IOS` 的设备记录
7. 触发一条站内通知，确认手机收到系统推送，并且点开后能回到对应页面

提审/TestFlight 构建前：

```bash
cd apps/web
npx cap sync ios
```

不要带本地 `FRIEMI_IOS_SERVER_URL`，否则打出来的包会继续指向你电脑上的开发地址。

后端环境变量示例：

```bash
APPLE_PUSH_TEAM_ID=YOUR_TEAM_ID
APPLE_PUSH_KEY_ID=YOUR_KEY_ID
APPLE_PUSH_BUNDLE_ID=com.friemi.app
APPLE_PUSH_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
APPLE_PUSH_USE_SANDBOX=true
```

说明：

- `APPLE_PUSH_PRIVATE_KEY` 使用 Apple Push Notifications Key (`.p8`) 内容
- 本地开发和 Debug 真机通常先用 `APPLE_PUSH_USE_SANDBOX=true`
- TestFlight / App Store 构建切到生产环境后，改为 `APPLE_PUSH_USE_SANDBOX=false`

## 6. 建议 Jira 拆分

1. 隐私政策正式页与 App 内入口
2. 账号删除闭环
3. iOS 登录 / 回跳链路验收
4. UGC 举报与审核说明补齐
5. App Store Connect 元数据定稿
6. iPhone 截图拍摄与上传
7. App Privacy 问卷填写
8. TestFlight 审核账号与 Review Notes

## 7. 提交前检查

- `https://www.friemi.com/privacy` 可访问
- 支持 URL 可访问，且包含联系邮箱
- App 内能找到隐私政策和删除账号入口
- 审核账号可登录，验证码/密码可用
- 登录后能访问首页、组队大厅、活动详情、消息、通知
- iPhone 真机允许通知后，能够收到至少一条 APNs 提醒
- 若有 UGC，举报入口和后台处理路径可说明
- App Privacy 与实际数据收集一致
- 截图来自 iOS 构建且不含调试信息
- iOS `Info.plist` 权限描述与实际原生能力一致
