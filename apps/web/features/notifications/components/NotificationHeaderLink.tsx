"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { getCopy } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { useNotificationBadge } from "./NotificationBadgeProvider";

export function NotificationHeaderLink({
  initialUnreadNotificationCount,
  locale,
}: {
  initialUnreadNotificationCount: number;
  locale: string;
}) {
  const t = getCopy(locale).notifications;
  const pathname = usePathname();
  const { unreadNotificationCount } = useNotificationBadge(
    initialUnreadNotificationCount,
  );
  const hasUnreadNotifications = unreadNotificationCount > 0;
  const notificationsHref = withLocale(locale, "/notifications");
  const active = pathname === notificationsHref;
  const unreadBadgeText =
    unreadNotificationCount > 99 ? "99+" : String(unreadNotificationCount);
  const label = hasUnreadNotifications
    ? `${t.title} (${t.unreadCount(unreadNotificationCount)})`
    : t.title;

  return (
    <Link
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-zinc-700 shadow-sm ring-1 ring-black/10 transition hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d88d72]/35",
        active &&
          "bg-white text-ink ring-[#d8c9b3] before:absolute before:bottom-1 before:h-0.5 before:w-4 before:rounded-full before:bg-[#d88d72]",
      )}
      href={notificationsHref}
      title={label}
    >
      <Bell
        className={cn("h-5 w-5", active ? "text-[#9b654f]" : "")}
        strokeWidth={active ? 2.4 : 2}
        aria-hidden="true"
      />
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
