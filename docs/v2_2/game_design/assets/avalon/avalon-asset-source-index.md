# Avalon Asset Source Index

All listed files are original SVG assets created for Friemi in `feature/v2-board-game-tools-design`.

## Copyright Boundary

- No official Avalon card art, logos, role illustrations, rulebook screenshots, or trade dress are included.
- Role icons are generic social-deduction symbols and do not reproduce official card faces.
- UI text must be rendered by application components, not baked into image files, so Chinese, English, and French can share the same assets.

## Runtime Assets

| File | Type | Source | Notes |
|---|---|---|---|
| `apps/web/public/game-tools/common/game-room-qr-frame.svg` | SVG | Original Friemi vector | QR frame for room join flow |
| `apps/web/public/game-tools/common/round-table-seat-map.svg` | SVG | Original Friemi vector | Generic 10-seat table map |
| `apps/web/public/game-tools/common/seat-avatar-placeholder.svg` | SVG | Original Friemi vector | Temporary player avatar |
| `apps/web/public/game-tools/common/privacy-blur-pattern.svg` | SVG | Original Friemi vector | Private identity cover |
| `apps/web/public/game-tools/common/hold-to-reveal-hint.svg` | SVG | Original Friemi vector | Gesture hint icon |
| `apps/web/public/game-tools/common/offline-reconnect-card.svg` | SVG | Original Friemi vector | Weak network and reconnect empty state |
| `apps/web/public/game-tools/common/timer-ring.svg` | SVG | Original Friemi vector | Generic countdown ring |
| `apps/web/public/game-tools/common/public-screen-corner-mark.svg` | SVG | Original Friemi vector | Public screen decoration |
| `apps/web/public/game-tools/avalon/avalon-tool-icon.svg` | SVG | Original Friemi vector | Tool entry icon |
| `apps/web/public/game-tools/avalon/room-lobby-empty.svg` | SVG | Original Friemi vector | Empty room illustration |
| `apps/web/public/game-tools/avalon/player-ready-token.svg` | SVG | Original Friemi vector | Ready status |
| `apps/web/public/game-tools/avalon/player-not-ready-token.svg` | SVG | Original Friemi vector | Waiting status |
| `apps/web/public/game-tools/avalon/host-crown-token.svg` | SVG | Original Friemi vector | Host marker |
| `apps/web/public/game-tools/avalon/roles/faction-good.svg` | SVG | Original Friemi vector | Good faction marker |
| `apps/web/public/game-tools/avalon/roles/faction-evil.svg` | SVG | Original Friemi vector | Evil faction marker |
| `apps/web/public/game-tools/avalon/roles/role-unknown.svg` | SVG | Original Friemi vector | Hidden role fallback |
| `apps/web/public/game-tools/avalon/roles/private-card-back.svg` | SVG | Original Friemi vector | Hidden identity card back |
| `apps/web/public/game-tools/avalon/roles/role-merlin.svg` | SVG | Original Friemi vector | Generic seer role icon |
| `apps/web/public/game-tools/avalon/roles/role-assassin.svg` | SVG | Original Friemi vector | Generic shadow dagger role icon |
| `apps/web/public/game-tools/avalon/roles/role-servant.svg` | SVG | Original Friemi vector | Generic ally role icon |
| `apps/web/public/game-tools/avalon/roles/role-minion.svg` | SVG | Original Friemi vector | Generic shadow role icon |
| `apps/web/public/game-tools/avalon/roles/role-percival.svg` | SVG | Original Friemi vector | Generic two-star watcher icon |
| `apps/web/public/game-tools/avalon/roles/role-morgana.svg` | SVG | Original Friemi vector | Generic mirror star icon |
| `apps/web/public/game-tools/avalon/roles/role-mordred.svg` | SVG | Original Friemi vector | Generic hidden shield icon |
| `apps/web/public/game-tools/avalon/roles/role-oberon.svg` | SVG | Original Friemi vector | Generic lone star icon |
| `apps/web/public/game-tools/avalon/states/mission-board-bg.svg` | SVG | Original Friemi vector | Five-round mission board |
| `apps/web/public/game-tools/avalon/states/mission-success-token.svg` | SVG | Original Friemi vector | Success token |
| `apps/web/public/game-tools/avalon/states/mission-fail-token.svg` | SVG | Original Friemi vector | Fail token |
| `apps/web/public/game-tools/avalon/states/mission-pending-token.svg` | SVG | Original Friemi vector | Pending token |
| `apps/web/public/game-tools/avalon/states/vote-approve-card.svg` | SVG | Original Friemi vector | Approve vote card |
| `apps/web/public/game-tools/avalon/states/vote-reject-card.svg` | SVG | Original Friemi vector | Reject vote card |
| `apps/web/public/game-tools/avalon/states/team-leader-marker.svg` | SVG | Original Friemi vector | Current leader marker |
| `apps/web/public/game-tools/avalon/states/reject-track-dot.svg` | SVG | Original Friemi vector | Rejection counter |
| `apps/web/public/game-tools/avalon/states/reject-track-danger.svg` | SVG | Original Friemi vector | Rejection danger token |
| `apps/web/public/game-tools/avalon/states/assassination-phase.svg` | SVG | Original Friemi vector | Final assassination stage |
| `apps/web/public/game-tools/avalon/states/good-victory.svg` | SVG | Original Friemi vector | Good-side victory scene |
| `apps/web/public/game-tools/avalon/states/evil-victory.svg` | SVG | Original Friemi vector | Evil-side victory scene |
| `apps/web/public/game-tools/avalon/states/manual-correction.svg` | SVG | Original Friemi vector | Manual correction empty state |
| `apps/web/public/game-tools/avalon/share/vote-matrix-frame.svg` | SVG | Original Friemi vector | Vote recap export frame |
| `apps/web/public/game-tools/avalon/share/timeline-node-success.svg` | SVG | Original Friemi vector | Recap success node |
| `apps/web/public/game-tools/avalon/share/timeline-node-fail.svg` | SVG | Original Friemi vector | Recap fail node |
| `apps/web/public/game-tools/avalon/share/timeline-node-vote.svg` | SVG | Original Friemi vector | Recap vote node |
| `apps/web/public/game-tools/avalon/share/timeline-node-assassin.svg` | SVG | Original Friemi vector | Recap assassination node |

## Deferred Assets

The following files from the full asset plan are intentionally not generated in this pass:

- `avalon-hero-mobile.webp`
- `avalon-hero-desktop.webp`
- `share/recap-card-bg.png`
- `share/recap-og-1200x630.png`
- `audio/*.mp3`

They should be created only when the first playable UI exists, so composition, crop, and copy can match the real screens.
