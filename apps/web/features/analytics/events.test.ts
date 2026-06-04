import assert from "node:assert/strict";
import test from "node:test";
import {
  analyticsEventInputSchema,
  assertAnalyticsEventRequirements,
  inferAnalyticsDeviceType,
  normalizeAnalyticsProperties,
  sanitizeAnalyticsReferrer,
  sanitizeAnalyticsRoute,
} from "./events";

test("analytics event schema rejects unknown events", () => {
  const result = analyticsEventInputSchema.safeParse({
    name: "button_clicked",
    route: "/zh-CN",
  });

  assert.equal(result.success, false);
});

test("normalizeAnalyticsProperties removes sensitive fields and limits values", () => {
  const properties = normalizeAnalyticsProperties({
    email: "user@example.com",
    comment_content: "private text",
    activity_category: "EXHIBITION",
    long_label: "x".repeat(180),
    tags: ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k"],
  });

  assert.deepEqual(properties?.email, undefined);
  assert.deepEqual(properties?.comment_content, undefined);
  assert.deepEqual(properties?.user_email, undefined);
  assert.deepEqual(properties?.contact_phone, undefined);
  assert.equal(properties?.activity_category, "EXHIBITION");
  assert.equal(String(properties?.long_label).length, 120);
  assert.equal(Array.isArray(properties?.tags), true);
  assert.equal((properties?.tags as unknown[]).length, 10);
});

test("normalizeAnalyticsProperties keeps only comparable property keys", () => {
  const properties = normalizeAnalyticsProperties({
    keyword_length: 8,
    "bad-key": "ignored",
    camelCaseKey: "ignored",
  });

  assert.equal(properties?.keyword_length, 8);
  assert.equal(properties?.["bad-key"], undefined);
  assert.equal(properties?.camelCaseKey, undefined);
});

test("assertAnalyticsEventRequirements requires entity context for activity clicks", () => {
  assert.throws(() =>
    assertAnalyticsEventRequirements({
      name: "activity_card_clicked",
      entityType: "activity",
      entityId: null,
      sourceSurface: "activity_list",
    }),
  );

  assert.doesNotThrow(() =>
    assertAnalyticsEventRequirements({
      name: "activity_card_clicked",
      entityType: "activity",
      entityId: "activity_1",
      sourceSurface: "activity_list",
    }),
  );
});

test("assertAnalyticsEventRequirements requires source surface for activity metrics", () => {
  assert.throws(() =>
    assertAnalyticsEventRequirements({
      name: "activity_detail_viewed",
      entityType: "activity",
      entityId: "activity_1",
      sourceSurface: null,
    }),
  );

  assert.doesNotThrow(() =>
    assertAnalyticsEventRequirements({
      name: "activity_detail_viewed",
      entityType: "activity",
      entityId: "activity_1",
      sourceSurface: "activity_list",
    }),
  );
});

test("assertAnalyticsEventRequirements requires safe friend request context", () => {
  assert.throws(() =>
    assertAnalyticsEventRequirements({
      name: "friend_request_sent",
      entityType: "user",
      entityId: "profile_1",
      sourceSurface: "messages",
      properties: {
        lookup_type: "friend_code",
      },
    }),
  );

  assert.doesNotThrow(() =>
    assertAnalyticsEventRequirements({
      name: "friend_request_sent",
      entityType: "user",
      entityId: "profile_1",
      sourceSurface: "messages",
      properties: {
        lookup_type: "friend_code",
        request_origin: "lookup_form",
      },
    }),
  );
});

test("assertAnalyticsEventRequirements requires admin operations context", () => {
  assert.throws(() =>
    assertAnalyticsEventRequirements({
      name: "report_submitted",
      entityType: null,
      entityId: "report_1",
      sourceSurface: "report_dialog",
      properties: {
        reason: "SPAM",
        target_type: "COMMENT",
      },
    }),
  );

  assert.doesNotThrow(() =>
    assertAnalyticsEventRequirements({
      name: "admin_report_status_updated",
      entityType: "report",
      entityId: "report_1",
      sourceSurface: "admin_reports",
      properties: {
        from_status: "PENDING",
        report_id: "report_1",
        to_status: "RESOLVED",
      },
    }),
  );

  assert.doesNotThrow(() =>
    assertAnalyticsEventRequirements({
      name: "public_event_converted_to_team",
      entityType: "public_event",
      entityId: "public_event_1",
      sourceSurface: "public_event_detail",
      properties: {
        activity_id: "activity_1",
        public_event_id: "public_event_1",
      },
    }),
  );
});

test("inferAnalyticsDeviceType classifies common user agents", () => {
  assert.equal(
    inferAnalyticsDeviceType(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile",
    ),
    "mobile",
  );
  assert.equal(
    inferAnalyticsDeviceType("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)"),
    "tablet",
  );
  assert.equal(
    inferAnalyticsDeviceType("Mozilla/5.0 (X11; Linux x86_64) Chrome/125"),
    "desktop",
  );
});

test("sanitizeAnalyticsRoute and sanitizeAnalyticsReferrer remove query strings", () => {
  assert.equal(sanitizeAnalyticsRoute("/zh-CN/search?q=secret"), "/zh-CN/search");
  assert.equal(
    sanitizeAnalyticsReferrer("https://example.com/zh-CN?q=secret"),
    "https://example.com/zh-CN",
  );
});
