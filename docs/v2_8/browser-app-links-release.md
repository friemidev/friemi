# Browser to Friemi app handoff

Implemented 2026-10-15. Website changes and NEW Android/iOS packages are both required for the complete flow. No database migration or new authentication credentials are needed. This change does not publish a release.

## Behavior

- Mobile web: an Open Friemi entry beside the existing plan participation controls, and app/store choices on sign-in and sign-up. Web sign-in and participation remain available; launching never automatically joins, cancels, pays, or posts.
- Installed apps: HTTPS App Links / Universal Links and `friemi://open?target=...` preserve the content route, locale, invitation access and fragment. Existing `friemi://auth-complete` login completion stays separate.
- Android Chrome: a user-tapped intent targets `com.friemi.app`. If it cannot open, a web page offers Google Play and a web continuation. No timer guesses whether the app is installed.
- Android fresh Play installs: recent public detail links can restore through Play Install Referrer. This is one-shot, bounded to five seconds, and canceled by interaction, backgrounding or a newer intent. It does not override an existing session's navigation. Private invitation credentials are NOT sent to Play; reopen their original link after installation.
- iOS: a user-tapped `https://friemi.com/open?...` crosses from www to the associated apex host. The browser fallback offers App Store, an explicit scheme retry and web continuation. Installation does not reliably preserve a destination on iOS; return to the original link after installation.
- WeChat: shows the browser-menu instructions and a copyable continuation link. Direct `wx-open-launch-app` is NOT enabled: a certified service account, JS security domain and approved/bound WeChat Open Platform mobile app are not yet available.
- Native Friemi login never shows the web app-download choices. Browser and native login sessions are independent; the app may still require one login.

## Website deployment first

1. Review and merge this branch to dev, then promote the reviewed changes to main through the normal workflow.
2. Both `friemi.com` and `www.friemi.com` must serve these endpoints with HTTP 200, JSON content type, no authentication and no redirect:
   - `/.well-known/assetlinks.json`
   - `/.well-known/apple-app-site-association`
3. `/open?target=%2Ffr%2Flobby%2FPLAN_ID` is deliberately excluded from locale/canonical middleware. Without an installed app it returns a 302 to the www handoff page, not an immediate store redirect. Do not add a blanket apex-domain redirect in Vercel that intercepts the association endpoints.
4. Public Android identity: `com.friemi.app`, Play App Signing SHA-256 `B6:37:6C:1B:AC:7F:9F:EB:0A:B6:FE:FE:8C:08:05:5B:25:20:B4:F4:B8:10:60:7A:62:F2:2A:45:73:D8:64:57`, read from Play Console's Digital Asset Links JSON. Do not replace it with the upload certificate. If signing-key rotation later introduces another supported certificate, publish both.
5. Public iOS identity: `SQFM8Y4B8X.com.friemi.app`. Confirm the signed app's `application-identifier` matches this value before uploading; transferred/legacy applications can have an App ID prefix different from the current team.

## Android package

1. Pull this revision, retain the project's release signing/Firebase files, increment the release version code as usual and build the release AAB. Do not replace its production base URL with the local preview URL.
2. Manifest contains verified content paths and `/open` (not all authentication paths), plus the existing custom scheme. The Play Install Referrer 2.2 dependency is included.
3. Test a Play-signed build through an internal testing track. A locally signed debug `.debug` package is deliberately NOT associated with the production domain.
4. On a test device, `adb shell pm verify-app-links --re-verify com.friemi.app`, then `adb shell pm get-app-links com.friemi.app` should show the production hosts as verified. Test links by tapping them in a browser/message, not just typing them in the address bar.

## iOS package

1. Pull this revision, run the existing iOS sync workflow (`npm run ios:sync --workspace=apps/web`) on the Mac, open `apps/ios/App/App.xcworkspace`, and run dependency installation if Xcode requests it.
2. The project includes `FriemiAppLinks.swift` in Sources and Associated Domains in `App.entitlements`: `applinks:friemi.com` and `applinks:www.friemi.com`.
3. Enable Associated Domains for the `com.friemi.app` App ID in Apple Developer if not already enabled. Refresh the provisioning profile / automatic signing. Keep the existing Apple sign-in and push entitlements.
4. Increment the build number, archive, and install via TestFlight for validation before App Store submission. Website-only deployment cannot add this entitlement to an existing installed package.
5. Optional routing test on the Mac, from `apps/ios`: `swiftc App/App/FriemiAppLinks.swift Tests/FriemiAppLinksTests.swift -o /tmp/friemi-app-links-tests` then `/tmp/friemi-app-links-tests`.

## Acceptance checklist

- Android and iOS, cold start and running app: tap a public plan, private invitation, planet and game invite link; correct content/language/query remains intact.
- Logged-out app: sign in with an existing account, return to the exact plan; no participation is created until the user confirms it.
- Installed app but user has disabled supported-link opening: explicit retry or store/web choices remain usable; no redirect loop.
- App not installed: correct store is offered. Android fresh public-plan install restores once if Play provides the referrer; iOS/private links retain the explicit reopen-original-link fallback.
- WeChat on both platforms: browser instructions/copy work; after opening externally the same target is retained. No claim of direct WeChat app opening.
- Browser-only continuation still works. Opening a host's external registration form remains separate from this feature.
- `sign-in`, OAuth callbacks and Android browser auth completion do not get captured by the new verified content-path filters.
- Verify on physical devices. Desktop emulation cannot validate OS association, store install attribution or native OAuth. Linux checks do not replace an Xcode archive.

## Local verification (2026-10-15)

- Web type check and production build passed; full test suite: 1084 passed, 1 skipped.
- Android debug Java compilation, 5 routing unit tests and `lintDebug` passed. Existing dependency/update warnings remain.
- Browser checks at 320/390 px mobile and 1280 px desktop: correct platform store, preserved access/locale/anchor, no horizontal overflow, all action targets at least 44 px.
- Browser round trip to the original plan preserved the existing joined state. Native iOS user-agent check hid the web app-download entry. WeChat clipboard success and denied-clipboard fallback both passed.
- Both association endpoints returned HTTP 200 with JSON locally; `/open` returned the expected locale-preserving 302 without a sign-in redirect.
- iOS project wiring and entitlement files were reviewed. The Foundation routing test and full iOS archive require the developer's Mac; no physical device was connected to this Linux host.

## Platform references

- [Android App Links](https://developer.android.com/training/app-links/about)
- [Chrome Android intents](https://developer.chrome.com/docs/android/intents)
- [Play Install Referrer](https://developer.android.com/google/play/installreferrer)
- [Apple associated domains](https://developer.apple.com/documentation/xcode/allowing-apps-and-websites-to-link-to-your-content)
- [Apple Universal Links diagnostics](https://developer.apple.com/documentation/technotes/tn3155-debugging-universal-links)
- [WeChat open tags](https://developers.weixin.qq.com/doc/service/guide/h5/opentag.html)
