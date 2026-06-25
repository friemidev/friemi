"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpDown, Check, ChevronDown } from "lucide-react";
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
  activityResultsFilterControlClass,
  activityResultsFilterLabelClass,
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
  className,
  filters,
  forceMobileLayout = false,
  locale,
}: {
  className?: string;
  filters: ActivityFilters;
  forceMobileLayout?: boolean;
  locale: string;
}) {
  const router = useRouter();
  const t = getCopy(locale);
  const activitiesHref = withLocale(locale, "/activities");
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const selectedLabel = getCardSortLabel(filters.sort, locale);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
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

  function applySort(sort: ActivityCardSortOption) {
    setOpen(false);
    router.push(
      getActivityFilterHref(
        activitiesHref,
        normalizeActivityFilterValues({
          ...filters,
          page: 1,
          sort,
        }),
      ),
    );
  }

  return (
    <div
      ref={menuRef}
      className={cn(
        "relative inline-flex min-w-0 items-center",
        open ? "z-[70]" : "z-10",
        forceMobileLayout ? "gap-0" : "gap-1.5 sm:gap-2",
        className,
      )}
    >
      <ArrowUpDown
        aria-hidden
        className={cn(
          "h-3.5 w-3.5 shrink-0 text-[#9a6b3b]",
          forceMobileLayout ? "hidden" : "hidden sm:block",
        )}
      />
      <span
        className={cn(
          forceMobileLayout ? "sr-only" : "sr-only sm:inline-flex",
          activityResultsFilterLabelClass,
          activityResultsFilterBarHeightClass,
        )}
      >
        {t.activityFilters.sortLabel}
      </span>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t.activityFilters.sortLabel}
        className={cn(
          "inline-flex w-full min-w-0 items-center justify-between gap-2 rounded-full bg-[#f4efe7]/88 px-3 text-left text-[#5e4732] shadow-[inset_0_0_0_1px_rgba(221,194,158,0.78)] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#efcfbd]",
          forceMobileLayout ? null : "sm:w-auto sm:min-w-[8rem]",
          activityResultsFilterBarHeightClass,
          activityResultsFilterControlClass,
        )}
        type="button"
        onClick={() => {
          setOpen((current) => !current);
        }}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          aria-hidden
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-[#8a6644] transition",
            open ? "rotate-180" : null,
          )}
        />
      </button>
      {open ? (
        <div
          className={cn(
            "absolute left-0 top-[calc(100%+0.4rem)] z-[80] w-max min-w-full overflow-hidden rounded-[0.95rem] bg-[#fffaf2] p-1 text-xs font-semibold text-[#5f4935] shadow-[0_18px_42px_rgba(81,56,27,0.22)] ring-1 ring-[#dcbf96]",
            forceMobileLayout ? null : "sm:left-auto sm:right-0",
          )}
          role="listbox"
        >
          {activityCardSortOptions.map((sort) => {
            const isSelected = filters.sort === sort;

            return (
              <button
                aria-selected={isSelected}
                className={cn(
                  "grid w-full min-w-[8.5rem] grid-cols-[minmax(0,1fr)_1rem] items-center gap-3 rounded-[0.7rem] px-3 py-2 text-left transition",
                  isSelected
                    ? "bg-[#fff2e9] text-[#8e5639]"
                    : "hover:bg-[#fff8ef]",
                )}
                key={sort}
                role="option"
                type="button"
                onClick={() => {
                  applySort(sort);
                }}
              >
                <span className="truncate">
                  {getCardSortLabel(sort, locale)}
                </span>
                {isSelected ? (
                  <Check className="h-3.5 w-3.5 text-[#a26343]" />
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
