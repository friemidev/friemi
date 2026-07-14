"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useNotificationBadge } from "@/features/notifications/components/NotificationBadgeProvider";
import { getCopy } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";

export function MobileHomeV23NotificationLink({ locale }: { locale: string }) {
  const t = getCopy(locale).notifications;
  const { unreadNotificationCount } = useNotificationBadge(0);
  const hasUnread = unreadNotificationCount > 0;
  const unreadBadgeText =
    unreadNotificationCount > 99 ? "99+" : String(unreadNotificationCount);
  const label = hasUnread
    ? `${t.title} (${t.unreadCount(unreadNotificationCount)})`
    : t.title;

  return (
    <Link
      href={withLocale(locale, "/notifications")}
      className={cn(
        "relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/80 text-[#123D31] shadow-[0_10px_24px_rgba(21,98,64,0.08)] ring-1 ring-[#D6D5B2]/62 transition",
        hasUnread &&
          "bg-white text-[#156240] ring-[#8AB68E]/75 shadow-[0_10px_24px_rgba(21,98,64,0.16)]",
      )}
      aria-label={label}
      title={label}
    >
      <Bell className="h-[18px] w-[18px]" strokeWidth={hasUnread ? 2.45 : 2} />
      {hasUnread ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-1 -top-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#F09182] px-1 text-[10px] font-extrabold leading-none text-white shadow-[0_6px_12px_rgba(176,49,31,0.24)] ring-2 ring-[#FEFFF9] outline outline-1 outline-[#156240]/20"
        >
          {unreadBadgeText}
        </span>
      ) : null}
    </Link>
  );
}
