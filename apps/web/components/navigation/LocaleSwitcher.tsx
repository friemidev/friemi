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
  const currentIndex = locales.indexOf(currentLocale);
  const nextLocale = locales[(currentIndex + 1) % locales.length];
  const currentMeta = localeMeta[currentLocale];
  const nextMeta = localeMeta[nextLocale];
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
    <Link
      href={getLocaleHref(nextLocale)}
      aria-label={t.common.switchLanguage(nextMeta.label)}
      title={`${currentMeta.label} -> ${nextMeta.label}`}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white/80 text-base leading-none shadow-sm transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300"
    >
      <span aria-hidden="true">{currentMeta.flag}</span>
    </Link>
  );
}
