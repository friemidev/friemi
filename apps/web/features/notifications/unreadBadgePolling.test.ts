import assert from "node:assert/strict";
import test from "node:test";
import { getUnreadBadgePollDelayMs } from "./unreadBadgePolling";

test("uses the base interval for successful and first failed badge polls", () => {
  assert.equal(
    getUnreadBadgePollDelayMs({
      baseIntervalMs: 45_000,
      consecutiveFailures: 0,
      randomValue: 0,
    }),
    45_000,
  );
  assert.equal(
    getUnreadBadgePollDelayMs({
      baseIntervalMs: 45_000,
      consecutiveFailures: 1,
      randomValue: 0,
    }),
    45_000,
  );
});

test("backs off repeated badge poll failures and caps the delay", () => {
  assert.equal(
    getUnreadBadgePollDelayMs({
      baseIntervalMs: 45_000,
      consecutiveFailures: 2,
      randomValue: 0,
    }),
    90_000,
  );
  assert.equal(
    getUnreadBadgePollDelayMs({
      baseIntervalMs: 45_000,
      consecutiveFailures: 3,
      randomValue: 0,
    }),
    180_000,
  );
  assert.equal(
    getUnreadBadgePollDelayMs({
      baseIntervalMs: 45_000,
      consecutiveFailures: 20,
      randomValue: 0.5,
    }),
    300_000,
  );
});

test("adds bounded jitter without exceeding the configured maximum", () => {
  assert.equal(
    getUnreadBadgePollDelayMs({
      baseIntervalMs: 45_000,
      consecutiveFailures: 0,
      maxJitterMs: 5000,
      randomValue: 0.5,
    }),
    47_500,
  );
});
