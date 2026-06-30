# Avalon Offline Assistant Assets

This folder contains original Friemi visual assets for the offline Avalon-style social deduction assistant.

These assets intentionally avoid official board game card art, logos, rulebook graphics, role illustrations, and layouts. They are generic medieval/social-deduction UI assets designed to match the Friemi v2.1 palette.

Runtime code should reference assets through `asset-manifest.json` or a centralized constants file rather than scattering hard-coded paths.

Large raster hero images and audio cues are intentionally deferred until the first UI implementation pass. The current pack focuses on SVGs that are small, themeable, and safe for MVP development.

v0.5 also includes dedicated SVG tokens for scan-to-join, public screen, live sync, host correction, round reset, mission undo, and recap timeline events. These keep the live-room UI more visual and reduce dependency on long explanatory labels during offline play.
