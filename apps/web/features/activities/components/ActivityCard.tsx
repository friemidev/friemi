import Link from "next/link";
import { CalendarDays, MapPin, UsersRound } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@chill-club/ui";
import { getCategoryLabel, getCopy, getTypeLabel } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { ActivityCardViewModel } from "../types";
import {
  getActivityDateLabel,
  getActivityDisplayStatus,
  getActivityTimeState,
} from "../utils/activityDisplay";
import { ActivityCoverImage } from "./ActivityCoverImage";
import { ActivityStatusBadge } from "./ActivityStatusBadge";
import { ActivityFavoriteButton } from "@/features/favorites/components/ActivityFavoriteButton";

type ActivityCardProps = {
  activity: ActivityCardViewModel;
  isAuthenticated?: boolean;
  locale: string;
  showFavoriteButton?: boolean;
};

const coverTones: Record<ActivityCardViewModel["coverTone"], string> = {
  moss: "bg-moss",
  clay: "bg-clay",
  sky: "bg-sky",
};

export function ActivityCard({
  activity,
  isAuthenticated = false,
  locale,
  showFavoriteButton = false,
}: ActivityCardProps) {
  const t = getCopy(locale);
  const displayStatus = getActivityDisplayStatus(activity);
  const timeState = getActivityTimeState(activity);
  const shouldShowCapacity = activity.type !== "PUBLIC_EVENT";
  const primaryActionLabel =
    activity.type === "PUBLIC_EVENT"
      ? locale === "fr"
        ? "Former une équipe"
        : locale === "en"
          ? "Team up now"
          : "立刻组队"
      : locale === "fr"
        ? "Rejoindre maintenant"
        : locale === "en"
          ? "Join now"
          : "立刻报名";
  const activityLabel = t.activityLabels.activityAria(
    activity.title,
    getActivityDateLabel(activity, locale),
    activity.city,
  );

  return (
    <Card className="relative flex h-full flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
      {showFavoriteButton ? (
        <div className="absolute right-3 top-3 z-20">
          <ActivityFavoriteButton
            activityId={activity.id}
            className="h-9 w-9"
            isAuthenticated={isAuthenticated}
            isFavorited={Boolean(activity.isFavorited)}
            locale={locale}
            redirectPath="/activities"
          />
        </div>
      ) : null}
      <Link
        className="flex flex-1 flex-col"
        href={withLocale(locale, `/activities/${activity.id}`)}
        aria-label={activityLabel}
      >
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
          <div className="grid gap-2 text-sm text-zinc-600">
            <span className="flex items-start gap-2">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0">
                {getActivityDateLabel(activity, locale)}
              </span>
            </span>
            <span className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0 line-clamp-1">{activity.city}</span>
            </span>
          </div>
          <div className="mt-auto border-t border-black/5 pt-3">
            <div className="flex items-center justify-between gap-3 text-sm text-zinc-600">
              {activity.friendSignal && activity.friendSignal.count > 0 ? (
                <div className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full bg-moss/10 px-2.5 py-1 text-xs font-semibold text-moss">
                  <UsersRound className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate whitespace-nowrap">
                    {t.activityFriendSignal.cardSummary(
                      activity.friendSignal.count,
                    )}
                  </span>
                </div>
              ) : (
                <span />
              )}
              {shouldShowCapacity ? (
                <span className="flex shrink-0 items-center gap-2 font-medium text-ink">
                  <UsersRound className="h-4 w-4 shrink-0 text-zinc-500" />
                  {activity.participantCount}/{activity.capacity} {t.common.people}
                </span>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Link>
      <div className="px-4 pb-4 pt-0 sm:px-5 sm:pb-5">
        <Link href={withLocale(locale, `/activities/${activity.id}`)}>
          <Button className="h-10 w-full rounded-full border-0 bg-[#d88d72] text-white hover:bg-[#c87b61]">
            {primaryActionLabel}
          </Button>
        </Link>
      </div>
    </Card>
  );
}
