import assert from "node:assert/strict";
import test from "node:test";
import {
  getActivityListEntryHrefFromTransition,
  isActivityListRoute,
  normalizeActivityListEntryHref,
} from "./activityListEntryReturn";

const origin = "https://friemi.example";

test("isActivityListRoute matches the localized activity list with filters", () => {
  assert.equal(
    isActivityListRoute("/zh-CN/activities?city=Paris", "zh-CN", origin),
    true,
  );
  assert.equal(
    isActivityListRoute("/zh-CN/activities/", "zh-CN", origin),
    true,
  );
});

test("isActivityListRoute does not treat activity detail as the list", () => {
  assert.equal(
    isActivityListRoute("/zh-CN/activities/activity_1", "zh-CN", origin),
    false,
  );
});

test("getActivityListEntryHrefFromTransition saves the non-list entry page", () => {
  assert.equal(
    getActivityListEntryHrefFromTransition({
      fromRoute: "/zh-CN/mobile-home?tab=discover#top",
      locale: "zh-CN",
      origin,
      targetRoute: "/zh-CN/activities?city=Paris",
    }),
    "/zh-CN/mobile-home?tab=discover#top",
  );
});

test("getActivityListEntryHrefFromTransition ignores activity-list filter changes", () => {
  assert.equal(
    getActivityListEntryHrefFromTransition({
      fromRoute: "/zh-CN/activities?city=Paris",
      locale: "zh-CN",
      origin,
      targetRoute: "/zh-CN/activities?category=MUSIC",
    }),
    null,
  );
});

test("getActivityListEntryHrefFromTransition ignores activity section subroutes", () => {
  assert.equal(
    getActivityListEntryHrefFromTransition({
      fromRoute: "/zh-CN/activities/activity_1",
      locale: "zh-CN",
      origin,
      targetRoute: "/zh-CN/activities",
    }),
    null,
  );
});

test("normalizeActivityListEntryHref rejects external and current hrefs", () => {
  assert.equal(
    normalizeActivityListEntryHref({
      href: "https://evil.example/zh-CN/mobile-home",
      locale: "zh-CN",
      origin,
    }),
    null,
  );
  assert.equal(
    normalizeActivityListEntryHref({
      currentHref: "/zh-CN/profile",
      href: "/zh-CN/profile",
      locale: "zh-CN",
      origin,
    }),
    null,
  );
});
