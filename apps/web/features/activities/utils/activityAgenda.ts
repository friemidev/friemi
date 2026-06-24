export type ActivityAgendaItem = {
  endAt?: string | null;
  startAt: string;
};

export type ActivityAgendaGroup<TActivity extends ActivityAgendaItem> =
  | {
      activities: TActivity[];
      dateKey: string;
      kind: "date";
    }
  | {
      activities: TActivity[];
      kind: "longRunning";
    };

export type ActivityAgendaRelativeDate = "today" | "tomorrow";
export type ActivityAgendaSortDirection = "asc" | "desc";
export type ActivityAgendaCardSort =
  | "soonest"
  | "latest"
  | "shortDuration"
  | "longDuration";
export type ActivityAgendaWithinGroupSort = "startAt" | "duration";

export type ActivityAgendaGroupSortOptions = {
  direction: ActivityAgendaSortDirection;
  durationDirection: ActivityAgendaSortDirection;
  withinGroup: ActivityAgendaWithinGroupSort;
};

export function getActivityAgendaGroupSortOptions(
  sort: ActivityAgendaCardSort,
): ActivityAgendaGroupSortOptions {
  switch (sort) {
    case "latest":
      return {
        direction: "desc",
        durationDirection: "desc",
        withinGroup: "startAt",
      };
    case "shortDuration":
      return {
        direction: "asc",
        durationDirection: "asc",
        withinGroup: "duration",
      };
    case "longDuration":
      return {
        direction: "asc",
        durationDirection: "desc",
        withinGroup: "duration",
      };
    default:
      return {
        direction: "asc",
        durationDirection: "asc",
        withinGroup: "startAt",
      };
  }
}

function getActivityDurationMs(activity: ActivityAgendaItem) {
  const startAt = new Date(activity.startAt).getTime();
  const endAt = activity.endAt ? new Date(activity.endAt).getTime() : startAt;

  return Math.max(endAt - startAt, 0);
}

const activityTimeZone = "Europe/Paris";

function getDateKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "2-digit",
    timeZone: activityTimeZone,
    year: "numeric",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

function shiftDateKey(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

export function getActivityAgendaDateKey(value: string | Date) {
  return getDateKey(value);
}

export function getActivityAgendaDateRelation(
  dateKey: string,
  now = new Date(),
): ActivityAgendaRelativeDate | null {
  const todayKey = getDateKey(now);

  if (dateKey === todayKey) {
    return "today";
  }

  if (dateKey === shiftDateKey(todayKey, 1)) {
    return "tomorrow";
  }

  return null;
}

export function formatActivityAgendaDateKey(dateKey: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: activityTimeZone,
    weekday: "short",
  }).format(new Date(`${dateKey}T12:00:00.000Z`));
}

export function isLongRunningAgendaActivity(activity: ActivityAgendaItem) {
  if (!activity.endAt) {
    return false;
  }

  return getDateKey(activity.startAt) !== getDateKey(activity.endAt);
}

export function getActivityAgendaGroups<TActivity extends ActivityAgendaItem>(
  activities: TActivity[],
  options: ActivityAgendaGroupSortOptions = getActivityAgendaGroupSortOptions(
    "soonest",
  ),
): ActivityAgendaGroup<TActivity>[] {
  const longRunningActivities: TActivity[] = [];
  const dateGroups = new Map<string, TActivity[]>();
  const { direction, durationDirection, withinGroup } = options;

  for (const activity of activities) {
    if (isLongRunningAgendaActivity(activity)) {
      longRunningActivities.push(activity);
      continue;
    }

    const dateKey = getDateKey(activity.startAt);
    const currentGroup = dateGroups.get(dateKey) ?? [];
    currentGroup.push(activity);
    dateGroups.set(dateKey, currentGroup);
  }

  const sortWithinGroup = (left: TActivity, right: TActivity) => {
    if (withinGroup === "duration") {
      const durationDiff =
        durationDirection === "asc"
          ? getActivityDurationMs(left) - getActivityDurationMs(right)
          : getActivityDurationMs(right) - getActivityDurationMs(left);

      if (durationDiff !== 0) {
        return durationDiff;
      }
    }

    return direction === "asc"
      ? new Date(left.startAt).getTime() - new Date(right.startAt).getTime()
      : new Date(right.startAt).getTime() - new Date(left.startAt).getTime();
  };

  const groupedActivities: ActivityAgendaGroup<TActivity>[] = Array.from(
    dateGroups.entries(),
  )
    .sort(([leftDateKey], [rightDateKey]) =>
      direction === "asc"
        ? leftDateKey.localeCompare(rightDateKey)
        : rightDateKey.localeCompare(leftDateKey),
    )
    .map(([dateKey, groupActivities]) => ({
      activities: [...groupActivities].sort(sortWithinGroup),
      dateKey,
      kind: "date" as const,
    }));

  if (longRunningActivities.length > 0) {
    groupedActivities.push({
      activities: [...longRunningActivities].sort(sortWithinGroup),
      kind: "longRunning",
    });
  }

  return groupedActivities;
}
