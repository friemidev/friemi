import { locales } from "@chill-club/shared";
import { withLocale } from "@/lib/routes";

const fallbackOrigin = "https://friemi.local";

function getFirstValue(value?: string | string[] | null) {
  return Array.isArray(value) ? value[0] : value;
}

function hasLocalePrefix(pathname: string) {
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  return locales.some((locale) => locale === firstSegment);
}

export function getPlanetChatFallbackHref(locale: string) {
  return withLocale(locale, "/footprints?tab=message");
}

export function normalizePlanetChatReturnHref(
  locale: string,
  value?: string | string[] | null,
) {
  const fallbackHref = getPlanetChatFallbackHref(locale);
  const rawValue = getFirstValue(value)?.trim();

  if (
    !rawValue ||
    /[\u0000-\u001F\u007F]/.test(rawValue) ||
    /^https?:\/\//i.test(rawValue) ||
    rawValue.startsWith("//")
  ) {
    return fallbackHref;
  }

  try {
    const url = new URL(
      rawValue.startsWith("/") ? rawValue : `/${rawValue}`,
      fallbackOrigin,
    );

    if (
      url.origin !== fallbackOrigin ||
      /\/planets\/[^/]+\/chat\/?$/.test(url.pathname)
    ) {
      return fallbackHref;
    }

    const pathname = hasLocalePrefix(url.pathname)
      ? url.pathname
      : withLocale(locale, url.pathname);

    return `${pathname}${url.search}${url.hash}`;
  } catch {
    return fallbackHref;
  }
}
