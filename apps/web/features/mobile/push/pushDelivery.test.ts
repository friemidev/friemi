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
    "/profile/gift-wall",
  );
  assert.equal(
    getNotificationPath({
      type: "DIRECT_MESSAGE",
      activityId: null,
    }),
    "/messages",
  );
});

test("received tickets open the single-ticket bag list", () => {
  assert.equal(
    getNotificationPath({
      activityId: null,
      type: "INVENTORY_TICKET_RECEIVED",
    }),
    "/profile/bag",
  );
});

test("cancelled merchant residency push links to the original date and names it", () => {
  assert.equal(
    getNotificationPath({
      activityId: null,
      residencyMerchantId: "merchant-1",
      residencySlotId: "slot-1",
      type: "MERCHANT_BOOKING_CANCELLED",
    }),
    "/merchants/merchant-1/bookings/slot-1",
  );
  assert.deepEqual(
    getNotificationCopy({
      activityTitle: null,
      actorName: null,
      locale: "zh-CN",
      residencyTitle: "周末聚会",
      type: "MERCHANT_BOOKING_CANCELLED",
    }),
    { title: "店铺预约已取消", body: "你报名的「周末聚会」已取消" },
  );
});

test("booking review and publication push routes and details stay specific", () => {
  assert.equal(
    getNotificationPath({
      activityId: null,
      residencySlotId: "slot-1",
      type: "MERCHANT_BOOKING_REJECTED",
    }),
    "/profile/store/bookings/slot-1",
  );
  assert.equal(
    getNotificationPath({
      activityId: "activity-1",
      residencySlotId: "slot-1",
      type: "MERCHANT_BOOKING_PUBLISHED",
    }),
    "/lobby/activity-1",
  );
  const published = getNotificationCopy({
    activityTitle: "周末聚吧",
    actorName: null,
    locale: "zh-CN",
    residencyTitle: "周末聚吧",
    residencyStartAt: "2050-07-20T19:30:00.000Z",
    residencyAddress: "2 rue de test",
    type: "MERCHANT_BOOKING_PUBLISHED",
  });
  assert.match(published.body, /19:30/);
  assert.match(published.body, /2 rue de test/);
});

test("received ticket push works for gifts and admin batches in each locale", () => {
  assert.deepEqual(
    getNotificationCopy({
      activityTitle: null,
      actorName: "hoting",
      locale: "zh-CN",
      ticketTitle: "酒会票",
      type: "INVENTORY_TICKET_RECEIVED",
    }),
    {
      body: "「酒会票」已放入物品背包",
      title: "收到票券",
    },
  );
  assert.deepEqual(
    getNotificationCopy({
      activityTitle: null,
      actorName: "Alex",
      locale: "en",
      ticketTitle: "Wine tasting ticket",
      type: "INVENTORY_TICKET_RECEIVED",
    }),
    {
      body: "“Wine tasting ticket” is now in your bag",
      title: "Ticket received",
    },
  );
  assert.deepEqual(
    getNotificationCopy({
      activityTitle: null,
      actorName: "Administrateur",
      locale: "fr",
      ticketTitle: "Soirée dégustation",
      type: "INVENTORY_TICKET_RECEIVED",
    }),
    {
      body: "« Soirée dégustation » est maintenant dans votre sac",
      title: "Billet reçu",
    },
  );
});

test("ticket check-in invitations open the workbench with clear push copy", () => {
  assert.equal(
    getNotificationPath({
      activityId: null,
      type: "INVENTORY_TICKET_ACCESS_INVITED",
    }),
    "/profile/ticket-workbench",
  );
  assert.deepEqual(
    getNotificationCopy({
      activityTitle: null,
      actorName: "hoting",
      locale: "zh-CN",
      ticketTitle: "酒会票",
      type: "INVENTORY_TICKET_ACCESS_INVITED",
    }),
    { body: "hoting 邀请你核销「酒会票」", title: "核销邀请" },
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
      body: "信用值 +0.1",
      title: "签到成功",
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
      giftText: "🌹 玫瑰 ×5",
      locale: "zh-CN",
      type: "CHARM_GIFT_RECEIVED",
    }),
    {
      body: "🌹 玫瑰 ×5",
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
