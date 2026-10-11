import assert from "node:assert/strict";
import test from "node:test";
import { drawGuessCanvasPoint } from "./drawGuessCanvasCoordinates";
import { canStartDrawGuessStroke } from "./drawGuessDrawingBudget";
import { isValidDrawing, type DrawStroke } from "./drawGuessEngine";

test("precise pointer coordinates retain sub-pixel accuracy without long float payloads", () => {
  const geometry = { bounds: { left: 0, top: 0, width: 1000, height: 700 }, width: 1000, height: 700, border: 0, rotatedClockwise: false };
  for (let index = 0; index < 512; index++) {
    const x = index / 511, y = .5 + Math.sin(index * .07) * .3;
    const point = drawGuessCanvasPoint(x * 1000, y * 700, geometry)!;
    assert.ok(Math.abs(point[0] - x) * 1000 <= .051);
    assert.ok(Math.abs(point[1] - y) * 700 <= .036);
    assert.ok(JSON.stringify(point).length <= 15);
  }
});

test("every allowed full-length gesture remains savable, including partial autosaves", () => {
  const stroke: DrawStroke = {color: "#30425C", width: 24, points: Array.from({length:512}, (_, index) => [index % 2 ? .1234 : .9876, .5678])};
  const drawing: DrawStroke[] = [];
  while (canStartDrawGuessStroke(drawing)) {
    for (const count of [1, 256, 512]) assert.ok(isValidDrawing([...drawing, {...stroke, points:stroke.points.slice(0,count)}]));
    drawing.push(stroke);
  }
  assert.ok(drawing.length > 8);
  assert.ok(drawing.length < 120);
  assert.ok(isValidDrawing(drawing));
  assert.ok(canStartDrawGuessStroke(drawing.slice(0, -1)), "Undo must free room for another full gesture");
});

test("legacy high-precision drawings and the stroke-count limit are preserved", () => {
  const detailed: DrawStroke = {color: "#30425C", width: 6, points: Array.from({length:512}, (_, i) => [i/511,.5+Math.sin(i*.07)*.3])};
  const legacy = Array.from({length:4}, () => detailed);
  const before = JSON.stringify(legacy);
  assert.ok(isValidDrawing(legacy));
  assert.equal(canStartDrawGuessStroke(legacy), false);
  assert.ok(canStartDrawGuessStroke(legacy.slice(0, -1)));
  assert.equal(JSON.stringify(legacy), before);
  assert.equal(canStartDrawGuessStroke(Array.from({length:120}, () => ({...detailed,points:[[.1,.2]]}))), false);
});
