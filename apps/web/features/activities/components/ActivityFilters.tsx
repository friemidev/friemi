"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ActivityCategory } from "@chill-club/shared";
import {
  Check,
  ChevronDown,
  FilterX,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Button, Input } from "@chill-club/ui";
import { ActivityCardSortSelect } from "./ActivityCardSortSelect";
import { ActivityTimeStateFilter } from "./ActivityTimeStateFilter";
import { getCategoryLabel, getCopy, getTypeLabel } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";
import {
  activityCategoryOptions,
  activityDateRangeOptions,
  activityFilterTypes,
  activityRelationFilters,
  type ActivityDateRange,
  getActivityFilterHref,
  getDefaultActivitySort,
  getDefaultActivityTimeStates,
  hasActiveActivityFilters,
  hasPartialActivityTimeStatesFilter,
  normalizeActivityFilterFormData,
  normalizeActivityFilterValues,
  type ActivityFilters,
  type ActivityFilterType,
  type ActivityRelationFilter,
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
  "h-11 w-full rounded-2xl border border-[#8AB68E] bg-[#FEFFF9] px-3 text-sm font-semibold text-[#1D1D1B] shadow-[0_8px_18px_rgba(54,151,88,0.06)] outline-none transition hover:border-[#8AB68E] hover:bg-white focus:border-[#369758] focus:bg-white focus:ring-2 focus:ring-[#8AB68E]/70";
const desktopSelectClassName =
  "sm:h-10 md:h-9 md:rounded-xl md:text-[13px] md:shadow-none";
const fieldLabelClassName =
  "grid gap-1.5 text-[12px] font-semibold text-[#156240]";
const desktopFieldLabelClassName =
  "md:gap-1 md:text-[11px] md:leading-[1.25]";

type FilterSelectOption = {
  label: string;
  value: string;
};

function ActivityFilterSelect({
  className,
  name,
  onValueChange,
  options,
  value,
}: {
  className?: string;
  name: string;
  onValueChange: (value: string) => void;
  options: FilterSelectOption[];
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedOption =
    options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div
      className={cn("relative min-w-0", open ? "z-[90]" : "z-10")}
      ref={rootRef}
    >
      <input name={name} type="hidden" value={value} />
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-left",
          className,
        )}
        type="button"
        onClick={() => {
          setOpen((current) => !current);
        }}
      >
        <span className="min-w-0 truncate">{selectedOption?.label}</span>
        <ChevronDown
          aria-hidden
          className={cn(
            "h-4 w-4 shrink-0 text-[#156240] transition",
            open ? "rotate-180" : null,
          )}
        />
      </button>
      {open ? (
        <div
          className="absolute left-0 top-[calc(100%+0.4rem)] z-[90] max-h-72 w-full min-w-[12rem] overflow-y-auto rounded-[1rem] border border-[#8AB68E] bg-[#FEFFF9] p-1.5 text-sm font-semibold text-[#1D1D1B] shadow-[0_20px_46px_rgba(29,29,27,0.18)] ring-1 ring-white"
          role="listbox"
        >
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                aria-selected={isSelected}
                className={cn(
                  "grid min-h-9 w-full grid-cols-[minmax(0,1fr)_1rem] items-center gap-3 rounded-[0.8rem] px-3 py-2 text-left transition",
                  isSelected
                    ? "bg-[#DEEBFF] text-[#156240]"
                    : "hover:bg-[#FEFFF9]",
                )}
                key={option.value || "__empty"}
                role="option"
                type="button"
                onClick={() => {
                  setOpen(false);
                  onValueChange(option.value);
                }}
              >
                <span className="truncate">{option.label}</span>
                {isSelected ? (
                  <Check className="h-3.5 w-3.5 text-[#369758]" />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

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
  const hasCustomFilterState = hasActiveFilters || filters.page > 1;
  const resetHref =
    filters.viewMode === "card"
      ? activitiesHref
      : getActivityFilterHref(activitiesHref, {
          ...filters,
          category: undefined,
          city: undefined,
          dateRange: undefined,
          keyword: undefined,
          page: 1,
          relation: "ALL",
          sort: getDefaultActivitySort({}),
          timeStates: getDefaultActivityTimeStates(),
          type: undefined,
        });

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
    ...(hasPartialActivityTimeStatesFilter(filters.timeStates)
      ? [
          {
            href: buildFilterHref({
              timeStates: getDefaultActivityTimeStates(),
            }),
            label: filters.timeStates
              .map((timeState) => t.activityLabels.timeStates[timeState])
              .join("、"),
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
        normalizeActivityFilterValues({
          ...normalizeActivityFilterFormData(formData),
          sort: filters.sort,
          timeStates: filters.timeStates,
          view: filters.viewMode,
        }),
      ),
    );
  }

  function FilterForm({
    className,
    layout = "desktop",
  }: {
    className: string;
    layout?: "desktop" | "mobile";
  }) {
    const isMobileLayout = layout === "mobile";
    const labelClassName = cn(
      fieldLabelClassName,
      isMobileLayout ? null : desktopFieldLabelClassName,
    );
    const selectControlClassName = cn(
      selectClassName,
      isMobileLayout ? null : desktopSelectClassName,
    );

    return (
      <form
        action={activitiesHref}
        className={className}
        method="get"
        onSubmit={handleSubmit}
      >
        {filters.viewMode !== "card" ? (
          <input name="view" type="hidden" value={filters.viewMode} />
        ) : null}

        <div
          className={cn(
            "grid grid-cols-2 gap-2.5",
            isMobileLayout
              ? null
              : "sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end md:gap-2",
          )}
        >
          <label
            className={cn(
              labelClassName,
              "col-span-2",
              isMobileLayout ? null : "sm:col-span-1",
            )}
          >
            {t.activityFilters.keywordLabel}
            <Input
              className={cn(
                "h-11 rounded-2xl border-[#8AB68E] bg-white/90 px-3 text-sm font-normal shadow-[0_8px_18px_rgba(116,83,45,0.05)] placeholder:font-normal placeholder:text-zinc-400 focus-visible:border-[#369758] focus-visible:bg-white focus-visible:ring-[#8AB68E]/70",
                isMobileLayout
                  ? null
                  : "sm:h-10 md:h-9 md:rounded-xl md:text-[13px] md:shadow-none",
              )}
              defaultValue={filters.keyword}
              enterKeyHint="search"
              name="q"
              placeholder={t.activityFilters.keywordPlaceholder}
              type="search"
            />
          </label>

          <div
            className={cn(
              "flex items-end",
              isMobileLayout && !hasCustomFilterState ? "col-span-2" : null,
            )}
          >
            <Button
              className={cn(
                "h-11 w-full gap-2 rounded-2xl bg-[#369758] px-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(54,151,88,0.24)] hover:bg-[#156240]",
                isMobileLayout
                  ? null
                  : "sm:h-10 sm:w-auto sm:min-w-[104px] md:h-9 md:min-w-[92px] md:rounded-xl md:px-3 md:text-[13px] md:shadow-[0_8px_18px_rgba(54,151,88,0.2)]",
              )}
              type="submit"
            >
              <Search
                className={cn(
                  "h-4 w-4 shrink-0",
                  isMobileLayout ? null : "md:h-3.5 md:w-3.5",
                )}
              />
              {t.activityFilters.apply}
            </Button>
          </div>

          {!isMobileLayout || hasCustomFilterState ? (
            <div className="flex items-end">
              <Link
                aria-disabled={!hasCustomFilterState}
                className={cn(
                  "inline-flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-4 text-sm font-medium transition",
                  isMobileLayout
                    ? "rounded-2xl px-0"
                    : "sm:h-10 sm:w-auto md:h-9 md:px-3 md:text-[13px]",
                  hasCustomFilterState
                    ? "border-[#8AB68E] bg-white/80 text-zinc-600 shadow-[0_8px_18px_rgba(116,83,45,0.05)] hover:border-[#8AB68E] hover:bg-white hover:text-ink"
                    : "border-transparent bg-transparent text-zinc-400",
                )}
                href={resetHref}
              >
                <FilterX className="h-4 w-4 shrink-0" />
                <span className={cn(isMobileLayout ? "sr-only" : null)}>
                  {t.activityFilters.reset}
                </span>
              </Link>
            </div>
          ) : null}
        </div>

        <div
          className={cn(
            "grid grid-cols-2 gap-2.5",
            isMobileLayout ? null : "sm:gap-3 md:items-end md:gap-2",
            !isMobileLayout && publicInfoOnly
              ? "md:grid-cols-3 lg:grid-cols-[minmax(8rem,1fr)_minmax(8rem,1fr)_minmax(9rem,1.05fr)_auto_auto]"
              : null,
            !isMobileLayout && !publicInfoOnly
              ? "sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[minmax(8rem,1fr)_minmax(8rem,1fr)_minmax(8.5rem,1fr)_minmax(8rem,1fr)_minmax(8rem,1fr)_auto_auto]"
              : null,
          )}
        >
          <div className={labelClassName}>
            <span>{t.activityFilters.categoryLabel}</span>
            <ActivityFilterSelect
              className={selectControlClassName}
              name="category"
              options={[
                {
                  label: t.activityFilters.allCategories,
                  value: "",
                },
                ...activityCategoryOptions.map((category) => ({
                  label: getCategoryLabel(category, locale),
                  value: category,
                })),
              ]}
              value={filters.category ?? ""}
              onValueChange={(value) =>
                applyFilterChange({
                  category: value ? (value as ActivityCategory) : undefined,
                })
              }
            />
          </div>

          <div className={labelClassName}>
            <span>{t.activityFilters.cityLabel}</span>
            <ActivityFilterSelect
              className={selectControlClassName}
              name="city"
              options={[
                {
                  label: t.activityFilters.allCities,
                  value: "",
                },
                ...cityOptions.map((city) => ({
                  label: city,
                  value: city,
                })),
              ]}
              value={selectedCity}
              onValueChange={(value) =>
                applyFilterChange({
                  city: value || undefined,
                })
              }
            />
          </div>

          <div
            className={cn(labelClassName, isMobileLayout ? "col-span-2" : null)}
          >
            <span>{t.activityFilters.dateRangeLabel}</span>
            <ActivityFilterSelect
              className={selectControlClassName}
              name="dateRange"
              options={[
                {
                  label: t.activityFilters.allDateRanges,
                  value: "",
                },
                ...activityDateRangeOptions.map((dateRange) => ({
                  label: t.activityFilters.dateRangeOptions[dateRange],
                  value: dateRange,
                })),
              ]}
              value={filters.dateRange ?? ""}
              onValueChange={(value) =>
                applyFilterChange({
                  dateRange: value ? (value as ActivityDateRange) : undefined,
                })
              }
            />
          </div>

          {!publicInfoOnly ? (
            <>
              <div className={labelClassName}>
                <span>{t.activityFilters.relationLabel}</span>
                <ActivityFilterSelect
                  className={selectControlClassName}
                  name="relation"
                  options={activityRelationFilters.map((relation) => ({
                    label:
                      relation === "ALL"
                        ? t.activityFilters.allRelations
                        : relation === "FRIEND_HOSTED"
                          ? t.activityFilters.relationFriendHosted
                          : relation === "FRIEND_JOINED"
                            ? t.activityFilters.relationFriendJoined
                            : t.activityFilters.relationMine,
                    value: relation,
                  }))}
                  value={filters.relation}
                  onValueChange={(value) =>
                    applyFilterChange({
                      relation: value as ActivityRelationFilter,
                    })
                  }
                />
              </div>

              <div className={labelClassName}>
                <span>{t.activityFilters.typeLabel}</span>
                <ActivityFilterSelect
                  className={selectControlClassName}
                  name="type"
                  options={[
                    {
                      label: t.activityFilters.allTypes,
                      value: "",
                    },
                    ...activityFilterTypes.map((type) => ({
                      label: getTypeLabel(type, locale),
                      value: type,
                    })),
                  ]}
                  value={filters.type ?? ""}
                  onValueChange={(value) =>
                    applyFilterChange({
                      type: value ? (value as ActivityFilterType) : undefined,
                    })
                  }
                />
              </div>
            </>
          ) : null}

          <ActivityTimeStateFilter
            className={cn(
              "col-span-2 w-full justify-between",
              isMobileLayout
                ? null
                : "sm:w-auto sm:justify-start md:col-span-2 lg:col-span-1",
              !isMobileLayout && !publicInfoOnly ? "xl:col-span-1" : null,
            )}
            filters={filters}
            forceMobileLayout={isMobileLayout}
            locale={locale}
            onApply={(timeStates) => {
              applyFilterChange({ timeStates });
            }}
          />
          <ActivityCardSortSelect
            className={cn(
              "col-span-2 w-full",
              isMobileLayout
                ? null
                : "sm:w-auto md:col-span-1 md:justify-self-end",
            )}
            filters={filters}
            forceMobileLayout={isMobileLayout}
            locale={locale}
          />
        </div>
      </form>
    );
  }

  return (
    <section className="space-y-2.5 sm:space-y-3">
      <div className="relative z-[35] hidden overflow-visible rounded-[1.25rem] border border-[#D6D5B2] bg-white/60 shadow-[0_14px_34px_rgba(116,83,45,0.06)] backdrop-blur md:block">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F1F2EC] text-[#156240] ring-1 ring-[#8AB68E]">
              <SlidersHorizontal className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">
                {publicInfoOnly
                  ? t.activityFilters.publicInfoTitle
                  : t.activityFilters.title}
              </p>
              <p className="text-[11px] leading-4 text-zinc-500">
                {publicInfoOnly
                  ? t.activityFilters.publicInfoDescription
                  : t.activityFilters.description}
              </p>
            </div>
          </div>
          <span className="inline-flex h-8 shrink-0 items-center rounded-full bg-[#FEFFF9] px-3 text-xs font-semibold text-[#156240] shadow-sm ring-1 ring-[#8AB68E]">
            {t.activityFilters.resultCount(resultCount)}
          </span>
        </div>
        <div className="border-t border-[#D6D5B2]/75 bg-[#FEFFF9]/60 px-4 py-3">
          <FilterForm className="grid gap-2.5" />
        </div>
      </div>

      <div className="md:hidden">
        <details className="group relative z-[35] rounded-[1.35rem] border border-[#D6D5B2] bg-white/70 shadow-[0_14px_30px_rgba(116,83,45,0.07)] backdrop-blur">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-3.5 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
            <span className="inline-flex min-w-0 items-center gap-2">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#F1F2EC] text-[#156240] ring-1 ring-[#8AB68E]">
                <SlidersHorizontal className="h-4 w-4 shrink-0" />
              </span>
              <span className="truncate">
                {t.activityFilters.mobileSummary}
              </span>
              {activeFilterChips.length > 0 ? (
                <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-coral px-1.5 text-[11px] font-bold leading-none text-white">
                  {activeFilterChips.length}
                </span>
              ) : null}
            </span>
            <span className="inline-flex shrink-0 items-center gap-2">
              <span className="rounded-full bg-[#FEFFF9] px-2.5 py-1 text-xs font-semibold text-[#156240] ring-1 ring-[#8AB68E]">
                {t.activityFilters.resultCount(resultCount)}
              </span>
              <ChevronDown className="h-4 w-4 text-zinc-500 transition group-open:rotate-180" />
            </span>
          </summary>
          <div className="border-t border-[#8AB68E] bg-[#FEFFF9]/70 p-3">
            <FilterForm className="grid gap-3" layout="mobile" />
          </div>
        </details>

        {activeFilterChips.length > 0 ? (
          <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {activeFilterChips.map((chip) => (
              <Link
                className="inline-flex h-8 max-w-[13rem] shrink-0 items-center gap-1.5 rounded-full bg-white/86 px-3 text-xs font-medium text-zinc-700 shadow-sm ring-1 ring-[#8AB68E]"
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
      </div>

      {activeFilterChips.length > 0 ? (
        <div className="hidden flex-wrap gap-2 px-1 md:flex">
          {activeFilterChips.map((chip) => (
            <Link
              className="inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-full bg-white/86 px-3 text-xs font-medium text-zinc-700 shadow-sm ring-1 ring-[#8AB68E] transition hover:bg-white hover:ring-[#8AB68E]"
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
