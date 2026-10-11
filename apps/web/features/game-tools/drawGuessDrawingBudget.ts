import { DRAW_GUESS_MAX_DRAWING_BYTES, type DrawStroke } from "./drawGuessEngine";

// Canvas points use four decimal places: at most 15 JSON characters per pair,
// plus a comma. Reserve one complete gesture so it never stops halfway through.
const MAX_STROKE_BYTES = JSON.stringify({ color: "#FFFFFF", width: 24, points: [] }).length + 512 * 16;

export function canStartDrawGuessStroke(strokes: DrawStroke[]) {
  return strokes.length < 120 && JSON.stringify(strokes).length + MAX_STROKE_BYTES + 1 <= DRAW_GUESS_MAX_DRAWING_BYTES;
}
