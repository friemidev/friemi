# Friemi Android 隐私政策与权限说明

这个文档用于准备 Android 内测和后续 Play Console 审核。它不是最终法律文本，但可以作为隐私政策、Data safety 和权限说明的工程草案。

## 当前权限

当前 Android Manifest 声明：

```text
android.permission.INTERNET
android.permission.POST_NOTIFICATIONS
```

### INTERNET

用途：

- 加载 Friemi Web App
- 登录、报名、消息、通知、活动详情和图片资源访问
- 访问 Friemi API

用户提示：

```text
Friemi 需要联网加载活动、组局、消息和账号信息。
```

### POST_NOTIFICATIONS

用途：

- Android 13+ 发送系统通知
- 提醒报名审核、好友请求、消息和活动更新

请求时机：

- 不在冷启动第一秒强行弹出
- 登录后或用户进入通知相关能力时请求
- 用户拒绝后不反复打扰

用户提示：

```text
开启通知后，你可以及时收到报名、消息和活动更新。
```

## 后续可能新增权限

这些权限暂不属于当前内测最小包，只有对应功能上线时才添加。

### CAMERA

触发功能：

- 线下活动签到扫码
- 桌游房间扫码加入

请求时机：

- 用户点击“扫码签到”或“扫码加入”后再请求

用户提示：

```text
Friemi 需要使用相机扫描签到码或桌游房间码。
```

### 图片选择 / 媒体访问

优先策略：

- Android Photo Picker 优先，不主动申请全量相册权限
- 只有旧系统或特殊上传需求再考虑 `READ_MEDIA_IMAGES`

触发功能：

- 上传头像
- 上传组局封面
- 聊天发送图片
- 保存分享海报

用户提示：

```text
Friemi 只会读取你选择的图片，用于头像、组局封面、聊天图片或分享海报。
```

### 位置权限

当前建议：

- 暂不主动申请原生定位权限
- 活动和组局地点主要由用户输入或 Web 地图完成

未来可能场景：

- 附近活动
- 签到距离校验
- 地图导航增强

如果未来新增，需要单独评估：

- `ACCESS_COARSE_LOCATION`
- `ACCESS_FINE_LOCATION`

用户提示：

```text
Friemi 使用你的位置帮助发现附近活动或完成线下签到校验。
```

## Play Console Data Safety 草案

### 收集的数据类型

账号信息：

- 邮箱
- 用户名 / 昵称
- 头像
- 第三方登录标识

联系方式：

- 邮箱
- 绑定手机号，若上线
- 微信号，若用户主动填写

用户生成内容：

- 组局标题、描述、时间、地点、费用、封面
- 报名记录
- 评论、消息、公告
- 举报和反馈

图片和文件：

- 头像
- 组局封面
- 聊天图片，若上线
- 分享海报，若保存或上传

设备和 App 信息：

- FCM registration token
- device id，App 生成的设备标识
- App version
- locale
- timezone
- user agent
- last seen time

粗略位置或地址信息：

- 活动 / 组局城市
- 用户主动填写的活动地点
- 未来如果启用定位签到，再单独声明位置权限

### 数据用途

- 账号登录和身份识别
- 活动 / 组局发布、报名和管理
- 消息、通知和推送
- 安全风控、举报处理和反滥用
- 产品体验优化和故障排查
- 用户请求的数据导出、删除或客服支持

### 是否与第三方共享

当前需要声明会使用第三方服务处理必要数据：

- Clerk：登录和账号认证
- Supabase / PostgreSQL：数据库和存储
- Vercel：网站和 API 托管
- Firebase Cloud Messaging：Android 系统推送
- Google OAuth / Play Services：Google 登录和 Android 分发

这些服务应只用于 Friemi 产品运行所需的数据处理，不用于出售用户数据。

## 隐私政策正式页需要覆盖

建议上线页面：

```text
https://www.friemi.com/privacy
```

或多语言路径：

```text
https://www.friemi.com/zh-CN/privacy
https://www.friemi.com/en/privacy
https://www.friemi.com/fr/privacy
```

正式隐私政策至少覆盖：

- 我们是谁和联系方式
- 收集哪些信息
- 为什么收集这些信息
- 第三方服务和数据处理方
- 数据保留周期
- 用户如何修改资料、解绑联系方式、删除账号
- 用户如何要求删除数据
- 未成年人使用限制
- 安全措施
- 政策更新方式

## 隐私政策中文草案

以下文本可作为第一版基础，发布前仍建议人工复核。

```text
Friemi 隐私政策

Friemi 是面向活动发现和组局的产品。我们会收集你主动提供的信息，以及为了提供服务所必需的技术信息。

我们可能收集的信息包括：账号邮箱、昵称、头像、第三方登录标识、你发布或报名的活动信息、你填写的联系方式、消息和通知记录、上传的图片、设备标识、App 版本、语言、时区和推送 token。

我们使用这些信息来完成登录、活动展示、组局报名、消息通知、报名审核、好友互动、安全风控、故障排查和产品改进。

Friemi 不出售用户个人信息。为了运行服务，我们会使用 Clerk、Supabase、Vercel、Firebase Cloud Messaging、Google OAuth 和 Google Play 等第三方服务。这些服务只会在必要范围内处理与 Friemi 功能相关的数据。

你可以在个人资料中修改昵称、头像和部分联系方式。你也可以联系我们请求删除账号或相关数据。

联系方式：friemi.dev@gmail.com
```

## 权限弹窗文案原则

- 不要在启动时一次性申请全部权限。
- 只有用户触发对应功能时再申请。
- 文案说清楚具体用途，不使用“为了更好体验”这种空泛说法。
- 用户拒绝权限后，提供功能级降级，不反复弹窗。

## 内测发布前必须确认

- Play Console 隐私政策 URL 可访问。
- Data safety 与实际权限、实际数据收集一致。
- `POST_NOTIFICATIONS` 的请求时机不打扰用户。
- 当前 APK 不声明还没上线的相机、位置和相册权限。
- 删除账号 / 删除数据的联系路径清楚。
