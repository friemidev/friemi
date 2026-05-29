"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { FilterX, Search, SlidersHorizontal, X } from "lucide-react";
import { Button, Input } from "@chill-club/ui";
import { getCategoryLabel, getCopy, getTypeLabel } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import {
  activityCategoryOptions,
  activityFilterTypes,
  getActivityFilterHref,
  hasActiveActivityFilters,
  normalizeActivityFilterFormData,
  type ActivityFilters,
} from "../utils/activityFilters";

type ActivityFiltersProps = {
  cities: string[];
  filters: ActivityFilters;
  locale: string;
  resultCount: number;
};

type ActiveFilterChip = {
  href: string;
  label: string;
};

const selectClassName =
  "h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-400";

export function ActivityFilters({
  cities,
  filters,
  locale,
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
  const hasCustomFilterState = hasActiveFilters || filters.sort !== "soonest";

  function buildFilterHref(nextFilters: Partial<ActivityFilters>) {
    const mergedFilters: ActivityFilters = {
      ...filters,
      ...nextFilters,
      sort: nextFilters.sort ?? filters.sort,
    };

    return getActivityFilterHref(activitiesHref, mergedFilters);
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
    ...(filters.type
      ? [
          {
            href: buildFilterHref({ type: undefined }),
            label: getTypeLabel(filters.type, locale),
          },
        ]
      : []),
    ...(filters.sort === "latest"
      ? [
          {
            href: buildFilterHref({ sort: "soonest" }),
            label: t.activityFilters.sortLatest,
          },
        ]
      : []),
  ];

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    router.push(
      getActivityFilterHref(
        activitiesHref,
        normalizeActivityFilterFormData(formData),
      ),
    );
  }

  return (
    <section className="rounded-lg border border-black/10 bg-white/80 p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <SlidersHorizontal className="h-4 w-4 shrink-0" />
            {t.activityFilters.title}
          </p>
          <p className="mt-1 text-sm leading-6 text-zinc-500">
            {t.activityFilters.description}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-moss/10 px-3 py-1 text-xs font-medium text-moss">
          {t.activityFilters.resultCount(resultCount)}
        </span>
      </div>

      <form
        action={activitiesHref}
        className="mt-4 grid gap-3 lg:grid-cols-[minmax(180px,1.4fr)_repeat(4,minmax(130px,1fr))_auto_auto]"
        method="get"
        onSubmit={handleSubmit}
      >
        <label className="grid gap-1.5 text-xs font-medium text-zinc-600">
          {t.activityFilters.keywordLabel}
          <Input
            defaultValue={filters.keyword}
            enterKeyHint="search"
            name="q"
            placeholder={t.activityFilters.keywordPlaceholder}
            type="search"
          />
        </label>

        <label className="grid gap-1.5 text-xs font-medium text-zinc-600">
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

        <label className="grid gap-1.5 text-xs font-medium text-zinc-600">
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

        <label className="grid gap-1.5 text-xs font-medium text-zinc-600">
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

        <label className="grid gap-1.5 text-xs font-medium text-zinc-600">
          {t.activityFilters.sortLabel}
          <select
            className={selectClassName}
            defaultValue={filters.sort}
            name="sort"
          >
            <option value="soonest">{t.activityFilters.sortSoonest}</option>
            <option value="latest">{t.activityFilters.sortLatest}</option>
          </select>
        </label>

        <div className="flex items-end">
          <Button className="w-full gap-2 px-3 lg:w-auto" type="submit">
            <Search className="h-4 w-4 shrink-0" />
            {t.activityFilters.apply}
          </Button>
        </div>

        <div className="flex items-end">
          <Link
            aria-disabled={!hasCustomFilterState}
            className="inline-flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md bg-white px-3 text-sm font-medium text-zinc-950 ring-1 ring-zinc-200 transition hover:bg-zinc-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 lg:w-auto"
            href={activitiesHref}
          >
            <FilterX className="h-4 w-4 shrink-0" />
            {t.activityFilters.reset}
          </Link>
        </div>
      </form>

      {activeFilterChips.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {activeFilterChips.map((chip) => (
            <Link
              className="inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-200"
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
