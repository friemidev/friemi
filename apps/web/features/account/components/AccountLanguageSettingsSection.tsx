"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales } from "@chill-club/shared";
import { Languages } from "lucide-react";
import { LocaleFlagIcon } from "@/components/navigation/LocaleFlagIcon";
import { getSupportedLocale, localeMeta, type AppLocale } from "@/lib/copy";
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
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-4 px-1">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F1F2EC] text-[#156240] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] ring-1 ring-[#D6D5B2]/70">
            <Languages className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-base font-black text-[#1D1D1B]">
              {label}
            </h2>
            <p className="mt-0.5 truncate text-xs font-bold text-[#8E8383]">
              {currentMeta.label}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {locales.map((nextLocale) => {
          const meta = localeMeta[nextLocale as AppLocale];
          const active = nextLocale === currentLocale;

          return (
            <Link
              key={nextLocale}
              href={getLocaleHref(nextLocale)}
              className={cn(
                "inline-flex h-12 min-w-0 items-center justify-center gap-2 rounded-full px-2.5 text-sm font-black ring-1 transition active:scale-[0.98] sm:px-3.5",
                active
                  ? "bg-[#156240] text-white shadow-[0_16px_34px_rgba(21,98,64,0.2)] ring-[#156240]"
                  : "bg-[#FEFFF9]/54 text-[#1D1D1B] ring-[#D6D5B2]/60 hover:bg-[#FEFFF9] hover:ring-[#8AB68E]/70",
              )}
            >
              <LocaleFlagIcon flag={meta.flag} label={meta.label} size="sm" />
              <span className="min-w-0 max-w-full truncate leading-tight">
                {meta.label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
