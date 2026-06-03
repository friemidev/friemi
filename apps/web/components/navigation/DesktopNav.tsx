"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales } from "@chill-club/shared";
import { Compass, MessageCircle, UsersRound } from "lucide-react";
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
    { href: "/lobby", label: t.nav.lobby, icon: UsersRound },
    { href: "/activities", label: t.nav.activities, icon: Compass },
    { href: "/messages", label: t.nav.messages, icon: MessageCircle },
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
