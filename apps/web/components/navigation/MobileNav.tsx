"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { locales } from "@chill-club/shared";
import {
  CircleUserRound,
  House,
  MessageCircle,
  Plus,
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

function getMobileNavToneClasses(tone: string, active: boolean) {
  if (tone === "rose") {
    return active
      ? "bg-[linear-gradient(145deg,#FEFFF9,#DEAAB3_135%)] text-[#B5301F] ring-[#DEAAB3]/80 shadow-[0_10px_20px_rgba(181,48,31,0.16)]"
      : "bg-[#DEAAB3]/20 text-[#1D1D1B]/70 ring-[#8E8383]/10";
  }

  if (tone === "cream") {
    return active
      ? "bg-[linear-gradient(145deg,#FEFFF9,#F1F2EC)] text-[#156240] ring-[#D6D5B2]/90 shadow-[0_10px_20px_rgba(21,98,64,0.12)]"
      : "bg-[#FEFFF9]/74 text-[#1D1D1B]/68 ring-[#8E8383]/12";
  }

  return active
    ? "bg-[linear-gradient(145deg,#FEFFF9,#DEEBFF)] text-[#156240] ring-[#8AB68E]/70 shadow-[0_10px_20px_rgba(21,98,64,0.13)]"
    : "bg-[#DEEBFF]/58 text-[#1D1D1B]/70 ring-[#8E8383]/10";
}

export function MobileNav({ locale }: MobileNavProps) {
  const t = getCopy(locale);
  const pathname = usePathname();
  const { sectionOverride } = useMobileNavSection();
  const currentLocale = locales.includes(locale as (typeof locales)[number])
    ? locale
    : "zh-CN";
  const items = useMemo(
    () => [
      {
        href: "/mobile-home",
        label: t.nav.hallShort,
        icon: House,
        tone: "green",
      },
      {
        href: "/lobby",
        label: t.nav.lobbyShort,
        icon: UsersRound,
        tone: "rose",
      },
      {
        href: "/activities/new",
        label: t.nav.newActivity,
        icon: Plus,
        isPrimary: true,
        tone: "green",
      },
      {
        href: "/messages",
        label: t.nav.messagesShort,
        icon: MessageCircle,
        tone: "rose",
      },
      {
        href: "/profile",
        label: t.nav.profileShort,
        icon: CircleUserRound,
        tone: "cream",
      },
    ],
    [
      t.nav.hallShort,
      t.nav.lobbyShort,
      t.nav.messagesShort,
      t.nav.newActivity,
      t.nav.profileShort,
    ],
  );

  function isItemActive(href: string) {
    if (sectionOverride === "lobby") {
      return href === "/lobby";
    }

    if (sectionOverride === "activities") {
      return href === "/activities/new";
    }

    const localizedHref = withLocale(currentLocale, href);

    if (href === "/") {
      return pathname === localizedHref;
    }

    if (href === "/activities/new") {
      return pathname === localizedHref || pathname.startsWith(`${localizedHref}/`);
    }

    return (
      pathname === localizedHref || pathname.startsWith(`${localizedHref}/`)
    );
  }

  return (
    <nav className="app-mobile-nav fixed inset-x-0 bottom-0 z-40 border-t border-[#D6D5B2] bg-[#F1F2EC] pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_28px_rgba(21,98,64,0.1)] md:hidden">
      <div className="mx-auto grid h-[5.15rem] max-w-md grid-cols-5 gap-1.5 px-4 py-2.5">
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
                "relative flex min-w-0 flex-col items-center justify-end gap-1 rounded-[1.35rem] px-1 pb-1.5 pt-1 text-[11px] font-semibold leading-[1.15] transition duration-200 ease-out active:scale-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#369758]/30",
                item.isPrimary
                  ? active
                    ? "h-14 w-14 self-center justify-center justify-self-center rounded-full bg-[linear-gradient(160deg,#156240_0%,#369758_62%,#8AB68E_140%)] p-0 text-white shadow-[0_12px_24px_rgba(21,98,64,0.28),0_0_0_4px_rgba(254,255,249,0.88)] ring-2 ring-[#D6D5B2]/85"
                    : "h-14 w-14 self-center justify-center justify-self-center rounded-full bg-[linear-gradient(160deg,#369758,#156240)] p-0 text-white shadow-[0_10px_20px_rgba(21,98,64,0.22)] ring-1 ring-[#FEFFF9]/75"
                  : active
                    ? "-translate-y-1 bg-[#FEFFF9]/72 text-forest shadow-[0_10px_22px_rgba(21,98,64,0.11)] ring-1 ring-[#8E8383]/12"
                    : "text-[#1D1D1B]/72",
              )}
            >
              <span
                className={cn(
                  "absolute rounded-full transition duration-200",
                  item.isPrimary
                    ? "top-1.5 h-0 w-0 bg-transparent"
                    : active
                      ? "-top-1 h-1.5 w-5 bg-[#369758]"
                      : "-top-0.5 h-1 w-0 bg-transparent",
                )}
                aria-hidden="true"
              />
              <span
                className={cn(
                  "relative inline-flex h-8 w-8 items-center justify-center rounded-full ring-1 transition duration-200",
                  item.isPrimary
                    ? active
                      ? "h-11 w-11 bg-[#FEFFF9]/18 text-white ring-white/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_0_0_1px_rgba(21,98,64,0.1)]"
                      : "h-10 w-10 bg-white/12 text-white ring-white/24"
                    : getMobileNavToneClasses(item.tone, active),
                )}
              >
                <Icon
                  className={cn(
                    "shrink-0",
                    item.isPrimary ? "h-[22px] w-[22px]" : "h-[17px] w-[17px]",
                  )}
                  strokeWidth={active ? 2.4 : 2}
                />
              </span>
              {item.isPrimary ? null : (
                <span
                  className={cn(
                    "max-w-full whitespace-nowrap transition",
                    active
                      ? "rounded-full bg-[#FEFFF9]/72 px-1.5 py-0.5 font-extrabold text-forest shadow-[0_1px_0_rgba(255,255,255,0.7)]"
                      : null,
                  )}
                >
                  {item.label}
                </span>
              )}
            </IntentPrefetchLink>
          );
        })}
      </div>
    </nav>
  );
}
