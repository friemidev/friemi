"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";

type AppHeaderChromeProps = {
  children: ReactNode;
  locale: string;
};

function shouldHideHeaderOnMobile(pathname: string, locale: string) {
  const localizedLobbyPrefix = `${withLocale(locale, "/lobby")}/`;
  const localizedFootprintsPrefix = `${withLocale(locale, "/footprints")}/`;
  const localizedGameToolsPrefix = `${withLocale(locale, "/game-tools")}/`;
  const localizedMessagesPrefix = `${withLocale(locale, "/messages")}/`;
  const localizedProfilePrefix = `${withLocale(locale, "/profile")}/`;
  const localizedAccountPrefix = `${withLocale(locale, "/account")}/`;

  return (
    pathname === withLocale(locale, "/mobile-home") ||
    pathname === withLocale(locale, "/footprints") ||
    pathname === withLocale(locale, "/planets") ||
    pathname === withLocale(locale, "/profile") ||
    pathname === withLocale(locale, "/lobby") ||
    pathname.startsWith(localizedFootprintsPrefix) ||
    pathname.startsWith(localizedLobbyPrefix) ||
    pathname.startsWith(localizedMessagesPrefix) ||
    pathname.startsWith(localizedProfilePrefix) ||
    pathname.startsWith(localizedAccountPrefix) ||
    pathname === withLocale(locale, "/activities/new") ||
    pathname === withLocale(locale, "/game-tools") ||
    pathname.startsWith(localizedGameToolsPrefix)
  );
}

export function AppHeaderChrome({ children, locale }: AppHeaderChromeProps) {
  const pathname = usePathname();
  const hideOnMobile = shouldHideHeaderOnMobile(pathname, locale);

  return (
    <header
      className={cn(
        "app-header sticky top-0 z-40 border-b border-[#D6D5B2] bg-[#F1F2EC] shadow-[0_2px_10px_rgba(21,98,64,0.06)]",
        hideOnMobile && "max-md:hidden",
      )}
    >
      {children}
    </header>
  );
}
