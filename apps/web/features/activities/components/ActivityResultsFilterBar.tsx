"use client";

import { ActivityCardSortSelect } from "@/features/activities/components/ActivityCardSortSelect";
import { ActivityTimeStateFilter } from "@/features/activities/components/ActivityTimeStateFilter";
import { ActivityTimeStateMultiSelectToggle } from "@/features/activities/components/ActivityTimeStateMultiSelectToggle";
import { useActivityTimeStateMultiSelectMode } from "@/features/activities/components/useActivityTimeStateMultiSelectMode";
import {
  getActivityFilterHref,
  normalizeActivityFilterValues,
  type ActivityFilters,
} from "@/features/activities/utils/activityFilters";
import { withLocale } from "@/lib/routes";
import { useRouter } from "next/navigation";

export function ActivityResultsFilterBar({
  filters,
  locale,
  viewToggle,
}: {
  filters: ActivityFilters;
  locale: string;
  viewToggle: React.ReactNode;
}) {
  const router = useRouter();
  const activitiesHref = withLocale(locale, "/activities");
  const { multiSelect, resolveTimeStatesForModeChange, setMultiSelectMode } =
    useActivityTimeStateMultiSelectMode();

  function applyFilters(nextFilters: ActivityFilters) {
    router.push(
      getActivityFilterHref(
        activitiesHref,
        normalizeActivityFilterValues(nextFilters),
      ),
    );
  }

  function handleMultiSelectModeChange(enabled: boolean) {
    setMultiSelectMode(enabled);

    const nextTimeStates = resolveTimeStatesForModeChange(
      enabled,
      filters.timeStates,
    );

    if (nextTimeStates) {
      applyFilters({
        ...filters,
        page: 1,
        timeStates: nextTimeStates,
      });
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <ActivityTimeStateFilter
        filters={filters}
        locale={locale}
        multiSelect={multiSelect}
        multiSelectToggle={
          <ActivityTimeStateMultiSelectToggle
            checked={multiSelect}
            locale={locale}
            onChange={handleMultiSelectModeChange}
          />
        }
        onApply={(timeStates) => {
          applyFilters({
            ...filters,
            page: 1,
            timeStates,
          });
        }}
      />
      <ActivityCardSortSelect filters={filters} locale={locale} />
      {viewToggle}
    </div>
  );
}
