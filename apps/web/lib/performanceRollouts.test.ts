import assert from "node:assert/strict";
import test from "node:test";
import {
  getStableRolloutBucket,
  isPerformanceRolloutActive,
} from "./performanceRollouts";

test("performance rollout buckets are stable and bounded", () => {
  const first = getStableRolloutBucket("profile-123");
  const second = getStableRolloutBucket("profile-123");

  assert.equal(first, second);
  assert.ok(first >= 0);
  assert.ok(first < 100);
});

test("performance rollouts stay inactive by default", () => {
  assert.equal(isPerformanceRolloutActive("guestLink"), false);
});
