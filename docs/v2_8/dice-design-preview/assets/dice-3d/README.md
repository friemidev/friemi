# Friemi · 3D dice sprites

Material v2: bright, glossy resin. Deterministic transparent assets for the local dice-design preview. These assets animate a result supplied by the caller; they do not roll a random number or implement multiplayer rules.

## File contract

- `roll-1.webp` … `roll-6.webp`: lossless RGBA sprite atlases, 1280 × 640 px. Each contains 32 frames of 160 × 160 px, eight columns by four rows, in row-major order.
- `idle-1.png` … `idle-6.png`: the corresponding final frame, 160 × 160 px, with the named value on the upward face.
- `roll-1.png` … `roll-6.png`: lossless PNG atlas equivalents.
- `frames/die-{result}-{00…31}.png`: the individual source frames.
- `manifest.json`: frame rectangles, durations, phases, center anchor, final values, fixed face definitions, camera/light, and the model rotation matrix for every frame.
- `spin-32.webp`: an optional seamless looping 32-frame 3D tumble, eight columns by four rows, 24 fps. It has no settled result.
- `wobble-12.webp`: an optional single light wobble of the face-1 idle pose, 12 frames, six columns by two rows, 24 fps. Frame 11 returns exactly to `idle-1.png`.
- `contact-sheet.png`: six final faces above six example tumbling poses, for inspection only.
- `material-comparison-v1-v2.png`: matching-pose material comparison on the requested mist blue `#DCECF9` background.
- `versions/v1-matte/`: full preserved v1 source, frames, atlases, metadata and renderer for comparison or rollback. Current top-level resources are the authorized v2 replacements.
- `validation.json`: generated dimensions, transparent-border checks, geometry assertions, checksums, and atlas sizes.

Playback is 24 fps (41⅔ ms/frame), for approximately 1.333 seconds. Frames 0–11 tumble; 12–22 decelerate; 23–28 contain one small, damped wobble; 29–31 are fully settled. Frame 22 first reaches the flat target orientation; frame 31 is the final exact target and `landingFrame`. Frames 29, 30, and 31 are identical static end frames (two trailing duplicates). The anchor is the center of each frame (80, 80 px), not the bottom edge. Transparent padding remains within a constant square; do not crop individual frames before playback.

For frame `i`, source coordinates are `x = (i % 8) * 160`, `y = floor(i / 8) * 160`. The result belongs to the sequence, not to intermediate visible faces. On cancellation, reduced motion, or recovery, use the result's `idle-*.png` instead of resampling a random value.

## Actual 3D geometry

`render_dice.py` traces orthographic camera rays through a rounded-box signed distance field. Twenty-one fixed spheres are subtracted from the cube to create genuine shallow, concave pip cavities. Surface normals and light occlusion are evaluated on that geometry. Each frame rotates the complete model in three dimensions: visible perspective, rounded edges, pip foreshortening, and recessed surfaces change together. This is not a flat square rotated with CSS and does not switch pip artwork independently of its face.

The model uses `+Y = 1`, `−Y = 6`, `+Z = 2`, `−Z = 5`, `+X = 3`, `−X = 4`; opposite faces always sum to seven. Each target rotation maps the requested face normal to world `+Y`. Camera and upper-left light remain fixed for every sequence. The render is deliberately stylized: bright milk-white polished resin, a dielectric clear coat, graphite recesses, and a vivid coral single pip. Rounded edges are fuller in v2. Long, soft specular highlights are calculated by reflecting the view vector about each actual surface normal into three fixed rectangular studio fixtures. Their position changes correctly as the complete model rotates; there are no painted highlight textures or frame-specific light spots. Key and fill directions are fixed in world space. The concave pip walls use their own actual normals and geometry occlusion, so their small reflections remain inside deep, readable dots. A highlight shoulder compresses only the brightest reflected light to avoid washing out the design.

A very light contact shadow is included in the alpha image. It uses short-range occlusion rays from a fixed world ground plane toward four upper-left area-light samples, followed by a soft reconstruction. This omits a heavy, long cast shadow while grounding the toy. The remaining background is transparent. Travel across the game table is still controlled by the surrounding preview.

## Rebuild

From the repository root:

```sh
OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 python3 docs/v2_8/dice-design-preview/assets/dice-3d/render_dice.py --workers 4
```

Dependencies: Python 3, NumPy, SciPy, Pillow. `--preview` renders three inspection images. `--assemble-only` rebuilds the six result atlases from existing individual frames and regenerates auxiliary animations. `--extras-only` updates only the two optional animations and their metadata after the main assets exist. The script only writes beneath its own directory. There is no random seed or stochastic sampling: geometry, trajectories, lighting and pixel sampling are deterministic.

## Checks and scope

V2 preserves every v1 face mapping, rotation matrix, translation, frame count, frame rectangle, playback duration, and anchor. Only material, studio reflections, bevel radius and contact-shadow rendering changed. The generator checks all six pip counts, the three opposite-face pairs, and the final upward value of all six rotations. Asset validation additionally checks all 192 transparent source frames, dimensions, empty outer borders, and final/static equality. The contact sheet must also be visually inspected for readable pips and true volume. Mathematical geometry checks do not establish hardware/browser animation performance; the consuming preview still needs mobile, desktop, reduced-motion and loading tests.
