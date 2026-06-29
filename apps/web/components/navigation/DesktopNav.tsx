"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { locales } from "@chill-club/shared";
import {
  CalendarPlus,
  Compass,
  House,
  MessageCircle,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { withLocale } from "@/lib/routes";
import { getCopy } from "@/lib/copy";
import { cn } from "@/lib/utils";
import { IntentPrefetchLink } from "./IntentPrefetchLink";
import { useMobileNavSection } from "./MobileNavSectionContext";

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
  const { sectionOverride } = useMobileNavSection();
  const currentLocale = locales.includes(locale as (typeof locales)[number])
    ? locale
    : "zh-CN";
  const items: DesktopNavItem[] = [
    { href: "/mobile-home", label: t.nav.hallShort, icon: House },
    { href: "/lobby", label: t.nav.lobbyShort, icon: UsersRound },
    { href: "/activities", label: t.nav.activities, icon: Compass },
    { href: "/messages", label: t.nav.messagesShort, icon: MessageCircle },
    {
      href: "/activities/new",
      label: t.nav.newActivity,
      icon: CalendarPlus,
      isPrimary: true,
    },
  ];

  function isItemActive(href: string) {
    if (sectionOverride === "lobby") {
      return href === "/lobby";
    }

    if (sectionOverride === "activities") {
      return href === "/activities";
    }

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

    return (
      pathname === localizedHref || pathname.startsWith(`${localizedHref}/`)
    );
  }

  return (
    <nav className="hidden h-full min-w-0 items-center justify-center gap-0 md:flex lg:gap-1">
      {items.map((item) => {
        const Icon = item.icon;
        const active = isItemActive(item.href);

        return (
          <IntentPrefetchLink
            key={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex h-full items-center gap-1.5 whitespace-nowrap px-1.5 text-[11px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#369758]/35 min-[900px]:px-2.5 min-[900px]:text-xs lg:px-3 lg:text-sm",
              item.isPrimary
                ? active
                  ? "text-[#156240]"
                  : "text-[#156240] hover:bg-[#F1F2EC] hover:text-[#156240]"
                : active
                  ? "text-[#1D1D1B]"
                  : "text-zinc-700 hover:bg-[#F1F2EC] hover:text-[#1D1D1B]",
            )}
            href={withLocale(currentLocale, item.href)}
          >
            <span
              className={cn(
                "absolute inset-x-2 bottom-0 h-[3px] origin-center rounded-t-full transition lg:inset-x-3",
                active
                  ? "scale-x-100 bg-[#369758]"
                  : "scale-x-0 bg-transparent",
              )}
              aria-hidden="true"
            />
            <Icon
              className={cn(
                "hidden h-4 w-4 shrink-0 transition min-[900px]:block",
                active ? "text-[#156240]" : "",
              )}
              strokeWidth={active ? 2.4 : 2}
            />
            {item.label}
          </IntentPrefetchLink>
        );
      })}
    </nav>
  );
}
