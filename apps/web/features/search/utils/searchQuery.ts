import { withLocale } from "@/lib/routes";

export type GlobalSearchParams = Record<string, string | string[] | undefined>;

export const globalSearchQueryMaxLength = 80;

export function getSingleGlobalSearchParam(
  searchParams: GlobalSearchParams,
  key: string,
) {
  const value = searchParams[key];

  return Array.isArray(value) ? value[0] : value;
}

export function normalizeGlobalSearchQuery(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\s+/g, " ").slice(0, globalSearchQueryMaxLength);
}

export function getGlobalSearchTerms(query: string) {
  return Array.from(
    new Set(
      query
        .split(/\s+/)
        .map((term) => term.trim())
        .filter(Boolean),
    ),
  ).slice(0, 5);
}

export function getGlobalSearchHref(locale: string, query: string) {
  const normalizedQuery = normalizeGlobalSearchQuery(query);

  if (!normalizedQuery) {
    return withLocale(locale, "/search");
  }

  const params = new URLSearchParams({ q: normalizedQuery });

  return `${withLocale(locale, "/search")}?${params.toString()}`;
}

export function isCanonicalGlobalSearchParams(
  searchParams: GlobalSearchParams = {},
) {
  const keys = Object.keys(searchParams);
  const rawQuery = getSingleGlobalSearchParam(searchParams, "q");
  const normalizedQuery = normalizeGlobalSearchQuery(rawQuery);

  if (keys.some((key) => key !== "q")) {
    return false;
  }

  if (Array.isArray(searchParams.q)) {
    return false;
  }

  if (rawQuery === undefined) {
    return keys.length === 0;
  }

  return Boolean(normalizedQuery) && rawQuery === normalizedQuery;
}
