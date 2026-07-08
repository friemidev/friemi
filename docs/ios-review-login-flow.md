# Friemi iOS 登录与审核说明

本文档用于 `feature/ios-review-login-flow` 分支，目标是把 iOS 内测、登录回跳和 App Store Review Notes 梳理成可执行版本。

## 分支描述

这个分支用于准备 iOS 审核中的登录与回跳说明，主要做：

- 明确 iOS App 使用 Capacitor WebView 加载 Friemi Web App
- 明确 Friemi 和 Clerk 登录域名留在 App WebView 内
- 明确 Google/OAuth 等第三方认证页面不强行留在 WebView
- 补齐审核账号、Demo 流程、账号删除路径、UGC 治理说明
- 补齐 Xcode 真机和 TestFlight 内测的登录验证清单
- 确认正式提审包不能使用本地 `192.168.x.x:3000` 地址

## iOS 登录策略

首版提审优先使用 Clerk 的邮箱登录或验证码登录作为审核账号路径。这样审核员可以在 App 内完成登录，流程最短、风险最低。

如果审核员选择 Google/OAuth 登录，第三方认证页面可能打开系统浏览器或提供商控制的页面。这是为了避免在内嵌 WebView 中完成第三方 OAuth 认证。认证完成后，用户应回到 Friemi App 会话。

## App Store Review Notes

可以复制到 App Store Connect 的 Review Notes：

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
Users can create group plans, comments, messages, and reports. Friemi provides report flows for inappropriate content or behavior. Reports can be reviewed by administrators, and content or accounts can be restricted when needed.

Privacy Policy:
https://www.friemi.com/privacy
```

提交前把 `app-review@friemi.com` 和验证码/密码换成真实可用的审核账号信息。

## Xcode 真机测试

本地真机测试使用局域网地址：

```bash
cd apps/web
npm run dev -- --hostname 0.0.0.0 --port 3000
```

另一个终端：

```bash
cd apps/web
FRIEMI_IOS_SERVER_URL=http://<你的电脑局域网IP>:3000/zh-CN/mobile-home npx cap sync ios
```

然后用 Xcode 运行 `apps/ios/App/App.xcworkspace` 到 iPhone。

测试项：

- 首次打开 App 可以加载移动首页
- iPhone 已允许 Friemi 访问本地网络
- 未登录访问受保护页面会跳到登录页
- 邮箱登录或验证码登录后能回到目标页面
- 登录后刷新/重开 App 仍保持会话
- 头像菜单能打开
- 账号与安全页面能打开
- 删除账号入口能展开确认
- 不要用主账号测试真实删除

## TestFlight 内测

上传 TestFlight 前必须恢复线上入口：

```bash
cd apps/web
npx cap sync ios
```

确认 `apps/ios/App/App/capacitor.config.json` 中没有本地 IP，例如：

```text
192.168.
localhost:3000
```

TestFlight 内测项：

- 安装后首次打开能进入线上 `https://www.friemi.com/zh-CN/mobile-home`
- 登录审核账号成功
- 登录完成后仍在 App 内，不停留在空白页或错误页
- 首页、组队大厅、活动详情、消息、通知能打开
- 隐私政策入口可访问
- 账号删除入口可访问
- 删除账号只用专门测试账号测试

## 通过标准

- App 内能完成审核账号登录
- 登录后能访问核心功能
- 审核说明能解释 Clerk/OAuth 回跳
- App 内能找到隐私政策与账号删除
- 正式/TestFlight 包不包含本地测试地址
