# Friemi Android 构建目标速查

这个文档记录 Android 壳在不同环境下的常用构建命令。每次切换 APP 测试场景时，优先看这里。

执行命令前先进入 Android 工程：

```bash
cd /home/ubuntu23/Bureau/friemi/apps/android
```

## 1. 生产环境

用途：

- 测 `https://www.friemi.com`
- 最接近正式 APK / 内测 APK
- 适合验证 Google / Clerk 登录、分享链接、正式域名 App Links

Debug APK：

```bash
./gradlew clean :app:assembleDebug -PfriemiBaseUrl=https://www.friemi.com
```

Release APK：

```bash
./gradlew clean :app:assembleRelease -PfriemiBaseUrl=https://www.friemi.com
```

注意：

- 生产登录回跳需要 `https://www.friemi.com/.well-known/assetlinks.json` 配置真实 SHA-256。
- `assetlinks.json` 模板在 `apps/android/docs/assetlinks.template.json`。
- 不要把模板里的 `REPLACE_WITH_*` 原样发布到生产。

## 2. Vercel Preview 环境

用途：

- 测还没合并到生产的 Web 改动
- 测 `/android-auth-complete` 这类网站层面的登录中转页
- 测某个 PR 对 Android WebView 壳的影响

把下面的域名换成当前 Vercel Preview URL：

```bash
PREVIEW_URL="https://your-preview.vercel.app"
./gradlew clean :app:assembleDebug -PfriemiBaseUrl="$PREVIEW_URL"
```

不要写成下面这种同一行形式：

```bash
PREVIEW_URL="https://your-preview.vercel.app" ./gradlew clean :app:assembleDebug -PfriemiBaseUrl="$PREVIEW_URL"
```

因为 shell 会先展开 `$PREVIEW_URL`，导致传给 Gradle 的值为空。

如果需要显式指定 App Link host：

```bash
PREVIEW_URL="https://your-preview.vercel.app"
PREVIEW_HOST="your-preview.vercel.app"
./gradlew clean :app:assembleDebug \
  -PfriemiBaseUrl="$PREVIEW_URL" \
  -PfriemiAppLinkHost="$PREVIEW_HOST"
```

注意：

- 预览域名通常没有正式 `assetlinks.json`，所以 HTTPS App Link 可能不会自动接回 APP。
- 当前壳已经有 `friemi://auth-complete` 中转兜底；只要 Preview 部署包含 `/android-auth-complete` 页面，就可以测试登录回 App。
- 如果测试的是 Google / Clerk 登录，优先用 Preview，而不是本地 HTTP。

## 3. 本地环境

用途：

- 测 Android WebView 页面适配
- 测 JS bridge、布局、返回键、文件选择
- 不建议作为 Google / Clerk OAuth 的主要测试环境

先启动 Web：

```bash
cd /home/ubuntu23/Bureau/friemi
npm run dev
```

Android 模拟器访问本机：

```bash
cd /home/ubuntu23/Bureau/friemi/apps/android
./gradlew clean :app:assembleDebug -PfriemiBaseUrl=http://10.0.2.2:3000
```

真实手机访问局域网电脑：

```bash
cd /home/ubuntu23/Bureau/friemi/apps/android
LAN_URL="http://192.168.x.x:3000"
./gradlew clean :app:assembleDebug -PfriemiBaseUrl="$LAN_URL"
```

把 `192.168.x.x` 换成电脑的局域网 IP。可以用：

```bash
hostname -I
```

注意：

- Debug 构建允许 cleartext HTTP；Release 构建不要使用 HTTP。
- Google / Clerk OAuth 对本地 HTTP、局域网 IP、回调域名限制更多，本地主要用来测非登录体验。
- 切换生产 / 预览 / 本地环境时一定带 `clean`，否则 Gradle 可能复用旧的 `BuildConfig.FRIEMI_BASE_URL`，导致 APK 仍然加载上一个环境。

## APK 输出位置

Debug：

```text
apps/android/app/build/outputs/apk/debug/app-debug.apk
```

Release：

```text
apps/android/app/build/outputs/apk/release/app-release-unsigned.apk
```

## 登录测试建议

完整 Google / Clerk 登录链路至少需要：

- APK 指向的 Web 域名已经部署最新代码
- 该域名包含 `/{locale}/android-auth-complete`
- WebView user-agent 能带上 `FriemiAndroid/<version>`
- Google OAuth 不在 WebView 内打开，而是在 Chrome Custom Tabs 内打开
- 登录完成后通过 `friemi://auth-complete` 或 HTTPS App Link 回到 APP

如果一打开 APP 就看到 Chrome 顶部浏览器栏，说明当前不是从 Friemi launcher WebView 正常进入，先关闭 Chrome / Custom Tabs 最近任务，再从手机桌面的 Friemi 图标进入。

## Chrome PWA 和原生壳不要混淆

如果手机突然弹出“下载 / 安装 Friemi app”，那通常是 Chrome 根据网站 `manifest.webmanifest` 安装的 PWA / WebAPK，不是 `apps/android` 里的原生壳 APK。

区别：

- 原生 Debug 包：`com.friemi.app.debug`
- Chrome 安装的 PWA：通常类似 `org.chromium.webapk.xxxxx`
- 如果顶部出现 `X / 下箭头 / 域名 / 三点菜单`，当前前台通常是 Chrome Custom Tab，不是 Android WebView 本体

查看当前前台页面属于哪个包：

```bash
adb shell dumpsys activity activities | rg "ResumedActivity|com.friemi|com.android.chrome|org.chromium"
```

查看手机里同时存在的 Friemi / WebAPK 包：

```bash
adb shell pm list packages | rg -i "friemi|webapk|chrome"
```

测试原生壳时，建议从 `Friemi Dev` 图标或下面命令启动：

```bash
adb shell am force-stop com.android.chrome
adb shell am force-stop com.friemi.app.debug
adb shell monkey -p com.friemi.app.debug -c android.intent.category.LAUNCHER 1
```
