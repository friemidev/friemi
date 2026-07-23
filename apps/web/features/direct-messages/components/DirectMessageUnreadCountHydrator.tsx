"use client";

import { useEffect } from "react";
import { useNotificationBadge } from "@/features/notifications/components/NotificationBadgeProvider";

export function DirectMessageUnreadCountHydrator({
  unreadCount,
}: {
  unreadCount: number;
}) {
  const { setUnreadDirectMessageCount } = useNotificationBadge();

  useEffect(() => {
    setUnreadDirectMessageCount(unreadCount);
  }, [setUnreadDirectMessageCount, unreadCount]);

  return null;
}
