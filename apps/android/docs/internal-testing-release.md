# Friemi Android 内测 APK / AAB 发布说明

这个文档用于第 4 项：内测 APK / 签名 / 隐私政策 / 权限说明。

目标不是马上公开上架，而是先形成可重复的内部测试包流程：签名方式明确、版本号可追踪、权限和隐私说明可提交审核、测试人员可以稳定安装和反馈。

## 分支范围

建议分支：

```text
feature/v2-android-internal-testing-release
```

本分支覆盖：

- Release signing 参数接入
- 内测 APK / AAB 构建命令
- Play Console Internal testing 操作清单
- 权限声明和隐私政策草案入口
- 真实 SHA-256 / App Links 检查项

本分支不覆盖：

- 真正发布到 Play Store
- Firebase 生产项目配置
- FCM 真机推送验收
- 扫码签到、原生聊天或原生通知中心

## Release 签名策略

Android release 包必须签名。推荐使用 Google Play App Signing：

- 本地保存 upload key，用于上传 AAB。
- Google Play 保存 app signing key，用于最终分发。
- upload key 丢失后可以向 Google 申请重置；app signing key 不建议自己手动管理。

密钥文件不要提交到 Git。当前忽略规则已覆盖：

```text
*.jks
*.keystore
*.p12
*.pem
keystore.properties
apps/android/app/google-services.json
```

## 生成 Upload Key

只在可信机器上执行一次。路径可以换成你自己的安全目录。

```bash
mkdir -p "$HOME/.friemi/android"

keytool -genkeypair \
  -v \
  -keystore "$HOME/.friemi/android/friemi-upload.jks" \
  -alias friemi-upload \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

记录这些信息到你的密码管理器，不要写进仓库：

```text
FRIEMI_RELEASE_STORE_FILE=
FRIEMI_RELEASE_STORE_PASSWORD=
FRIEMI_RELEASE_KEY_ALIAS=friemi-upload
FRIEMI_RELEASE_KEY_PASSWORD=
```

如果 key password 和 store password 一样，可以不单独设置 `FRIEMI_RELEASE_KEY_PASSWORD`，Gradle 会用 store password 兜底。

## 获取 SHA-256

App Links、Google OAuth Android client 和 Play Console 都会用到 SHA-256。

```bash
keytool -list -v \
  -keystore "$HOME/.friemi/android/friemi-upload.jks" \
  -alias friemi-upload \
  | rg "SHA1|SHA256"
```

需要记录：

- Debug SHA-256：用于本地 / 预览排查
- Upload key SHA-256：用于 Play Console 上传签名
- Play App Signing SHA-256：用于生产 App Links 和 OAuth，以上架后台显示为准

## 推荐的本机签名配置

推荐放到本机 `~/.gradle/gradle.properties`，避免每次命令行输入密码，也避免 shell history 泄露。

```properties
friemiReleaseStoreFile=/home/ubuntu23/.friemi/android/friemi-upload.jks
friemiReleaseStorePassword=REPLACE_WITH_STORE_PASSWORD
friemiReleaseKeyAlias=friemi-upload
friemiReleaseKeyPassword=REPLACE_WITH_KEY_PASSWORD
```

也可以临时使用环境变量：

```bash
export FRIEMI_RELEASE_STORE_FILE="$HOME/.friemi/android/friemi-upload.jks"
export FRIEMI_RELEASE_STORE_PASSWORD="REPLACE_WITH_STORE_PASSWORD"
export FRIEMI_RELEASE_KEY_ALIAS="friemi-upload"
export FRIEMI_RELEASE_KEY_PASSWORD="REPLACE_WITH_KEY_PASSWORD"
```

## 构建内测 AAB

Play Console 推荐上传 AAB。

```bash
cd /home/ubuntu23/Bureau/friemi/apps/android

./gradlew clean :app:bundleRelease \
  -PfriemiBaseUrl=https://www.friemi.com \
  -PfriemiVersionCode=2 \
  -PfriemiVersionName=0.1.0-internal2
```

输出：

```text
apps/android/app/build/outputs/bundle/release/app-release.aab
```

如果签名参数完整，输出 AAB 会使用 release signing config；如果签名参数缺失，构建仍可用于本地检查，但不能作为正式内测包上传。

## 构建内测 APK

APK 适合直接发给少量测试机安装验证。

```bash
cd /home/ubuntu23/Bureau/friemi/apps/android

./gradlew clean :app:assembleRelease \
  -PfriemiBaseUrl=https://www.friemi.com \
  -PfriemiVersionCode=2 \
  -PfriemiVersionName=0.1.0-internal2
```

输出：

```text
apps/android/app/build/outputs/apk/release/app-release.apk
```

如果没有签名参数，输出会是：

```text
apps/android/app/build/outputs/apk/release/app-release-unsigned.apk
```

## 验证 APK 是否签名

```bash
APK=/home/ubuntu23/Bureau/friemi/apps/android/app/build/outputs/apk/release/app-release.apk

apksigner verify --verbose --print-certs "$APK"
```

应该看到：

```text
Verified using v1 scheme ...
Verified using v2 scheme ...
Signer #1 certificate SHA-256 digest: ...
```

如果系统找不到 `apksigner`，通常在：

```text
$ANDROID_HOME/build-tools/<version>/apksigner
```

## Play Console 内测流程

1. 创建 App，package name 使用：

```text
com.friemi.app
```

2. 启用 Play App Signing。

3. 上传第一个 AAB：

```text
apps/android/app/build/outputs/bundle/release/app-release.aab
```

4. 创建 Internal testing track。

5. 添加测试账号邮箱列表。

6. 填写版本说明：

```text
Friemi Android internal test.
- Mobile hall and activity browsing
- Google / Clerk sign-in through secure browser flow
- Deep links for activities, messages and notifications
- Native loading, retry and back handling
```

7. 补齐 Data safety、隐私政策 URL、App content 和权限说明。

8. 发布到 internal testing，等待 Play Console 生成测试链接。

## App Links 和 OAuth 检查

内测包使用生产域名时必须确认：

- `https://www.friemi.com/.well-known/assetlinks.json` 已发布
- `assetlinks.json` 使用生产 release / Play App Signing SHA-256
- Clerk / Google OAuth 允许生产域名回调
- Web 端 `/{locale}/android-auth-complete` 已部署
- App 构建使用 `-PfriemiBaseUrl=https://www.friemi.com`

如果 App Links 没配好，Google 登录可能仍然完成，但回跳体验会依赖 Custom Tabs / fallback，不能作为正式内测验收结果。

## 内测前真机检查

- 冷启动无白屏，首屏进入大厅。
- 登录按钮点击后走 Custom Tabs，完成后自动回到 App。
- 右上角能从登录按钮刷新为用户头像。
- Android 返回键：弹窗优先关闭，首页二次返回退出。
- 通知权限只在 Android 13+ 出现一次。
- 未登录报名时进入登录引导，不展示游客报名优先路径。
- 活动详情、组局详情、消息、通知、外部分享链接能正确打开。
- 文件上传、保存图片、复制链接、打开地图仍可用。
- Release 包无法用 Chrome DevTools 调试 WebView。

## 版本号规则

- `versionCode` 每次上传 Play Console 必须递增。
- `versionName` 建议使用：

```text
0.1.0-internal1
0.1.0-internal2
0.1.0-beta1
```

- 不要重新上传相同 `versionCode`。

## 失败回滚

- 内测包体验异常：暂停对应 Internal testing release。
- 登录回跳异常：先检查 App Links / OAuth callback / `android-auth-complete`。
- 推送异常：不影响基础 App 使用，先检查 Firebase 配置和 `MobileDevice` 注册。
- 签名异常：不要重新生成 package name；确认 upload key 和 Play App Signing 配置。
