import assert from "node:assert/strict";
import test from "node:test";
import { validateActivitySchedule } from "./validateActivitySchedule";

test("validateActivitySchedule allows past start when end is in the future", () => {
  const now = new Date("2026-05-30T12:00:00Z");
  const result = validateActivitySchedule({
    now,
    startAt: new Date("2026-05-29T10:00:00Z"),
    endAt: new Date("2026-05-31T22:00:00Z"),
  });

  assert.equal(result.ok, true);
});

test("validateActivitySchedule rejects past start without future end", () => {
  const now = new Date("2026-05-30T12:00:00Z");
  const result = validateActivitySchedule({
    now,
    startAt: new Date("2026-05-29T10:00:00Z"),
    endAt: null,
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.field, "startAt");
  }
});
