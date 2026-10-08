export type UnreadBadgeCounts = {
  unreadActivityRoomCount: number;
  unreadDirectMessageCount: number;
  unreadInventoryTicketGiftCount: number;
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
  unreadInventoryTicketGiftCount = 0,
  unreadNotificationCount,
  unreadPlanetChatCount = 0,
}: Omit<
  UnreadBadgeCounts,
  "unreadInventoryTicketGiftCount" | "unreadMessageCount" | "unreadPlanetChatCount"
> & {
  unreadInventoryTicketGiftCount?: number;
  unreadPlanetChatCount?: number;
}): UnreadBadgeCounts {
  return {
    unreadActivityRoomCount,
    unreadDirectMessageCount,
    unreadInventoryTicketGiftCount,
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
  const unreadInventoryTicketGiftCount =
    candidate.unreadInventoryTicketGiftCount === undefined
      ? 0
      : parseUnreadCount(candidate.unreadInventoryTicketGiftCount);
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
    unreadInventoryTicketGiftCount === null ||
    unreadNotificationCount === null ||
    unreadPlanetChatCount === null
  ) {
    return null;
  }

  return createUnreadBadgeCounts({
    unreadActivityRoomCount,
    unreadDirectMessageCount,
    unreadInventoryTicketGiftCount,
    unreadNotificationCount,
    unreadPlanetChatCount,
  });
}
