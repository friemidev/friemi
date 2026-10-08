"use client";

import { useEffect } from "react";
import { useNotificationBadge } from "@/features/notifications/components/NotificationBadgeProvider";
import { markReceivedTicketsSeenAction } from "@/features/inventory/actions/markReceivedTicketsSeen";

export function ReceivedTicketsSeen({
  locale,
  pageOpenedAt,
}: {
  locale: string;
  pageOpenedAt: string;
}) {
  const {
    setUnreadInventoryTicketGiftCount,
    setUnreadNotificationCount,
  } = useNotificationBadge();

  useEffect(() => {
    void markReceivedTicketsSeenAction(locale, pageOpenedAt)
      .then(({ unreadInventoryTicketGiftCount, unreadNotificationCount }) => {
        setUnreadInventoryTicketGiftCount(unreadInventoryTicketGiftCount);
        setUnreadNotificationCount(unreadNotificationCount);
      })
      .catch((error: unknown) => {
        console.error("Failed to mark received tickets seen", error);
      });
  }, [
    locale,
    pageOpenedAt,
    setUnreadInventoryTicketGiftCount,
    setUnreadNotificationCount,
  ]);

  return null;
}
