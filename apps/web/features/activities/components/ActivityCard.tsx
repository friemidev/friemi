import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@chill-club/ui";
import { getCategoryLabel, getCopy } from "@/lib/copy";
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

function getCardKindLabel(isActivityInfo: boolean, locale: string) {
  if (locale === "fr") {
    return isActivityInfo ? "Événement" : "Équipe";
  }

  if (locale === "en") {
    return isActivityInfo ? "Event" : "Team";
  }

  return isActivityInfo ? "活动" : "车队";
}

function getCardFavoriteLabels(locale: string) {
  if (locale === "fr") {
    return {
      favorite: "Ajouter aux favoris",
      unfavorite: "Favori",
      favoriting: "Ajout...",
      unfavoriting: "Retrait...",
      signInToFavorite: "Se connecter pour ajouter aux favoris",
    };
  }

  if (locale === "en") {
    return {
      favorite: "Save",
      unfavorite: "Saved",
      favoriting: "Saving...",
      unfavoriting: "Removing...",
      signInToFavorite: "Sign in to save",
    };
  }

  return {
    favorite: "收藏",
    unfavorite: "已收藏",
    favoriting: "收藏中...",
    unfavoriting: "取消中...",
    signInToFavorite: "登录后收藏",
  };
}

export function ActivityCard({
  activity,
  isAuthenticated = false,
  locale,
  showFavoriteButton = false,
}: ActivityCardProps) {
  const t = getCopy(locale);
  const isActivityInfo = Boolean(
    activity.type === "PUBLIC_EVENT" || activity.isActivityInfo,
  );
  const displayStatus = getActivityDisplayStatus(activity);
  const timeState = getActivityTimeState(activity);
  const activityInfoHref = activity.publicEventId
    ? `/public-events/${activity.publicEventId}`
    : `/activities/${activity.id}`;
  const activityInfoTeamHref = activity.publicEventId
    ? `/public-events/${activity.publicEventId}/teams/new`
    : `/activities/${activity.id}/teams/new`;
  const cardHref = isActivityInfo
    ? withLocale(locale, activityInfoHref)
    : withLocale(locale, `/activities/${activity.id}`);
  const actionHref =
    isActivityInfo && displayStatus !== "ENDED" && displayStatus !== "CANCELLED"
      ? withLocale(locale, activityInfoTeamHref)
      : cardHref;
  const primaryActionLabel = isActivityInfo
    ? locale === "fr"
      ? displayStatus === "ENDED" || displayStatus === "CANCELLED"
        ? "Voir l'événement"
        : "Former une équipe"
      : locale === "en"
        ? displayStatus === "ENDED" || displayStatus === "CANCELLED"
          ? "View event"
          : "Team up now"
        : displayStatus === "ENDED" || displayStatus === "CANCELLED"
          ? "查看活动"
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
      {showFavoriteButton && !isActivityInfo ? (
        <div className="absolute right-3 top-3 z-20">
          <ActivityFavoriteButton
            activityId={activity.id}
            className="h-9 w-9"
            isAuthenticated={isAuthenticated}
            isFavorited={Boolean(activity.isFavorited)}
            locale={locale}
            redirectPath="/activities"
            labelOverrides={getCardFavoriteLabels(locale)}
          />
        </div>
      ) : null}
      <Link
        className="flex flex-1 flex-col"
        href={cardHref}
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
              {getCardKindLabel(isActivityInfo, locale)}
            </span>
          </div>
          <div className="relative flex shrink-0 flex-col items-end gap-2">
            {!isActivityInfo ? (
              <ActivityStatusBadge status={displayStatus} locale={locale} />
            ) : null}
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
        </CardContent>
      </Link>
      <div className="px-4 pb-4 pt-0 sm:px-5 sm:pb-5">
        <Link href={actionHref}>
          <Button className="h-10 w-full rounded-full border-0 bg-[#d88d72] text-white hover:bg-[#c87b61]">
            {primaryActionLabel}
          </Button>
        </Link>
      </div>
    </Card>
  );
}
