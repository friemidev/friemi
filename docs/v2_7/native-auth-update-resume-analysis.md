# Friemi v2.7 Android 更新、登录保持与回 App 故障分析

日期：2026-08-13

分支：`fix/v2-7-native-auth-resume-analysis`

状态：静态代码分析和线上入口检查完成；真机日志与稳定复现待补充；本分支暂不修改认证行为

## 1. 本次用户现象

用户描述的实际过程如下：

1. 打开 App 后发现处于游客状态。
2. 点击登录，在外部认证页面完成登录。
3. 页面显示“回到 App”，但点击后没有真正进入 App；页面中的加载角色每次只转动一小段。
4. 多次点击仍无法进入，用户判断当前无法登录。
5. 强制退出 App 后重新打开，出现“登录完成”状态，随后正常进入。

这不是单纯的“账号或密码错误”。“登录完成”能在冷启动后出现，说明外部认证很可能已经成功，失败点更接近：

- 认证结果没有可靠地交给正在运行的 App；或
- App 已收到回调，但 WebView 没有及时同步 Clerk 会话；或
- 回调、App 恢复和自动重试之间发生时序竞争。

目前没有连接报告问题的 Android 真机，也没有该次登录的生命周期日志，因此本文将“已确认事实”和“高概率推断”分开记录。

## 2. 先回答：每次更新都要重新登录吗

### 结论

**不应该。**

正常网页部署不会替换 Android App 的本地数据。使用相同包名、相同签名证书进行覆盖更新时，WebView Cookie 和 App 数据也应继续保留，用户不应该因为每次发布而重新登录。

当前代码没有在 App 启动或网页更新时主动清除 Cookie、WebStorage 或缓存。Android 壳还明确开启 Cookie 并在页面完成后调用 `CookieManager.flush()`：

- `apps/android/app/src/main/java/com/friemi/app/MainActivity.java:368`
- `apps/android/app/src/main/java/com/friemi/app/MainActivity.java:1266`

### 以下情况会表现为“更新后重新登录”

| 情况                                    | 是否属于正常结果 | 原因                                                                           |
| --------------------------------------- | ---------------- | ------------------------------------------------------------------------------ |
| 仅部署 Vercel 网页                      | 否               | 不应删除 App WebView 的本地会话                                                |
| Google Play 使用同包名、同签名覆盖升级  | 否               | 系统把它识别为原 App 的升级                                                    |
| `adb install -r` 同包名、同签名覆盖安装 | 否               | `-r` 保留现有应用数据                                                          |
| 卸载后重新安装                          | 是               | 卸载会清除该安装的 WebView Cookie 和应用数据                                   |
| Android Studio/脚本先卸载再安装         | 是               | 实际执行的是重装，不是覆盖升级                                                 |
| 从 debug 切换到 release                 | 是               | debug 包名是 `com.friemi.app.debug`，release 是 `com.friemi.app`，属于两个 App |
| 使用不同签名重新安装                    | 通常是           | Android 不允许无签名继承关系的 APK 直接覆盖，测试时往往只能先卸载              |
| Clerk 会话过期、被撤销或切换 Clerk 项目 | 是               | 认证服务已不再认可旧会话                                                       |
| App 构建域名从 Preview 切到 Production  | 可能             | Cookie 按域名隔离，两个域名不会共用登录状态                                    |

Android 官方说明，更新必须保持相同 application ID 和兼容签名；签名不一致时会被视为新应用。当前项目配置也明确区分 release 与 `.debug` 包：

- `apps/android/app/build.gradle.kts:71`
- `apps/android/app/build.gradle.kts:95`
- [Android App updates](https://developer.android.com/google/play/app-updates)
- [Android App signing](https://developer.android.com/studio/publish/app-signing)

### 当前不能确认的部分

本轮 `adb devices -l` 没有发现连接设备，因此还不能确认报告问题的安装包：

- 是 `com.friemi.app` 还是 `com.friemi.app.debug`；
- 是 Play 覆盖更新、`adb install -r`，还是卸载重装；
- 当前安装版本、首次安装时间和最近更新时间；
- 登录失败发生时 App 收到的 Intent 与当前 WebView URL。

所以，“游客状态”可能是安装方式造成的独立问题，不能直接和“回到 App 失败”合并成同一个根因。

## 3. 当前 Android 登录链路

```text
Android WebView
  -> Friemi /sign-in
  -> Clerk 登录组件
  -> Google / Clerk 页面进入 Custom Tab
  -> 认证成功后进入 /android-auth-complete
  -> 网页尝试打开 friemi://auth-complete?target=...&webBase=...
  -> MainActivity.onNewIntent() 或冷启动 onCreate()
  -> App 将 target 转成 WebView URL
  -> 添加 __friemi_android_auth_return=1
  -> WebView 多次 router.refresh()
  -> Clerk 客户端与服务端均识别登录后清理标记
```

对应代码：

- 原生 App 使用特定 User-Agent：`MainActivity.java:363`
- 登录页把 Android 成功地址改为 `/android-auth-complete`：`apps/web/app/[locale]/sign-in/[[...sign-in]]/page.tsx:79`
- 完成页在 180ms 后尝试打开 `friemi://auth-complete`：`apps/web/features/auth/components/AndroidAuthCompleteRedirect.tsx:22`
- “回到 App”按钮仍是同一个自定义 scheme 链接：`AndroidAuthCompleteRedirect.tsx:69`
- MainActivity 使用 `singleTask`：`apps/android/app/src/main/AndroidManifest.xml:22`
- 已运行实例应通过 `onNewIntent()` 接收新 Intent：`MainActivity.java:118`
- App 回跳后由网页组件执行 120 / 650 / 1500ms 三次刷新：`apps/web/features/auth/components/AndroidAuthReturnRefresh.tsx:115`

Android 官方文档确认，`singleTask` 已有实例接收新导航时会通过 `onNewIntent()` 获得 Intent：

- [Android activity launch mode](https://developer.android.com/guide/topics/manifest/activity-element)
- [Tasks and back stack](https://developer.android.com/guide/components/activities/tasks-and-back-stack)

## 4. 已确认的代码风险

### 4.1 App 恢复与认证回调由两条独立路径处理

`onNewIntent()` 会清除待处理认证并加载回跳 URL：

```java
setIntent(intent);
clearPendingAuthBrowser();
loadUrl(buildLaunchUrl(intent));
```

但 `onResume()` 会执行另一套逻辑：

```java
maybeResumePendingAuthBrowser();
```

只要 WebView 仍停留在登录路由、认证浏览器已打开超过 3.5 秒，`maybeResumePendingAuthBrowser()` 就会在 350ms 后重新打开原认证 URL。

这意味着：

- 正确收到 deep link 时，系统依赖 `onNewIntent()` 及时清除 pending 状态；
- deep link 没送达、送达较晚或恢复路径异常时，App 不会主动核对“外部登录是否已成功”，而会再次打开旧认证页；
- 用户看到的是按钮有反应或页面重新开始加载，但 App 没进入最终页面。

这与本次“多次点击只看到加载图动一点、强退后才完成”的现象一致，但还需要真机生命周期日志证明具体调用顺序。

“回到 App”当前只是普通 `<a href="friemi://...">`，没有等待或确认原生端已消费 Intent。页面里的角色加载图则是 `BrandLoader` 使用的 GIF。因此，角色每次移动一小段最多说明浏览器页面发生了重绘、重新尝试导航或 GIF 继续播放，不能证明 Android 已经收到认证回调。

风险位置：

- `apps/web/features/auth/components/AndroidAuthCompleteRedirect.tsx:59`
- `apps/web/components/ui/BrandLoader.tsx:41`
- `MainActivity.java:119`
- `MainActivity.java:127`
- `MainActivity.java:1136`
- `MainActivity.java:1169`

### 4.2 待处理认证状态只保存在内存

以下三项都是 Activity 字段，并没有写入 `SharedPreferences`：

- `pendingAuthBrowserUrl`
- `pendingAuthStartedAt`
- `pendingAuthAutoRetryUsed`

当 Android 因内存压力终止进程、App 被强退或 Activity 被重新创建时，这些状态会丢失。冷启动和热恢复因此会走不同代码路径，也就容易出现“冷启动反而成功、正常返回却卡住”的不一致体验。

风险位置：`MainActivity.java:93`

### 4.3 Custom Tab 与 WebView 不是同一个会话容器

Google 登录适合放在 Custom Tab，因为它使用系统浏览器环境；但 Friemi 主界面运行在 WebView。Android 官方文档说明 Custom Tab 共享的是默认浏览器状态，而不是 Friemi WebView 的 Cookie 容器。

当前实现因此需要额外的 deep link、Clerk handshake 和 WebView 刷新来完成会话交接。这个交接比普通网页同一浏览器内登录更容易受网络和生命周期时序影响。

- [Android in-app browsing comparison](https://developer.android.com/develop/ui/views/layout/webapps/in-app-browsing-embedded-web)
- [Clerk handshake overview](https://clerk.com/docs/guides/how-clerk-works/overview)

### 4.4 网页传递 `webBase`，Android 端却忽略

网页生成的回调已经包含来源域名：

```text
friemi://auth-complete?target=...&webBase=https://...
```

但 `normalizeIncomingUri()` 只读取 `target`，最终始终使用 APK 编译时的 `BuildConfig.FRIEMI_BASE_URL`。

因此，若 Preview APK、生产 APK、Preview 网页或正式网页混合测试，可能发生：

1. 在 A 域名完成认证；
2. 回到 App 后打开 B 域名；
3. B 域名没有 A 的 Cookie；
4. 用户仍显示游客或再次进入登录。

风险位置：

- `apps/web/features/auth/components/AndroidAuthCompleteRedirect.tsx:23`
- `MainActivity.java:418`
- `MainActivity.java:483`

### 4.5 App 声明了 HTTPS App Link，但线上没有验证文件

Manifest 配置了 `android:autoVerify="true"` 的 HTTPS Intent Filter，但在 2026-08-13 检查：

```text
https://www.friemi.com/.well-known/assetlinks.json -> HTTP 404
```

所以目前不能把已验证 HTTPS App Link 作为 `friemi://` 失败时的可靠备用通道。自定义 scheme 仍是单点回跳方式。

### 4.6 网页只在带回跳参数时同步会话

`AndroidAuthReturnRefresh` 只有看到 `__friemi_android_auth_return=1` 才启动同步覆盖层和重试。如果 App 只是从 Custom Tab 恢复，但 deep link 未送达，WebView 不会收到该参数，也不会进入这套认证恢复逻辑。

通用的 `AuthSessionRefresh` 只在 Clerk 客户端状态和服务端状态已经不一致时刷新路由；它没有监听 Android Activity 恢复事件，也不能代替丢失的 deep link。

风险位置：

- `apps/web/features/auth/components/AndroidAuthReturnRefresh.tsx:107`
- `apps/web/features/auth/components/AuthSessionRefresh.tsx:25`

### 4.7 Web 端已监听 Android resume，但原生端没有派发

`PresenceHeartbeat` 已监听 `friemi:android-resume`，说明项目已有原生恢复事件约定；但 MainActivity 当前没有找到派发该事件的代码。认证层也没有复用统一的恢复事件。

风险位置：`apps/web/features/profile/components/PresenceHeartbeat.tsx:7`

## 5. 根因排序

| 优先级 | 候选根因                                                     | 置信度 | 可解释的现象                                     | 仍缺少的证据                                               |
| ------ | ------------------------------------------------------------ | ------ | ------------------------------------------------ | ---------------------------------------------------------- |
| P0     | 自定义 scheme 在热状态没有可靠送达或没有被当前 Activity 消费 | 高     | 点击“回到 App”无跳转，冷启动后才能完成           | `onNewIntent()` 日志、收到的 URI、浏览器类型               |
| P0     | App 恢复时自动重开旧认证 URL，与最终回调/会话同步形成竞态    | 中高   | 多次点击只重新触发页面，无法进入最终目标         | `onResume()`、延迟任务和 `onNewIntent()` 的时间顺序        |
| P0     | Custom Tab 成功后 WebView Clerk 会话交接未完成               | 中高   | 外部已登录，App 仍显示游客；稍后或重启才同步成功 | Clerk 客户端加载状态、WebView Cookie 名称与 handshake 状态 |
| P1     | Preview/Production 来源与 APK `FRIEMI_BASE_URL` 不一致       | 中     | `webBase` 被忽略，跨域时必然无法直接继承 Cookie  | 报告设备的 APK 构建参数和认证页实际域名                    |
| P1     | 实际安装过程是重装、换包或换签名                             | 中     | 更新后首次打开变游客                             | 包名、签名、首次安装和更新时间                             |
| P2     | Clerk 会话正常过期或被撤销                                   | 低到中 | 可解释游客状态，但不能解释“回到 App”按钮失效     | Clerk Dashboard 会话事件                                   |

## 6. 建议的实施顺序

### P0：先补证据，不改变登录协议

风险：极低

方案：

- 为每次认证生成不含用户隐私的 `authAttemptId`。
- 记录 `onPause`、`onStop`、`onResume`、`onNewIntent` 和 `onCreate` 的时间顺序。
- 记录收到的 scheme、host、目标 path 和来源 host；不记录 token、code、邮箱或完整 query。
- 记录 WebView 当前 host/path、是否处于 auth route、pending 状态及持续时间。
- 网页记录 Clerk 的 `isLoaded` / `isSignedIn` 布尔状态和回跳阶段。
- 支持通过 `adb logcat` 一次性导出单次认证完整轨迹。

预期：一次复现即可确认问题发生在“浏览器未发 Intent”“Activity 未消费 Intent”还是“WebView 未同步会话”。

### P1：让热返回成为幂等流程

风险：低到中

方案：

- 将 pending attempt、目标和时间写入 `SharedPreferences`，进程重建后仍可恢复。
- `onNewIntent()` 先原子标记 attempt 已完成，再取消所有自动重试任务。
- 普通 `onResume()` 不再直接重开旧认证页；先向 WebView 派发统一 `friemi:android-resume` 事件并检查认证结果。
- 只有在明确确认“仍未完成且用户仍在登录页”后，展示可理解的“继续登录/取消”操作，不自动抢占页面。
- 每个 attempt 只消费一次；重复点击“回到 App”不能创建重复页面或重复 Custom Tab。
- Android 端读取并校验 `webBase`，只允许编译域名和 Friemi 白名单域名，保证回到发起认证的同一环境。

预期：App 在后台存活、Activity 被重建和进程被系统回收三种状态下都走同一结果。

### P2：增加可靠的回跳通道

风险：中

方案：

- 部署 `/.well-known/assetlinks.json`，配置正式和预览发布使用的签名 SHA-256。
- 将验证过的 HTTPS App Link 作为主回调或可靠备用回调。
- 保留 `friemi://` 作为旧版本兼容路径，并给失败页面明确反馈，避免无限点击同一个链接。

预期：Chrome、系统默认浏览器和不同 Android 版本都能稳定打开正确 App；没有安装 App 时仍可停留网页版。

### P3：改为 Android 原生 Clerk 登录

风险：中高，但长期稳定性最好

方案：

- 评估 Clerk Android SDK 和 Android Credential Manager 的原生登录。
- 参考项目现有 iOS 原生 Google/Apple ticket 交换方式，为 Android 建立一次性 ticket/session 交接。
- 不再依赖 Custom Tab Cookie 与 WebView Cookie 的间接同步。
- 使用 PKCE 或 Clerk 官方 Native API，不在 APK 内保存 client secret。

Clerk 已提供 Android Native SDK、认证流程和 Native API。该方向不是本次低风险修补的前置条件，但适合作为长期收敛方案：

- [Clerk Android SDK overview](https://clerk.com/docs/android/reference/native-mobile/overview)
- [Clerk Android quickstart](https://clerk.com/docs/android/getting-started/quickstart)
- [Clerk native authentication flows](https://clerk.com/docs/reference/native-mobile/auth)

## 7. 真机测试矩阵

### 登录保持

- [ ] 正式版保持登录，Vercel 仅发布网页更新，重新打开 App 仍为登录状态。
- [ ] 同签名、同包名 APK 使用覆盖升级，重新打开 App 仍为登录状态。
- [ ] Play Internal Testing 从旧 `versionCode` 更新到新版本，仍为登录状态。
- [ ] 明确验证卸载重装会退出，并与覆盖升级结果区分记录。
- [ ] 明确验证 `com.friemi.app.debug` 与 `com.friemi.app` 是两套独立会话。

### 登录回跳

- [ ] App 前台进入登录，Google 成功后一次自动回到 App。
- [ ] 自动回跳失败时，点击一次“回到 App”可以进入，不需要强退。
- [ ] App 在后台但进程存活时完成登录。
- [ ] Activity 被系统重建后完成登录。
- [ ] App 进程被系统回收后完成登录。
- [ ] 用户在 Custom Tab 手动返回，再继续登录，不出现重复 Custom Tab。
- [ ] 连续点击“回到 App”不会产生多次路由加载或多份登录状态。
- [ ] 慢网、断网恢复和 Clerk handshake 延迟下给出可理解的失败提示。
- [ ] Chrome、Samsung Internet 和至少一个非 Chrome 默认浏览器完成测试。
- [ ] Android 8、Android 13 和 Android 15/16 至少覆盖三档系统。
- [ ] Preview APK 只回 Preview 域名，Production APK 只回正式域名。

### 安全与隐私

- [ ] 日志不输出 OAuth code、Clerk token、Cookie 值、邮箱或完整回调 URL。
- [ ] 回跳目标只接受 Friemi 允许域名和站内 path。
- [ ] 重复、过期和伪造 attempt 无法覆盖当前有效会话。

## 8. 验收标准

### 功能

- [ ] 网页发布不导致已登录 Android 用户变为游客。
- [ ] 正常覆盖升级不导致已登录 Android 用户变为游客。
- [ ] 登录成功后无需强制退出 App，一次回跳即可进入目标页面。
- [ ] 热启动、冷启动和进程重建结果一致。
- [ ] 登录失败时有明确原因和恢复操作，不出现只能反复点击加载图的死循环。

### 稳定性

- [ ] 每个重点设备/浏览器组合连续登录 20 次，成功回 App 率 100%。
- [ ] 同一认证 attempt 不重复打开 Custom Tab。
- [ ] 回调进入 App 后 3 秒内完成状态同步；慢网超过阈值时显示可操作错误。
- [ ] 认证恢复不触发无限 `router.refresh()` 或重定向循环。

### 可观测性

- [ ] 单个 `authAttemptId` 能串起网页、Custom Tab、Activity 和 WebView 四段事件。
- [ ] 能区分 deep link 未送达、域名不一致、Clerk 未加载和会话无效。
- [ ] 线上指标可以统计回跳成功率、P95 回跳时长和重复点击次数。

## 9. 本分支 Checklist

- [x] 建立独立分析分支。
- [x] 检查 Android 包名、debug/release 差异和 Cookie 清理逻辑。
- [x] 检查登录完成页、自定义 scheme、Activity 生命周期和 WebView 会话同步链路。
- [x] 确认 `webBase` 当前未被 Android 消费。
- [x] 检查正式站 `android-auth-complete` 可访问。
- [x] 确认正式站 `/.well-known/assetlinks.json` 当前为 404。
- [x] 将已确认事实与待真机验证推断分开记录。
- [ ] 连接报告问题的 Android 设备并采集包信息。
- [ ] 加入最小化认证生命周期日志。
- [ ] 在真机稳定复现一次热返回失败。
- [ ] 根据日志确认唯一根因后批准 P1 修复。

## 10. 当前结论

1. **Friemi 更新后要求重新登录不是预期行为。** 如果确实每次发布都变游客，应先核对是否发生卸载重装、debug/release 切换、签名变化或域名变化。
2. **本次“强退后才登录完成”不是偶然现象可以直接忽略。** 当前认证链路确实存在热恢复、状态持久化、域名一致性和单一回跳通道方面的结构性风险。
3. **不建议先增加更多自动刷新或延长加载动画。** 这会掩盖回调丢失，并可能让重定向竞争更严重。
4. **下一步应先加脱敏日志并复现，再做 P1 幂等恢复。** 这是对现有功能影响最小、最容易回滚的处理顺序。
