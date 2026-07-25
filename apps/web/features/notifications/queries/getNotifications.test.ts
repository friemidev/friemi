import assert from "node:assert/strict";
import test from "node:test";
import {
  getVisibleNotificationWhere,
  notificationCenterExcludedTypes,
} from "./getNotifications";

test("notification center excludes chat and moment notifications", () => {
  assert.deepEqual(notificationCenterExcludedTypes, [
    "DIRECT_MESSAGE",
    "MOMENT_LIKED",
    "MOMENT_COMMENTED",
    "MOMENT_COMMENT_REPLY",
    "MOMENT_REPOSTED",
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
            notIn: notificationCenterExcludedTypes,
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
            notIn: notificationCenterExcludedTypes,
          },
        },
      ],
    },
  );
});
