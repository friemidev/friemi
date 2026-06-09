"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
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
  getActivityFilterHref,
  getDefaultActivitySort,
  hasActiveActivityFilters,
  normalizeActivityFilterFormData,
  normalizeActivityFilterValues,
  type ActivityFilters,
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
  "h-12 w-full rounded-2xl border border-[#ddc9a9] bg-white px-4 text-[15px] font-medium text-zinc-950 shadow-[0_8px_22px_rgba(92,66,32,0.05)] outline-none transition hover:border-[#cfb287] hover:shadow-[0_10px_26px_rgba(92,66,32,0.07)] focus:border-[#c7936c] focus:ring-2 focus:ring-[#ecd2bb]/70";

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
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-end">
          <label className="grid gap-2 text-[12px] font-semibold tracking-[0.08em] text-[#9a7448]">
            {t.activityFilters.keywordLabel}
            <Input
              className="h-12 rounded-2xl border-[#ddc9a9] bg-white px-4 text-[15px] shadow-[0_8px_22px_rgba(92,66,32,0.05)] placeholder:text-zinc-400 focus-visible:border-[#c7936c] focus-visible:ring-[#ecd2bb]/70"
              defaultValue={filters.keyword}
              enterKeyHint="search"
              name="q"
              placeholder={t.activityFilters.keywordPlaceholder}
              type="search"
            />
          </label>

          <div className="flex items-end">
            <Button
              className="h-12 w-full gap-2 rounded-2xl bg-[linear-gradient(180deg,#d59c76,#bf8460)] px-5 text-[15px] font-semibold text-white shadow-[0_14px_28px_rgba(191,132,96,0.3)] hover:bg-[#b87f59] lg:min-w-[112px] lg:w-auto"
              type="submit"
            >
              <Search className="h-4 w-4 shrink-0" />
              {t.activityFilters.apply}
            </Button>
          </div>

          <div className="flex items-end">
            <Link
              aria-disabled={!hasCustomFilterState}
              className="inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-[#ddc9a9] bg-white px-4 text-[15px] font-medium text-zinc-700 shadow-[0_8px_22px_rgba(92,66,32,0.04)] transition hover:border-[#cfb287] hover:bg-[#fdfaf4] aria-disabled:pointer-events-none aria-disabled:opacity-50 lg:w-auto"
              href={activitiesHref}
            >
              <FilterX className="h-4 w-4 shrink-0" />
              {t.activityFilters.reset}
            </Link>
          </div>
        </div>

        <div
          className={cn(
            "grid gap-3",
            publicInfoOnly
              ? "sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.05fr)_minmax(0,1fr)_minmax(0,1fr)]"
              : "sm:grid-cols-2 xl:grid-cols-6",
          )}
        >
          <label className="grid gap-2 text-[12px] font-semibold tracking-[0.08em] text-[#9a7448]">
            {t.activityFilters.categoryLabel}
            <select
              className={selectClassName}
              defaultValue={filters.category ?? ""}
              name="category"
            >
              <option value="">{t.activityFilters.allCategories}</option>
              {activityCategoryOptions.map((category) => (
                <option key={category} value={category}>
                  {getCategoryLabel(category, locale)}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-[12px] font-semibold tracking-[0.08em] text-[#9a7448]">
            {t.activityFilters.cityLabel}
            <select
              className={selectClassName}
              defaultValue={selectedCity}
              name="city"
            >
              <option value="">{t.activityFilters.allCities}</option>
              {cityOptions.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-[12px] font-semibold tracking-[0.08em] text-[#9a7448]">
            {t.activityFilters.dateRangeLabel}
            <select
              className={selectClassName}
              defaultValue={filters.dateRange ?? ""}
              name="dateRange"
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
              <label className="grid gap-2 text-[12px] font-semibold tracking-[0.08em] text-[#9a7448]">
                {t.activityFilters.relationLabel}
                <select
                  className={selectClassName}
                  defaultValue={filters.relation}
                  name="relation"
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

              <label className="grid gap-2 text-[12px] font-semibold tracking-[0.08em] text-[#9a7448]">
                {t.activityFilters.typeLabel}
                <select
                  className={selectClassName}
                  defaultValue={filters.type ?? ""}
                  name="type"
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

          <label className="grid gap-2 text-[12px] font-semibold tracking-[0.08em] text-[#9a7448]">
            {t.activityFilters.timeStateLabel}
            <select
              className={selectClassName}
              defaultValue={filters.timeState ?? ""}
              name="time"
            >
              <option value="">{t.activityFilters.allTimeStates}</option>
              {activityTimeStates.map((timeState) => (
                <option key={timeState} value={timeState}>
                  {t.activityLabels.timeStates[timeState]}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-[12px] font-semibold tracking-[0.08em] text-[#9a7448]">
            {t.activityFilters.sortLabel}
            <select
              className={selectClassName}
              defaultValue={filters.sort}
              name="sort"
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
    <section className="rounded-[1.75rem] border border-[#dcc9aa] bg-[linear-gradient(180deg,rgba(249,242,229,0.98),rgba(241,231,213,0.98))] p-4 shadow-[0_18px_42px_rgba(92,66,32,0.08)] sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[12px] font-semibold tracking-[0.14em] text-[#9a7448]">
            <SlidersHorizontal className="h-4 w-4 shrink-0" />
            {publicInfoOnly
              ? t.activityFilters.publicInfoTitle
              : t.activityFilters.title}
          </p>
          <p className="mt-2 max-w-2xl text-[15px] leading-7 text-zinc-600 sm:text-[16px]">
            {publicInfoOnly
              ? t.activityFilters.publicInfoDescription
              : t.activityFilters.description}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center rounded-full border border-[#ddc9a9] bg-white px-3.5 py-1.5 text-[13px] font-semibold text-[#9a7448] shadow-[0_8px_18px_rgba(92,66,32,0.05)]">
          {t.activityFilters.resultCount(resultCount)}
        </span>
      </div>

      <details className="mt-4 overflow-hidden rounded-[1.35rem] border border-[#dcc9aa] bg-[linear-gradient(180deg,rgba(252,246,236,0.99),rgba(244,235,220,0.98))] md:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
          <span className="inline-flex min-w-0 items-center gap-2">
            <Search className="h-4 w-4 shrink-0" />
            <span className="truncate">{t.activityFilters.mobileSummary}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500" />
        </summary>
        <div className="border-t border-[#e7d8bf] p-4">
          <FilterForm className="grid gap-4" />
        </div>
      </details>

      <div className="hidden md:block">
        <FilterForm className="mt-5 grid gap-4" />
      </div>

      {activeFilterChips.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {activeFilterChips.map((chip) => (
            <Link
              className="inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full border border-[#ddc9a9] bg-white px-3.5 text-[13px] font-medium text-zinc-700 shadow-[0_6px_14px_rgba(92,66,32,0.04)] transition hover:border-[#cfb287] hover:bg-[#fdfaf4]"
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
