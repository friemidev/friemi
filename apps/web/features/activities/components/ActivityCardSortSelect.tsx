"use client";

import { ArrowUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  activityCardSortOptions,
  type ActivityCardSortOption,
  type ActivityFilters,
  getActivityFilterHref,
  normalizeActivityFilterValues,
} from "@/features/activities/utils/activityFilters";
import { getCopy } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";
import {
  activityResultsFilterBarHeightClass,
  activityResultsFilterLabelClass,
  activityResultsFilterSelectClass,
} from "./activityResultsFilterStyles";

function getCardSortLabel(sort: ActivityCardSortOption, locale: string) {
  const t = getCopy(locale);

  switch (sort) {
    case "latest":
      return t.activityFilters.sortLatest;
    case "shortDuration":
      return t.activityFilters.sortShortDuration;
    case "longDuration":
      return t.activityFilters.sortLongDuration;
    default:
      return t.activityFilters.sortSoonest;
  }
}

export function ActivityCardSortSelect({
  filters,
  locale,
}: {
  filters: ActivityFilters;
  locale: string;
}) {
  const router = useRouter();
  const t = getCopy(locale);
  const activitiesHref = withLocale(locale, "/activities");

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 sm:gap-2",
        activityResultsFilterBarHeightClass,
      )}
    >
      <ArrowUpDown
        aria-hidden
        className="h-3.5 w-3.5 shrink-0 text-[#9a6b3b]"
      />
      <span
        className={cn(
          "sr-only sm:inline-flex",
          activityResultsFilterLabelClass,
          activityResultsFilterBarHeightClass,
        )}
      >
        {t.activityFilters.sortLabel}
      </span>
      <select
        aria-label={t.activityFilters.sortLabel}
        className={activityResultsFilterSelectClass}
        value={filters.sort}
        onChange={(event) => {
          router.push(
            getActivityFilterHref(
              activitiesHref,
              normalizeActivityFilterValues({
                ...filters,
                page: 1,
                sort: event.target.value as ActivityCardSortOption,
              }),
            ),
          );
        }}
      >
        {activityCardSortOptions.map((sort) => (
          <option key={sort} value={sort}>
            {getCardSortLabel(sort, locale)}
          </option>
        ))}
      </select>
    </div>
  );
}
