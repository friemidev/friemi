# Dice audio sources

`dice-foley-aacb49c2f6.mp3` contains excerpts from **2BACH — Dice sounds (yatzy style)**.
Pack: https://freesound.org/people/2BACH/packs/11753/

The author recorded the set with a Sennheiser MKH 416 and Focusrite Scarlett
2i2, at 48 kHz / 24 bit. We use the public HQ MP3 previews, not the original WAVs.
All nine source sounds are licensed CC0 1.0:
https://creativecommons.org/publicdomain/zero/1.0/

- **Dice (1) shake in cup.wav** — https://freesound.org/people/2BACH/sounds/185968/
  Preview: https://cdn.freesound.org/previews/185/185968_878622-hq.mp3
  SHA256: `d96e1aaaf7043e2a70011cf847a916e4f0f75abc6051f5b72e7c2d4eb0bd90fd`.
- **Dice (1) shake in cup closed.wav** — https://freesound.org/people/2BACH/sounds/185962/
  Preview: https://cdn.freesound.org/previews/185/185962_878622-hq.mp3
  SHA256: `87e9264d190b5bd40ef82642897eadab04ce069e736209bd2fb6cbe26433771f`.
- **Dice (1) pour on felt.wav** — https://freesound.org/people/2BACH/sounds/185963/
  Preview: https://cdn.freesound.org/previews/185/185963_878622-hq.mp3
  SHA256: `6eda4cc7748cd6e12f4494d3369114b404f65acc91d0e36427580ea2da05530a`.
- **Dice (3) shake in cup.wav** — https://freesound.org/people/2BACH/sounds/185978/
  Preview: https://cdn.freesound.org/previews/185/185978_878622-hq.mp3
  SHA256: `15e05c16572a3b6dae7fdb6b2cc80f07ab19b3cc5ee2292fec4ab687e89c5220`.
- **Dice (3) shake in cup closed.wav** — https://freesound.org/people/2BACH/sounds/185980/
  Preview: https://cdn.freesound.org/previews/185/185980_878622-hq.mp3
  SHA256: `6c1ac22981b627c67169fb4b34b611be426e9e60aaa07550a502f7fdf69fa75a`.
- **Dice (3) pour on felt.wav** — https://freesound.org/people/2BACH/sounds/185970/
  Preview: https://cdn.freesound.org/previews/185/185970_878622-hq.mp3
  SHA256: `7247b6d584d62f042bce5596651cd19a71704aad44db1dc788a77e70c3046262`.
- **Dice (6) shake in cup.wav** — https://freesound.org/people/2BACH/sounds/185972/
  Preview: https://cdn.freesound.org/previews/185/185972_878622-hq.mp3
  SHA256: `654b830517420a70286aae2aba00d7b9f6e6079d68e227cc20650e975bb7a31e`.
- **Dice (6) shake in cup closed.wav** — https://freesound.org/people/2BACH/sounds/185974/
  Preview: https://cdn.freesound.org/previews/185/185974_878622-hq.mp3
  SHA256: `c9a4985c5308dd183e9a2140210d106eae2b27ad1bfb17ba5e3cf2acb973591c`.
- **Dice (6) pour on felt.wav** — https://freesound.org/people/2BACH/sounds/185982/
  Preview: https://cdn.freesound.org/previews/185/185982_878622-hq.mp3
  SHA256: `e6316f268a44a1f52c277a83370a8dad0ecff9f37130df92d7c5a075bc85227e`.

Preparation: mono 44.1 kHz, 65 Hz rumble removal, one gain adjustment per
source recording, trimmed takes and short edge fades. No synthesized impacts,
pitch changes, dynamic-range compression or added reverb. The 1-, 3- and 6-die recordings
serve the UI's 1, 2–3 and 4–6 count groups respectively. Closed-cup recordings
include their own settling; they never use the open-cup felt landing.
The reproducible script is `features/game-tools/dice-preview/tools/prepare_audio.py`.
