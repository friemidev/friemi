"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Layers3,
  MapPin,
} from "lucide-react";
import { ActivityCoverImage } from "./ActivityCoverImage";
import { AnalyticsLink } from "@/features/analytics/components/AnalyticsLink";
import { getAnalyticsEntityForActivity } from "@/features/analytics/utils";
import { getCategoryLabel, getCopy, getStatusLabel } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { ActivityCardViewModel } from "../types";
import { isPublicEventCard } from "../utils/activityCardKind";
import {
  formatActivityAgendaDateKey,
  getActivityAgendaDateRelation,
  getActivityAgendaGroupSortOptions,
  getActivityAgendaGroups,
  type ActivityAgendaDateSummary,
  type ActivityAgendaGroup,
} from "../utils/activityAgenda";
import {
  getActivityFilterHref,
  type ActivityFilters,
} from "../utils/activityFilters";
import {
  getActivityDateLabel,
  getActivityDisplayStatus,
  getActivityLocationLabel,
  getActivityTimeState,
} from "../utils/activityDisplay";

type ActivityAgendaListProps = {
  activities: ActivityCardViewModel[];
  dateSummaries?: ActivityAgendaDateSummary[];
  filters: ActivityFilters;
  locale: string;
  longRunningCount?: number;
};

type ActivityAgendaDateGroup = Extract<
  ActivityAgendaGroup<ActivityCardViewModel>,
  { kind: "date" }
>;
type ActivityAgendaLongRunningGroup = Extract<
  ActivityAgendaGroup<ActivityCardViewModel>,
  { kind: "longRunning" }
>;

function getActivityKey(activity: ActivityCardViewModel) {
  return isPublicEventCard(activity) && activity.publicEventId
    ? `event-${activity.publicEventId}`
    : activity.id;
}

const coverTones: Record<ActivityCardViewModel["coverTone"], string> = {
  clay: "bg-clay",
  moss: "bg-moss",
  sky: "bg-sky",
};

function getAgendaActivityHref(
  activity: ActivityCardViewModel,
  locale: string,
) {
  if (isPublicEventCard(activity) && activity.publicEventId) {
    return withLocale(locale, `/public-events/${activity.publicEventId}`);
  }

  return withLocale(locale, `/activities/${activity.id}`);
}

function getGroupTitle(
  group: ActivityAgendaGroup<ActivityCardViewModel>,
  locale: string,
) {
  const t = getCopy(locale);

  if (group.kind === "longRunning") {
    return t.activities.agendaLongRunningTitle;
  }

  const relativeDate = getActivityAgendaDateRelation(group.dateKey);

  if (relativeDate === "today") {
    return t.activities.agendaToday;
  }

  if (relativeDate === "tomorrow") {
    return t.activities.agendaTomorrow;
  }

  return formatActivityAgendaDateKey(group.dateKey, locale);
}

function getGroupId(group: ActivityAgendaGroup<ActivityCardViewModel>) {
  return group.kind === "date"
    ? `agenda-${group.dateKey}`
    : "agenda-long-running";
}

const agendaTimeZone = "Europe/Paris";

function getAgendaMonthKey(dateKey: string) {
  return dateKey.slice(0, 7);
}

function formatAgendaMonthKey(monthKey: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    timeZone: agendaTimeZone,
    year: "numeric",
  }).format(new Date(`${monthKey}-01T12:00:00.000Z`));
}

function getAgendaCalendarWeekdayLabels(locale: string) {
  return Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale, {
      timeZone: agendaTimeZone,
      weekday: "narrow",
    }).format(new Date(Date.UTC(2026, 0, 4 + index, 12))),
  );
}

function getAgendaCalendarCells(monthKey: string) {
  const [yearValue, monthValue] = monthKey.split("-").map(Number);
  const monthIndex = monthValue - 1;
  const firstDate = new Date(Date.UTC(yearValue, monthIndex, 1, 12));
  const firstWeekday = firstDate.getUTCDay();
  const daysInMonth = new Date(
    Date.UTC(yearValue, monthIndex + 1, 0, 12),
  ).getUTCDate();
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const cellDate = new Date(
      Date.UTC(yearValue, monthIndex, 1 - firstWeekday + index, 12),
    );
    const dateKey = cellDate.toISOString().slice(0, 10);

    return {
      dateKey,
      day: cellDate.getUTCDate(),
      isCurrentMonth: cellDate.getUTCMonth() === monthIndex,
    };
  });
}

function ActivityAgendaRow({
  activity,
  locale,
}: {
  activity: ActivityCardViewModel;
  locale: string;
}) {
  const displayStatus = getActivityDisplayStatus(activity);
  const timeState = getActivityTimeState(activity);
  const analyticsEntity = getAnalyticsEntityForActivity(activity);
  const isActivityInfo = Boolean(
    activity.type === "PUBLIC_EVENT" || activity.isActivityInfo,
  );
  const detailSourceTargetKey = `${analyticsEntity.itemKind}:${analyticsEntity.entityId}`;
  const href = getAgendaActivityHref(activity, locale);
  const dateLabel = getActivityDateLabel(activity, locale);
  const locationLabel = getActivityLocationLabel(activity);
  const statusLabel = getStatusLabel(displayStatus, locale);
  const categoryLabel = getCategoryLabel(activity.category, locale);

  return (
    <AnalyticsLink
      ariaLabel={getCopy(locale).activityLabels.activityAria(
        activity.title,
        dateLabel,
        activity.city,
      )}
      className="group grid min-h-[6.5rem] grid-cols-[5.75rem_minmax(0,1fr)_auto] gap-3 rounded-[1rem] border border-[#D6D5B2] bg-white/88 p-2.5 shadow-[0_8px_20px_rgba(29,29,27,0.05)] transition hover:-translate-y-0.5 hover:border-[#D6D5B2] hover:bg-white hover:shadow-[0_12px_26px_rgba(29,29,27,0.08)] sm:min-h-[7rem] sm:grid-cols-[7rem_minmax(0,1fr)_auto] sm:gap-4 sm:p-3"
      detailSource={{
        sourceKey: "activity_list",
        targetKey: detailSourceTargetKey,
        targetKind: isActivityInfo ? "public_event" : "activity",
      }}
      event={{
        name: "activity_card_clicked",
        properties: {
          category: activity.category,
          city: activity.city,
          display_status: displayStatus,
          item_kind: analyticsEntity.itemKind,
          time_state: timeState,
          view_mode: "date",
        },
        sourceSurface: "activity_list",
      }}
      href={href}
      prefetch={false}
    >
      <span
        className={cn(
          "relative block h-full min-h-[5.25rem] overflow-hidden rounded-[0.8rem]",
          coverTones[activity.coverTone],
        )}
      >
        <ActivityCoverImage
          alt=""
          overlayClassName="bg-gradient-to-t from-black/42 via-black/8 to-transparent"
          src={activity.coverImageUrl}
        />
        <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-[#156240] shadow-sm">
          {categoryLabel}
        </span>
      </span>

      <span className="min-w-0 self-center">
        <span className="line-clamp-2 text-base font-semibold leading-6 text-ink group-hover:text-[#156240] sm:text-lg sm:leading-7">
          {activity.title}
        </span>
        <span className="mt-2 grid gap-1.5 text-sm leading-5 text-zinc-600">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <Clock3 className="h-4 w-4 shrink-0 text-[#156240]" />
            <span className="truncate">{dateLabel}</span>
          </span>
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <MapPin className="h-4 w-4 shrink-0 text-[#156240]" />
            <span className="truncate">{locationLabel}</span>
          </span>
        </span>
      </span>

      <span className="flex h-full flex-col items-end justify-between gap-2 py-1">
        <span
          className={cn(
            "inline-flex min-h-6 max-w-[5.5rem] items-center rounded-full px-2.5 py-1 text-[11px] font-semibold leading-[1.15]",
            displayStatus === "ENDED" || displayStatus === "CANCELLED"
              ? "bg-zinc-100 text-zinc-500"
              : "bg-[#DEEBFF] text-[#156240] ring-1 ring-[#DEEBFF]",
          )}
        >
          <span className="truncate">{statusLabel}</span>
        </span>
        <ChevronRight className="h-5 w-5 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-[#156240]" />
      </span>
    </AnalyticsLink>
  );
}

export function ActivityAgendaList({
  activities,
  dateSummaries,
  filters,
  locale,
  longRunningCount,
}: ActivityAgendaListProps) {
  const router = useRouter();
  const t = getCopy(locale);
  const activitiesHref = withLocale(locale, "/activities");
  const groups = useMemo(
    () =>
      getActivityAgendaGroups(
        activities,
        getActivityAgendaGroupSortOptions(filters.sort),
      ),
    [activities, filters.sort],
  );
  const dateGroups = useMemo(
    () =>
      groups.filter(
        (group): group is ActivityAgendaDateGroup => group.kind === "date",
      ),
    [groups],
  );
  const longRunningGroup = useMemo(
    () =>
      groups.find(
        (group): group is ActivityAgendaLongRunningGroup =>
          group.kind === "longRunning",
      ) ?? null,
    [groups],
  );
  const effectiveDateSummaries = useMemo(
    () =>
      dateSummaries ??
      dateGroups.map((group) => ({
        count: group.activities.length,
        dateKey: group.dateKey,
        page: filters.page,
      })),
    [dateGroups, dateSummaries, filters.page],
  );
  const currentPageDateGroupIds = useMemo(
    () => new Set(dateGroups.map((group) => getGroupId(group))),
    [dateGroups],
  );
  const dateSummaryByDateKey = useMemo(
    () =>
      new Map(
        effectiveDateSummaries.map((summary) => [summary.dateKey, summary]),
      ),
    [effectiveDateSummaries],
  );
  const calendarMonthKeys = useMemo(
    () =>
      Array.from(
        new Set(
          effectiveDateSummaries.map((summary) =>
            getAgendaMonthKey(summary.dateKey),
          ),
        ),
      ),
    [effectiveDateSummaries],
  );
  const firstMonthKey = calendarMonthKeys[0] ?? null;
  const groupIds = useMemo(() => groups.map(getGroupId), [groups]);
  const firstGroupId = groupIds[0] ?? null;
  const [activeGroupId, setActiveGroupId] = useState<string | null>(
    firstGroupId,
  );
  const [activeMonthKey, setActiveMonthKey] = useState<string | null>(
    firstMonthKey,
  );
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isLongRunningOpen, setIsLongRunningOpen] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const displayedLongRunningCount =
    longRunningCount ?? longRunningGroup?.activities.length ?? 0;

  useEffect(() => {
    if (groupIds.length === 0) {
      setActiveGroupId(null);
      return;
    }

    setActiveGroupId((currentGroupId) =>
      currentGroupId && groupIds.includes(currentGroupId)
        ? currentGroupId
        : groupIds[0],
    );
    setIsLongRunningOpen(false);
  }, [groupIds]);

  useEffect(() => {
    if (calendarMonthKeys.length === 0) {
      setActiveMonthKey(null);
      return;
    }

    setActiveMonthKey((currentMonthKey) =>
      currentMonthKey && calendarMonthKeys.includes(currentMonthKey)
        ? currentMonthKey
        : calendarMonthKeys[0],
    );
  }, [calendarMonthKeys]);

  const activeMonthIndex = activeMonthKey
    ? calendarMonthKeys.indexOf(activeMonthKey)
    : -1;
  const calendarCells = useMemo(
    () => (activeMonthKey ? getAgendaCalendarCells(activeMonthKey) : []),
    [activeMonthKey],
  );
  const calendarWeekdayLabels = useMemo(
    () => getAgendaCalendarWeekdayLabels(locale),
    [locale],
  );

  const scrollToGroup = (groupId: string) => {
    window.requestAnimationFrame(() => {
      sectionRefs.current[groupId]?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const handleCalendarSelect = (groupId: string) => {
    setActiveGroupId(groupId);
    setIsDatePickerOpen(false);
    scrollToGroup(groupId);
  };

  const handleCalendarDateSelect = (dateKey: string) => {
    const summary = dateSummaryByDateKey.get(dateKey);

    if (!summary) {
      return;
    }

    const groupId = `agenda-${dateKey}`;

    if (currentPageDateGroupIds.has(groupId)) {
      handleCalendarSelect(groupId);
      return;
    }

    setIsDatePickerOpen(false);
    router.push(
      getActivityFilterHref(activitiesHref, {
        ...filters,
        page: summary.page,
        viewMode: "date",
      }),
    );
  };

  const toggleLongRunningGroup = () => {
    if (!longRunningGroup) {
      return;
    }

    const groupId = getGroupId(longRunningGroup);
    setActiveGroupId(groupId);
    setIsLongRunningOpen((isOpen) => {
      const nextIsOpen = !isOpen;

      if (nextIsOpen) {
        scrollToGroup(groupId);
      }

      return nextIsOpen;
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap">
        <button
          aria-controls="activity-agenda-date-picker"
          aria-expanded={isDatePickerOpen}
          className={cn(
            "inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold shadow-sm transition sm:w-auto sm:px-3.5",
            isDatePickerOpen
              ? "bg-ink text-white"
              : "bg-white text-[#156240] ring-1 ring-[#8AB68E] hover:bg-[#FEFFF9]",
          )}
          onClick={() => setIsDatePickerOpen((isOpen) => !isOpen)}
          type="button"
        >
          <CalendarDays className="h-4 w-4" />
          <span>{t.activities.agendaChooseDate}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 transition",
              isDatePickerOpen && "rotate-180",
            )}
          />
        </button>

        {longRunningGroup ? (
          <button
            aria-controls={getGroupId(longRunningGroup)}
            aria-expanded={isLongRunningOpen}
            className={cn(
              "inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold shadow-sm transition sm:w-auto sm:px-3.5",
              isLongRunningOpen
                ? "bg-[#FFF5E6] text-[#B5301F] ring-1 ring-[#8AB68E]"
                : "bg-white/78 text-[#156240] ring-1 ring-[#8AB68E] hover:bg-[#FEFFF9]",
            )}
            onClick={toggleLongRunningGroup}
            type="button"
          >
            <Layers3 className="h-4 w-4" />
            <span className="truncate">
              {t.activities.agendaLongRunningTitle}
            </span>
            <span className="rounded-full bg-white/72 px-1.5 py-0.5 text-[11px] leading-none">
              {displayedLongRunningCount}
            </span>
          </button>
        ) : null}
      </div>

      {isDatePickerOpen ? (
        <nav
          aria-label={t.activities.agendaJumpLabel}
          className="w-full max-w-[23rem] rounded-[1.05rem] border border-[#8AB68E]/72 bg-white/72 p-2.5 shadow-[0_14px_34px_rgba(29,29,27,0.08)] backdrop-blur sm:p-4"
          id="activity-agenda-date-picker"
        >
          {activeMonthKey ? (
            <>
              <div className="mb-2 flex items-center justify-between gap-3 sm:mb-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold capitalize text-ink">
                    {formatAgendaMonthKey(activeMonthKey, locale)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    aria-label={t.activities.agendaPreviousMonth}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#156240] transition hover:bg-[#FEFFF9] disabled:pointer-events-none disabled:text-zinc-300"
                    disabled={activeMonthIndex <= 0}
                    onClick={() => {
                      const previousMonthKey =
                        calendarMonthKeys[activeMonthIndex - 1];

                      if (previousMonthKey) {
                        setActiveMonthKey(previousMonthKey);
                      }
                    }}
                    type="button"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    aria-label={t.activities.agendaNextMonth}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#156240] transition hover:bg-[#FEFFF9] disabled:pointer-events-none disabled:text-zinc-300"
                    disabled={
                      activeMonthIndex < 0 ||
                      activeMonthIndex >= calendarMonthKeys.length - 1
                    }
                    onClick={() => {
                      const nextMonthKey =
                        calendarMonthKeys[activeMonthIndex + 1];

                      if (nextMonthKey) {
                        setActiveMonthKey(nextMonthKey);
                      }
                    }}
                    type="button"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-0.5 text-center sm:gap-1">
                {calendarWeekdayLabels.map((label, index) => (
                  <span
                    className="pb-0.5 text-[11px] font-semibold text-[#156240]/72 sm:pb-1"
                    key={`${label}-${index}`}
                  >
                    {label}
                  </span>
                ))}
                {calendarCells.map((cell) => {
                  const summary = dateSummaryByDateKey.get(cell.dateKey);
                  const count = summary?.count ?? 0;
                  const groupId = `agenda-${cell.dateKey}`;
                  const isActive = activeGroupId === groupId;
                  const isClickable = Boolean(summary);

                  return (
                    <button
                      aria-controls={isClickable ? groupId : undefined}
                      aria-current={isActive ? "date" : undefined}
                      className={cn(
                        "relative flex h-9 min-w-0 flex-col items-center justify-center rounded-[0.7rem] text-sm font-semibold transition sm:h-11",
                        isActive
                          ? "bg-[#156240] text-white shadow-[0_8px_16px_rgba(47,117,144,0.22)]"
                          : isClickable
                            ? "bg-white text-ink shadow-[inset_0_0_0_1px_rgba(234,215,184,0.9)] hover:bg-[#FEFFF9] hover:text-[#B5301F]"
                            : cell.isCurrentMonth
                              ? "text-zinc-400"
                              : "text-zinc-300",
                        !cell.isCurrentMonth && !isActive && "opacity-70",
                        !isClickable && "cursor-default",
                      )}
                      disabled={!isClickable}
                      key={cell.dateKey}
                      onClick={() => handleCalendarDateSelect(cell.dateKey)}
                      type="button"
                    >
                      <span className="leading-none">{cell.day}</span>
                      {isClickable ? (
                        <span
                          className={cn(
                            "mt-1 rounded-full px-1.5 py-0.5 text-[10px] leading-none",
                            isActive
                              ? "bg-white/22 text-white"
                              : "bg-[#DEEBFF] text-[#156240]",
                          )}
                        >
                          {count}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}
        </nav>
      ) : null}

      <div className="relative space-y-5 pl-8 before:absolute before:left-1.5 before:bottom-1 before:top-3 before:w-px before:bg-[#D6D5B2] sm:pl-10 sm:before:left-2">
        {dateGroups.map((group) => {
          const groupId = getGroupId(group);
          const groupTitle = getGroupTitle(group, locale);

          return (
            <section
              aria-labelledby={`${groupId}-heading`}
              className={cn(
                "relative scroll-mt-24",
                activeGroupId === groupId && "rounded-[1rem] bg-[#DEEBFF]/58",
              )}
              id={groupId}
              key={group.dateKey}
              ref={(element) => {
                sectionRefs.current[groupId] = element;
              }}
            >
              <span
                aria-hidden="true"
                className="absolute -left-[1.95rem] top-3 h-3.5 w-3.5 rounded-full border-2 border-[#8AB68E] bg-[#FFF5E6] sm:-left-[2.45rem]"
              />
              <div className="flex min-w-0 items-center gap-2 pb-2">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#DEEBFF] text-[#156240] ring-1 ring-[#8AB68E]">
                  <CalendarDays className="h-4 w-4" />
                </span>
                <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <h3
                    className="truncate text-base font-semibold text-ink sm:text-lg"
                    id={`${groupId}-heading`}
                  >
                    {groupTitle}
                  </h3>
                  <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-white/86 px-2.5 text-xs font-semibold text-[#156240] ring-1 ring-[#8AB68E]">
                    {t.activities.agendaActivityCount(group.activities.length)}
                  </span>
                </span>
              </div>

              <div className="grid gap-2.5 pb-1 xl:grid-cols-2 2xl:grid-cols-3">
                {group.activities.map((activity) => (
                  <ActivityAgendaRow
                    activity={activity}
                    key={getActivityKey(activity)}
                    locale={locale}
                  />
                ))}
              </div>
            </section>
          );
        })}

        {longRunningGroup ? (
          <section
            aria-labelledby="agenda-long-running-heading"
            className={cn(
              "relative scroll-mt-24",
              activeGroupId === getGroupId(longRunningGroup) &&
                "rounded-[1rem] bg-[#F1F2EC]/58",
            )}
            id={getGroupId(longRunningGroup)}
            ref={(element) => {
              sectionRefs.current[getGroupId(longRunningGroup)] = element;
            }}
          >
            <button
              aria-controls="agenda-long-running-events"
              aria-expanded={isLongRunningOpen}
              className="flex w-full min-w-0 items-center gap-2 pb-2 text-left transition"
              onClick={toggleLongRunningGroup}
              type="button"
            >
              <span
                aria-hidden="true"
                className="absolute -left-[1.95rem] top-3 h-3.5 w-3.5 rounded-full border-2 border-[#369758] bg-[#FFF5E6] sm:-left-[2.45rem]"
              />
              <span
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F1F2EC] text-[#B5301F] ring-1 ring-[#8AB68E]"
                aria-hidden="true"
              >
                <Layers3 className="h-4 w-4" />
              </span>
              <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                <span
                  className="block truncate text-base font-semibold text-ink sm:text-lg"
                  id="agenda-long-running-heading"
                >
                  {t.activities.agendaLongRunningTitle}
                </span>
                <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-white/86 px-2.5 text-xs font-semibold text-[#156240] ring-1 ring-[#8AB68E]">
                  {t.activities.agendaActivityCount(displayedLongRunningCount)}
                </span>
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "ml-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#156240] transition",
                  isLongRunningOpen
                    ? "rotate-180 bg-white/82"
                    : "bg-transparent",
                )}
              >
                <ChevronDown className="h-5 w-5" />
              </span>
            </button>

            {isLongRunningOpen ? (
              <div
                className="grid gap-2.5 pb-1 xl:grid-cols-2"
                id="agenda-long-running-events"
              >
                {longRunningGroup.activities.map((activity) => (
                  <ActivityAgendaRow
                    activity={activity}
                    key={getActivityKey(activity)}
                    locale={locale}
                  />
                ))}
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}
