import { IOS_APP_STORE_URL } from "./iosAppStore";

export const APP_LINK_ORIGIN = "https://friemi.com";
export const APP_WEB_ORIGIN = "https://www.friemi.com";
export const ANDROID_PACKAGE = "com.friemi.app";
export const APP_LOCALES = ["zh-CN", "en", "fr"] as const;
const contentRoots = new Set([
  "lobby",
  "activities",
  "public-events",
  "planets",
  "game-tools",
  "mobile-home",
  "home",
  "world",
  "profile",
  "users",
  "friends",
  "messages",
  "footprints",
  "notifications",
  "discover",
  "search",
  "referrals",
  "account",
  "coupons",
  "tickets",
  "merchants",
  "poll",
  "official-messages",
  "official-feedback",
  "top-news",
  "updates",
  "co-creators",
  "privacy",
  "safety",
]);

export function appLinkLocale(locale?: string | null) {
  return APP_LOCALES.find((value) => value === locale) ?? "zh-CN";
}

// Only content routes cross the browser/app boundary, never OAuth credentials or callbacks.
export function normalizeAppLinkTarget(
  value: string | null | undefined,
  locale: string,
) {
  const fallback = `/${appLinkLocale(locale)}/mobile-home`;
  if (
    typeof value !== "string" ||
    !value ||
    value.length > 4096 ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u0020\u007f]/.test(value)
  )
    return fallback;
  try {
    const url = new URL(value, APP_WEB_ORIGIN);
    const decodedPath = decodeURIComponent(url.pathname);
    if (
      url.origin !== APP_WEB_ORIGIN ||
      /[\\\u0000-\u0020\u007f]/.test(decodedPath) ||
      decodedPath.includes("//") ||
      decodedPath.includes("%")
    )
      return fallback;
    const segments = decodedPath.split("/").filter(Boolean);
    const hasLocale = APP_LOCALES.some((item) => item === segments[0]);
    if (!contentRoots.has(segments[hasLocale ? 1 : 0])) return fallback;
    for (const key of Array.from(url.searchParams.keys())) {
      if (key === "code" && segments[hasLocale ? 1 : 0] === "game-tools")
        continue;
      if (
        /^(?:__clerk|__friemi_|code$|state$|ticket$|token$|redirect_url$)/i.test(
          key,
        )
      )
        url.searchParams.delete(key);
    }
    // Embedded detail sheets should become full pages inside the native app.
    url.searchParams.delete("embedded");
    url.searchParams.delete("sheet");
    const path = hasLocale
      ? url.pathname
      : `/${appLinkLocale(locale)}${url.pathname}`;
    return `${path}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function getAppLinkTargetLocale(target: string) {
  return appLinkLocale(target.split("/")[1]);
}

export function getAppHandoffPath(locale: string, target?: string | null) {
  return `/${appLinkLocale(locale)}/open-app?${new URLSearchParams({ target: normalizeAppLinkTarget(target, locale) })}`;
}

export function getAppLinks(locale: string, value?: string | null) {
  const target = normalizeAppLinkTarget(value, locale);
  const query = new URLSearchParams({ target }).toString();
  const fallback = `${APP_WEB_ORIGIN}${getAppHandoffPath(locale, target)}`;
  const storeQuery = new URLSearchParams({ id: ANDROID_PACKAGE });
  const targetUrl = new URL(target, APP_WEB_ORIGIN);
  // Private invitation capabilities stay between Friemi and the device, not in Play attribution.
  const publicDetail =
    /^\/(zh-CN|en|fr)\/(lobby|activities|public-events|planets)\/[^/]+\/?$/.test(
      targetUrl.pathname,
    );
  if (
    publicDetail &&
    !targetUrl.searchParams.has("access") &&
    !targetUrl.searchParams.has("invite")
  ) {
    storeQuery.set(
      "referrer",
      new URLSearchParams({ friemi_target: targetUrl.pathname }).toString(),
    );
  }
  return {
    target,
    universal: `${APP_LINK_ORIGIN}/open?${query}`,
    scheme: `friemi://open?${query}`,
    androidIntent: `intent://open?${query}#Intent;scheme=friemi;package=${ANDROID_PACKAGE};S.browser_fallback_url=${encodeURIComponent(fallback)};end`,
    androidStore: `https://play.google.com/store/apps/details?${storeQuery}`,
    iosStore: IOS_APP_STORE_URL,
    fallback,
  };
}

export function getAppLinkPlatform(userAgent: string) {
  if (/Friemi(?:Android|IOS)\//i.test(userAgent)) return "native";
  if (/Android/i.test(userAgent)) return "android";
  if (/iPhone|iPad|iPod|Macintosh.+Mobile\//i.test(userAgent)) return "ios";
  return "desktop";
}
