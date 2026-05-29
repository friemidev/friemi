"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales } from "@chill-club/shared";
import { localeMeta, getCopy, getSupportedLocale } from "@/lib/copy";

type LocaleSwitcherProps = {
  locale: string;
};

export function LocaleSwitcher({ locale }: LocaleSwitcherProps) {
  const pathname = usePathname();
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

    return segments.join("/") || `/${nextLocale}`;
  }

  return (
    <details className="group relative">
      <summary
        aria-label={t.common.switchLanguage(currentMeta.label)}
        title={currentMeta.label}
        className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border border-black/10 bg-white/85 text-base leading-none shadow-sm transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300 [&::-webkit-details-marker]:hidden"
      >
        <span aria-hidden="true">{currentMeta.flag}</span>
      </summary>
      <div className="absolute right-0 top-12 z-50 flex w-max items-center gap-2 rounded-xl border border-black/10 bg-white/95 p-2 shadow-lg backdrop-blur">
        {locales.map((nextLocale) => {
          const meta = localeMeta[nextLocale];
          const active = nextLocale === currentLocale;

          return (
            <Link
              key={nextLocale}
              href={getLocaleHref(nextLocale)}
              aria-label={t.common.switchLanguage(meta.label)}
              title={meta.label}
              className={
                active
                  ? "flex h-9 w-9 items-center justify-center rounded-full bg-moss/10 text-base ring-2 ring-moss/50"
                  : "flex h-9 w-9 items-center justify-center rounded-full bg-zinc-50 text-base ring-1 ring-zinc-200 transition hover:bg-zinc-100"
              }
            >
              <span aria-hidden="true">{meta.flag}</span>
            </Link>
          );
        })}
      </div>
    </details>
  );
}
