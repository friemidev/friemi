import assert from "node:assert/strict";
import test from "node:test";
import {
  isGuestJoinRateLimited,
  maxGuestJoinsGlobalPerFingerprint,
  maxGuestJoinsPerActivityPerFingerprint,
} from "./guestJoinRateLimit";

test("guest join rate limit allows up to 99 attempts per activity and source", () => {
  assert.equal(maxGuestJoinsPerActivityPerFingerprint, 99);
  assert.equal(maxGuestJoinsGlobalPerFingerprint, 99);
  assert.equal(
    isGuestJoinRateLimited({
      activityAttemptCount: 98,
      globalAttemptCount: 98,
    }),
    false,
  );
  assert.equal(
    isGuestJoinRateLimited({
      activityAttemptCount: 99,
      globalAttemptCount: 98,
    }),
    true,
  );
});
