"use client";

import { Clock3 } from "lucide-react";
import {
  activityTimeStateDisplayOrder,
  type ActivityFilters,
  type ActivityTimeState,
  selectSingleActivityTimeState,
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
  locale,
  multiSelect,
  multiSelectToggle,
  onApply,
}: {
  filters: ActivityFilters;
  locale: string;
  multiSelect: boolean;
  multiSelectToggle?: React.ReactNode;
  onApply: (timeStates: ActivityTimeState[]) => void;
}) {
  const t = getCopy(locale);

  function handleTimeStateChange(timeState: ActivityTimeState) {
    if (multiSelect) {
      onApply(toggleActivityTimeStateSelection(filters.timeStates, timeState));
      return;
    }

    onApply(selectSingleActivityTimeState(timeState));
  }

  return (
    <fieldset
      className={cn(
        "inline-flex min-w-0 max-w-full flex-wrap items-center justify-end gap-1.5 sm:gap-2",
        activityResultsFilterBarHeightClass,
      )}
    >
      <legend className="sr-only">{t.activityFilters.timeStateLabel}</legend>
      <Clock3
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
        {t.activityFilters.timeStateLabel}
      </span>
      {multiSelectToggle}
      <div
        className={cn(
          activityResultsFilterShellClass,
          activityResultsFilterBarHeightClass,
          "max-w-full gap-0.5",
        )}
      >
        {activityTimeStateDisplayOrder.map((timeState) => {
          const isSelected = filters.timeStates.includes(timeState);
          const isLocked =
            multiSelect && isSelected && filters.timeStates.length === 1;

          return (
            <label
              className={cn(
                "cursor-pointer select-none transition",
                activityResultsFilterInnerHeightClass,
                activityResultsFilterControlClass,
                activityResultsFilterChipClass,
                isSelected
                  ? "bg-[#fff2e9] text-[#8e5639] ring-1 ring-[#e7c2aa]"
                  : "text-[#6f4d34] hover:bg-[#fff8ec]",
                isLocked ? "cursor-not-allowed opacity-95" : null,
              )}
              key={timeState}
            >
              <input
                checked={isSelected}
                className="sr-only"
                disabled={isLocked}
                name={
                  multiSelect ? undefined : "activity-time-state-single"
                }
                type={multiSelect ? "checkbox" : "radio"}
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
