"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales } from "@chill-club/shared";
import { ChevronDown, Languages } from "lucide-react";
import {
  getSupportedLocale,
  localeMeta,
  type AppLocale,
} from "@/lib/copy";
import { cn } from "@/lib/utils";

type AccountLanguageSettingsSectionProps = {
  label: string;
  locale: string;
};

export function AccountLanguageSettingsSection({
  label,
  locale,
}: AccountLanguageSettingsSectionProps) {
  const pathname = usePathname();
  const currentLocale = getSupportedLocale(locale);
  const currentMeta = localeMeta[currentLocale];

  function getLocaleHref(nextLocale: string) {
    const segments = pathname.split("/");
    const hasLocalePrefix = locales.includes(
      segments[1] as (typeof locales)[number],
    );

    if (hasLocalePrefix) {
      segments[1] = nextLocale;
    } else {
      segments.splice(1, 0, nextLocale);
    }

    return segments.join("/") || `/${nextLocale}`;
  }

  return (
    <details className="group rounded-[1rem] border border-[#D6D5B2] bg-white px-4 py-4 shadow-[0_12px_30px_rgba(17,18,16,0.05)] md:rounded-2xl md:p-6">
      <summary className="grid cursor-pointer list-none grid-cols-[2.5rem_minmax(0,1fr)_auto_auto] items-center gap-3 [&::-webkit-details-marker]:hidden">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FEFFF9] text-[#8B907F] ring-1 ring-[#EEF0EA] md:h-11 md:w-11">
          <Languages className="h-[1.125rem] w-[1.125rem] md:h-5 md:w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 truncate text-base font-black text-ink md:text-lg md:font-semibold">
          {label}
        </span>
        <span className="max-w-[5.5rem] shrink-0 truncate text-right text-sm font-bold text-[#8B907F]">
          {currentMeta.label}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-[#B8BBAE] transition group-open:rotate-180 md:h-5 md:w-5" />
      </summary>

      <div className="mt-4 flex flex-col items-start gap-2 pl-[3.25rem] md:mt-6 md:gap-3 md:pl-[3.75rem]">
        {locales.map((nextLocale) => {
          const meta = localeMeta[nextLocale as AppLocale];
          const active = nextLocale === currentLocale;

          return (
            <Link
              key={nextLocale}
              href={getLocaleHref(nextLocale)}
              className={cn(
                "inline-flex h-10 min-w-[7.5rem] items-center gap-2 rounded-full px-4 text-sm font-extrabold ring-1 transition md:h-11 md:min-w-[8.5rem] md:px-5",
                active
                  ? "bg-[#156240] text-white ring-[#156240]"
                  : "bg-white text-[#1D1D1B] ring-[#D6D5B2]",
              )}
            >
              <span aria-hidden="true">
                {meta.flag === "cn" ? "CN" : meta.flag.toUpperCase()}
              </span>
              <span>{meta.label}</span>
            </Link>
          );
        })}
      </div>
    </details>
  );
}
