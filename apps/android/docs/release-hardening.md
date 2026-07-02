# Friemi Android 发布加固清单

这个文档记录 `feature/v2-android-release-hardening` 后 Android release 构建的固定检查项。签名、隐私政策和 Play Console 内测见 `apps/android/docs/internal-testing-release.md` 与 `apps/android/docs/privacy-permissions.md`。

## Release 构建目标

Release 包必须满足：

- 只加载正式域名：`https://www.friemi.com`
- 不允许 cleartext HTTP
- WebView release 不开启调试
- WebView 禁止 file URL 访问跨域能力
- WebView 开启 Safe Browsing
- R8 minify 和 resource shrink 开启
- Firebase 配置不存在时仍可构建；存在时可用于 FCM
- `versionCode` 和 `versionName` 可通过 Gradle 参数显式传入

## 常用命令

进入 Android 工程：

```bash
cd /home/ubuntu23/Bureau/friemi/apps/android
```

Release APK：

```bash
./gradlew clean :app:assembleRelease \
  -PfriemiBaseUrl=https://www.friemi.com \
  -PfriemiVersionCode=1 \
  -PfriemiVersionName=0.1.0
```

Release AAB：

```bash
./gradlew clean :app:bundleRelease \
  -PfriemiBaseUrl=https://www.friemi.com \
  -PfriemiVersionCode=1 \
  -PfriemiVersionName=0.1.0
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
