"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

type MobileNavProps = {
  locale: string;
};

export function MobileNav({ locale }: MobileNavProps) {
  const t = getCopy(locale);
  const pathname = usePathname();
  const currentLocale = locales.includes(locale as (typeof locales)[number])
    ? locale
    : "zh-CN";
  const items = [
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
  ];

  function isItemActive(href: string) {
    const localizedHref = withLocale(currentLocale, href);

    if (href === "/") {
      return pathname === localizedHref;
    }

    return (
      pathname === localizedHref || pathname.startsWith(`${localizedHref}/`)
    );
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-paper/95 shadow-[0_-8px_24px_rgba(21,21,21,0.08)] backdrop-blur md:hidden">
      <div className="mx-auto grid h-[4.5rem] max-w-md grid-cols-5 gap-1 px-3">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item.href);

          return (
            <Link
              key={item.href}
              href={withLocale(currentLocale, item.href)}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              title={item.label}
              className={cn(
                "flex min-w-0 items-center justify-center rounded-xl transition focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300",
                item.isPrimary
                  ? active
                    ? "-mt-3 rounded-2xl bg-[#d88d72] text-white shadow-[0_12px_24px_rgba(216,141,114,0.32)]"
                    : "-mt-3 rounded-2xl bg-[#e6a189] text-white shadow-[0_10px_22px_rgba(216,141,114,0.22)] hover:bg-[#d88d72]"
                  : active
                    ? "text-ink"
                    : "text-zinc-600 hover:bg-white/65 hover:text-ink",
              )}
            >
              <Icon
                className={cn(item.isPrimary ? "h-7 w-7" : "h-6 w-6")}
                strokeWidth={active ? 2.4 : 2}
              />
              <span className="sr-only">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
