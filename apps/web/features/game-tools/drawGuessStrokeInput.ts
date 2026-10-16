import type { DrawStroke } from "./drawGuessEngine";

// Keep the wire format within isValidStroke's per-stroke limit.
const MAX_POINTS = 512;

export function appendDrawGuessPoint(points: DrawStroke["points"], next: [number, number]): DrawStroke["points"] {
  const last = points.at(-1);
  if (last && Math.hypot((next[0] - last[0]) * 1000, (next[1] - last[1]) * 700) < 2) return points;
  const extended = [...points, next];
  if (extended.length <= MAX_POINTS) return extended;

  // Keep the newest endpoint moving. Remove the least visible interior point,
  // rather than freezing a long gesture or splitting one undo into two strokes.
  let remove = 1;
  let smallestError = Infinity;
  for (let index = 1; index < extended.length - 1; index += 1) {
    const before = extended[index - 1];
    const current = extended[index];
    const after = extended[index + 1];
    const dx = (after[0] - before[0]) * 1000;
    const dy = (after[1] - before[1]) * 700;
    const px = (current[0] - before[0]) * 1000;
    const py = (current[1] - before[1]) * 700;
    const lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared ? Math.max(0, Math.min(1, (px * dx + py * dy) / lengthSquared)) : 0;
    const error = (px - t * dx) ** 2 + (py - t * dy) ** 2;
    if (error < smallestError) { smallestError = error; remove = index; }
  }
  extended.splice(remove, 1);
  return extended;
}
