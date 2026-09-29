import { locales } from "@chill-club/shared";
import {
  buildPlanetChatListReturnHref,
  getPlanetChatListState,
} from "@/features/planets/utils/planetChatListState";
import { withLocale } from "@/lib/routes";

const fallbackOrigin = "https://friemi.local";

function getFirstValue(value?: string | string[] | null) {
  return Array.isArray(value) ? value[0] : value;
}

function getPathWithoutLocale(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);

  if (locales.some((locale) => locale === segments[0])) {
    segments.shift();
  }

  return `/${segments.join("/")}`;
}

export function getOfficialMessageFallbackHref(locale: string) {
  return buildPlanetChatListReturnHref({
    filter: "all",
    locale,
    query: "",
  });
}

export function buildOfficialMessageDetailHref({
  detailPath,
  locale,
  returnHref,
}: {
  detailPath: "/official-feedback" | "/official-messages";
  locale: string;
  returnHref: string;
}) {
  const params = new URLSearchParams({ returnTo: returnHref });
  return `${withLocale(locale, detailPath)}?${params.toString()}`;
}

export function normalizeOfficialMessageReturnHref(
  locale: string,
  value?: string | string[] | null,
) {
  const fallbackHref = getOfficialMessageFallbackHref(locale);
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
      getPathWithoutLocale(url.pathname) !== "/footprints"
    ) {
      return fallbackHref;
    }

    const state = getPlanetChatListState(url.search);
    return buildPlanetChatListReturnHref({ locale, ...state });
  } catch {
    return fallbackHref;
  }
}
