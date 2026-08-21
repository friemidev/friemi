import assert from "node:assert/strict";
import test from "node:test";
import {
  getUnreadBadgeFreshnessRemainingMs,
  getUnreadBadgePollDelayMs,
  resolveUnreadBadgeFreshnessGuardEnabled,
} from "./unreadBadgePolling";

test("enables the freshness guard by default in Vercel environments", () => {
  assert.equal(
    resolveUnreadBadgeFreshnessGuardEnabled({
      vercelEnvironment: "preview",
    }),
    true,
  );
  assert.equal(
    resolveUnreadBadgeFreshnessGuardEnabled({
      vercelEnvironment: "production",
    }),
    true,
  );
  assert.equal(
    resolveUnreadBadgeFreshnessGuardEnabled({
      configuredValue: "1",
      vercelEnvironment: "production",
    }),
    true,
  );
  assert.equal(
    resolveUnreadBadgeFreshnessGuardEnabled({
      configuredValue: "off",
      vercelEnvironment: "preview",
    }),
    false,
  );
});

test("skips navigation refreshes inside the 30 second freshness window", () => {
  const firstNavigationAtMs = 1_000;
  let lastSuccessfulRefreshAtMs: number | null = null;
  let refreshCount = 0;

  for (const nowMs of [1_000, 3_000, 5_000, 7_000, 10_000]) {
    const freshnessRemainingMs = getUnreadBadgeFreshnessRemainingMs({
      freshnessGuardEnabled: true,
      lastSuccessfulRefreshAtMs,
      nowMs,
    });

    if (freshnessRemainingMs === 0) {
      refreshCount += 1;
      lastSuccessfulRefreshAtMs = firstNavigationAtMs;
    }
  }

  assert.equal(refreshCount, 1);
  assert.equal(
    getUnreadBadgeFreshnessRemainingMs({
      freshnessGuardEnabled: true,
      lastSuccessfulRefreshAtMs,
      nowMs: 10_000,
    }),
    21_000,
  );
});

test("refreshes when freshness expires and when the guard is disabled", () => {
  assert.equal(
    getUnreadBadgeFreshnessRemainingMs({
      freshnessGuardEnabled: true,
      lastSuccessfulRefreshAtMs: 1_000,
      nowMs: 31_000,
    }),
    0,
  );
  assert.equal(
    getUnreadBadgeFreshnessRemainingMs({
      freshnessGuardEnabled: false,
      lastSuccessfulRefreshAtMs: 30_000,
      nowMs: 31_000,
    }),
    0,
  );
  assert.equal(
    getUnreadBadgeFreshnessRemainingMs({
      freshnessGuardEnabled: true,
      lastSuccessfulRefreshAtMs: null,
      nowMs: 31_000,
    }),
    0,
  );
});

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
