"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { locales } from "@chill-club/shared";
import {
  CalendarPlus,
  CircleUserRound,
  Compass,
  LoaderCircle,
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
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
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

  useEffect(() => {
    items.forEach((item) => {
      router.prefetch(withLocale(currentLocale, item.href));
    });
  }, [currentLocale, items, router]);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

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
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#d8cdbb] bg-paper pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_18px_rgba(21,21,21,0.08)] md:hidden">
      <div className="mx-auto grid h-[4.75rem] max-w-md grid-cols-5 gap-1 px-2.5 py-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item.href);

          return (
            <Link
              key={item.href}
              href={withLocale(currentLocale, item.href)}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              prefetch
              title={item.label}
              onClick={() => {
                if (!active) {
                  setPendingHref(item.href);
                }
              }}
              className={cn(
                "relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-semibold leading-none transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d88d72]/35",
                item.isPrimary
                  ? active
                    ? "-mt-3 h-[4.4rem] bg-[#c97d62] text-white shadow-[0_12px_24px_rgba(216,141,114,0.32)]"
                    : "-mt-3 h-[4.4rem] bg-[#e6a189] text-white shadow-[0_10px_22px_rgba(216,141,114,0.22)] hover:bg-[#d88d72]"
                  : active
                    ? "bg-white text-ink shadow-sm"
                    : "text-zinc-600 hover:bg-white/65 hover:text-ink",
                pendingHref === item.href && "scale-[0.97] opacity-80",
              )}
            >
              <span
                className={cn(
                  "absolute top-1.5 h-1 w-5 rounded-full transition",
                  active ? "bg-[#d88d72]" : "bg-transparent",
                )}
                aria-hidden="true"
              />
              <span className="relative inline-flex h-5 min-w-5 items-center justify-center">
                {pendingHref === item.href ? (
                  <LoaderCircle
                    className={cn(
                      "animate-spin",
                      item.isPrimary ? "h-5 w-5" : "h-[18px] w-[18px]",
                    )}
                  />
                ) : (
                  <Icon
                    className={cn(
                      "shrink-0",
                      item.isPrimary ? "h-5 w-5" : "h-[18px] w-[18px]",
                      active ? "text-[#9b654f]" : "",
                    )}
                    strokeWidth={active ? 2.4 : 2}
                  />
                )}
              </span>
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
