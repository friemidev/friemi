import assert from "node:assert/strict";
import test from "node:test";
import {
  getAnalyticsSampleRate,
  isSampleableAnalyticsEvent,
  sampleAnalyticsEvent,
} from "./policy";

test("only performance and exposure events are sampleable", () => {
  assert.equal(isSampleableAnalyticsEvent("page_load_timed"), true);
  assert.equal(isSampleableAnalyticsEvent("activity_swipe_viewed"), true);
  assert.equal(isSampleableAnalyticsEvent("message_sent"), false);
  assert.equal(isSampleableAnalyticsEvent("admin_report_status_updated"), false);
});

test("preview samples optional events and never samples business events", () => {
  assert.equal(getAnalyticsSampleRate("page_load_timed", "preview"), 0.1);
  assert.equal(getAnalyticsSampleRate("activity_list_viewed", "preview"), 1);
  assert.equal(
    getAnalyticsSampleRate("activity_list_viewed", "preview", "0.25"),
    0.25,
  );
  assert.equal(getAnalyticsSampleRate("message_sent", "preview", "0"), 1);
  assert.equal(getAnalyticsSampleRate("page_load_timed", "production"), 1);
});

test("sampled events carry their rate for reporting", () => {
  const input = {
    name: "page_load_timed" as const,
    locale: "zh-CN" as const,
    route: "/zh-CN/mobile-home",
    properties: {
      duration_ms: 420,
      route_key: "mobile-home",
      slowest_step_label: "feed",
      slowest_step_ms: 300,
    },
  };

  assert.equal(sampleAnalyticsEvent(input, "preview", 0.5), null);
  assert.deepEqual(sampleAnalyticsEvent(input, "preview", 0.05), {
    ...input,
    properties: {
      ...input.properties,
      analytics_sample_rate: 0.1,
    },
  });
});
