import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateTrustScore,
  getTrustLevel,
  initialTrustScore,
  isLargeActivityCapacity,
  isLowTrustScore,
  largeActivityCapacityThreshold,
  lowTrustScoreThreshold,
} from "./trustScore";

test("trust score starts at 80 and clamps between 0 and 100", () => {
  assert.equal(calculateTrustScore(null), initialTrustScore);
  assert.equal(calculateTrustScore(50), 100);
  assert.equal(calculateTrustScore(-200), 0);
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
  assert.equal(isLargeActivityCapacity(largeActivityCapacityThreshold - 1), false);
});
