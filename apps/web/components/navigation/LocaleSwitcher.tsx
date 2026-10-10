"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { locales } from "@chill-club/shared";
import {
  localeMeta,
  getCopy,
  getSupportedLocale,
  type AppLocale,
} from "@/lib/copy";
import { LocaleFlagIcon } from "./LocaleFlagIcon";

type LocaleSwitcherProps = {
  locale: string;
};

export function LocaleSwitcher({ locale }: LocaleSwitcherProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentLocale = getSupportedLocale(locale);
  const currentMeta = localeMeta[currentLocale];
  const t = getCopy(currentLocale);

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

    const nextPathname = segments.join("/") || `/${nextLocale}`;
    const query = searchParams.toString();
    return query ? `${nextPathname}?${query}` : nextPathname;
  }

  return (
    <details key={currentLocale} className="group relative shrink-0">
      <summary
        aria-label={t.common.switchLanguage(currentMeta.label)}
        title={currentMeta.label}
        className="flex size-11 cursor-pointer list-none items-center justify-center rounded-full border border-ink/10 bg-paper text-base leading-none transition hover:bg-fog focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest [&::-webkit-details-marker]:hidden"
      >
        <LocaleFlagIcon
          flag={currentMeta.flag}
          label={currentMeta.label}
          size="md"
        />
      </summary>
      <div className="absolute right-0 top-12 z-50 flex w-max items-center gap-2 rounded-lg border border-ink/10 bg-paper p-2 shadow-lg">
        {locales.map((nextLocale) => {
          const meta = localeMeta[nextLocale as AppLocale];
          const active = nextLocale === currentLocale;

          return (
            <Link
              key={nextLocale}
              href={getLocaleHref(nextLocale)}
              aria-current={active ? "page" : undefined}
              aria-label={t.common.switchLanguage(meta.label)}
              title={meta.label}
              className={
                active
                  ? "flex size-11 items-center justify-center rounded-full bg-forest/10 ring-2 ring-forest/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                  : "flex size-11 items-center justify-center rounded-full bg-paper ring-1 ring-ink/10 transition hover:bg-fog focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
              }
            >
              <LocaleFlagIcon flag={meta.flag} label={meta.label} size="sm" />
            </Link>
          );
        })}
      </div>
    </details>
  );
}
