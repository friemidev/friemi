# Browser to Friemi app handoff

Implemented 2026-10-15. Website changes and NEW Android/iOS packages are both required for the complete flow. No database migration or new authentication credentials are needed. This change does not publish a release.

## Current rollout: disabled

`apps/web/features/mobile/appHandoffRollout.ts` sets `APP_HANDOFF_ENABLED = false` for the website-first release. It is a source-controlled switch shared by the server and client, with no environment, query-string or local-storage override.

- Plan details and sign-in/sign-up do not render the new app-opening/download choices, including after hydration and on old native user agents.
- `/open` redirects to the validated content URL on www with `Cache-Control: no-store`; localized `open-app` pages redirect directly to that content. They do not present a scheme retry. Invitation access, locale and section anchors are retained.
- Localized `/zh-CN/open`, `/en/open` and `/fr/open` aliases also handle the path rewriting performed by older Android shells. A missing target falls back to the locale's mobile home; a target already discarded by an old shell cannot be recovered by the website.
- WeChat retains a browser-login guide. Copying uses the ordinary web sign-in/sign-up URL with the original return target, not the app handoff page. Clipboard failure exposes a selectable link.
- Ordinary website/native login, registration and participation remain unchanged. Association endpoints remain HTTP 200 JSON but return no active associations while the switch is off. This prevents the old Android manifest's broad URL filter from becoming verified during this website-only release. The certificate/team configuration and native code are retained for later activation. There is no database migration for this switch.
- To enable later, first complete signed-device checks and old-package fallback, then explicitly change the switch, update the disabled-rollout regression tests and deploy. Store approval or a new app installation does not automatically turn it on.
- Both production hosts returned 404 for both association endpoints during the pre-release read-only check on 2026-10-15; this does not disable an existing deployed association. OS verification caches and user-selected link preferences are outside this website switch. After enabling, reverify signed devices before opening the rollout broadly.

Disabled-rollout verification (2026-10-15):

- Web type checking and 32 focused rollout, app-link and authentication tests passed. Server redirects preserve encoded invitation values and anchors, reject external targets, and do not allow retry/preview query parameters to enable launching.
- Browser checks at 390 px and 1280 px found no new launch links after hydration, including with old Android/iOS user agents. A direct localized handoff URL returned to the plan with its existing joined state unchanged. These are browser simulations, not signed-device acceptance.
- WeChat sign-in/sign-up in Chinese, English and French retained their browser guide; clipboard success and denied-permission selectable-link fallbacks preserved the auth mode and original return target. Both local association endpoints returned HTTP 200 JSON with empty associations and no-store caching.
- No production deployment, database migration, real-account login or store package publication was performed as part of this rollout change.

## Behavior when enabled

- Mobile web: an Open Friemi entry beside the existing plan participation controls, and app/store choices on sign-in and sign-up. Web sign-in and participation remain available; launching never automatically joins, cancels, pays, or posts.
- Installed apps: HTTPS App Links / Universal Links and `friemi://open?target=...` preserve the content route, locale, invitation access and fragment. Existing `friemi://auth-complete` login completion stays separate.
- Android Chrome: a user-tapped intent targets `com.friemi.app`. If it cannot open, a web page offers Google Play and a web continuation. No timer guesses whether the app is installed.
- Android fresh Play installs: recent public detail links can restore through Play Install Referrer. This is one-shot, bounded to five seconds, and canceled by interaction, backgrounding or a newer intent. It does not override an existing session's navigation. Private invitation credentials are NOT sent to Play; reopen their original link after installation.
- iOS: a user-tapped `https://friemi.com/open?...` crosses from www to the associated apex host. The browser fallback offers App Store, an explicit scheme retry and web continuation. Installation does not reliably preserve a destination on iOS; return to the original link after installation.
- WeChat: shows the browser-menu instructions and a copyable continuation link. Direct `wx-open-launch-app` is NOT enabled: a certified service account, JS security domain and approved/bound WeChat Open Platform mobile app are not yet available.
- Native Friemi login never shows the web app-download choices. Browser and native login sessions are independent; the app may still require one login.

## Production rollout and older packages

- Production shells load the live website. A successful main/Production website deployment updates web behavior for already-installed apps; store review does not isolate those users from web changes. Java, Swift, manifest and entitlement changes still require a newly installed package.
- The pre-handoff native code at `0d1ad6f7` does not support `friemi://open?target=...`: Android routes it to a localized `/open` page and drops the target; iOS does not resolve it. Do not assume that opening an old installed app reaches the requested plan.
- The new web handoff entry is currently disabled by the rollout switch above. The guarded website changes can be promoted before package availability; keep the switch disabled while the packages are being reviewed.
- Store availability alone does not upgrade every installed app. Validate old-package fallback and new-package routing on signed devices before enabling the entry broadly. Browser code cannot reliably detect the installed app version.
- The follow-up audit's web auth cleanup remains compatible with existing callers and adds no mandatory native plugin method. No database migration is required. Native-shell fixes remain unavailable to users until they update their installed app.

## Website prerequisites

1. Review and merge this branch to dev. Apply the production rollout restrictions above before promoting any website changes to main. Signed-package link verification must be checked after the associations are explicitly activated in the later rollout.
2. Both `friemi.com` and `www.friemi.com` must serve these endpoints with HTTP 200, JSON content type, no authentication and no redirect:
   - `/.well-known/assetlinks.json`
   - `/.well-known/apple-app-site-association`
   During the current disabled rollout, these responses deliberately contain no active associations; HTTP 200 alone does not mean native link verification is enabled.
3. `/open?target=%2Ffr%2Flobby%2FPLAN_ID` is deliberately excluded from locale/canonical middleware. With rollout disabled, it returns a 302 to the validated www content page; once enabled, it returns the www handoff page, not an immediate store redirect. Do not add a blanket apex-domain redirect in Vercel that intercepts the association endpoints.
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

## Follow-up shell audit (2026-10-15)

The following defects were fixed after the initial dev push. This audit covers the browser/app handoff, native navigation, notification entry and authentication return paths; it is not a claim that every native feature has passed device testing.

| Area | Defect and resulting behavior |
| --- | --- |
| Android launcher resume | A new launcher intent without a destination reloaded home. It now keeps the mounted WebView and draft; invalid content links also leave the current page alone. |
| Android background notifications | FCM notification/data messages deliver their destination in intent extras, while foreground notifications use a URI. Both now resolve the same allowed content paths. |
| Android internal windows | Content-only filtering discarded sign-in routes and Clerk parameters. Internal navigation now preserves authentication state; `/open` resolves its target before locale rewriting. |
| Android history and load failures | SPA history updates now update the native back-navigation URL. A failed main-frame load keeps its retry UI when `onPageFinished` subsequently fires. |
| iOS content origins | Cold-start routing uses the configured app origin and locale. Clerk hosts and arbitrary Vercel hosts cannot become a content/auth-return origin. Preview builds explicitly trust their configured server. |
| iOS external browser return | Returning to a valid Friemi link dismisses the host-link Safari sheet before showing the target. Native URL logs no longer include full queries. |
| iOS Apple sign-in | Requests run on the main queue; a concurrent request cannot replace the pending sign-in callback. |
| Authentication return | Both native resolvers retain encoded invitation values, the one-retry marker and validated internal profile-setup return links. Web cleanup retains the destination fragment and removes the transient return timestamps. |

Verification completed on this Linux workspace:

- Android `testDebugUnitTest`: 11 tests passed. `lintDebug` and `assembleDebug` passed. The audit APK uses a local fixture URL and is **not a release artifact**; do not upload it.
- Web type checking passed. The focused app-link, Android-auth and iOS-frame suites passed all 20 tests.
- iOS Info.plist and entitlements parsed successfully. Custom scheme, associated domains, source inclusion, bundle ID and signing-team configuration were checked.
- `git diff --check` passed. No database migration is required.

Still required before release:

1. On the iOS developer's Mac, pull these changes, run `npm run ios:sync --workspace=apps/web`, then run the Foundation routing test documented above and build/archive the Xcode workspace. Swift compilation, provisioning and signed entitlements cannot be validated on this Linux host.
2. On Android, test a Play-signed internal build: open a shared plan from a cold start; enter a draft, minimize and reopen from the launcher; tap a background push for a different chat; complete browser login and verify the original invitation and section remain selected.
3. On iPhone/TestFlight, test Google and Apple login from a shared plan, cancellation/retry, return from a host-link Safari sheet, and Universal Links with the app both stopped and running. Confirm no browser sheet obscures the returned page.
4. Test the keyboard accessory bar and gestures on the new installed iOS package. Website deployment alone cannot update native behavior.

No physical device was connected. The local Android emulator crashed during startup, before the audit APK could be exercised; its attempted run is not a successful interaction test. Production deployment, OS link verification, live push delivery and signed-device OAuth remain outside the completed local checks. These follow-up fixes have not been deployed by this audit.

## Platform references

- [Android App Links](https://developer.android.com/training/app-links/about)
- [Chrome Android intents](https://developer.chrome.com/docs/android/intents)
- [Play Install Referrer](https://developer.android.com/google/play/installreferrer)
- [Apple associated domains](https://developer.apple.com/documentation/xcode/allowing-apps-and-websites-to-link-to-your-content)
- [Apple Universal Links diagnostics](https://developer.apple.com/documentation/technotes/tn3155-debugging-universal-links)
- [WeChat open tags](https://developers.weixin.qq.com/doc/service/guide/h5/opentag.html)
