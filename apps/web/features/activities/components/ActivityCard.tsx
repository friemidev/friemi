import Link from "next/link";
import { CalendarDays, MapPin, Store, UsersRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@chill-club/ui";
import { getCategoryLabel, getCopy, getTypeLabel } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { ActivityCardViewModel } from "../types";
import {
  getActivityDateLabel,
  getActivityDisplayStatus,
  getActivityLocationLabel,
  getActivityParticipantPercent,
  getActivitySeatLabel,
  getActivityTimeState,
} from "../utils/activityDisplay";
import { ActivityCoverImage } from "./ActivityCoverImage";
import { ActivityStatusBadge } from "./ActivityStatusBadge";

type ActivityCardProps = {
  activity: ActivityCardViewModel;
  locale: string;
};

const coverTones: Record<ActivityCardViewModel["coverTone"], string> = {
  moss: "bg-moss",
  clay: "bg-clay",
  sky: "bg-sky",
};

export function ActivityCard({ activity, locale }: ActivityCardProps) {
  const t = getCopy(locale);
  const participantPercent = getActivityParticipantPercent(activity);
  const displayStatus = getActivityDisplayStatus(activity);
  const timeState = getActivityTimeState(activity);
  const activityLabel = t.activityLabels.activityAria(
    activity.title,
    getActivityDateLabel(activity, locale),
    getActivityLocationLabel(activity),
  );

  return (
    <Link
      href={withLocale(locale, `/activities/${activity.id}`)}
      aria-label={activityLabel}
    >
      <Card className="flex h-full flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
        <div
          className={cn(
            "relative flex h-28 items-end justify-between gap-2 overflow-hidden p-3 sm:h-36 sm:p-4",
            coverTones[activity.coverTone],
          )}
        >
          <ActivityCoverImage src={activity.coverImageUrl} />
          <div className="relative flex min-w-0 flex-wrap gap-2">
            <span className="rounded-md bg-white/90 px-2.5 py-1 text-xs font-semibold leading-none text-ink">
              {getCategoryLabel(activity.category, locale)}
            </span>
            <span className="rounded-md bg-white/75 px-2.5 py-1 text-xs font-medium leading-none text-zinc-700">
              {getTypeLabel(activity.type, locale)}
            </span>
          </div>
          <div className="relative flex shrink-0 flex-col items-end gap-2">
            <ActivityStatusBadge status={displayStatus} locale={locale} />
            <span className="rounded-md bg-white/80 px-2.5 py-1 text-xs font-medium leading-none text-zinc-700">
              {t.activityLabels.timeStates[timeState]}
            </span>
          </div>
        </div>
        <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
          <CardTitle className="line-clamp-2 text-base leading-snug sm:text-lg">
            {activity.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col space-y-3 p-4 pt-0 sm:p-5 sm:pt-0">
          <p className="line-clamp-2 text-sm leading-5 text-zinc-600">
            {activity.description}
          </p>
          <div className="grid gap-1.5 text-sm text-zinc-600">
            {activity.merchant ? (
              <span className="flex items-start gap-2 text-zinc-700">
                <Store className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="min-w-0 line-clamp-1">
                  {t.merchant.cardLabel(activity.merchant.name)}
                </span>
              </span>
            ) : null}
            <span className="flex items-start gap-2">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0">
                {getActivityDateLabel(activity, locale)}
              </span>
            </span>
            <span className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0">
                {getActivityLocationLabel(activity)}
              </span>
            </span>
          </div>
          <div className="mt-auto space-y-2 pt-1">
            <div className="flex items-center justify-between gap-3 text-sm text-zinc-600">
              <span className="flex items-center gap-2">
                <UsersRound className="h-4 w-4 shrink-0" />
                {activity.participantCount}/{activity.capacity}{" "}
                {t.common.people}
              </span>
              <span className="shrink-0 font-medium text-ink">
                {getActivitySeatLabel(activity, locale)}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-moss"
                style={{ width: `${participantPercent}%` }}
              />
            </div>
            <p className="text-sm font-medium text-ink">{activity.priceText}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
