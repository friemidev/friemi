import { locales } from "@chill-club/shared";
import { withLocale } from "./routes";

export const authRedirectParamName = "redirect_url";
export const androidAuthCompleteTargetParamName = "target";

const authRedirectFallbackPath = "/home";
const appOrigin = "https://friemi.local";

function getFirstParamValue(value?: string | string[] | null) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function hasControlCharacters(value: string) {
  return /[\u0000-\u001F\u007F]/.test(value);
}

function hasSupportedLocalePrefix(pathname: string) {
  const firstSegment = pathname.split("/").filter(Boolean)[0];

  return locales.some((locale) => locale === firstSegment);
}

function isAuthPath(pathname: string) {
  const withoutLocale = hasSupportedLocalePrefix(pathname)
    ? `/${pathname.split("/").filter(Boolean).slice(1).join("/")}`
    : pathname;

  return (
    withoutLocale === "/sign-in" ||
    withoutLocale.startsWith("/sign-in/") ||
    withoutLocale === "/sign-up" ||
    withoutLocale.startsWith("/sign-up/")
  );
}

export function getAuthRedirectFallback(locale: string) {
  return withLocale(locale, authRedirectFallbackPath);
}

export function normalizeAuthRedirectTarget(
  locale: string,
  value?: string | string[] | null,
) {
  const rawValue = getFirstParamValue(value)?.trim();
  const fallback = getAuthRedirectFallback(locale);

  if (!rawValue || hasControlCharacters(rawValue)) {
    return fallback;
  }

  if (/^https?:\/\//i.test(rawValue) || rawValue.startsWith("//")) {
    return fallback;
  }

  const prefixedValue = rawValue.startsWith("/") ? rawValue : `/${rawValue}`;

  try {
    const url = new URL(prefixedValue, appOrigin);

    if (url.origin !== appOrigin || isAuthPath(url.pathname)) {
      return fallback;
    }

    const pathWithLocale = hasSupportedLocalePrefix(url.pathname)
      ? url.pathname
      : withLocale(locale, url.pathname);

    return `${pathWithLocale}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function getSignInHref(
  locale: string,
  redirectTarget?: string | string[] | null,
) {
  const target = normalizeAuthRedirectTarget(locale, redirectTarget);
  const query = new URLSearchParams({ [authRedirectParamName]: target });

  return withLocale(locale, `/sign-in?${query.toString()}`);
}

export function getSignUpHref(
  locale: string,
  redirectTarget?: string | string[] | null,
) {
  const target = normalizeAuthRedirectTarget(locale, redirectTarget);
  const query = new URLSearchParams({ [authRedirectParamName]: target });

  return withLocale(locale, `/sign-up?${query.toString()}`);
}

export function getAndroidAuthCompleteHref(
  locale: string,
  redirectTarget?: string | string[] | null,
) {
  const target = normalizeAuthRedirectTarget(locale, redirectTarget);
  const query = new URLSearchParams({
    [androidAuthCompleteTargetParamName]: target,
  });

  return withLocale(locale, `/android-auth-complete?${query.toString()}`);
}

export function getRequestRedirectTarget({
  pathname,
  search,
}: {
  pathname: string;
  search?: string;
}) {
  return `${pathname}${search ?? ""}`;
}
