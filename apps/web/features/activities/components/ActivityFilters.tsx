"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import type { ActivityCategory } from "@chill-club/shared";
import {
  ChevronDown,
  FilterX,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Button, Input } from "@chill-club/ui";
import { getCategoryLabel, getCopy, getTypeLabel } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";
import {
  activityCategoryOptions,
  activityDateRangeOptions,
  activityFilterTypes,
  activityRelationFilters,
  activityTimeStates,
  type ActivityDateRange,
  getActivityFilterHref,
  getDefaultActivitySort,
  hasActiveActivityFilters,
  normalizeActivityFilterFormData,
  normalizeActivityFilterValues,
  type ActivityFilters,
  type ActivityFilterType,
  type ActivityRelationFilter,
  type ActivitySortOption,
  type ActivityTimeState,
} from "../utils/activityFilters";

type ActivityFiltersProps = {
  cities: string[];
  filters: ActivityFilters;
  locale: string;
  publicInfoOnly?: boolean;
  resultCount: number;
};

type ActiveFilterChip = {
  href: string;
  label: string;
};

const selectClassName =
  "h-11 w-full rounded-xl border border-[#ddc9a9] bg-white/92 px-3 text-sm font-medium text-zinc-950 shadow-[0_5px_14px_rgba(92,66,32,0.04)] outline-none transition hover:border-[#cfb287] focus:border-[#c7936c] focus:ring-2 focus:ring-[#ecd2bb]/70 sm:h-10";

export function ActivityFilters({
  cities,
  filters,
  locale,
  publicInfoOnly = false,
  resultCount,
}: ActivityFiltersProps) {
  const router = useRouter();
  const t = getCopy(locale);
  const activitiesHref = withLocale(locale, "/activities");
  const selectedCity = filters.city ?? "";
  const cityOptions = selectedCity
    ? Array.from(new Set([selectedCity, ...cities]))
    : cities;
  const hasActiveFilters = hasActiveActivityFilters(filters);
  const defaultSort = getDefaultActivitySort(filters);
  const hasCustomFilterState =
    hasActiveFilters || filters.sort !== defaultSort || filters.page > 1;

  function buildFilterHref(nextFilters: Partial<ActivityFilters>) {
    const mergedFilters = {
      ...filters,
      ...nextFilters,
      page: 1,
      ...(publicInfoOnly ? { relation: "ALL" as const, type: undefined } : {}),
    };

    return getActivityFilterHref(
      activitiesHref,
      normalizeActivityFilterValues(mergedFilters),
    );
  }

  function applyFilterChange(nextFilters: Partial<ActivityFilters>) {
    router.push(buildFilterHref(nextFilters));
  }

  const activeFilterChips: ActiveFilterChip[] = [
    ...(filters.keyword
      ? [
          {
            href: buildFilterHref({ keyword: undefined }),
            label: t.activityFilters.activeKeyword(filters.keyword),
          },
        ]
      : []),
    ...(filters.category
      ? [
          {
            href: buildFilterHref({ category: undefined }),
            label: getCategoryLabel(filters.category, locale),
          },
        ]
      : []),
    ...(filters.city
      ? [
          {
            href: buildFilterHref({ city: undefined }),
            label: filters.city,
          },
        ]
      : []),
    ...(filters.dateRange
      ? [
          {
            href: buildFilterHref({ dateRange: undefined }),
            label: t.activityFilters.dateRangeOptions[filters.dateRange],
          },
        ]
      : []),
    ...(!publicInfoOnly && filters.relation !== "ALL"
      ? [
          {
            href: buildFilterHref({ relation: "ALL" }),
            label:
              filters.relation === "FRIEND_HOSTED"
                ? t.activityFilters.relationFriendHosted
                : filters.relation === "FRIEND_JOINED"
                  ? t.activityFilters.relationFriendJoined
                  : t.activityFilters.relationMine,
          },
        ]
      : []),
    ...(!publicInfoOnly && filters.type
      ? [
          {
            href: buildFilterHref({ type: undefined }),
            label: getTypeLabel(filters.type, locale),
          },
        ]
      : []),
    ...(filters.timeState
      ? [
          {
            href: buildFilterHref({ timeState: undefined }),
            label: t.activityLabels.timeStates[filters.timeState],
          },
        ]
      : []),
    ...(filters.sort !== defaultSort
      ? [
          {
            href: buildFilterHref({ sort: undefined }),
            label:
              filters.sort === "latest"
                ? t.activityFilters.sortLatest
                : filters.sort === "recentlyAdded"
                  ? t.activityFilters.sortRecentlyAdded
                : filters.sort === "recommended"
                  ? t.activityFilters.sortRecommended
                  : t.activityFilters.sortSoonest,
          },
        ]
      : []),
  ];

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    if (publicInfoOnly) {
      formData.set("relation", "ALL");
      formData.delete("type");
    }

    router.push(
      getActivityFilterHref(
        activitiesHref,
        normalizeActivityFilterFormData(formData),
      ),
    );
  }

  function FilterForm({ className }: { className: string }) {
    return (
      <form
        action={activitiesHref}
        className={className}
        method="get"
        onSubmit={handleSubmit}
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
          <label className="col-span-2 grid gap-1.5 text-[12px] font-semibold tracking-[0.08em] text-[#9a7448] sm:col-span-1">
            {t.activityFilters.keywordLabel}
            <Input
              className="h-11 rounded-xl border-[#ddc9a9] bg-white/92 px-3 text-sm shadow-[0_5px_14px_rgba(92,66,32,0.04)] placeholder:text-zinc-400 focus-visible:border-[#c7936c] focus-visible:ring-[#ecd2bb]/70 sm:h-10"
              defaultValue={filters.keyword}
              enterKeyHint="search"
              name="q"
              placeholder={t.activityFilters.keywordPlaceholder}
              type="search"
            />
          </label>

          <div className="flex items-end">
            <Button
              className="h-11 w-full gap-2 rounded-xl bg-[#d88d72] px-4 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(216,141,114,0.22)] hover:bg-[#c87b61] sm:h-10 sm:min-w-[104px] sm:w-auto"
              type="submit"
            >
              <Search className="h-4 w-4 shrink-0" />
              {t.activityFilters.apply}
            </Button>
          </div>

          <div className="flex items-end">
            <Link
              aria-disabled={!hasCustomFilterState}
              className={cn(
                "inline-flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-4 text-sm font-medium transition sm:h-10 sm:w-auto",
                hasCustomFilterState
                  ? "border-[#ddc9a9] bg-white/92 text-zinc-700 shadow-[0_5px_14px_rgba(92,66,32,0.04)] hover:border-[#cfb287] hover:bg-[#fdfaf4]"
                  : "border-transparent bg-transparent text-zinc-400",
              )}
              href={activitiesHref}
            >
              <FilterX className="h-4 w-4 shrink-0" />
              {t.activityFilters.reset}
            </Link>
          </div>
        </div>

        <div
          className={cn(
            "grid grid-cols-2 gap-2 sm:gap-3",
            publicInfoOnly
              ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.05fr)_minmax(0,1fr)_minmax(0,1fr)]"
              : "sm:grid-cols-2 xl:grid-cols-6",
          )}
        >
          <label className="grid gap-1.5 text-[12px] font-semibold tracking-[0.08em] text-[#9a7448]">
            {t.activityFilters.categoryLabel}
            <select
              className={selectClassName}
              defaultValue={filters.category ?? ""}
              name="category"
              onChange={(event) =>
                applyFilterChange({
                  category: event.target.value
                    ? (event.target.value as ActivityCategory)
                    : undefined,
                })
              }
            >
              <option value="">{t.activityFilters.allCategories}</option>
              {activityCategoryOptions.map((category) => (
                <option key={category} value={category}>
                  {getCategoryLabel(category, locale)}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5 text-[12px] font-semibold tracking-[0.08em] text-[#9a7448]">
            {t.activityFilters.cityLabel}
            <select
              className={selectClassName}
              defaultValue={selectedCity}
              name="city"
              onChange={(event) =>
                applyFilterChange({
                  city: event.target.value || undefined,
                })
              }
            >
              <option value="">{t.activityFilters.allCities}</option>
              {cityOptions.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5 text-[12px] font-semibold tracking-[0.08em] text-[#9a7448]">
            {t.activityFilters.dateRangeLabel}
            <select
              className={selectClassName}
              defaultValue={filters.dateRange ?? ""}
              name="dateRange"
              onChange={(event) =>
                applyFilterChange({
                  dateRange: event.target.value
                    ? (event.target.value as ActivityDateRange)
                    : undefined,
                })
              }
            >
              <option value="">{t.activityFilters.allDateRanges}</option>
              {activityDateRangeOptions.map((dateRange) => (
                <option key={dateRange} value={dateRange}>
                  {t.activityFilters.dateRangeOptions[dateRange]}
                </option>
              ))}
            </select>
          </label>

          {!publicInfoOnly ? (
            <>
              <label className="grid gap-1.5 text-[12px] font-semibold tracking-[0.08em] text-[#9a7448]">
                {t.activityFilters.relationLabel}
                <select
                  className={selectClassName}
                  defaultValue={filters.relation}
                  name="relation"
                  onChange={(event) =>
                    applyFilterChange({
                      relation: event.target.value as ActivityRelationFilter,
                    })
                  }
                >
                  {activityRelationFilters.map((relation) => (
                    <option key={relation} value={relation}>
                      {relation === "ALL"
                        ? t.activityFilters.allRelations
                        : relation === "FRIEND_HOSTED"
                          ? t.activityFilters.relationFriendHosted
                          : relation === "FRIEND_JOINED"
                            ? t.activityFilters.relationFriendJoined
                            : t.activityFilters.relationMine}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5 text-[12px] font-semibold tracking-[0.08em] text-[#9a7448]">
                {t.activityFilters.typeLabel}
                <select
                  className={selectClassName}
                  defaultValue={filters.type ?? ""}
                  name="type"
                  onChange={(event) =>
                    applyFilterChange({
                      type: event.target.value
                        ? (event.target.value as ActivityFilterType)
                        : undefined,
                    })
                  }
                >
                  <option value="">{t.activityFilters.allTypes}</option>
                  {activityFilterTypes.map((type) => (
                    <option key={type} value={type}>
                      {getTypeLabel(type, locale)}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : null}

          <label className="grid gap-1.5 text-[12px] font-semibold tracking-[0.08em] text-[#9a7448]">
            {t.activityFilters.timeStateLabel}
            <select
              className={selectClassName}
              defaultValue={filters.timeState ?? ""}
              name="time"
              onChange={(event) =>
                applyFilterChange({
                  timeState: event.target.value
                    ? (event.target.value as ActivityTimeState)
                    : undefined,
                })
              }
            >
              <option value="">{t.activityFilters.allTimeStates}</option>
              {activityTimeStates.map((timeState) => (
                <option key={timeState} value={timeState}>
                  {t.activityLabels.timeStates[timeState]}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5 text-[12px] font-semibold tracking-[0.08em] text-[#9a7448]">
            {t.activityFilters.sortLabel}
            <select
              className={selectClassName}
              defaultValue={filters.sort}
              name="sort"
              onChange={(event) =>
                applyFilterChange({
                  sort: event.target.value as ActivitySortOption,
                })
              }
            >
              <option value="recommended">
                {t.activityFilters.sortRecommended}
              </option>
              <option value="soonest">{t.activityFilters.sortSoonest}</option>
              <option value="latest">{t.activityFilters.sortLatest}</option>
              <option value="recentlyAdded">
                {t.activityFilters.sortRecentlyAdded}
              </option>
            </select>
          </label>
        </div>
      </form>
    );
  }

  return (
    <section className="space-y-3">
      <div className="hidden flex-wrap items-center justify-between gap-2 px-1 md:flex">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fff8ec] text-[#9a7448] ring-1 ring-[#ead7b8]">
            <SlidersHorizontal className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">
              {publicInfoOnly
                ? t.activityFilters.publicInfoTitle
                : t.activityFilters.title}
            </p>
            <p className="text-xs leading-5 text-zinc-500">
              {publicInfoOnly
                ? t.activityFilters.publicInfoDescription
                : t.activityFilters.description}
            </p>
          </div>
        </div>
        <span className="inline-flex h-8 shrink-0 items-center rounded-full bg-white/82 px-3 text-xs font-semibold text-[#9a7448] shadow-sm ring-1 ring-[#ead7b8]">
          {t.activityFilters.resultCount(resultCount)}
        </span>
      </div>

      <div className="md:hidden">
        <details className="group overflow-hidden rounded-[1.35rem] bg-white/86 shadow-sm ring-1 ring-[#e6d5bb]">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
            <span className="inline-flex min-w-0 items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 shrink-0 text-[#9a7448]" />
              <span className="truncate">{t.activityFilters.mobileSummary}</span>
              {activeFilterChips.length > 0 ? (
                <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#d88d72] px-1.5 text-[11px] font-bold leading-none text-white">
                  {activeFilterChips.length}
                </span>
              ) : null}
            </span>
            <span className="inline-flex shrink-0 items-center gap-2">
              <span className="rounded-full bg-[#fff8ec] px-2.5 py-1 text-xs font-semibold text-[#9a7448] ring-1 ring-[#ead7b8]">
                {t.activityFilters.resultCount(resultCount)}
              </span>
              <ChevronDown className="h-4 w-4 text-zinc-500 transition group-open:rotate-180" />
            </span>
          </summary>
          <div className="border-t border-[#ead7b8] bg-[#fff9ef]/72 p-3">
            <FilterForm className="grid gap-3" />
          </div>
        </details>

        {activeFilterChips.length > 0 ? (
          <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {activeFilterChips.map((chip) => (
              <Link
                className="inline-flex h-8 max-w-[13rem] shrink-0 items-center gap-1.5 rounded-full bg-white/86 px-3 text-xs font-medium text-zinc-700 shadow-sm ring-1 ring-[#ead7b8]"
                href={chip.href}
                key={chip.label}
                prefetch={false}
                title={t.activityFilters.removeFilter(chip.label)}
              >
                <span className="truncate">{chip.label}</span>
                <X
                  aria-hidden
                  className="h-3.5 w-3.5 shrink-0 text-zinc-500"
                />
                <span className="sr-only">
                  {t.activityFilters.removeFilter(chip.label)}
                </span>
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      <div className="hidden rounded-[1.25rem] bg-white/62 p-3 shadow-sm ring-1 ring-[#ead7b8] md:block">
        <FilterForm className="grid gap-3" />
      </div>

      {activeFilterChips.length > 0 ? (
        <div className="hidden flex-wrap gap-2 px-1 md:flex">
          {activeFilterChips.map((chip) => (
            <Link
              className="inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-full bg-white/86 px-3 text-xs font-medium text-zinc-700 shadow-sm ring-1 ring-[#ead7b8] transition hover:bg-white hover:ring-[#d8b895]"
              href={chip.href}
              key={chip.label}
              prefetch={false}
              title={t.activityFilters.removeFilter(chip.label)}
            >
              <span className="truncate">{chip.label}</span>
              <X aria-hidden className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
              <span className="sr-only">
                {t.activityFilters.removeFilter(chip.label)}
              </span>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
