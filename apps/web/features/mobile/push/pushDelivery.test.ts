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
      actorId: "sender_1",
      activityId: null,
      type: "CHARM_GIFT_RECEIVED",
    }),
    "/profile/sender_1",
  );
  assert.equal(
    getNotificationPath({
      type: "DIRECT_MESSAGE",
      activityId: null,
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

test("getNotificationCopy includes check-in success copy", () => {
  assert.deepEqual(
    getNotificationCopy({
      activityTitle: "来吧",
      actorName: "friemi",
      locale: "zh-CN",
      type: "ACTIVITY_CHECK_IN",
    }),
    {
      body: "来吧 签到成功",
      title: "Friemi",
    },
  );
});

test("getNotificationCopy includes check-in request copy", () => {
  assert.deepEqual(
    getNotificationCopy({
      activityTitle: "来吧",
      actorActivityRole: null,
      actorName: "hoting",
      locale: "zh-CN",
      type: "ACTIVITY_CHECK_IN",
    }),
    {
      body: "hoting 提交了签到",
      title: "Friemi",
    },
  );
});

test("getNotificationCopy includes received gift detail", () => {
  assert.deepEqual(
    getNotificationCopy({
      actorName: "hoting",
      activityTitle: null,
      giftText: "🌹 玫瑰 +5",
      locale: "zh-CN",
      type: "CHARM_GIFT_RECEIVED",
    }),
    {
      body: "🌹 玫瑰 +5",
      title: "hoting 给你送了礼物",
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
