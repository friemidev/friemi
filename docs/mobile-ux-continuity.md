# Mobile UX Continuity

Implementation branch: `codex/mobile-ux-continuity`, based on dev `18ce42f`.
Scope: shared mobile navigation and loading, activity previews, search, chat motion.
Existing layouts, permissions, authentication flows and native packages are unchanged.

## Implemented

- Primary navigation retains each tab's URL filters and scroll coordinate for the current viewer and locale. Creation forms are excluded. Restoration stops on user input, and waits up to 10 seconds for streamed content.
- The mobile lobby retains recent loaded pages for up to five minutes. Stale pages are refreshed in the background without first truncating the list to page one. Existing viewer-scoped cache keys and size limits remain in place.
- Activity sheets immediately show the activity title and loading state. Failed or stalled initial documents offer retry. Ready documents retain their state using the existing two-frame limit; only the matching same-origin frame can signal readiness.
- Opening a sheet no longer also prefetches the full-page detail. Maximizing still prefetches on intent. Close and maximize have expanded touch hit areas without changing layout dimensions.
- Search uses Next Form client navigation, keeps a localized GET fallback and dismisses the focused search keyboard. Its pending icon is delayed by 150ms.
- Directional motion waits for real streamed content instead of animating only the loading shell. Chat surfaces opt into the same direction handling; fixed descendants stay stationary. Removed the extra chat content fade and delayed chat loading placeholders.
- Game-room shortcut lookup is streamed separately from the shared layout. Message/planet tabs no longer fetch moment-publishing activity options; loaded moment options survive switching tabs.
- Failed covers have a bounded 60-second browser-memory failure cache. This suppresses component retries, not server-generated preload hints. Offline failures and lazy-image timeouts are not recorded as persistent failures.
- Lobby warming stops for hidden pages, offline mode, Save-Data and 2G connections.

Next Form behavior was checked against the installed Next 15.5.27 implementation and [official documentation](https://nextjs.org/docs/app/api-reference/components/form).

## Verification, 2026-10-07

Test environment: local production-mode Next build, separate `friemi_ux_20261007` database with 24 synthetic activities; Chromium with mobile UA/touch emulation. No production or preview database changes.

| Check | Result |
| --- | --- |
| Lobby -> profile -> lobby | Scroll 400 -> 400px |
| Popular filter -> home -> lobby | Filter URL retained; scroll 300 -> 300px |
| Two loaded lobby pages -> profile -> lobby | 16 rows retained; scroll 1100 -> 1100px |
| First detail, artificial 1500ms document delay | Title/loading visible after 37ms; ready at 2449ms |
| Reopen same detail | 54ms in this sample; same iframe; one detail document request across both opens |
| Abort detail document, retry after restoring network | Retry displayed; real detail recovered |
| Search submission | Identical `performance.timeOrigin`; no full-document reload |
| Shared RouteMotion isolated chat fixture | +31.2px entry / -31.2px return, 200ms; fixed footer remains at viewport bottom |
| Primary tab motion / reduced-motion fixture | Zero route animations |
| Real activity sheet with reduced motion | `animation: none`, `transition: 0s` |
| Width 320 / 390 / 1280 | No horizontal document overflow; screenshots inspected |
| Tests | 608 total: 607 passed, one existing skip |
| Repository lint / Next production build | Passed; existing share-card image lint warnings remain |

Timing samples include browser automation overhead and local synthetic data. They are not production latency percentiles or real-device measurements. Screenshots and logs are in `output/playwright/mobile-ux-implementation/` (not release assets).

## Still Requires Real Devices

- Android: system back with keyboard open, sheet open, detail visible and primary screen; confirm back closes the correct layer before navigation/exit. `adb devices -l` reported no attached device.
- iOS: installed release build, Chinese/Latin input, eight-line composer, interactive keyboard dismissal, safe areas and keyboard accessory bar. Chromium cannot verify WKWebView behavior.
- Authenticated direct/activity/planet chats: actual messaging, history return, drafts, unread counts, background/resume and account switching. The motion fixture validates animation mechanics, not these end-to-end flows.
- Production-like cold-start measurements on slow Android hardware and real network. The query dependency reductions are implemented, but a production before/after LCP claim is not yet justified.

This batch needs no production database migration or new iOS/Android binary. The release target is dev; main/production deployment and native-device acceptance remain separate steps.
