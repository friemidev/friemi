import assert from "node:assert/strict";
import test from "node:test";
import { readUnoClock, sampleUnoClock, syncUnoClock } from "./unoClock";

test("room deadlines ignore a device clock an hour ahead or behind", () => {
  const sample = sampleUnoClock(100_000, 5_000);
  for (const deviceNow of [3_700_000, -3_500_000]) {
    assert.equal(160_000 - readUnoClock(sample, 7_000, deviceNow), 58_000);
  }
});

test("a server reaction expires after elapsed time even if the device clock jumps", () => {
  const sample = sampleUnoClock(100_000, 10_000);
  const expiresAt = 104_500;
  assert.ok(expiresAt > readUnoClock(sample, 14_499, 86_500_000));
  assert.ok(expiresAt <= readUnoClock(sample, 14_500, -86_300_000));
});

test("fresh server samples replace old anchors; legacy snapshots keep local time", () => {
  const old = sampleUnoClock(100_000, 1_000);
  const fresh = sampleUnoClock(102_500, 3_700);
  assert.equal(readUnoClock(old, 4_700, 0), 103_700);
  assert.equal(readUnoClock(fresh, 4_700, 0), 103_500);
  for (const absent of [undefined, NaN, Infinity]) assert.equal(readUnoClock(sampleUnoClock(absent, 0), 100, 25_000), 25_000);
});

test("late duplicate or older samples cannot revive an expired reaction", () => {
  const current = sampleUnoClock(100_000, 1_000);
  for (const serverNow of [100_000, 99_999, undefined]) {
    const updated = syncUnoClock(current, serverNow, 7_000);
    assert.equal(updated, current);
    assert.equal(readUnoClock(updated, 7_000, 0), 106_000);
    assert.ok(readUnoClock(updated, 7_000, 0) >= 104_500);
  }
  assert.deepEqual(syncUnoClock(current, 107_000, 7_000), { serverNow: 107_000, monotonicAt: 7_000 });
});

test("a newer timestamp delivered late cannot extend the remaining turn", () => {
  const current = sampleUnoClock(100_000, 1_000);
  const delayed = syncUnoClock(current, 101_000, 7_000);
  assert.equal(readUnoClock(delayed, 8_000, 0), 107_000);
});
