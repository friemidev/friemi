# Dice preview runtime

`runtime/` packages the reviewed `docs/v2_8/dice-design-preview` prototype for the
development game hub. It contains only the main page, its five CSS/JS dependencies,
six glossy dice atlases and twenty cat SVGs. Source frames, the sprite laboratory,
test files and previous materials are deliberately outside the served allowlist.

The Next route checks `isDicePreviewEnabled` before serving the page or any asset.
Production shows a localized coming-soon page and rejects preview asset requests.
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
Production still gates both the preview runtime and online room/API.

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

## Verification (2026-10-11)

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

Run the focused checks from `apps/web`:

```bash
node --import tsx --test features/game-tools/diceAvailability.test.ts features/game-tools/dice-preview/response.test.ts
```
