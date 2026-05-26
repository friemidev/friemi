"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales } from "@chill-club/shared";
import { localeMeta, getSupportedLocale } from "@/lib/copy";
import { cn } from "@/lib/utils";

type LocaleSwitcherProps = {
  locale: string;
};

export function LocaleSwitcher({ locale }: LocaleSwitcherProps) {
  const pathname = usePathname();
  const currentLocale = getSupportedLocale(locale);

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
    <div className="flex items-center gap-1 rounded-full border border-black/10 bg-white/70 p-1">
      {locales.map((item) => {
        const meta = localeMeta[item];

        return (
          <Link
            key={item}
            href={getLocaleHref(item)}
            aria-label={meta.label}
            title={meta.label}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-base leading-none transition hover:bg-zinc-100",
              item === currentLocale &&
                "bg-paper shadow-sm ring-1 ring-black/10",
            )}
          >
            <span aria-hidden="true">{meta.flag}</span>
          </Link>
        );
      })}
    </div>
  );
}
