# Android 移动端 APP 开发记录

## 当前定位

这个文档用于记录 Friemi Android 移动端 APP 的产品、技术和发布规划。当前阶段只做需求梳理和方案讨论，不在本分支创建 Android / React Native / Expo / Capacitor 等工程基础建设。

Android APP 的目标不是简单复制网页，而是把移动端高频路径做得更像真正的手机应用：

```text
打开 APP -> 看到大厅 -> 发现活动 / 组局 -> 报名或发起 -> 收到通知 -> 现场使用签到、聊天、桌游工具
```

## 第一阶段目标

- 明确 Android APP 是原生、跨端还是 WebView / TWA 方案
- 明确哪些能力必须首发，哪些可以继续留在网页
- 明确登录、通知、分享、地图、上传、签到和桌游工具的移动端边界
- 明确和现有 Next.js Web / Prisma 后端的接口复用方式
- 明确上架前需要的素材、隐私政策、权限声明和测试设备范围

## 相关文档

- 产品与路线记录：`docs/v2_2/android-mobile-app-development-plan.md`
- 技术架构方案：`docs/v2_2/android-app-technical-architecture.md`

## 不在当前分支做的事

- 不创建 Android Studio 工程
- 不接入 Expo / React Native / Capacitor / Kotlin
- 不改现有后端 API 结构
- 不新增数据库表
- 不改 PWA manifest 或生产发布配置
- 不提交 Play Store / APK / AAB 相关文件

## 候选技术路线

当前倾向：

先走“Android Studio 管理壳工程 + 复用现有移动端 Web 体验 + 按需补原生桥接能力”的渐进路线。原因是现有网站已经针对移动端、微信 WebView、Android / iOS 浏览器做过大量适配，直接完全原生重写会带来较高成本，也会让 Web 和 APP 两套体验分叉太快。

首发阶段不建议一开始就重写所有页面。更稳的方式是：

```text
现有移动端 Web 体验 -> Android 壳验证安装 / 登录 / Deep Link / 推送 -> 针对高频场景逐步原生化
```

后续如果发现 WebView / TWA 在推送、扫码、相册、桌游工具或性能上无法满足体验，再把局部页面迁移到 React Native / 原生 Kotlin。

### 方案 A：PWA / TWA

优点：

- 最快接近 Android APP 外壳
- 可以最大化复用现有移动端网页
- 适合先验证安装、桌面图标、通知入口和深链

风险：

- 原生能力受限，复杂推送、相册、地图、扫码和离线体验可能不够顺滑
- UI 仍然容易带着网页感
- 依赖 Chrome / WebView 行为，部分机型兼容性要额外验证

当前判断：

- 可以作为最快验证路线，但不能把“套壳后能打开网站”当成产品完成
- 需要补原生推送、Deep Link、分享、外部浏览器登录兜底等 APP 必备体验
- 发布前需要单独核对 Google Play 对 WebView / TWA 类应用的最新要求

### 方案 B：React Native / Expo

优点：

- 更像真正 APP，可控性强于 WebView
- 适合做推送、扫码、相册、地图、签到、桌游工具等移动端能力
- TypeScript 生态可复用一部分业务类型和文案

风险：

- 需要重新搭建移动端 UI 和导航
- 与现有 Next.js 页面无法直接复用
- 需要规划 API 层、鉴权、缓存和发布流程

### 方案 C：原生 Kotlin

优点：

- Android 体验和性能控制最好
- 推送、扫码、相册、定位、通知和系统能力最稳

风险：

- 开发成本最高
- 与现有 TypeScript 代码复用少
- 后续如果要 iOS，需要再做一套

当前判断：

- 不适合作为第一步，除非后续明确 Android APP 需要大量离线、相机、扫码、推送和复杂系统能力
- 可以作为长期重写路线，但不应该阻塞首发验证

## 首发能力候选

建议先从“移动端必须比网页更顺手”的路径开始，而不是一次性把全站搬进 APP。

P0 候选：

- 移动端大厅：首页 / mobile-home 的 APP 化入口
- 活动发现：查看、搜索、分类、收藏
- 组局详情：报名、审核状态、联系发起人、分享
- 我要组局：移动端发起组局的核心流程
- 通知中心：报名、审核、好友、系统通知
- 原生推送：报名审核、好友申请、消息和重要活动变更
- 账号登录：Clerk 或后续移动端适配后的登录方案

P1 候选：

- 聊天：文字、图片、表情包
- 线下签到：扫码签到、手动签到、签到名单
- 地图：打开地图、复制地址、路线跳转
- 图片上传：封面、聊天图片、头像
- 桌游工具：阿瓦隆入口与房间操作

P2 候选：

- 周报 / 月报 / 成就
- 离线缓存
- 更完整的移动端运营位
- Play Store 上架优化

## 已确认结论与待确认问题

### 产品问题

- APP 首屏：使用“大厅”，也就是当前 `/mobile-home` 的产品方向
- `/home` 是否保留：保留。Logo 访问 `/home`，底部导航栏大厅访问 `/mobile-home`
- 默认语言：首次启动跟随系统语言；中文系统进入 `zh-CN`，英语系统进入 `en`，其他语言全部进入 `fr`
- 桌游工具：不作为首发主入口；作为报名后的扩展入口出现
- 通知中心：需要原生推送，不只做站内通知
- 游客报名：待最终确认。当前建议 APP 首发优先登录报名，网页和微信 WebView 继续保留游客报名

### 技术问题

- APP 技术路线：倾向先做 Android Studio 壳工程，复用现有移动端 Web 体验，再按需补原生能力
- Clerk 登录：移动端网页目前可以正常登录；APP 壳里需要重点测试 Google 登录、Cookie、回跳和外部浏览器兜底
- API 方案：首发如果主要复用 Web 页面，可继续走现有 Next.js 页面和 Server Actions；涉及原生推送设备 token、扫码签到、图片上传、聊天媒体等能力时，再补明确的 REST / RPC 接口
- 图片上传、聊天、签到和通知接口：根据功能逐步补，不在规划分支一次性设计完
- Deep Link：优先复用现有 canonical Web 路径，例如 `/zh-CN/mobile-home`、`/zh-CN/activities/:id`、`/zh-CN/lobby`。APP 内通过 Android App Links / Deep Link 打开同一路径，未安装 APP 时落回网页

### 发布问题

- Android package name：`com.friemi.app`
- 发布节奏：先内部测试 APK，再考虑 Play Store
- Google Play Console 和签名密钥：已有账号和密钥管理条件
- 测试机型：继续覆盖小屏 Android、大屏 Android、平板和低性能机型；虽然网页端已经测过，APP 壳仍需要单独测登录、推送、Deep Link、相册、扫码和返回键
- 隐私政策和权限声明：待补。至少需要围绕账号登录、通知、相册 / 图片上传、相机 / 扫码、位置 / 地图、聊天消息和数据删除路径准备说明

## 当前建议

### 游客报名策略

APP 首发建议以登录报名为主，游客报名继续留在 Web / 微信 WebView。

理由：

- APP 是更长期的用户关系入口，登录报名更有利于通知、消息、审核、签到、桌游工具和后续周报 / 成就体系
- 游客报名适合 Web 外链、微信分享、临时活动传播等低摩擦场景
- APP 内如果继续突出游客报名，后续会增加账号合并、通知送达、报名审核和数据归属的复杂度

建议策略：

- APP 内报名按钮默认引导登录 / 注册
- Web 和微信 WebView 继续保留游客报名
- 从分享链接进入 APP 时，如果用户未登录，先给清楚的登录报名提示；必要时提供“用浏览器继续游客报名”的兜底，而不是把游客报名作为 APP 主路径

### 技术路线策略

短期不建议直接重写原生 APP。更合理的是三步：

1. 先做 Android 壳，验证安装、登录、Deep Link、通知和返回键
2. 保持 `/mobile-home`、详情页、报名页等高质量移动 Web 页面作为首发内容
3. 对原生收益明显的功能单独补桥接或原生页：推送、扫码签到、图片上传、地图、桌游工具

这个路线能最大化利用当前移动端适配成果，也不会过早把 Web 和 APP 做成两套难同步的产品。

### 语言策略

APP 首次启动时跟随 Android 系统语言：

```text
zh* -> zh-CN
en* -> en
其他 -> fr
```

规则说明：

- 默认不是固定法语，而是先判断用户系统语言
- 只明确支持中文、英语和法语三种界面
- 如果系统语言不是中文或英语，例如法语、西班牙语、德语、日语、韩语等，都进入法语
- 用户在 APP 内手动切换语言后，保存用户选择，后续优先使用用户选择而不是系统语言
- Deep Link 如果已经带 locale，例如 `/zh-CN/activities/:id`，优先尊重链接 locale；如果链接没有 locale，再按 APP 语言策略补全

## 与现有 Web 的关系

短期应该复用：

- 现有数据库模型
- 现有活动 / 组局 / 用户 / 通知数据结构
- 现有分类体系：饭局、闲逛、视听、艺术、桌游、进步、旅行、音乐、运动、其它
- 现有品牌色、logo、插画和游戏工具素材
- 现有 v2.1 / v2.2 移动端体验沉淀

不建议直接复用：

- 过重的网页布局
- 依赖 hover 的交互
- 复杂桌面筛选栏
- 需要大量滚动和折叠的网页表单

## 素材初步清单

后续进入工程前需要准备：

- Android app icon：`apps/web/public/brand/android/app-icon-512.png`
- Android adaptive icon foreground：`apps/web/public/brand/android/adaptive-icon-foreground.png`
- Android adaptive icon background：`apps/web/public/brand/android/adaptive-icon-background.png`
- Splash screen logo：`apps/web/public/brand/android/splash-logo.png`
- Play Store feature graphic：`apps/web/public/brand/android/play-store-feature-graphic.png`
- 通知小图标：`apps/web/public/brand/android/notification-icon.png`
- APP 截图素材：大厅、活动详情、组局报名、通知、桌游工具

素材文件夹暂不创建，等技术路线确定后再补。

## 建议里程碑

### M0：规划确认

- 选择技术路线
- 明确首发范围
- 明确登录和 API 方案
- 明确素材和发布要求

### M1：可运行壳

- 创建 Android / 跨端工程
- 接入品牌启动页
- 接入大厅入口
- 能打开活动详情
- 验证登录、返回键、外部链接、Deep Link 和基础导航

### M2：核心闭环

- 登录
- 报名
- 通知
- 原生推送
- 我要组局
- 分享 / deep link

### M3：APP 特有能力

- 扫码签到
- 图片上传
- 桌游工具现场体验

### M4：发布准备

- 隐私政策
- 权限说明
- 内测包
- Play Store 素材
- 设备兼容测试
