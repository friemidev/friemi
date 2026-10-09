"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useNotificationBadge } from "@/features/notifications/components/NotificationBadgeProvider";
import { withLocale } from "@/lib/routes";
import { markBookingsSeenAction } from "../actions";

export function BookingsSeen({
  locale,
  pageOpenedAt,
}: {
  locale: string;
  pageOpenedAt: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { setUnreadBookingCount } = useNotificationBadge();
  const visit = useRef<{ initialSnapshot: string; markedSeen: boolean } | null>(
    null,
  );

  useEffect(() => {
    if (pathname !== withLocale(locale, "/profile/bookings")) {
      visit.current = null;
      return;
    }
    if (!visit.current) {
      // A cached or prefetched list may precede a merchant's latest response.
      // Refresh once on entry, then acknowledge only the refreshed snapshot.
      visit.current = { initialSnapshot: pageOpenedAt, markedSeen: false };
      router.refresh();
      return;
    }
    if (
      visit.current.markedSeen ||
      visit.current.initialSnapshot === pageOpenedAt
    )
      return;

    visit.current.markedSeen = true;
    let disposed = false;
    void markBookingsSeenAction(locale, pageOpenedAt)
      .then(({ unreadBookingCount }) => {
        if (!disposed) setUnreadBookingCount(unreadBookingCount);
      })
      .catch((error: unknown) => {
        console.error("Failed to mark bookings seen", error);
      });
    return () => {
      disposed = true;
    };
  }, [locale, pageOpenedAt, pathname, router, setUnreadBookingCount]);

  return null;
}
