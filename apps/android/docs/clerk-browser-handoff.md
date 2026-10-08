# Android Clerk browser sign-in

## Why the production flow changes

The previous WebView flow started Clerk sign-in in the WebView, then opened the
Google authorization page in a browser. Browser and WebView cookies are separate.
Clerk's production callback can therefore reject the browser's OAuth response
with `authorization_invalid` even when the OAuth client and callback are correct.

The new flow starts at the environment's Clerk Account Portal in the browser.
It does not copy cookies, change Clerk user IDs, or create another Friemi profile.
Web and iOS login are unchanged.

## Handoff

1. The Android web page generates a random verifier and flow ID. The verifier
   stays in WebView session storage for at most ten minutes. Only its SHA-256
   challenge travels to the browser.
2. The browser completes Clerk login, then opens `/{locale}/android-auth-browser`.
   The signed-in user explicitly confirms the account to use in the app.
3. An authenticated, same-origin POST issues a random code with a 120-second
   Redis TTL. Redis stores the code's hash, device challenge, user ID and target.
4. `friemi://auth-complete` returns that code to `/{locale}/android-auth-return`.
   It never carries a session JWT, Clerk ticket, or the device verifier.
5. A same-origin POST checks the device proof and atomically consumes the code.
   It rejects banned/locked Clerk users and returns a 30-second Clerk sign-in
   ticket in a non-cacheable response. The WebView activates that session, clears
   the local proof and returns to the original in-app page.

Codes are isolated by Clerk publishable key and web origin, cannot be replayed,
and cannot be consumed by an incorrect verifier. Issuance is limited to ten
attempts per signed-in user per minute. Missing or unavailable Redis fails closed.
Authentication request bodies and codes must not be logged.

## Native requirement

Android App Links cover the website. They can intercept the browser confirmation
URL before the browser has finished. `MainActivity` keeps `android-auth-browser`
in the selected browser package and only loads `android-auth-return` in WebView.
Browser selection must remain stable throughout the flow.

This native routing change requires a new APK/AAB. A web-only deployment cannot
update installed native code. An old app that intercepts the confirmation page
receives an update notice instead of entering a recursive sign-in loop.
If Android kills the app during login, session storage may be lost; the return
page safely asks the user to restart sign-in rather than accepting an unbound code.

## Configuration and rollout

- Keep the existing Clerk production/preview keys separate.
- Reuse `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`, or the existing KV
  equivalents. No new database table, migration, or user ID remapping is needed.
- Release code to `dev` first. Promote web code to production and distribute an
  Android build containing the matching native routing fix after validation.
- Do not roll the new Android build back to a web version without the handoff
  routes while users may still be returning from sign-in.

## Verification

Automated tests cover proof expiry, malformed input, cross-origin requests,
unauthenticated issuance, rate limits, Redis failure, unsafe redirects, environment
isolation and replay. `androidAuthHandoff.redis.test.ts` is opt-in using
`ANDROID_AUTH_TEST_REDIS_URL` and `ANDROID_AUTH_TEST_REDIS_TOKEN`; it uses random,
short-lived fixture keys and no real Clerk user. Never commit these credentials.

Before production rollout, verify on a real Android phone:

- Sign in with an existing migrated Google account using the updated build.
- Enable verified App Links and confirm return to the original in-app page.
- Confirm the existing profile, Friemi number and private chat access are retained.
- Cancel, retry, switch accounts, and return with an expired or already-used code.
- Check at least Chrome and the affected user's default browser.

Browser/Redis unit tests and Android compilation do not replace this real-device
Google OAuth acceptance test.
