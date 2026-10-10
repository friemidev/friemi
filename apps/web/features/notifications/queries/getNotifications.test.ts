import assert from "node:assert/strict";
import test from "node:test";
import {
  getVisibleNotificationWhere,
  notificationCenterExcludedTypes,
  notificationCenterVisibleTypes,
} from "./getNotifications";

test("notification center excludes chat and moment notifications", () => {
  assert.deepEqual(notificationCenterExcludedTypes, [
    "DIRECT_MESSAGE",
    "MOMENT_LIKED",
    "MOMENT_COMMENTED",
    "MOMENT_COMMENT_REPLY",
    "MOMENT_REPOSTED",
    "PLANET_MESSAGE",
    "ACTIVITY_ROOM_MESSAGE",
  ]);

  assert.deepEqual(
    getVisibleNotificationWhere({
      readAt: null,
      recipientId: "profile-1",
    }),
    {
      AND: [
        {
          readAt: null,
          recipientId: "profile-1",
        },
        {
          type: {
            in: notificationCenterVisibleTypes,
          },
        },
      ],
    },
  );
});

test("notification center visible where keeps caller type filters", () => {
  assert.deepEqual(
    getVisibleNotificationWhere({
      recipientId: "profile-1",
      type: "FRIEND_REQUEST",
    }),
    {
      AND: [
        {
          recipientId: "profile-1",
          type: "FRIEND_REQUEST",
        },
        {
          type: {
            in: notificationCenterVisibleTypes,
          },
        },
      ],
    },
  );
});

test("notification center only reads supported non-chat types", () => {
  const visible = new Set<string>(notificationCenterVisibleTypes);
  for (const type of [
    ...notificationCenterExcludedTypes,
    "FUTURE_NOTIFICATION_TYPE",
  ]) {
    assert.equal(
      visible.has(type),
      false,
      `${type} must not reach Prisma decoding`,
    );
  }

  for (const type of [
    "FRIEND_REQUEST",
    "PARTICIPATION_CONFIRMED",
    "ACTIVITY_ANNOUNCEMENT",
    "COUPON_RECEIVED",
    "INVENTORY_TICKET_RECEIVED",
    "NOW_INTERESTED",
    "NOW_SELECTED",
    "NOW_MESSAGE",
    "NOW_CONVERTED",
  ]) {
    assert.equal(visible.has(type), true, `${type} must remain visible`);
  }
});
