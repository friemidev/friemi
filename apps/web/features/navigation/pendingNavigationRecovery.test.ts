import assert from "node:assert/strict";
import test from "node:test";
import {
  getPendingNavigationRecoveryHref,
  PENDING_NAVIGATION_RECOVERY_DELAY_MS,
} from "./pendingNavigationRecovery";

const startingHref = "https://friemi.com/zh-CN/mobile-home";
const destinationHref = "/zh-CN/lobby";

function recovery(overrides: Record<string, string | number | boolean> = {}) {
  return getPendingNavigationRecoveryHref({
    currentHref: startingHref,
    destinationHref,
    elapsedMs: PENDING_NAVIGATION_RECOVERY_DELAY_MS,
    isOnline: true,
    isVisible: true,
    startingHref,
    ...overrides,
  });
}

test("recovers a stalled same-origin navigation with a full-page URL", () => {
  assert.equal(recovery(), "https://friemi.com/zh-CN/lobby");
});

test("does not reload a navigation that completed or redirected", () => {
  assert.equal(
    recovery({ currentHref: "https://friemi.com/zh-CN/lobby" }),
    null,
  );
  assert.equal(
    recovery({ currentHref: "https://friemi.com/zh-CN/sign-in" }),
    null,
  );
});

test("waits for the deadline and an online, visible app", () => {
  assert.equal(
    recovery({ elapsedMs: PENDING_NAVIGATION_RECOVERY_DELAY_MS - 1 }),
    null,
  );
  assert.equal(recovery({ isOnline: false }), null);
  assert.equal(recovery({ isVisible: false }), null);
});

test("never recovers to the current page or another origin", () => {
  assert.equal(recovery({ destinationHref: startingHref }), null);
  assert.equal(
    recovery({ destinationHref: "https://example.com/other" }),
    null,
  );
});
