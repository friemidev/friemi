import Link from "next/link";
import { CalendarDays, MapPin, Sparkles, UsersRound } from "lucide-react";
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
} from "../utils/activityDisplay";
import { ActivityStatusBadge } from "./ActivityStatusBadge";

type ActivityCardProps = {
  activity: ActivityCardViewModel;
  locale: string;
  compact?: boolean;
};

const coverTones: Record<ActivityCardViewModel["coverTone"], string> = {
  moss: "bg-moss",
  clay: "bg-clay",
  sky: "bg-sky",
};

export function ActivityCard({
  activity,
  locale,
  compact = false,
}: ActivityCardProps) {
  const t = getCopy(locale);
  const participantPercent = getActivityParticipantPercent(activity);
  const displayStatus = getActivityDisplayStatus(activity);
  const baseActivityLabel = t.activityLabels.activityAria(
    activity.title,
    getActivityDateLabel(activity, locale),
    getActivityLocationLabel(activity),
  );
  const activityLabel = activity.isPromoted
    ? `${t.activityLabels.promoted}. ${baseActivityLabel}`
    : baseActivityLabel;

  return (
    <Link
      href={withLocale(locale, `/activities/${activity.id}`)}
      aria-label={activityLabel}
    >
      <Card className="flex h-full flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
        <div
          className={cn(
            "flex items-end justify-between gap-2",
            compact ? "h-20 p-3 sm:h-20" : "h-24 p-3 sm:h-28 sm:p-4",
            coverTones[activity.coverTone],
          )}
        >
          <div className="flex min-w-0 flex-wrap gap-2">
            {activity.isPromoted ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold leading-none text-amber-800">
                <Sparkles className="h-3 w-3" />
                {t.activityLabels.promoted}
              </span>
            ) : null}
            <span className="rounded-md bg-white/90 px-2.5 py-1 text-xs font-semibold leading-none text-ink">
              {getCategoryLabel(activity.category, locale)}
            </span>
            <span className="rounded-md bg-white/75 px-2.5 py-1 text-xs font-medium leading-none text-zinc-700">
              {getTypeLabel(activity.type, locale)}
            </span>
          </div>
          <ActivityStatusBadge status={displayStatus} locale={locale} />
        </div>
        <CardHeader
          className={cn(
            "p-4 pb-2",
            compact ? "sm:p-4 sm:pb-2" : "sm:p-5 sm:pb-2",
          )}
        >
          <CardTitle
            className={cn(
              "line-clamp-2 text-base leading-snug",
              compact ? "sm:text-base" : "sm:text-lg",
            )}
          >
            {activity.title}
          </CardTitle>
        </CardHeader>
        <CardContent
          className={cn(
            "flex flex-1 flex-col p-4 pt-0",
            compact ? "space-y-2.5 sm:p-4 sm:pt-0" : "space-y-3 sm:p-5 sm:pt-0",
          )}
        >
          <p
            className={cn(
              "text-sm leading-5 text-zinc-600",
              compact ? "line-clamp-2" : "line-clamp-2",
            )}
          >
            {activity.description}
          </p>
          <div className="grid gap-1.5 text-sm text-zinc-600">
            <span className="flex items-start gap-2">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0 line-clamp-1">
                {getActivityDateLabel(activity, locale)}
              </span>
            </span>
            <span className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0 line-clamp-1">
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
