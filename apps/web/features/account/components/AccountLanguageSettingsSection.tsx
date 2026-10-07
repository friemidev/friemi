"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales } from "@chill-club/shared";
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
      <div className="flex items-baseline justify-between gap-4 px-2">
        <h2 className="text-sm font-bold text-ink/70">{label}</h2>
        <span className="text-xs font-semibold text-ink/70">
          {currentMeta.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-fog p-1">
        {locales.map((nextLocale) => {
          const meta = localeMeta[nextLocale as AppLocale];
          const active = nextLocale === currentLocale;

          return (
            <Link
              aria-current={active ? "page" : undefined}
              key={nextLocale}
              href={getLocaleHref(nextLocale)}
              className={cn(
                "inline-flex h-12 min-w-0 items-center justify-center gap-2 rounded-xl px-2 text-sm font-semibold transition active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest sm:px-3",
                active ? "bg-paper text-forest" : "text-ink hover:bg-paper/70",
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
