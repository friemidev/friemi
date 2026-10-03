import assert from "node:assert/strict";
import test from "node:test";
import { getNowExpiry, getNowPriority, isNowKind, isNowVisible } from "./now";

test("a default 12-hour invite leaves the feed at its exact expiry", () => {
  const published = new Date("2026-10-03T10:00:00.000Z");
  const expiry = getNowExpiry(published, 12);
  assert.equal(expiry.toISOString(), "2026-10-03T22:00:00.000Z");
  assert.equal(
    isNowVisible(expiry, new Date("2026-10-03T21:59:59.999Z")),
    true,
  );
  assert.equal(
    isNowVisible(expiry, new Date("2026-10-03T22:00:00.000Z")),
    false,
  );
  assert.throws(() => getNowExpiry(published, 72));
});

test("supported invite kinds include the home mockup actions", () => {
  for (const kind of ["COFFEE", "DRINK", "PARK", "MOVIE", "GAME", "TEA"]) {
    assert.equal(isNowKind(kind), true);
  }
  assert.equal(isNowKind("FAKE"), false);
});

test("interest raises prominence while a given hourly ordering stays stable", () => {
  const now = new Date("2026-10-03T12:00:00.000Z");
  const createdAt = new Date("2026-10-03T10:00:00.000Z");
  const base = getNowPriority({
    id: "invite-1",
    interestCount: 0,
    createdAt,
    now,
  });
  const active = getNowPriority({
    id: "invite-1",
    interestCount: 4,
    createdAt,
    now,
  });
  assert.deepEqual(
    base,
    getNowPriority({ id: "invite-1", interestCount: 0, createdAt, now }),
  );
  assert.ok(active.score > base.score);
  assert.equal(active.size, "large");
});
