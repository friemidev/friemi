export type UnreadBadgeCounts = {
  unreadActivityRoomCount: number;
  unreadDirectMessageCount: number;
  unreadMessageCount: number;
  unreadNotificationCount: number;
  unreadPlanetChatCount: number;
};

function parseUnreadCount(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return null;
  }

  return Math.floor(value);
}

export function createUnreadBadgeCounts({
  unreadActivityRoomCount,
  unreadDirectMessageCount,
  unreadNotificationCount,
  unreadPlanetChatCount = 0,
}: Omit<
  UnreadBadgeCounts,
  "unreadMessageCount" | "unreadPlanetChatCount"
> & {
  unreadPlanetChatCount?: number;
}): UnreadBadgeCounts {
  return {
    unreadActivityRoomCount,
    unreadDirectMessageCount,
    unreadMessageCount:
      unreadDirectMessageCount +
      unreadActivityRoomCount +
      unreadPlanetChatCount,
    unreadNotificationCount,
    unreadPlanetChatCount,
  };
}

export function parseUnreadBadgeCountsPayload(
  payload: unknown,
): UnreadBadgeCounts | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as Record<string, unknown>;
  const unreadActivityRoomCount = parseUnreadCount(
    candidate.unreadActivityRoomCount,
  );
  const unreadDirectMessageCount = parseUnreadCount(
    candidate.unreadDirectMessageCount,
  );
  const unreadNotificationCount = parseUnreadCount(
    candidate.unreadNotificationCount,
  );
  const unreadPlanetChatCount =
    candidate.unreadPlanetChatCount === undefined
      ? 0
      : parseUnreadCount(candidate.unreadPlanetChatCount);

  if (
    unreadActivityRoomCount === null ||
    unreadDirectMessageCount === null ||
    unreadNotificationCount === null ||
    unreadPlanetChatCount === null
  ) {
    return null;
  }

  return createUnreadBadgeCounts({
    unreadActivityRoomCount,
    unreadDirectMessageCount,
    unreadNotificationCount,
    unreadPlanetChatCount,
  });
}
