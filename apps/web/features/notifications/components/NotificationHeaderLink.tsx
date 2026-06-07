"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { getCopy } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import { useNotificationBadge } from "./NotificationBadgeProvider";

export function NotificationHeaderLink({
  initialUnreadNotificationCount,
  locale,
}: {
  initialUnreadNotificationCount: number;
  locale: string;
}) {
  const t = getCopy(locale).notifications;
  const { unreadNotificationCount } = useNotificationBadge(
    initialUnreadNotificationCount,
  );
  const hasUnreadNotifications = unreadNotificationCount > 0;
  const unreadBadgeText =
    unreadNotificationCount > 99 ? "99+" : String(unreadNotificationCount);
  const label = hasUnreadNotifications
    ? `${t.title} (${t.unreadCount(unreadNotificationCount)})`
    : t.title;

  return (
    <Link
      aria-label={label}
      className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/75 text-zinc-700 shadow-sm ring-1 ring-black/10 transition hover:bg-white hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
      href={withLocale(locale, "/notifications")}
      title={label}
    >
      <Bell className="h-5 w-5" aria-hidden="true" />
      {hasUnreadNotifications ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-clay px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-paper"
        >
          {unreadBadgeText}
        </span>
      ) : null}
    </Link>
  );
}
