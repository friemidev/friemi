"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import type { ActivityCategory } from "@chill-club/shared";
import type { CSSProperties, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CircleEllipsis,
  Dice5,
  Dumbbell,
  Film,
  Footprints,
  LayoutGrid,
  Music2,
  Palette,
  Plane,
  Search,
  SlidersHorizontal,
  Sprout,
  Utensils,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  activityCategoryOptions,
  activityDateRangeOptions,
  activityTimeStateDisplayOrder,
  getActivityFilterHref,
  getDefaultActivityTimeStates,
  hasPartialActivityTimeStatesFilter,
  normalizeActivityFilterValues,
  type ActivityDateRange,
  type ActivityFilters,
  type ActivityTimeState,
} from "@/features/activities/utils/activityFilters";
import { getActivityCategoryIllustrationSrc } from "@/features/activities/utils/activityCategoryVisuals";
import {
  activityListEntryUpdatedEvent,
  getActivityListFallbackHref,
  readActivityListEntryHref,
} from "@/features/navigation/activityListEntryReturn";
import { getCategoryLabel, getCopy } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";

type MobileActivitiesToolbarProps = {
  cities: string[];
  filters: ActivityFilters;
  locale: string;
  resultCount: number;
};

type ActivityCategoryFilterId = ActivityCategory | "all";

const activityCategoryIcons = {
  FOOD: Utensils,
  WANDER: Footprints,
  AUDIO_VISUAL: Film,
  ART: Palette,
  BOARD_GAME: Dice5,
  GROWTH: Sprout,
  TRAVEL: Plane,
  MUSIC: Music2,
  SPORTS: Dumbbell,
  OTHER: CircleEllipsis,
} satisfies Record<ActivityCategory, LucideIcon>;

function getMobileActivitiesCopy(locale: string) {
  if (locale === "fr") {
    return {
      all: "Tout",
      back: "Retour",
      close: "Fermer",
      filters: "Filtres",
      reset: "Réinitialiser",
    };
  }

  if (locale === "en") {
    return {
      all: "All",
      back: "Back",
      close: "Close",
      filters: "Filters",
      reset: "Reset",
    };
  }

  return {
    all: "全部",
    back: "返回",
    close: "关闭",
    filters: "筛选",
    reset: "重置",
  };
}

export function MobileActivitiesToolbar({
  cities,
  filters,
  locale,
  resultCount,
}: MobileActivitiesToolbarProps) {
  const router = useRouter();
  const t = getCopy(locale);
  const copy = getMobileActivitiesCopy(locale);
  const activitiesHref = withLocale(locale, "/activities");
  const fallbackBackHref = getActivityListFallbackHref(locale);
  const [backHref, setBackHref] = useState(fallbackBackHref);
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState(filters.keyword ?? "");

  useEffect(() => {
    function syncBackHref() {
      setBackHref(readActivityListEntryHref(locale) ?? fallbackBackHref);
    }

    syncBackHref();
    window.addEventListener(activityListEntryUpdatedEvent, syncBackHref);

    return () => {
      window.removeEventListener(activityListEntryUpdatedEvent, syncBackHref);
    };
  }, [fallbackBackHref, locale]);

  useEffect(() => {
    setKeyword(filters.keyword ?? "");
  }, [filters.keyword]);

  useEffect(() => {
    if (!open || typeof window === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const cityOptions = useMemo(() => {
    const selectedCity = filters.city ? [filters.city] : [];

    return Array.from(new Set([...selectedCity, ...cities])).slice(0, 10);
  }, [cities, filters.city]);

  function buildFilterHref(nextFilters: Partial<ActivityFilters>) {
    return getActivityFilterHref(
      activitiesHref,
      normalizeActivityFilterValues({
        ...filters,
        ...nextFilters,
        page: 1,
        relation: "ALL",
        type: undefined,
      }),
    );
  }

  function pushFilter(nextFilters: Partial<ActivityFilters>) {
    router.push(buildFilterHref(nextFilters));
    setOpen(false);
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    pushFilter({
      keyword: keyword.trim() || undefined,
    });
  }

  const activeCategory: ActivityCategoryFilterId = filters.category ?? "all";
  const listSeparator = locale === "zh-CN" ? "、" : ", ";
  const activeFilterChips = [
    ...(filters.keyword
      ? [
          {
            label: t.activityFilters.activeKeyword(filters.keyword),
            onRemove: () => pushFilter({ keyword: undefined }),
          },
        ]
      : []),
    ...(filters.category
      ? [
          {
            label: getCategoryLabel(filters.category, locale),
            onRemove: () => pushFilter({ category: undefined }),
          },
        ]
      : []),
    ...(filters.city
      ? [
          {
            label: filters.city,
            onRemove: () => pushFilter({ city: undefined }),
          },
        ]
      : []),
    ...(filters.dateRange
      ? [
          {
            label: t.activityFilters.dateRangeOptions[filters.dateRange],
            onRemove: () => pushFilter({ dateRange: undefined }),
          },
        ]
      : []),
    ...(hasPartialActivityTimeStatesFilter(filters.timeStates)
      ? [
          {
            label: filters.timeStates
              .map((timeState) => t.activityLabels.timeStates[timeState])
              .join(listSeparator),
            onRemove: () =>
              pushFilter({ timeStates: getDefaultActivityTimeStates() }),
          },
        ]
      : []),
  ];

  const categoryOptions: {
    Icon: LucideIcon;
    id: ActivityCategoryFilterId;
    imageSrc?: string;
    label: string;
  }[] = [
    {
      Icon: LayoutGrid,
      id: "all",
      label: copy.all,
    },
    ...activityCategoryOptions.map((category) => ({
      Icon: activityCategoryIcons[category],
      id: category,
      imageSrc: getActivityCategoryIllustrationSrc(category) ?? undefined,
      label: getCategoryLabel(category, locale),
    })),
  ];

  return (
    <div className="space-y-2 md:hidden">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2.5">
        <button
          aria-label={copy.back}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#D6D5B2] bg-white text-[#111210] shadow-[0_10px_24px_rgba(17,18,16,0.06)] transition active:scale-95"
          type="button"
          onClick={() => router.push(backHref)}
        >
          <ArrowLeft className="h-[1.12rem] w-[1.12rem]" />
        </button>

        <form
          action={activitiesHref}
          className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2"
          method="get"
          onSubmit={handleSearchSubmit}
        >
          <label className="relative min-w-0">
            <span className="sr-only">{t.activityFilters.keywordLabel}</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#111210]/38" />
            <input
              className="h-10 w-full rounded-full border border-[#D6D5B2] bg-white px-9 text-[13px] font-semibold text-[#111210] shadow-[0_10px_22px_rgba(17,18,16,0.045)] outline-none placeholder:text-[#111210]/38 focus:border-[#369758] focus:ring-2 focus:ring-[#8AB68E]/45"
              enterKeyHint="search"
              name="q"
              placeholder={t.activityFilters.keywordPlaceholder}
              type="search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </label>
          <button
            aria-label={t.activityFilters.apply}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#096B45] text-white shadow-[0_14px_28px_rgba(9,107,69,0.22)] transition active:scale-95"
            type="submit"
          >
            <Search className="h-[1.125rem] w-[1.125rem]" />
          </button>
        </form>

        <button
          aria-expanded={open}
          aria-label={copy.filters}
          className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#D6D5B2] bg-white text-[#096B45] shadow-[0_10px_24px_rgba(17,18,16,0.06)] transition active:scale-95"
          type="button"
          onClick={() => setOpen(true)}
        >
          <SlidersHorizontal className="h-[1.05rem] w-[1.05rem]" />
          {activeFilterChips.length > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-black leading-none text-white">
              {activeFilterChips.length}
            </span>
          ) : null}
        </button>
      </div>

      {activeFilterChips.length > 0 ? (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="inline-flex h-8 shrink-0 items-center rounded-full bg-[#F1F2EC] px-3 text-xs font-bold text-[#096B45] ring-1 ring-[#D6D5B2]">
            {t.activityFilters.resultCount(resultCount)}
          </span>
          {activeFilterChips.map((chip) => (
            <button
              className="inline-flex h-8 max-w-[13rem] shrink-0 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-semibold text-[#111210]/72 shadow-sm ring-1 ring-[#D6D5B2] active:scale-95"
              key={chip.label}
              type="button"
              onClick={chip.onRemove}
            >
              <span className="truncate">{chip.label}</span>
              <X className="h-3.5 w-3.5 shrink-0 text-[#111210]/42" />
            </button>
          ))}
        </div>
      ) : null}

      {open ? (
        <div
          aria-modal="true"
          aria-labelledby="mobile-activities-filter-title"
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
        >
          <button
            aria-label={copy.close}
            className="absolute inset-0 bg-[#111210]/22 backdrop-blur-[2px]"
            type="button"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 right-0 flex w-[min(88vw,23rem)] flex-col overflow-hidden border-l border-[#D6D5B2] bg-[#FEFFF9] pb-[calc(1.1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] shadow-[-26px_0_48px_rgba(17,18,16,0.16)]">
            <div className="flex items-center justify-between gap-3 px-4">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#096B45]/62">
                  Friemi
                </p>
                <p
                  id="mobile-activities-filter-title"
                  className="mt-1 truncate text-[22px] font-black leading-none text-[#111210]"
                >
                  {copy.filters}
                </p>
              </div>
              <button
                aria-label={copy.close}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#D6D5B2] bg-white text-[#111210] shadow-[0_10px_24px_rgba(17,18,16,0.08)] transition active:scale-95"
                type="button"
                onClick={() => setOpen(false)}
              >
                <X className="h-[1.125rem] w-[1.125rem]" />
              </button>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="space-y-4">
                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-[15px] font-black text-[#111210]">
                      {t.activityFilters.categoryLabel}
                    </h2>
                    <button
                      className="text-xs font-bold text-[#096B45]"
                      type="button"
                      onClick={() =>
                        pushFilter({
                          category: undefined,
                          city: undefined,
                          dateRange: undefined,
                          keyword: undefined,
                          timeStates: getDefaultActivityTimeStates(),
                        })
                      }
                    >
                      {copy.reset}
                    </button>
                  </div>
                  <div className="-mx-1 flex snap-x gap-2.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {categoryOptions.map(
                      ({ Icon, id, imageSrc, label }, index) => {
                        const active = id === activeCategory;
                        const isAll = id === "all";

                        return (
                          <button
                            key={id}
                            aria-pressed={active}
                            className={cn(
                              "relative flex h-[6rem] w-[6.15rem] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-[1.1rem] border p-2 text-left transition active:scale-[0.97]",
                              active
                                ? "border-[#096B45] bg-[#096B45] text-white shadow-[0_18px_36px_rgba(9,107,69,0.22)]"
                                : "border-[#E4DFC9] bg-white text-[#111210] shadow-[0_14px_28px_rgba(17,18,16,0.055)]",
                            )}
                            style={
                              {
                                animationDelay: `${70 + index * 34}ms`,
                              } as CSSProperties
                            }
                            type="button"
                            onClick={() =>
                              pushFilter({
                                category:
                                  id === "all"
                                    ? undefined
                                    : (id as ActivityCategory),
                              })
                            }
                          >
                            <span
                              className={cn(
                                "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300",
                                active &&
                                  "bg-[radial-gradient(circle_at_86%_14%,rgba(255,255,255,0.2),transparent_38%)] opacity-100",
                              )}
                            />
                            <span
                              className={cn(
                                "relative flex h-[3.45rem] w-full shrink-0 items-center justify-center overflow-hidden rounded-[0.9rem]",
                                active ? "bg-white/16" : "bg-[#F7F4EA]",
                              )}
                            >
                              {imageSrc ? (
                                <Image
                                  alt=""
                                  className="h-full w-full object-contain p-1"
                                  height={124}
                                  src={imageSrc}
                                  width={148}
                                />
                              ) : (
                                <Icon
                                  className={cn(
                                    isAll ? "h-7 w-7" : "h-8 w-8",
                                    active ? "text-white" : "text-[#096B45]",
                                  )}
                                  strokeWidth={2.35}
                                />
                              )}
                            </span>
                            <span className="relative flex min-w-0 items-center justify-between gap-1">
                              <span className="min-w-0 truncate text-[13px] font-black leading-tight">
                                {label}
                              </span>
                              {active ? (
                                <Check className="h-3.5 w-3.5 shrink-0 text-current" />
                              ) : null}
                            </span>
                          </button>
                        );
                      },
                    )}
                  </div>
                </section>

                {cityOptions.length > 0 ? (
                  <section className="space-y-2">
                    <h2 className="text-[15px] font-black text-[#111210]">
                      {t.activityFilters.cityLabel}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      <FilterChipButton
                        active={!filters.city}
                        label={t.activityFilters.allCities}
                        onClick={() => pushFilter({ city: undefined })}
                      />
                      {cityOptions.map((city) => (
                        <FilterChipButton
                          key={city}
                          active={filters.city === city}
                          label={city}
                          onClick={() => pushFilter({ city })}
                        />
                      ))}
                    </div>
                  </section>
                ) : null}

                <section className="space-y-2">
                  <h2 className="text-[15px] font-black text-[#111210]">
                    {t.activityFilters.dateRangeLabel}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    <FilterChipButton
                      active={!filters.dateRange}
                      icon={CalendarDays}
                      label={t.activityFilters.allDateRanges}
                      onClick={() => pushFilter({ dateRange: undefined })}
                    />
                    {activityDateRangeOptions.map((dateRange) => (
                      <FilterChipButton
                        key={dateRange}
                        active={filters.dateRange === dateRange}
                        label={t.activityFilters.dateRangeOptions[dateRange]}
                        onClick={() =>
                          pushFilter({
                            dateRange: dateRange as ActivityDateRange,
                          })
                        }
                      />
                    ))}
                  </div>
                </section>

                <section className="space-y-2">
                  <h2 className="text-[15px] font-black text-[#111210]">
                    {t.activityFilters.timeStateLabel}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    <FilterChipButton
                      active={!hasPartialActivityTimeStatesFilter(
                        filters.timeStates,
                      )}
                      label={t.activityFilters.allTimeStates}
                      onClick={() =>
                        pushFilter({
                          timeStates: getDefaultActivityTimeStates(),
                        })
                      }
                    />
                    {activityTimeStateDisplayOrder.map((timeState) => (
                      <FilterChipButton
                        key={timeState}
                        active={
                          filters.timeStates.length === 1 &&
                          filters.timeStates[0] === timeState
                        }
                        label={t.activityLabels.timeStates[timeState]}
                        onClick={() =>
                          pushFilter({
                            timeStates: [timeState as ActivityTimeState],
                          })
                        }
                      />
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function FilterChipButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon?: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition active:scale-95",
        active
          ? "border-[#096B45] bg-[#096B45] text-white shadow-[0_12px_24px_rgba(9,107,69,0.18)]"
          : "border-[#D6D5B2] bg-white text-[#111210]/78",
      )}
      type="button"
      onClick={onClick}
    >
      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" /> : null}
      <span>{label}</span>
    </button>
  );
}
