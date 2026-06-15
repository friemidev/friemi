"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { locales } from "@chill-club/shared";
import {
  CalendarPlus,
  Compass,
  MessageCircle,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { withLocale } from "@/lib/routes";
import { getCopy } from "@/lib/copy";
import { cn } from "@/lib/utils";

type DesktopNavProps = {
  locale: string;
};

type DesktopNavItem = {
  href: string;
  label: ReactNode;
  icon: LucideIcon;
  isPrimary?: boolean;
};

export function DesktopNav({ locale }: DesktopNavProps) {
  const t = getCopy(locale);
  const pathname = usePathname();
  const currentLocale = locales.includes(locale as (typeof locales)[number])
    ? locale
    : "zh-CN";
  const messagesLabel = (
    <>
      <span className="2xl:hidden">{t.nav.messagesShort}</span>
      <span className="hidden 2xl:inline">{t.nav.messages}</span>
    </>
  );
  const lobbyLabel = (
    <>
      <span className="2xl:hidden">{t.nav.lobbyShort}</span>
      <span className="hidden 2xl:inline">{t.nav.lobby}</span>
    </>
  );
  const newActivityLabel = (
    <>
      <span className="2xl:hidden">{t.nav.newActivityShort}</span>
      <span className="hidden 2xl:inline">{t.nav.newActivity}</span>
    </>
  );
  const items: DesktopNavItem[] = [
    { href: "/lobby", label: lobbyLabel, icon: UsersRound },
    { href: "/activities", label: t.nav.activities, icon: Compass },
    { href: "/messages", label: messagesLabel, icon: MessageCircle },
    {
      href: "/activities/new",
      label: newActivityLabel,
      icon: CalendarPlus,
      isPrimary: true,
    },
  ];

  function isItemActive(href: string) {
    const localizedHref = withLocale(currentLocale, href);

    if (href === "/") {
      return pathname === localizedHref;
    }

    if (href === "/activities") {
      const newActivityHref = withLocale(currentLocale, "/activities/new");

      return (
        pathname === localizedHref ||
        (pathname.startsWith(`${localizedHref}/`) &&
          !pathname.startsWith(newActivityHref))
      );
    }

    return pathname === localizedHref || pathname.startsWith(`${localizedHref}/`);
  }

  return (
    <nav className="hidden h-full min-w-0 items-center justify-center gap-1 md:flex">
      {items.map((item) => {
        const Icon = item.icon;
        const active = isItemActive(item.href);

        return (
          <Link
            key={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex h-full items-center gap-1.5 whitespace-nowrap px-2.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#d88d72]/45 lg:px-3 lg:text-sm",
              item.isPrimary
                ? active
                  ? "text-[#9b5d46]"
                  : "text-[#b66f55] hover:bg-[#fff7ed] hover:text-[#9b5d46]"
                : active
                  ? "text-ink"
                  : "text-zinc-700 hover:bg-[#fff7ed] hover:text-ink",
            )}
            href={withLocale(currentLocale, item.href)}
            prefetch
          >
            <span
              className={cn(
                "absolute inset-x-2 bottom-0 h-[3px] origin-center rounded-t-full transition lg:inset-x-3",
                active
                  ? "scale-x-100 bg-[#d88d72]"
                  : "scale-x-0 bg-transparent",
              )}
              aria-hidden="true"
            />
            <Icon
              className={cn(
                "h-4 w-4 shrink-0 transition",
                active ? "text-[#9b654f]" : "",
              )}
              strokeWidth={active ? 2.4 : 2}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
