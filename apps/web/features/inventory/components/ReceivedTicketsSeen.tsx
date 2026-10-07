"use client";

import { useEffect } from "react";
import { useNotificationBadge } from "@/features/notifications/components/NotificationBadgeProvider";
import { markReceivedTicketsSeenAction } from "@/features/inventory/actions/markReceivedTicketsSeen";

export function ReceivedTicketsSeen({ locale }: { locale: string }) {
  const {
    setUnreadInventoryTicketGiftCount,
    setUnreadNotificationCount,
  } = useNotificationBadge();

  useEffect(() => {
    void markReceivedTicketsSeenAction(locale)
      .then(({ unreadNotificationCount }) => {
        setUnreadInventoryTicketGiftCount(0);
        setUnreadNotificationCount(unreadNotificationCount);
      })
      .catch((error: unknown) => {
        console.error("Failed to mark received tickets seen", error);
      });
  }, [locale, setUnreadInventoryTicketGiftCount, setUnreadNotificationCount]);

  return null;
}
