import assert from "node:assert/strict";
import test from "node:test";
import type { DrawStroke } from "./drawGuessEngine";
import { createDrawGuessInkBuffer, getDrawGuessInkDrawing, mergeDrawGuessInkBatch, mergeDrawGuessInkSnapshot } from "./drawGuessInkBuffer";

const first: DrawStroke = { color: "#123456", width: 6, points: [[0.1, 0.2]] };
const second: DrawStroke = { color: "#654321", width: 6, points: [[0.3, 0.4]] };
const empty = () => createDrawGuessInkBuffer({ drawing: [], revision: 1, seq: 0 });

test("many updates to one stroke retain the complete earlier stroke", () => {
  let buffer = mergeDrawGuessInkBatch(empty(), { seq: 1, strokeIndex: 0, stroke: first });
  for (let seq = 2; seq <= 260; seq += 1) buffer = mergeDrawGuessInkBatch(buffer, { seq, strokeIndex: 1, stroke: second });
  assert.equal(buffer.events.length, 2);
  assert.deepEqual(getDrawGuessInkDrawing(buffer), [first, second]);
});

test("a later update to an earlier stroke still supplies the contiguous prefix", () => {
  let buffer = mergeDrawGuessInkBatch(empty(), { seq: 1, strokeIndex: 0, stroke: first });
  buffer = mergeDrawGuessInkBatch(buffer, { seq: 2, strokeIndex: 1, stroke: second });
  const extended = { ...first, points: [...first.points, [0.5, 0.6] as [number, number]] };
  buffer = mergeDrawGuessInkBatch(buffer, { seq: 3, strokeIndex: 0, stroke: extended });
  assert.deepEqual(getDrawGuessInkDrawing(buffer), [extended, second]);
});

test("out-of-order broadcasts wait for a missing stroke and ignore older or duplicate batches", () => {
  let buffer = mergeDrawGuessInkBatch(empty(), { seq: 3, strokeIndex: 1, stroke: second });
  assert.deepEqual(getDrawGuessInkDrawing(buffer), []);
  buffer = mergeDrawGuessInkBatch(buffer, { seq: 1, strokeIndex: 0, stroke: first });
  const current = buffer;
  buffer = mergeDrawGuessInkBatch(buffer, { seq: 2, strokeIndex: 1, stroke: first });
  assert.equal(buffer, current);
  assert.equal(mergeDrawGuessInkBatch(buffer, { seq: 3, strokeIndex: 1, stroke: first }), current);
  assert.deepEqual(getDrawGuessInkDrawing(buffer), [first, second]);
});

test("a delayed snapshot cannot restore an authoritative clear", () => {
  const oldSnapshot = { drawing: [first], revision: 5, seq: 4 };
  let buffer = createDrawGuessInkBuffer(oldSnapshot);
  buffer = mergeDrawGuessInkSnapshot(buffer, { drawing: [], revision: 6, seq: 4 });
  const cleared = buffer;
  buffer = mergeDrawGuessInkSnapshot(buffer, oldSnapshot);
  assert.equal(buffer, cleared);
  assert.deepEqual(getDrawGuessInkDrawing(buffer), []);
});

test("undo drops acknowledged batches and rejects their late rebroadcasts", () => {
  let buffer = mergeDrawGuessInkBatch(empty(), { seq: 1, strokeIndex: 0, stroke: first });
  buffer = mergeDrawGuessInkBatch(buffer, { seq: 2, strokeIndex: 1, stroke: second });
  buffer = mergeDrawGuessInkSnapshot(buffer, { drawing: [first], revision: 2, seq: 2 });
  buffer = mergeDrawGuessInkBatch(buffer, { seq: 2, strokeIndex: 1, stroke: second });
  assert.deepEqual(getDrawGuessInkDrawing(buffer), [first]);
  assert.equal(buffer.events.length, 0);
});

test("a clear preserves only strokes created after its sequence barrier", () => {
  let buffer = mergeDrawGuessInkBatch(empty(), { seq: 1, strokeIndex: 0, stroke: first });
  buffer = mergeDrawGuessInkBatch(buffer, { seq: 3, strokeIndex: 0, stroke: second });
  buffer = mergeDrawGuessInkSnapshot(buffer, { drawing: [], revision: 2, seq: 2 });
  assert.deepEqual(getDrawGuessInkDrawing(buffer), [second]);
});

test("snapshots cannot lower the sequence barrier within the current topic", () => {
  const buffer = createDrawGuessInkBuffer({ drawing: [], revision: 5, seq: 10 });
  assert.equal(mergeDrawGuessInkSnapshot(buffer, { drawing: [first], revision: 6, seq: 9 }), buffer);
});

test("a new turn starts with an empty buffer and its own sequence", () => {
  const previous = mergeDrawGuessInkBatch(empty(), { seq: 90, strokeIndex: 0, stroke: first });
  const next = createDrawGuessInkBuffer({ drawing: [], revision: previous.revision + 1, seq: 0 });
  assert.deepEqual(getDrawGuessInkDrawing(next), []);
  assert.deepEqual(getDrawGuessInkDrawing(mergeDrawGuessInkBatch(next, { seq: 1, strokeIndex: 0, stroke: second })), [second]);
});

test("clear ignores a timed-out stroke's late broadcast even when its server sequence is newer", () => {
  const inkCursor = { clientId: "artist-session", seq: 1 };
  let buffer = createDrawGuessInkBuffer({ drawing: [], revision: 2, seq: 0, inkCursor });
  buffer = mergeDrawGuessInkBatch(buffer, { seq: 100, inkCursor, strokeIndex: 0, stroke: first });
  assert.deepEqual(getDrawGuessInkDrawing(buffer), []);
  buffer = mergeDrawGuessInkBatch(buffer, { seq: 101, inkCursor: { ...inkCursor, seq: 2 }, strokeIndex: 0, stroke: second });
  assert.deepEqual(getDrawGuessInkDrawing(buffer), [second]);
});

test("a clear removes already buffered timed-out batches using their source cursor", () => {
  const inkCursor = { clientId: "artist-session", seq: 2 };
  let buffer = mergeDrawGuessInkBatch(empty(), { seq: 100, inkCursor, strokeIndex: 0, stroke: first });
  buffer = mergeDrawGuessInkSnapshot(buffer, { drawing: [], revision: 2, seq: 0, inkCursor });
  assert.deepEqual(getDrawGuessInkDrawing(buffer), []);
  assert.equal(buffer.events.length, 0);
});

test("a source cursor does not discard a different session or legacy protocol stroke", () => {
  const cleared = createDrawGuessInkBuffer({ drawing: [], revision: 2, seq: 10, inkCursor: { clientId: "first-session", seq: 5 } });
  assert.deepEqual(getDrawGuessInkDrawing(mergeDrawGuessInkBatch(cleared, {
    seq: 11, inkCursor: { clientId: "second-session", seq: 1 }, strokeIndex: 0, stroke: first,
  })), [first]);
  assert.deepEqual(getDrawGuessInkDrawing(mergeDrawGuessInkBatch(cleared, { seq: 11, strokeIndex: 0, stroke: first })), [first]);
  assert.equal(mergeDrawGuessInkBatch(cleared, { seq: 10, strokeIndex: 0, stroke: first }), cleared);
});

test("late requests cannot replace newer source data with a higher server sequence", () => {
  const inkCursor = { clientId: "artist-session", seq: 2 };
  let buffer = mergeDrawGuessInkBatch(empty(), { seq: 10, inkCursor, strokeIndex: 0, stroke: second });
  buffer = mergeDrawGuessInkBatch(buffer, { seq: 11, inkCursor: { ...inkCursor, seq: 1 }, strokeIndex: 0, stroke: first });
  assert.deepEqual(getDrawGuessInkDrawing(buffer), [second]);
});
