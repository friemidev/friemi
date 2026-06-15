"use client";

import { useEffect } from "react";
import { useNotificationBadge } from "./NotificationBadgeProvider";

export function NotificationCountHydrator({
  unreadCount,
}: {
  unreadCount: number;
}) {
  const { setUnreadNotificationCount } = useNotificationBadge(unreadCount);

  useEffect(() => {
    setUnreadNotificationCount(unreadCount);
  }, [setUnreadNotificationCount, unreadCount]);

  return null;
}
