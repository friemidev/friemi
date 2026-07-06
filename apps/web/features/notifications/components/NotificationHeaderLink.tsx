"use client";

import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { IntentPrefetchLink } from "@/components/navigation/IntentPrefetchLink";
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
    <IntentPrefetchLink
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-zinc-700 shadow-sm ring-1 ring-black/10 transition hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-[#369758]/35 max-[420px]:h-9 max-[420px]:w-9",
        hasUnreadNotifications &&
          "text-[#156240] ring-[#8AB68E]/70 shadow-[0_8px_18px_rgba(21,98,64,0.16)]",
        active &&
          "bg-white text-ink ring-[#8AB68E] before:absolute before:bottom-1 before:h-0.5 before:w-4 before:rounded-full before:bg-[#369758]",
      )}
      href={notificationsHref}
      title={label}
    >
      <Bell
        className={cn(
          "h-5 w-5 max-[420px]:h-[18px] max-[420px]:w-[18px]",
          active || hasUnreadNotifications ? "text-[#156240]" : "",
        )}
        strokeWidth={active || hasUnreadNotifications ? 2.45 : 2}
        aria-hidden="true"
      />
      {hasUnreadNotifications ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-[-0.2rem] top-[-0.2rem] inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#F09182] px-1 text-[10px] font-extrabold leading-none text-white shadow-[0_6px_12px_rgba(176,49,31,0.24)] ring-2 ring-[#FEFFF9] outline outline-1 outline-[#156240]/20 max-[420px]:right-[-0.05rem] max-[420px]:top-[-0.1rem] max-[420px]:h-4 max-[420px]:min-w-4 max-[420px]:text-[9px]"
        >
          {unreadBadgeText}
        </span>
      ) : null}
    </IntentPrefetchLink>
  );
}
