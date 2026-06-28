"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { locales } from "@chill-club/shared";
import {
  CircleUserRound,
  Compass,
  House,
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

function getMobileNavToneClasses(tone: string, active: boolean) {
  if (tone === "rose") {
    return active
      ? "bg-[linear-gradient(145deg,#FEFFF9,#DEAAB3_135%)] text-[#B5301F] ring-[#DEAAB3]/80 shadow-[0_10px_20px_rgba(181,48,31,0.16)]"
      : "bg-[#DEAAB3]/20 text-[#1D1D1B]/70 ring-[#8E8383]/10";
  }

  if (tone === "cream") {
    return active
      ? "bg-[linear-gradient(145deg,#FEFFF9,#F1F2E3)] text-[#156240] ring-[#D6D5B2]/90 shadow-[0_10px_20px_rgba(21,98,64,0.12)]"
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
        href: "/activities",
        label: t.nav.activities,
        icon: Compass,
        tone: "blue",
      },
      {
        href: "/lobby",
        label: t.nav.lobbyShort,
        icon: UsersRound,
        tone: "rose",
      },
      {
        href: "/mobile-home",
        label: t.nav.hallShort,
        icon: House,
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
      t.nav.activities,
      t.nav.hallShort,
      t.nav.lobbyShort,
      t.nav.messagesShort,
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

    return (
      pathname === localizedHref || pathname.startsWith(`${localizedHref}/`)
    );
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#D6D5B2] bg-[#FFF5E6] pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_28px_rgba(21,98,64,0.1)] md:hidden">
      <div className="mx-auto grid h-[5.35rem] max-w-md grid-cols-[0.92fr_0.92fr_1.22fr_0.92fr_0.92fr] gap-1.5 px-3 py-2.5">
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
                    ? "-mt-5 h-[5.35rem] justify-center gap-1.5 bg-[linear-gradient(160deg,#156240_0%,#369758_62%,#8AB68E_140%)] text-white shadow-[0_18px_34px_rgba(21,98,64,0.38)] ring-2 ring-[#FEFFF9]/80"
                    : "-mt-4 h-[5.15rem] justify-center gap-1.5 bg-[linear-gradient(160deg,#369758,#156240)] text-white shadow-[0_14px_28px_rgba(21,98,64,0.24)] ring-1 ring-[#FEFFF9]/70"
                  : active
                    ? "-translate-y-1 bg-[#FEFFF9]/72 text-forest shadow-[0_10px_22px_rgba(21,98,64,0.11)] ring-1 ring-[#8E8383]/12"
                    : "text-[#1D1D1B]/72",
              )}
            >
              <span
                className={cn(
                  "absolute rounded-full transition duration-200",
                  item.isPrimary
                    ? active
                      ? "top-1.5 h-1.5 w-8 bg-white/92"
                      : "top-1.5 h-1 w-0 bg-transparent"
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
                      ? "h-11 w-11 bg-white/18 text-white ring-white/34 shadow-[inset_0_1px_0_rgba(255,255,255,0.24)]"
                      : "h-10 w-10 bg-white/14 text-white ring-white/24"
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
              <span
                className={cn(
                  "max-w-full whitespace-nowrap transition",
                  item.isPrimary
                    ? "text-[11px] font-extrabold"
                    : active
                      ? "rounded-full bg-[#FEFFF9]/72 px-1.5 py-0.5 font-extrabold text-forest shadow-[0_1px_0_rgba(255,255,255,0.7)]"
                      : null,
                )}
              >
                {item.label}
              </span>
            </IntentPrefetchLink>
          );
        })}
      </div>
    </nav>
  );
}
