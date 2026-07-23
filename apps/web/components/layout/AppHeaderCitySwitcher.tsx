"use client";

import { usePathname } from "next/navigation";
import { MapPin } from "lucide-react";
import { withLocale } from "@/lib/routes";

const cityLabels: Record<string, string> = {
  "zh-CN": "巴黎",
  en: "Paris",
  fr: "Paris",
};

export function AppHeaderCitySwitcher({ locale }: { locale: string }) {
  const pathname = usePathname();
  const notificationsHref = withLocale(locale, "/notifications");
  const hiddenOnCurrentRoute = pathname === notificationsHref;
  const selectedLabel = cityLabels[locale] ?? cityLabels.en;

  if (hiddenOnCurrentRoute) {
    return null;
  }

  return (
    <span
      className="inline-flex h-9 cursor-default select-none items-center justify-center gap-1.5 justify-self-end rounded-full bg-white/82 px-3 text-xs font-extrabold text-[#156240] shadow-sm ring-1 ring-black/10 lg:justify-self-auto"
      aria-label={selectedLabel}
      title={selectedLabel}
    >
      <MapPin
        aria-hidden="true"
        className="h-3.5 w-3.5 fill-[#F56D62] text-[#F56D62]"
      />
      <span>{selectedLabel}</span>
    </span>
  );
}
