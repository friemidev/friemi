export type UnreadBadgeCounts = {
  unreadActivityRoomCount: number;
  unreadDirectMessageCount: number;
  unreadMessageCount: number;
  unreadNotificationCount: number;
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
}: Omit<UnreadBadgeCounts, "unreadMessageCount">): UnreadBadgeCounts {
  return {
    unreadActivityRoomCount,
    unreadDirectMessageCount,
    unreadMessageCount: unreadDirectMessageCount + unreadActivityRoomCount,
    unreadNotificationCount,
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

  if (
    unreadActivityRoomCount === null ||
    unreadDirectMessageCount === null ||
    unreadNotificationCount === null
  ) {
    return null;
  }

  return createUnreadBadgeCounts({
    unreadActivityRoomCount,
    unreadDirectMessageCount,
    unreadNotificationCount,
  });
}
