"use client";

import { Clock3 } from "lucide-react";
import {
  activityTimeStateDisplayOrder,
  type ActivityFilters,
  type ActivityTimeState,
  toggleActivityTimeStateSelection,
} from "@/features/activities/utils/activityFilters";
import { getCopy } from "@/lib/copy";
import { cn } from "@/lib/utils";
import {
  activityResultsFilterBarHeightClass,
  activityResultsFilterChipClass,
  activityResultsFilterControlClass,
  activityResultsFilterInnerHeightClass,
  activityResultsFilterLabelClass,
  activityResultsFilterShellClass,
} from "./activityResultsFilterStyles";

export function ActivityTimeStateFilter({
  filters,
  forceMobileLayout = false,
  locale,
  onApply,
  className,
}: {
  className?: string;
  filters: ActivityFilters;
  forceMobileLayout?: boolean;
  locale: string;
  onApply: (timeStates: ActivityTimeState[]) => void;
}) {
  const t = getCopy(locale);

  function handleTimeStateChange(timeState: ActivityTimeState) {
    onApply(toggleActivityTimeStateSelection(filters.timeStates, timeState));
  }

  return (
    <fieldset
      className={cn(
        "inline-flex min-w-0 max-w-full items-center gap-1.5 sm:gap-2",
        forceMobileLayout ? "min-h-9" : "min-h-9 sm:min-h-0",
        className,
      )}
    >
      <legend className="sr-only">{t.activityFilters.timeStateLabel}</legend>
      <Clock3
        aria-hidden
        className={cn(
          "h-3.5 w-3.5 shrink-0 text-[#156240]",
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
        {t.activityFilters.timeStateLabel}
      </span>
      <div
        className={cn(
          activityResultsFilterShellClass,
          activityResultsFilterBarHeightClass,
          forceMobileLayout
            ? "grid flex-1 grid-cols-3 gap-0.5"
            : "grid flex-1 grid-cols-3 gap-0.5 sm:inline-flex sm:flex-none",
        )}
      >
        {activityTimeStateDisplayOrder.map((timeState) => {
          const isSelected = filters.timeStates.includes(timeState);
          const isLocked = isSelected && filters.timeStates.length === 1;

          return (
            <label
              className={cn(
                "min-w-0 cursor-pointer select-none transition",
                activityResultsFilterInnerHeightClass,
                activityResultsFilterControlClass,
                activityResultsFilterChipClass,
                isSelected
                  ? "bg-[#F1F2E3] text-[#156240] ring-1 ring-[#8AB68E]"
                  : "text-[#156240] hover:bg-[#FEFFF9]",
                isLocked ? "cursor-not-allowed opacity-95" : null,
              )}
              key={timeState}
            >
              <input
                checked={isSelected}
                className="sr-only"
                disabled={isLocked}
                type="checkbox"
                onChange={() => {
                  handleTimeStateChange(timeState);
                }}
              />
              {t.activityLabels.timeStates[timeState]}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
