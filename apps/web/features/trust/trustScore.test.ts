import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateTrustScore,
  getTrustLevel,
  initialTrustScore,
  isActivityEndedForTrustSettlement,
  isLargeActivityCapacity,
  isLowTrustScore,
  largeActivityCapacityThreshold,
  lowTrustScoreThreshold,
} from "./trustScore";
import { getTrustScoreEventDelta } from "./trustScoreEvents";

test("trust score starts at 95 and clamps between 0 and 100", () => {
  assert.equal(initialTrustScore, 95);
  assert.equal(calculateTrustScore(null), initialTrustScore);
  assert.equal(calculateTrustScore(0.1), 95.1);
  assert.equal(calculateTrustScore(0.1 + 0.1 + 0.1), 95.3);
  assert.equal(calculateTrustScore(50), 100);
  assert.equal(calculateTrustScore(-200), 0);
});

test("confirmed check-in adds one tenth of a trust point", () => {
  assert.equal(getTrustScoreEventDelta("ACTIVITY_CHECK_IN"), 0.1);
});

test("a participant explicitly marked absent loses two trust points", () => {
  assert.equal(getTrustScoreEventDelta("NO_SHOW"), -2);
});

test("no-show settlement starts after the activity ends and skips cancellations", () => {
  const now = new Date("2026-09-17T18:00:00.000Z");

  assert.equal(
    isActivityEndedForTrustSettlement(
      {
        endAt: new Date("2026-09-17T17:00:00.000Z"),
        startAt: new Date("2026-09-17T16:00:00.000Z"),
        status: "CONFIRMED",
      },
      now,
    ),
    true,
  );
  assert.equal(
    isActivityEndedForTrustSettlement(
      {
        endAt: new Date("2026-09-17T19:00:00.000Z"),
        startAt: new Date("2026-09-17T16:00:00.000Z"),
        status: "CONFIRMED",
      },
      now,
    ),
    false,
  );
  assert.equal(
    isActivityEndedForTrustSettlement(
      {
        endAt: new Date("2026-09-17T17:00:00.000Z"),
        startAt: new Date("2026-09-17T16:00:00.000Z"),
        status: "CANCELLED",
      },
      now,
    ),
    false,
  );
});

test("trust levels resolve from product thresholds", () => {
  assert.equal(getTrustLevel(95), "TRUSTED");
  assert.equal(getTrustLevel(80), "VERIFIED");
  assert.equal(getTrustLevel(60), "BUILDING_TRUST");
  assert.equal(getTrustLevel(30), "WARNING");
  assert.equal(getTrustLevel(29), "RESTRICTED");
});

test("low trust and large activity thresholds match policy", () => {
  assert.equal(isLowTrustScore(lowTrustScoreThreshold - 1), true);
  assert.equal(isLowTrustScore(lowTrustScoreThreshold), false);
  assert.equal(isLargeActivityCapacity(largeActivityCapacityThreshold), true);
  assert.equal(
    isLargeActivityCapacity(largeActivityCapacityThreshold - 1),
    false,
  );
});
