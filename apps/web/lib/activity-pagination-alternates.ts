import { locales } from "@chill-club/shared";
import { getActivityListCanonicalPath } from "../features/activities/utils/activityFilters";

const activityListingPaths = new Set(
  locales.map((locale) => `/${locale}/activities`),
);

export function getActivityPaginationAlternateLinkHeader(
  url: Pick<URL, "origin" | "pathname" | "searchParams">,
) {
  if (
    !activityListingPaths.has(url.pathname) ||
    url.searchParams.size !== 1
  ) {
    return null;
  }

  const page = url.searchParams.get("page");

  if (
    !page ||
    getActivityListCanonicalPath(url.pathname, { page }) !==
      `${url.pathname}?page=${page}`
  ) {
    return null;
  }

  return locales
    .map(
      (locale) =>
        `<${new URL(`/${locale}/activities?page=${page}`, url.origin)}>; rel="alternate"; hreflang="${locale}"`,
    )
    .join(", ");
}
