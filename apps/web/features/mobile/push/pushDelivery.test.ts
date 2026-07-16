import assert from "node:assert/strict";
import test from "node:test";
import {
  getAPNsErrorReason,
  getNotificationCopy,
  getNotificationPath,
  isInvalidAPNsTokenResponse,
  isInvalidFirebaseTokenResponse,
  normalizePushLocale,
} from "./pushDelivery";

test("normalizePushLocale maps supported locales conservatively", () => {
  assert.equal(normalizePushLocale("zh-TW"), "zh-CN");
  assert.equal(normalizePushLocale("en-US"), "en");
  assert.equal(normalizePushLocale("fr-FR"), "fr");
  assert.equal(normalizePushLocale(null), "fr");
});

test("getNotificationPath routes activity and message notifications correctly", () => {
  assert.equal(
    getNotificationPath({
      activityId: "activity_1",
      type: "ACTIVITY_COMMENTED",
    }),
    "/lobby/activity_1#comments",
  );
  assert.equal(
    getNotificationPath({
      activityId: "activity_1",
      type: "PARTICIPATION_PENDING",
    }),
    "/lobby/activity_1#participation-approval",
  );
  assert.equal(
    getNotificationPath({
      activityId: null,
      momentId: "moment_1",
      type: "MOMENT_COMMENTED",
    }),
    "/footprints/moment_1",
  );
  assert.equal(
    getNotificationPath({
      activityId: null,
      type: "DIRECT_MESSAGE",
    }),
    "/messages",
  );
});

test("getNotificationCopy keeps localized fallback copy", () => {
  assert.deepEqual(
    getNotificationCopy({
      activityTitle: null,
      actorName: null,
      locale: "zh-CN",
      type: "REPORT_CREATED",
    }),
    {
      body: "有新的举报需要处理",
      title: "Friemi",
    },
  );
});

test("firebase invalid-token detection matches FCM responses", () => {
  assert.equal(
    isInvalidFirebaseTokenResponse(
      404,
      '{"error":{"status":"NOT_FOUND","message":"UNREGISTERED"}}',
    ),
    true,
  );
  assert.equal(isInvalidFirebaseTokenResponse(500, "internal"), false);
});

test("apns invalid-token detection parses structured reasons", () => {
  assert.equal(
    getAPNsErrorReason('{"reason":"BadDeviceToken"}'),
    "BadDeviceToken",
  );
  assert.equal(
    isInvalidAPNsTokenResponse(400, '{"reason":"BadDeviceToken"}'),
    true,
  );
  assert.equal(
    isInvalidAPNsTokenResponse(410, '{"reason":"Unregistered"}'),
    true,
  );
  assert.equal(
    isInvalidAPNsTokenResponse(403, '{"reason":"ExpiredProviderToken"}'),
    false,
  );
});
