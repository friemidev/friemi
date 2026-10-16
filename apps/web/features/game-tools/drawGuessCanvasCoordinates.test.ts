import assert from "node:assert/strict";
import test from "node:test";
import { drawGuessCanvasPoint } from "./drawGuessCanvasCoordinates";

function expectPoint(actual: [number, number] | null, expected: [number, number]) {
  assert.ok(actual);
  actual.forEach((value, index) => assert.ok(Math.abs(value - expected[index]) < 0.000001, `${actual} != ${expected}`));
}

test("normal landscape drawing reaches every corner and the center inside the border", () => {
  const geometry = { bounds: { left: 100, top: 50, width: 506, height: 356 }, width: 506, height: 356, border: 3, rotatedClockwise: false };
  for (const x of [0, 0.5, 1]) for (const y of [0, 0.5, 1]) {
    expectPoint(drawGuessCanvasPoint(103 + x * 500, 53 + y * 350, geometry), [x, y]);
  }
});

test("CSS fullscreen rotation maps the full paper without swapping or mirroring strokes", () => {
  const geometry = { bounds: { left: 20, top: 40, width: 356, height: 506 }, width: 506, height: 356, border: 3, rotatedClockwise: true };
  for (const x of [0, 0.5, 1]) for (const y of [0, 0.5, 1]) {
    expectPoint(drawGuessCanvasPoint(373 - y * 350, 43 + x * 500, geometry), [x, y]);
  }
});

test("scaled layouts account for the SVG border and horizontal letterboxing", () => {
  const geometry = { bounds: { left: 100, top: 50, width: 1007.5, height: 445 }, width: 806, height: 356, border: 3, rotatedClockwise: false };
  for (const x of [0, 0.5, 1]) for (const y of [0, 0.5, 1]) {
    expectPoint(drawGuessCanvasPoint(100 + (153 + x * 500) * 1.25, 50 + (3 + y * 350) * 1.25, geometry), [x, y]);
  }
});

test("rotated layouts account for vertical letterboxing and scale", () => {
  const geometry = { bounds: { left: 20, top: 40, width: 1012, height: 1012 }, width: 506, height: 506, border: 3, rotatedClockwise: true };
  for (const x of [0, 0.5, 1]) for (const y of [0, 0.5, 1]) {
    expectPoint(drawGuessCanvasPoint(1032 - (78 + y * 350) * 2, 40 + (3 + x * 500) * 2, geometry), [x, y]);
  }
});

test("the same stroke coordinates survive resize, rotation and fullscreen exit", () => {
  const portrait = { bounds: { left: 15, top: 100, width: 306, height: 216 }, width: 306, height: 216, border: 3, rotatedClockwise: false };
  const rotated = { bounds: { left: 20, top: 40, width: 356, height: 506 }, width: 506, height: 356, border: 3, rotatedClockwise: true };
  const landscape = { bounds: { left: 100, top: 50, width: 506, height: 356 }, width: 506, height: 356, border: 3, rotatedClockwise: false };
  for (const x of [0.1, 0.5, 0.9]) {
    expectPoint(drawGuessCanvasPoint(18 + x * 300, 208, portrait), [x, 0.5]);
    expectPoint(drawGuessCanvasPoint(198, 43 + x * 500, rotated), [x, 0.5]);
    expectPoint(drawGuessCanvasPoint(103 + x * 500, 228, landscape), [x, 0.5]);
    expectPoint(drawGuessCanvasPoint(18 + x * 300, 208, portrait), [x, 0.5]);
  }
});

test("borderless canvases clamp captured pointers outside the paper and reject a collapsed frame", () => {
  const geometry = { bounds: { left: 0, top: 0, width: 1000, height: 700 }, width: 1000, height: 700, border: 0, rotatedClockwise: false };
  expectPoint(drawGuessCanvasPoint(-10, 800, geometry), [0, 1]);
  assert.equal(drawGuessCanvasPoint(20, 20, { ...geometry, bounds: { ...geometry.bounds, width: 0 } }), null);
  assert.equal(drawGuessCanvasPoint(20, 20, { ...geometry, width: 0 }), null);
  assert.equal(drawGuessCanvasPoint(20, 20, { ...geometry, height: Number.NaN }), null);
});
