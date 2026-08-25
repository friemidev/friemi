import assert from "node:assert/strict";
import test from "node:test";
import { createUnreadBadgeCounts } from "./unreadBadgeCounts";
import { unreadBadgeCountsMatch } from "./unreadBadgeRedisCache";

test("Redis unread cache comparison includes every badge channel", () => {
  const baseline = createUnreadBadgeCounts({
    unreadActivityRoomCount: 1,
    unreadDirectMessageCount: 2,
    unreadNotificationCount: 3,
    unreadPlanetChatCount: 4,
  });

  assert.equal(unreadBadgeCountsMatch(baseline, { ...baseline }), true);
  assert.equal(
    unreadBadgeCountsMatch(baseline, {
      ...baseline,
      unreadPlanetChatCount: 5,
      unreadMessageCount: 8,
    }),
    false,
  );
});
