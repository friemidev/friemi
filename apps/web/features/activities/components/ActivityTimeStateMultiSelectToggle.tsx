"use client";

import { getCopy } from "@/lib/copy";
import { cn } from "@/lib/utils";
import { activityResultsFilterStandaloneControlClass } from "./activityResultsFilterStyles";

export function ActivityTimeStateMultiSelectToggle({
  checked,
  className,
  locale,
  onChange,
}: {
  checked: boolean;
  className?: string;
  locale: string;
  onChange: (enabled: boolean) => void;
}) {
  const t = getCopy(locale);

  return (
    <label
      className={cn(
        "shrink-0 cursor-pointer select-none",
        activityResultsFilterStandaloneControlClass,
        className,
      )}
      title={t.activityFilters.timeStateMultiSelect}
    >
      <input
        aria-label={t.activityFilters.timeStateMultiSelect}
        checked={checked}
        className="h-3 w-3 shrink-0 rounded border-[#d3ad7e] text-[#b36f48] focus:ring-[#efcfbd]"
        type="checkbox"
        onChange={(event) => {
          onChange(event.target.checked);
        }}
      />
      <span className="sr-only sm:not-sr-only">
        {t.activityFilters.timeStateMultiSelect}
      </span>
    </label>
  );
}
