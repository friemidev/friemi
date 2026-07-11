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
  const localizedGameToolsPrefix = `${withLocale(locale, "/game-tools")}/`;

  return (
    pathname === withLocale(locale, "/mobile-home") ||
    pathname === withLocale(locale, "/lobby") ||
    pathname.startsWith(localizedLobbyPrefix) ||
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
