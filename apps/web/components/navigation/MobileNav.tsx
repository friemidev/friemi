"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { locales } from "@chill-club/shared";
import {
  CalendarPlus,
  CircleUserRound,
  Compass,
  MessageCircle,
  UsersRound,
} from "lucide-react";
import { withLocale } from "@/lib/routes";
import { getCopy } from "@/lib/copy";
import { cn } from "@/lib/utils";
import { IntentPrefetchLink } from "./IntentPrefetchLink";
import { useMobileNavSection } from "./MobileNavSectionContext";

type MobileNavProps = {
  locale: string;
};

export function MobileNav({ locale }: MobileNavProps) {
  const t = getCopy(locale);
  const pathname = usePathname();
  const { sectionOverride } = useMobileNavSection();
  const currentLocale = locales.includes(locale as (typeof locales)[number])
    ? locale
    : "zh-CN";
  const items = useMemo(
    () => [
      { href: "/lobby", label: t.nav.lobbyShort, icon: UsersRound },
      { href: "/activities", label: t.nav.activities, icon: Compass },
      {
        href: "/activities/new",
        label: t.nav.newActivityShort,
        icon: CalendarPlus,
        isPrimary: true,
      },
      { href: "/messages", label: t.nav.messagesShort, icon: MessageCircle },
      { href: "/profile", label: t.nav.profileShort, icon: CircleUserRound },
    ],
    [
      t.nav.activities,
      t.nav.lobbyShort,
      t.nav.messagesShort,
      t.nav.newActivityShort,
      t.nav.profileShort,
    ],
  );

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

    return pathname === localizedHref || pathname.startsWith(`${localizedHref}/`);
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#D6D5B2] bg-[#FFF5E6] pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_26px_rgba(21,98,64,0.1)] md:hidden">
      <div className="mx-auto grid h-[5.05rem] max-w-md grid-cols-5 gap-1 px-2.5 py-2.5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item.href);

          return (
            <IntentPrefetchLink
              key={item.href}
              href={withLocale(currentLocale, item.href)}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              title={item.label}
              className={cn(
                "relative flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-2xl px-1 pb-0.5 text-[11px] font-semibold leading-[1.18] transition duration-200 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#369758]/30",
                item.isPrimary
                  ? active
                    ? "-mt-2.5 h-[4.5rem] bg-meadow text-white shadow-[0_12px_26px_rgba(54,151,88,0.3)]"
                    : "-mt-2.5 h-[4.5rem] bg-coral text-white shadow-[0_10px_22px_rgba(240,145,130,0.24)] hover:bg-danger"
                  : active
                    ? "bg-paper text-forest shadow-[0_8px_18px_rgba(21,98,64,0.08)] ring-1 ring-sage"
                    : "text-zinc-600 hover:bg-paper hover:text-ink",
              )}
            >
              <span
                className={cn(
                  "absolute top-1.5 h-1 w-5 rounded-full transition",
                  active
                    ? item.isPrimary
                      ? "bg-white/88"
                      : "bg-[#369758]"
                    : "bg-transparent",
                )}
                aria-hidden="true"
              />
              <span className="relative inline-flex h-5 min-w-5 items-center justify-center">
                <Icon
                  className={cn(
                    "shrink-0",
                    item.isPrimary ? "h-5 w-5" : "h-[18px] w-[18px]",
                    active && item.isPrimary ? "text-white" : "",
                  )}
                  strokeWidth={active ? 2.4 : 2}
                />
              </span>
              <span className="max-w-full whitespace-nowrap">{item.label}</span>
            </IntentPrefetchLink>
          );
        })}
      </div>
    </nav>
  );
}
