# Dice game runtime

`runtime/` packages the reviewed `docs/v2_8/dice-design-preview` prototype for the
game hub. It contains only the main page, its seven CSS/JS dependencies,
six glossy dice atlases and twenty cat SVGs. Source frames, the sprite laboratory,
test files and previous materials are deliberately outside the served allowlist.

The Next route checks `isDiceEnabled` before serving the page or any asset.
Development, preview and production all serve the playable game. Only production
entry documents are indexable; preview documents and runtime assets remain noindex.
The public page supplies localized descriptions, canonical links and language alternates.
`next.config.ts` includes the runtime files in this route's deployment trace.

The packaged game's integration changes are a localized asset base, the dice logo
as its page icon, localized preview/exit labels, and a confirmed exit from practice
to the localized game hub. Chinese rules dialogs restore their own language after
a localized exit dialog.
Game controls and rules retain the prototype's Chinese copy, so the game document
keeps `lang="zh-CN"`. The local roller and three-bot practice remain in this runtime.
The preview page now links to `/game-tools/dice/online`, a separate 2–6 player
Liar's Dice room using shared `GameToolRoom`, seats, members and events. The online
room is server-authoritative, keeps unrevealed hands private in authenticated
snapshots, broadcasts only invalidation notices, and falls back to polling.
Production also enables the online room pages and APIs. The production roller
hides the preview label; local practice keeps its three-bot notice.

The dice atlases are generated from `tools/render_dice.py`. The current material
uses cool white rounded resin, black recessed pips, and broad studio reflections.
All six result-specific atlases keep the same 32-frame trajectory and settle on
their requested top face. Rebuild them with Python 3 plus numpy, scipy and Pillow:

```bash
python3 apps/web/features/game-tools/dice-preview/tools/render_dice.py --workers 4 --runtime-only
```

The command validates all 192 frames and copies the six WebP atlases into
`runtime/assets/dice-3d/`. Generated source frames and contact sheets stay in
`tools/` for inspection and are not served. `apps/web/public/game-tools/dice/cup.svg`
is the shared graphite cup artwork used by the local preview and online room.

## Phone shaking and roll audio

`runtime/dice-device.js` is shared by the local roller and the online room. The
physical shake switch requests motion permission only in a button gesture and
enables roll audio in that same gesture. Motion data stays in the browser. Three
opposing impulses trigger the existing roll; busy states, dialogs, background
pages and orientation changes discard partial gestures. Turning the switch off
removes its listeners; losing the host role also stops room motion input. Returning
from the background checks for fresh sensor readings. Missing sensors or denied permissions leave the normal
buttons usable. Motion requires a secure context, such as the HTTPS site.

The local free roller preserves the dice count and covered state. Online rooms
use motion only for a host's legal START, NEXT_ROUND or REMATCH command; bidding
never rerolls hands. Accepted round snapshots trigger the existing sprite motion
and recorded dice/cup foley with an independent mute control. A content-versioned
755 KB MP3 atlas under `public/sounds/dice` uses one matched CC0 recording set by
2BACH. The source was microphone-recorded; the shipped excerpts use its public
HQ MP3 previews. The recorded 1, 3 and 6 dice serve count groups 1, 2–3 and 4–6.
Closed-cup rolls use a complete cup take with its own internal settling, including
online rooms. Open rolls join matched open-cup and felt-landings with a short
crossfade. Each condition has three takes, avoiding immediate repetition.
Quick rolls keep the real take's ending at the original pitch. Reduced motion
uses one softer short impact, also respecting the covered state. One gain
adjustment per source preserves the relative strength of its collisions; there
are no synthesized roll impacts, added reverb, dynamic-range compression or pitch changes.
Credits and source hashes are in `public/sounds/dice/LICENSE.md`.
`tools/prepare_audio.py` reproduces the atlas and `runtime/dice-audio-data.js`
metadata together; the new filename prevents old cached offsets being reused.
Interrupted audio contexts resume for the next roll. Delayed recovery only plays
the remaining sounds; muted, canceled and expired rolls cannot replay later,
including when the recording is still downloading. A failed download or decode
leaves the roll usable and allows sound to be retried.

Automated checks cover detection, permission failures, cleanup, duplicate input,
mute, and the served module. Browser sensor events can be simulated for UI QA;
actual sensitivity, Safari permission prompts and embedded WebView behavior still
need a physical phone. Do not treat desktop emulation as hardware verification.

## Historical verification before production release (2026-10-11)

- The normal web build and TypeScript check passed on Node 20.19.6. The built
  route's NFT trace includes all 32 runtime files; no asset is missing.
- Seven automated checks cover deployment tiers, localized waiting pages, all
  preview assets, production denial, supported locales and path traversal.
- The actual built server was checked with `VERCEL_ENV=preview` and
  `VERCEL_ENV=production`. Preview links work in Chinese, English and French;
  production cards have no link, the direct page contains no game scripts, and
  direct JavaScript/atlas requests return 404.
- Browser checks cover 390px mobile and 1280px desktop layouts, the card below
  Draw & Guess, rolling and the matching total, a practice settlement, and both
  direct and confirmed returns to the current-language hub.
- Local screenshots are under `output/playwright/dice-entry/`. No database was
  configured for this UI check; unrelated analytics/prefetch requests log missing
  database configuration. Physical WebView testing is outside this entry change.

## Production release verification (2026-10-12)

- Eleven focused checks and the project TypeScript check pass. Coverage includes
  production availability, playable documents, every runtime asset, locale paths,
  indexing, traversal denial, private hands, command retries and same-origin writes.
- The production-tier local browser check covers 390px and 1280px hub ordering,
  the enabled dice card, a six-die roll with a matching total, and the practice
  notice appearing only in practice. Screenshots are in
  `output/playwright/dice-production/`.
- Fresh production environment settings point to the verified Production project.
  Read-only catalog checks confirm both dice migrations, the DICE enum, five
  dice access policies and the existing seat character field. No schema or
  business data changes were needed for this release.

Run the focused checks from `apps/web`:

```bash
node --import tsx --test features/game-tools/diceAvailability.test.ts features/game-tools/diceDevice.test.ts features/game-tools/dice-preview/response.test.ts
```
