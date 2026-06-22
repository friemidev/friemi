"use client";

import { useEffect, useState } from "react";
import {
  collapseActivityTimeStatesToSingle,
  type ActivityTimeState,
} from "@/features/activities/utils/activityFilters";

export const TIME_STATE_MULTI_SELECT_STORAGE_KEY =
  "activity-time-state-multi-select";

export function readActivityTimeStateMultiSelectMode() {
  if (typeof window === "undefined") {
    return true;
  }

  return window.localStorage.getItem(TIME_STATE_MULTI_SELECT_STORAGE_KEY) !== "false";
}

export function useActivityTimeStateMultiSelectMode() {
  const [multiSelect, setMultiSelect] = useState(true);

  useEffect(() => {
    setMultiSelect(readActivityTimeStateMultiSelectMode());
  }, []);

  function setMultiSelectMode(enabled: boolean) {
    window.localStorage.setItem(
      TIME_STATE_MULTI_SELECT_STORAGE_KEY,
      String(enabled),
    );
    setMultiSelect(enabled);
  }

  function resolveTimeStatesForModeChange(
    enabled: boolean,
    currentTimeStates: ActivityTimeState[],
  ): ActivityTimeState[] | null {
    if (enabled) {
      return null;
    }

    return collapseActivityTimeStatesToSingle(currentTimeStates);
  }

  return {
    multiSelect,
    resolveTimeStatesForModeChange,
    setMultiSelectMode,
  };
}
