import assert from "node:assert/strict";
import test from "node:test";
import { appendDrawGuessPoint } from "./drawGuessStrokeInput";
import { isValidDrawing, type DrawStroke } from "./drawGuessEngine";

test("long gestures continue to the latest point within the server point budget", () => {
  let points: DrawStroke["points"] = [[0, 0.5]];
  for (let index = 1; index <= 2_000; index += 1) {
    points = appendDrawGuessPoint(points, [index / 2_000, 0.5 + Math.sin(index * 0.1) * 0.3]);
  }
  points = appendDrawGuessPoint(points, [1, 0.9]);
  assert.equal(points.length, 512);
  assert.deepEqual(points[0], [0, 0.5]);
  assert.deepEqual(points.at(-1), [1, 0.9]);
  assert.ok(isValidDrawing([{ color: "#30425C", width: 6, points }]));
});

test("simplifying a full stroke preserves a sharp turn and does not mutate the saved draft", () => {
  const points: DrawStroke["points"] = Array.from({ length: 512 }, (_, index) => [index / 600, index === 256 ? 0.9 : 0.2]);
  const original = structuredClone(points);
  const next = appendDrawGuessPoint(points, [0.95, 0.2]);
  assert.deepEqual(points, original);
  assert.equal(next.length, 512);
  assert.ok(next.some(([x, y]) => x === 256 / 600 && y === 0.9));
  assert.deepEqual(next.at(-1), [0.95, 0.2]);
});

test("sub-pixel jitter does not grow a stroke or trigger another render", () => {
  const points: DrawStroke["points"] = [[0.5, 0.5]];
  assert.equal(appendDrawGuessPoint(points, [0.5001, 0.5001]), points);
  assert.deepEqual(appendDrawGuessPoint(points, [0.51, 0.52]), [[0.5, 0.5], [0.51, 0.52]]);
});
