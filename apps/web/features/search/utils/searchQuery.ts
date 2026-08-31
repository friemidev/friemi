import { withLocale } from "@/lib/routes";

export type GlobalSearchParams = Record<string, string | string[] | undefined>;
export type GlobalSearchSource = "messages";

export const globalSearchQueryMaxLength = 80;

export function normalizeGlobalSearchSource(
  value: unknown,
): GlobalSearchSource | null {
  return value === "messages" ? value : null;
}

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

export function getGlobalSearchHref(
  locale: string,
  query: string,
  options: {
    includeEnded?: boolean;
    source?: GlobalSearchSource | null;
  } = {},
) {
  const normalizedQuery = normalizeGlobalSearchQuery(query);
  const params = new URLSearchParams();

  if (normalizedQuery) {
    params.set("q", normalizedQuery);
  }

  if (normalizedQuery && options.includeEnded) {
    params.set("ended", "1");
  }

  if (options.source) {
    params.set("source", options.source);
  }

  const serializedParams = params.toString();

  return serializedParams
    ? `${withLocale(locale, "/search")}?${serializedParams}`
    : withLocale(locale, "/search");
}

export function isCanonicalGlobalSearchParams(
  searchParams: GlobalSearchParams = {},
) {
  const keys = Object.keys(searchParams);
  const rawQuery = getSingleGlobalSearchParam(searchParams, "q");
  const rawSource = getSingleGlobalSearchParam(searchParams, "source");
  const normalizedQuery = normalizeGlobalSearchQuery(rawQuery);
  const normalizedSource = normalizeGlobalSearchSource(rawSource);

  if (keys.some((key) => key !== "q" && key !== "ended" && key !== "source")) {
    return false;
  }

  if (
    Array.isArray(searchParams.q) ||
    Array.isArray(searchParams.ended) ||
    Array.isArray(searchParams.source)
  ) {
    return false;
  }

  if (rawSource !== undefined && rawSource !== normalizedSource) {
    return false;
  }

  if (
    searchParams.ended !== undefined &&
    (searchParams.ended !== "1" || !normalizedQuery)
  ) {
    return false;
  }

  if (rawQuery === undefined) {
    return keys.length === (normalizedSource ? 1 : 0);
  }

  return Boolean(normalizedQuery) && rawQuery === normalizedQuery;
}
