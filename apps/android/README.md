# Friemi Android

Friemi Android is an Android Studio WebView shell for the existing mobile web experience.

Current branch scope:

- Load Friemi mobile hall by default: `/{locale}/mobile-home`
- Map Android system language to Friemi locale:
  - `zh* -> zh-CN`
  - `en* -> en`
  - all other languages -> `fr`
- Keep `/home` available through the web UI logo
- Support HTTPS App Links for `https://www.friemi.com/...`
- Support the custom debug scheme `friemi://...`
- Keep most Friemi pages in WebView, while external non-Friemi links open in the system browser
- Open Clerk / Google OAuth in Chrome Custom Tabs instead of WebView, avoiding Google `disallowed_useragent`
- Provide a small `window.FriemiAndroid` JavaScript bridge
- Support image file picking from WebView forms
- Show native loading and error states
- Lock orientation to portrait

This branch does not connect Firebase Cloud Messaging yet. `FriemiAndroid.registerPushToken()` currently returns a structured placeholder.

## Open In Android Studio

Open this folder:

```text
apps/android
```

The project uses:

- Application ID: `com.friemi.app`
- Debug application ID: `com.friemi.app.debug`
- Compile SDK: `36`
- Min SDK: `26`
- Java: `17`

## Debug Base URL

常用生产 / 预览 / 本地构建命令见：

```text
apps/android/docs/build-targets.md
```

By default, debug builds load production:

```text
https://www.friemi.com/{locale}/mobile-home
```

To test a local web server from an emulator:

```bash
./gradlew :app:assembleDebug -PfriemiBaseUrl=http://10.0.2.2:3000
```

To test a LAN device:

```bash
./gradlew :app:assembleDebug -PfriemiBaseUrl=http://192.168.x.x:3000
```

To test a Vercel Preview domain and register that same host in the debug manifest:

```bash
./gradlew :app:assembleDebug -PfriemiBaseUrl=https://your-preview.vercel.app
```

If the web host cannot publish a matching `assetlinks.json`, Android may still keep HTTPS callbacks in the browser. In that case the shell automatically retries the pending auth URL once when the user returns to the App, which removes the second manual sign-in tap in most Google / Clerk flows.

The debug build allows cleartext traffic. Release builds should use HTTPS.

## Google / Clerk Sign-In

Google OAuth must not run inside Android WebView. The shell keeps ordinary Friemi pages in WebView, but moves Clerk / Google OAuth URLs into Chrome Custom Tabs. This avoids Google `403: disallowed_useragent`.

Expected flow:

```text
Friemi WebView page
  -> user taps Google / Clerk sign-in
  -> Android opens the auth URL in Chrome Custom Tabs
  -> auth provider redirects to /{locale}/android-auth-complete
  -> that page opens friemi://auth-complete
  -> Android brings the target route back into the WebView shell
```

Production sign-in stability depends on real App Links:

- publish `/.well-known/assetlinks.json`
- include the real release SHA-256 fingerprint
- configure Clerk / Google redirect URLs to land on the Friemi production host

If Custom Tabs completes login but the WebView still does not receive the signed-in session, the next step is a dedicated session handoff route in the web app. Do not work around this by spoofing the WebView user-agent; Google blocks that class of OAuth flow by policy.

The WebView user-agent includes `FriemiAndroid/<version>`. The web sign-in pages use that signal to send successful Android app auth to `/{locale}/android-auth-complete`, which immediately opens `friemi://auth-complete?target=...`.

The shell also has a small fallback for incomplete callback handling: if the user finishes Google login in Custom Tabs and manually returns to Friemi while still on the sign-in page, Android reopens the pending auth URL once. Because Google / Clerk already have the browser session, the second pass should complete quickly without another user tap. This is a fallback, not a substitute for the dedicated Android auth-complete route.

## JavaScript Bridge

The native shell exposes:

```ts
window.FriemiAndroid?.getAppInfo()
window.FriemiAndroid?.saveLocale("zh-CN" | "en" | "fr")
window.FriemiAndroid?.openExternal(url)
window.FriemiAndroid?.share(JSON.stringify({ title, text, url }))
window.FriemiAndroid?.registerPushToken()
window.FriemiAndroid?.setBackBehavior(JSON.stringify({ hasModal: true }))
```

`getAppInfo()` returns a JSON string with platform, version, package, base URL, locale, and push placeholder status.

## App Links

Production App Links require:

- `apps/android/docs/assetlinks.template.json` copied to the web app as `/.well-known/assetlinks.json`
- Real SHA-256 fingerprints from debug / release signing keys
- Production host `https://www.friemi.com`
- `friemiAppLinkHost` matching the build's `friemiBaseUrl` host

Do not ship placeholder fingerprints.
