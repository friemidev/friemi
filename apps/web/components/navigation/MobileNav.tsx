"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales } from "@chill-club/shared";
import {
  CalendarPlus,
  CircleUserRound,
  Compass,
  Home,
  MessageCircle,
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
    { href: "/", label: t.nav.home, icon: Home },
    { href: "/activities", label: t.nav.activities, icon: Compass },
    {
      href: "/activities/new",
      label: t.nav.newActivityShort,
      icon: CalendarPlus,
    },
    { href: "/messages", label: t.nav.messagesShort, icon: MessageCircle },
    { href: "/profile", label: t.nav.profileShort, icon: CircleUserRound },
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
          pathname !== newActivityHref)
      );
    }

    return (
      pathname === localizedHref || pathname.startsWith(`${localizedHref}/`)
    );
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-paper/95 shadow-[0_-8px_24px_rgba(21,21,21,0.08)] backdrop-blur md:hidden">
      <div className="mx-auto grid h-[4.25rem] max-w-md grid-cols-5 px-4">
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
                active
                  ? "text-ink"
                  : "text-zinc-600 hover:bg-white/65 hover:text-ink",
              )}
            >
              <Icon className="h-7 w-7" strokeWidth={active ? 2.4 : 2} />
              <span className="sr-only">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
