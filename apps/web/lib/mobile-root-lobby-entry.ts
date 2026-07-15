import { defaultLocale, locales } from "@chill-club/shared";

type SupportedLocale = (typeof locales)[number];

export const localeCookieName = "NEXT_LOCALE";

const mobileUserAgentPattern =
  /\b(Mobi|Mobile|Android|iPhone|iPod|iPad|IEMobile|BlackBerry|Opera Mini|Windows Phone)\b/i;
const searchCrawlerUserAgentPattern =
  /\b(Googlebot|AdsBot-Google|Mediapartners-Google|Google-InspectionTool|bingbot|BingPreview|DuckDuckBot|Slurp|YandexBot|Baiduspider|facebookexternalhit|Twitterbot|LinkedInBot)\b/i;

function isSupportedLocale(value: string | null | undefined): value is SupportedLocale {
  return locales.includes(value as SupportedLocale);
}

function normalizeSearch(search: string | null | undefined) {
  if (!search) {
    return "";
  }

  return search.startsWith("?") ? search : `?${search}`;
}

function getLocaleFromLanguageTag(languageTag: string) {
  const normalized = languageTag.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  const exactLocale = locales.find(
    (locale) => locale.toLowerCase() === normalized,
  );

  if (exactLocale) {
    return exactLocale;
  }

  const baseLanguage = normalized.split("-")[0];

  if (baseLanguage === "zh") {
    return "zh-CN";
  }

  return locales.find((locale) => locale.toLowerCase() === baseLanguage) ?? null;
}

export function isMobileUserAgent(userAgent: string | null | undefined) {
  if (!userAgent?.trim()) {
    return false;
  }

  if (searchCrawlerUserAgentPattern.test(userAgent)) {
    return false;
  }

  return mobileUserAgentPattern.test(userAgent);
}

export function resolveRootEntryLocale({
  acceptLanguage,
  localeCookie,
}: {
  acceptLanguage?: string | null;
  localeCookie?: string | null;
}) {
  if (isSupportedLocale(localeCookie)) {
    return localeCookie;
  }

  const acceptedLocales = (acceptLanguage ?? "")
    .split(",")
    .map((entry, index) => {
      const [languageRange, ...params] = entry.trim().split(";");
      const qParam = params.find((param) => param.trim().startsWith("q="));
      const q = qParam ? Number(qParam.trim().slice(2)) : 1;

      return {
        index,
        locale: getLocaleFromLanguageTag(languageRange),
        q: Number.isFinite(q) ? q : 0,
      };
    })
    .filter((entry): entry is { index: number; locale: SupportedLocale; q: number } =>
      Boolean(entry.locale) && entry.q > 0,
    )
    .sort((a, b) => b.q - a.q || a.index - b.index);

  return acceptedLocales[0]?.locale ?? defaultLocale;
}

export function getMobileRootLobbyRedirectPath({
  acceptLanguage,
  localeCookie,
  pathname,
  search,
  userAgent,
}: {
  acceptLanguage?: string | null;
  localeCookie?: string | null;
  pathname: string;
  search?: string | null;
  userAgent?: string | null;
}) {
  if (pathname !== "/" || !isMobileUserAgent(userAgent)) {
    return null;
  }

  const locale = resolveRootEntryLocale({ acceptLanguage, localeCookie });

  return `/${locale}/lobby${normalizeSearch(search)}`;
}
