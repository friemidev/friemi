import {
  CalendarDays,
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
  type ActivityAgendaCardSort,
  type ActivityAgendaGroup,
} from "../utils/activityAgenda";
import {
  getActivityDateLabel,
  getActivityDisplayStatus,
  getActivityLocationLabel,
  getActivityTimeState,
} from "../utils/activityDisplay";

type ActivityAgendaListProps = {
  activities: ActivityCardViewModel[];
  locale: string;
  sort?: ActivityAgendaCardSort;
  totalCount: number;
};

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

function getAgendaActivityHref(activity: ActivityCardViewModel, locale: string) {
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
      className="group grid min-h-[6.5rem] grid-cols-[5.75rem_minmax(0,1fr)_auto] gap-3 rounded-[1rem] border border-[#e6d5bb] bg-white/88 p-2.5 shadow-[0_8px_20px_rgba(92,66,32,0.05)] transition hover:-translate-y-0.5 hover:border-[#d7b78e] hover:bg-white hover:shadow-[0_12px_26px_rgba(92,66,32,0.08)] sm:min-h-[7rem] sm:grid-cols-[7rem_minmax(0,1fr)_auto] sm:gap-4 sm:p-3"
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
        <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-[#3f6170] shadow-sm">
          {categoryLabel}
        </span>
      </span>

      <span className="min-w-0 self-center">
        <span className="line-clamp-2 text-base font-semibold leading-6 text-ink group-hover:text-[#a85f40] sm:text-lg sm:leading-7">
          {activity.title}
        </span>
        <span className="mt-2 grid gap-1.5 text-sm leading-5 text-zinc-600">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <Clock3 className="h-4 w-4 shrink-0 text-[#9a7448]" />
            <span className="truncate">{dateLabel}</span>
          </span>
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <MapPin className="h-4 w-4 shrink-0 text-[#9a7448]" />
            <span className="truncate">{locationLabel}</span>
          </span>
        </span>
      </span>

      <span className="flex h-full flex-col items-end justify-between gap-2 py-1">
        <span
          className={cn(
            "inline-flex max-w-[5.5rem] items-center rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none",
            displayStatus === "ENDED" || displayStatus === "CANCELLED"
              ? "bg-zinc-100 text-zinc-500"
              : "bg-[#eef8fb] text-[#326b82] ring-1 ring-[#c4ddea]",
          )}
        >
          <span className="truncate">{statusLabel}</span>
        </span>
        <ChevronRight className="h-5 w-5 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-[#a85f40]" />
      </span>
    </AnalyticsLink>
  );
}

export function ActivityAgendaList({
  activities,
  locale,
  sort = "soonest",
  totalCount,
}: ActivityAgendaListProps) {
  const t = getCopy(locale);
  const groups = getActivityAgendaGroups(
    activities,
    getActivityAgendaGroupSortOptions(sort),
  );
  const hasMoreResults = totalCount > activities.length;

  return (
    <div className="space-y-5">
      <nav
        aria-label={t.activities.agendaJumpLabel}
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {groups.map((group) => {
          const groupTitle = getGroupTitle(group, locale);
          const isLongRunningGroup = group.kind === "longRunning";

          return (
            <a
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold shadow-sm ring-1 transition",
                isLongRunningGroup
                  ? "bg-[#fff2e9] text-[#8e5639] ring-[#e7c2aa] hover:bg-[#ffe7d7]"
                  : "bg-[#eef8fb] text-[#326b82] ring-[#c4ddea] hover:bg-[#e3f3fa]",
              )}
              href={`#${getGroupId(group)}`}
              key={getGroupId(group)}
            >
              <span>{groupTitle}</span>
              <span className="rounded-full bg-white/72 px-1.5 py-0.5 text-[11px]">
                {group.activities.length}
              </span>
            </a>
          );
        })}
      </nav>

      {groups.map((group) => {
        const groupTitle = getGroupTitle(group, locale);
        const isLongRunningGroup = group.kind === "longRunning";

        return (
          <section
            className="relative scroll-mt-24 space-y-3 border-l border-[#ead7b8] pl-4 sm:pl-6"
            id={getGroupId(group)}
            key={group.kind === "date" ? group.dateKey : "long-running"}
          >
            <span
              aria-hidden
              className={cn(
                "absolute -left-[9px] top-1 inline-flex h-4 w-4 rounded-full border-2 bg-white",
                isLongRunningGroup
                  ? "border-[#d08c69]"
                  : "border-[#7da9bf]",
              )}
            />

            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      isLongRunningGroup
                        ? "bg-[#fff2e9] text-[#9b5f3f] ring-1 ring-[#e7c2aa]"
                        : "bg-[#edf8fd] text-[#326b82] ring-1 ring-[#b8d6e3]",
                    )}
                  >
                    {isLongRunningGroup ? (
                      <Layers3 className="h-4 w-4" />
                    ) : (
                      <CalendarDays className="h-4 w-4" />
                    )}
                  </span>
                  <h3 className="text-lg font-semibold text-ink">
                    {groupTitle}
                  </h3>
                  <span className="inline-flex h-6 items-center rounded-full bg-white/86 px-2.5 text-xs font-semibold text-[#9a7448] ring-1 ring-[#ead7b8]">
                    {t.activities.agendaActivityCount(group.activities.length)}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-2.5">
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

      {hasMoreResults ? (
        <p className="rounded-[1rem] border border-[#ead7b8] bg-white/72 px-4 py-3 text-sm leading-6 text-zinc-600">
          {t.activities.agendaLimitedHint(activities.length, totalCount)}
        </p>
      ) : null}
    </div>
  );
}
