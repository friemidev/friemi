"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales } from "@chill-club/shared";
import {
  CalendarPlus,
  CircleUserRound,
  Compass,
  MessageCircle,
} from "lucide-react";
import { withLocale } from "@/lib/routes";
import { getCopy } from "@/lib/copy";
import { cn } from "@/lib/utils";

type DesktopNavProps = {
  locale: string;
};

export function DesktopNav({ locale }: DesktopNavProps) {
  const t = getCopy(locale);
  const pathname = usePathname();
  const currentLocale = locales.includes(locale as (typeof locales)[number])
    ? locale
    : "zh-CN";
  const items = [
    { href: "/activities", label: t.nav.activities, icon: Compass },
    {
      href: "/activities/new",
      label: t.nav.newActivityShort,
      icon: CalendarPlus,
      className: "lg:hidden",
    },
    { href: "/messages", label: t.nav.messages, icon: MessageCircle },
    { href: "/profile", label: t.nav.profile, icon: CircleUserRound },
  ];

  function isItemActive(href: string) {
    const localizedHref = withLocale(currentLocale, href);

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
    <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex">
      {items.map((item) => {
        const Icon = item.icon;
        const active = isItemActive(item.href);

        return (
          <Link
            key={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-10 items-center gap-2 whitespace-nowrap rounded-md px-3 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300",
              active
                ? "bg-white/80 text-ink shadow-sm"
                : "text-zinc-700 hover:bg-white/70",
              item.className,
            )}
            href={withLocale(currentLocale, item.href)}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
