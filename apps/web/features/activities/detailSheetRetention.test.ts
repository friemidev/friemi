import assert from "node:assert/strict";
import test from "node:test";
import { DetailSheetRetention } from "./detailSheetRetention";

test("detail retention evicts the least recently opened document at its limit", () => {
  const cache = new DetailSheetRetention(2);
  const [a, b, c] = [{}, {}, {}];
  const evicted: string[] = [];
  cache.retain(a, () => evicted.push("a"));
  cache.retain(b, () => evicted.push("b"));
  cache.retain(a, () => evicted.push("a"));
  assert.deepEqual(evicted, []);
  cache.retain(c, () => evicted.push("c"));
  assert.deepEqual(evicted, ["b"]);
});

test("unmounted or locked details release their cache slot and callbacks", () => {
  const cache = new DetailSheetRetention(2);
  const [a, b, c] = [{}, {}, {}];
  const evicted: string[] = [];
  cache.retain(a, () => evicted.push("a"));
  cache.retain(b, () => evicted.push("b"));
  cache.release(a);
  cache.release(a);
  cache.retain(c, () => evicted.push("c"));
  assert.deepEqual(evicted, []);
});
