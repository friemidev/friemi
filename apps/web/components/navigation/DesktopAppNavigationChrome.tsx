"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { withLocale } from "@/lib/routes";

const hiddenSections = [
  "/poll",
  "/admin/merchants",
  "/admin/items",
  "/profile/store",
  "/account/settings",
  "/account/security",
  "/sign-in",
  "/sign-up",
  "/android-auth-browser",
  "/android-auth-complete",
  "/android-auth-return",
];

export function DesktopAppNavigationChrome({
  children,
  locale,
}: {
  children: ReactNode;
  locale: string;
}) {
  const pathname = usePathname();
  const hidden = hiddenSections.some((path) => {
    const localizedPath = withLocale(locale, path);
    return pathname === localizedPath || pathname.startsWith(`${localizedPath}/`);
  });

  if (hidden) {
    return null;
  }

  return (
    <div className="app-desktop-navigation sticky top-0 z-40 hidden border-b border-sand/60 bg-paper md:block">
      {children}
    </div>
  );
}
