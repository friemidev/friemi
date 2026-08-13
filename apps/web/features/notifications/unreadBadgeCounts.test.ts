import assert from "node:assert/strict";
import test from "node:test";
import {
  createUnreadBadgeCounts,
  parseUnreadBadgeCountsPayload,
} from "./unreadBadgeCounts";

test("creates the combined chat badge from direct, room, and planet counts", () => {
  assert.deepEqual(
    createUnreadBadgeCounts({
      unreadActivityRoomCount: 4,
      unreadDirectMessageCount: 3,
      unreadNotificationCount: 2,
      unreadPlanetChatCount: 5,
    }),
    {
      unreadActivityRoomCount: 4,
      unreadDirectMessageCount: 3,
      unreadMessageCount: 12,
      unreadNotificationCount: 2,
      unreadPlanetChatCount: 5,
    },
  );
});

test("parses badge payloads and recomputes the combined message count", () => {
  assert.deepEqual(
    parseUnreadBadgeCountsPayload({
      unreadActivityRoomCount: 4.9,
      unreadDirectMessageCount: 3.8,
      unreadMessageCount: 999,
      unreadNotificationCount: 2.2,
      unreadPlanetChatCount: 5.7,
    }),
    {
      unreadActivityRoomCount: 4,
      unreadDirectMessageCount: 3,
      unreadMessageCount: 12,
      unreadNotificationCount: 2,
      unreadPlanetChatCount: 5,
    },
  );
});

test("keeps old unread badge payloads compatible during rolling deploys", () => {
  assert.deepEqual(
    parseUnreadBadgeCountsPayload({
      unreadActivityRoomCount: 4,
      unreadDirectMessageCount: 3,
      unreadNotificationCount: 2,
    }),
    {
      unreadActivityRoomCount: 4,
      unreadDirectMessageCount: 3,
      unreadMessageCount: 7,
      unreadNotificationCount: 2,
      unreadPlanetChatCount: 0,
    },
  );
});

test("rejects incomplete or invalid badge payloads", () => {
  assert.equal(
    parseUnreadBadgeCountsPayload({
      unreadActivityRoomCount: 1,
      unreadDirectMessageCount: -1,
      unreadNotificationCount: 2,
      unreadPlanetChatCount: 0,
    }),
    null,
  );
  assert.equal(parseUnreadBadgeCountsPayload(null), null);
});
