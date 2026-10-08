# Friemi Android 发布加固清单

这个文档记录 `feature/v2-android-release-hardening` 后 Android release 构建的固定检查项。签名、隐私政策和 Play Console 内测见 `apps/android/docs/internal-testing-release.md` 与 `apps/android/docs/privacy-permissions.md`。

## Release 构建目标

Release 包必须满足：

- 只加载正式域名：`https://www.friemi.com`
- 不允许 cleartext HTTP
- WebView release 不开启调试
- WebView 禁止 file URL 访问跨域能力
- WebView 开启 Safe Browsing
- R8 minify 和 AGP 9 优化型资源缩减开启
- Release AAB 自动附带可提取的原生调试符号（`FULL`）
- Firebase 配置不存在时仍可构建；存在时可用于 FCM
- `versionCode` 和 `versionName` 可通过 Gradle 参数显式传入

## R8 与构建工具

- Android Gradle Plugin 使用 `9.0.1`，Gradle Wrapper 使用 `9.1.0` 并校验官方下载包的 SHA-256，JDK 为 17。
- 使用支持 AGP 9.0 的 Android Studio；统一通过仓库的 `./gradlew` 构建，不使用旧版全局 Gradle。
- 使用 AGP 内置 Kotlin，不再应用 `org.jetbrains.kotlin.android`。Kotlin JVM target 自动跟随 Java 的 `targetCompatibility = VERSION_17`。
- Release 保留 `isMinifyEnabled = true`、`isShrinkResources = true` 和 `proguard-android-optimize.txt`。AGP 9 默认开启优化型资源缩减，不需要再添加旧版本的启用开关。
- 不要设置 `android.r8.optimizedResourceShrinking=false`、`android.enableR8.fullMode=false` 或 `-dontoptimize`。也不要为了消除警告添加保留整个应用的通配规则。
- 保留 `FriemiAndroidBridge` 的 `@JavascriptInterface` 方法规则，避免登录、分享、扫码和推送等 WebView 调用被混淆或删除。
- 此升级仅影响重新构建的 Android 包；网站部署不会改变已安装 App 的 R8 产物。下次正式发布仍需构建、签名并上传新 AAB，使用大于 Play Console 现有最高值的 `versionCode`。
- R8 优化原生 Java/Kotlin 代码和 Android 资源，不直接优化 WebView 中网页的网络请求或 JavaScript；实际内存和启动耗时需用同一设备、同一场景对比。

参考：[AGP 9.0 兼容性](https://developer.android.com/build/releases/agp-9-0-0-release-notes)、[优化型资源缩减](https://developer.android.com/topic/performance/app-optimization/enable-app-optimization)。

## 常用命令

进入 Android 工程：

```bash
cd /home/ubuntu23/Bureau/friemi/apps/android
```

Release APK：

```bash
./gradlew clean :app:assembleRelease \
  -PfriemiBaseUrl=https://www.friemi.com \
  -PfriemiVersionCode=2 \
  -PfriemiVersionName=0.1.0-internal2
```

Release AAB：

```bash
./gradlew clean :app:bundleRelease \
  -PfriemiBaseUrl=https://www.friemi.com \
  -PfriemiVersionCode=2 \
  -PfriemiVersionName=0.1.0-internal2
```

输出位置：

```text
apps/android/app/build/outputs/apk/release/app-release-unsigned.apk
apps/android/app/build/outputs/bundle/release/app-release.aab
```

如果已经配置 release signing 参数，APK 输出会变成：

```text
apps/android/app/build/outputs/apk/release/app-release.apk
```

## 崩溃调试文件

Release 已配置 `ndk.debugSymbolLevel = "FULL"`。下次构建 AAB 时，Android Gradle Plugin 会将可提取的原生调试信息放入 Bundle 元数据，由 Play Console 自动提取；无需关闭 R8、资源压缩或改用 debug 包。

- 原生调试符号用于解析 C/C++ 库崩溃的函数名、文件名和行号，不是 R8 的 `mapping.txt`。
- R8 映射文件仍由 release 构建生成，用于 Java/Kotlin 堆栈去混淆。
- 这项配置只影响下一次构建，不会给已上传的版本 16 自动补充符号。
- 下次上传必须使用比 Play Console 当前最高版本代码更大的 `versionCode`。
- 第三方 `.so` 如果已被供应方移除调试信息，Gradle 无法重新生成；应向供应方获取匹配符号，不要上传空 ZIP 或不匹配版本的文件来消除警告。

每次 release 构建应保留 AAB 和同次构建的调试文件，不要混用不同版本：

```text
apps/android/app/build/outputs/native-debug-symbols/release/native-debug-symbols.zip
apps/android/app/build/outputs/mapping/release/mapping.txt
```

原生符号 ZIP 仅在存在可提取元数据时生成。上传后，在 Play Console 的 App bundle 资源管理器中选择本次版本，检查调试符号和映射文件是否已识别。若需要单独补传，文件必须匹配该版本实际打包的原生库。

参考：[Android 原生调试符号说明](https://developer.android.com/build/include-native-symbols)。

## 版本号规则

- `versionCode` 每次上传 Play Console 必须递增。
- `versionName` 给用户看，建议和产品版本或内测版本对应，例如 `0.1.0-beta1`。
- 不要依赖默认版本号发布；release 构建时显式传 `-PfriemiVersionCode=` 和 `-PfriemiVersionName=`。

## Firebase 配置

FCM 真机推送需要：

```text
apps/android/app/google-services.json
```

该文件不要提交到 Git。它已经在 `apps/android/.gitignore` 中忽略。

服务端还需要：

```env
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

如果这些配置缺失，App 仍能构建运行，只是不会收到原生推送。

## App Links

生产 App Links 需要在网站发布：

```text
https://www.friemi.com/.well-known/assetlinks.json
```

检查项：

- package name 是 `com.friemi.app`
- SHA-256 是 release signing key 的 fingerprint，不是 debug key
- 不要发布模板中的 `REPLACE_WITH_*`
- 构建包时 `-PfriemiBaseUrl=https://www.friemi.com`

## 发布前手动检查

- 打开 App 首屏是大厅，不是浏览器 Custom Tab。
- 右上角登录状态能正确刷新。
- Google / Clerk 登录通过 Custom Tabs 后能回到 App。
- 通知权限只在 Android 13+ 请求一次，不反复弹。
- 断网时显示 App 级错误和重试入口。
- Android 返回键：弹窗优先关闭，首页二次返回退出。
- 外部链接、地图、下载、复制链接仍能使用。
- Release build 中 WebView 不可通过 Chrome DevTools 调试。
- 升级构建工具后，必须在开启 R8 的 release 包上回归 Google 登录返回、相册上传、扫码、分享、通知点击及冷启动；不能只测试未压缩的 debug 包。
