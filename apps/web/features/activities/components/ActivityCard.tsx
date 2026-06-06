import { CalendarDays, MapPin, UsersRound } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@chill-club/ui";
import { AnalyticsLink } from "@/features/analytics/components/AnalyticsLink";
import type {
  AnalyticsEventName,
  AnalyticsSourceSurface,
} from "@/features/analytics/events";
import { getAnalyticsEntityForActivity } from "@/features/analytics/utils";
import { PublicEventFavoriteButton } from "@/features/favorites/components/PublicEventFavoriteButton";
import { ActivityFavoriteButton } from "@/features/favorites/components/ActivityFavoriteButton";
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

type ActivityCardProps = {
  activity: ActivityCardViewModel;
  favoriteRedirectPath?: string;
  isAuthenticated?: boolean;
  locale: string;
  showFavoriteButton?: boolean;
  showPrimaryAction?: boolean;
  sourceSurface?: AnalyticsSourceSurface;
};

const coverTones: Record<ActivityCardViewModel["coverTone"], string> = {
  moss: "bg-moss",
  clay: "bg-clay",
  sky: "bg-sky",
};

function getCardKindLabel(isActivityInfo: boolean, locale: string) {
  if (locale === "fr") {
    return isActivityInfo ? "Sortie" : "Equipe";
  }

  if (locale === "en") {
    return isActivityInfo ? "Activity info" : "Crew";
  }

  return isActivityInfo ? "活动信息" : "车队";
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

function getParticipationActionLabel(
  activityCopy: ReturnType<typeof getCopy>,
  status: ActivityCardViewModel["viewerParticipationStatus"],
) {
  if (status === "PENDING") {
    return activityCopy.join.pendingAction;
  }

  if (status === "JOINED" || status === "APPROVED") {
    return activityCopy.join.joinedAction;
  }

  return null;
}

export function ActivityCard({
  activity,
  favoriteRedirectPath = "/activities",
  isAuthenticated = false,
  locale,
  showFavoriteButton = false,
  showPrimaryAction = true,
  sourceSurface = "activity_list",
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
  const participationActionLabel = getParticipationActionLabel(
    t,
    activity.viewerParticipationStatus ?? null,
  );
  const primaryActionLabel = isActivityInfo
    ? locale === "fr"
      ? displayStatus === "ENDED" || displayStatus === "CANCELLED"
        ? "Voir l'evenement"
        : "Former une equipe"
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
  const actionLabel =
    participationActionLabel ??
    (!isActivityInfo && displayStatus === "FULL"
      ? t.join.fullAction
      : primaryActionLabel);
  const activityLabel = t.activityLabels.activityAria(
    activity.title,
    getActivityDateLabel(activity, locale),
    activity.city,
  );
  const analyticsEntity = getAnalyticsEntityForActivity(activity);
  const canCreateTeam =
    isActivityInfo &&
    displayStatus !== "ENDED" &&
    displayStatus !== "CANCELLED";
  const shouldShowParticipantCount = !isActivityInfo && activity.capacity > 0;
  const participantLabel = `${activity.participantCount}/${activity.capacity} ${t.activityDetail.participants}`;
  const actionEventName: AnalyticsEventName = canCreateTeam
    ? "team_create_started"
    : "activity_card_clicked";
  const baseAnalyticsProperties = {
    category: activity.category,
    city: activity.city,
    display_status: displayStatus,
    item_kind: analyticsEntity.itemKind,
    time_state: timeState,
  };

  return (
    <Card className="relative flex h-full flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
      {showFavoriteButton && isActivityInfo && activity.publicEventId ? (
        <div className="absolute right-3 top-3 z-20">
          <PublicEventFavoriteButton
            publicEventId={activity.publicEventId}
            className="h-9 w-9"
            isAuthenticated={isAuthenticated}
            isFavorited={Boolean(activity.isFavorited)}
            locale={locale}
            redirectPath={favoriteRedirectPath}
            labelOverrides={getCardFavoriteLabels(locale)}
          />
        </div>
      ) : null}
      {showFavoriteButton && (!isActivityInfo || !activity.publicEventId) ? (
        <div className="absolute right-3 top-3 z-20">
          <ActivityFavoriteButton
            activityId={activity.id}
            className="h-9 w-9"
            isAuthenticated={isAuthenticated}
            isFavorited={Boolean(activity.isFavorited)}
            locale={locale}
            redirectPath={favoriteRedirectPath}
            labelOverrides={getCardFavoriteLabels(locale)}
          />
        </div>
      ) : null}

      <AnalyticsLink
        className="flex flex-1 flex-col"
        href={cardHref}
        ariaLabel={activityLabel}
        event={{
          name: "activity_card_clicked",
          entityId: analyticsEntity.entityId,
          entityType: analyticsEntity.entityType,
          sourceSurface,
          properties: baseAnalyticsProperties,
        }}
      >
        <div
          className={cn(
            "relative flex h-28 items-end justify-between gap-2 overflow-hidden p-3 sm:h-36 sm:p-4",
            coverTones[activity.coverTone],
          )}
        >
          <ActivityCoverImage
            src={activity.coverImageUrl}
            overlayClassName="bg-gradient-to-t from-black/68 via-black/30 to-black/10"
          />
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent" />
          <div className="relative flex min-w-0 flex-wrap gap-2 rounded-xl bg-black/18 p-1.5 ring-1 ring-white/10 backdrop-blur-sm">
            <span className="rounded-md bg-white/95 px-2.5 py-1 text-xs font-semibold leading-none text-ink shadow-sm">
              {getCategoryLabel(activity.category, locale)}
            </span>
            <span className="rounded-md bg-white/85 px-2.5 py-1 text-xs font-medium leading-none text-zinc-700 shadow-sm">
              {getCardKindLabel(isActivityInfo, locale)}
            </span>
          </div>
          <div className="relative flex shrink-0 flex-col items-end gap-2 rounded-xl bg-black/18 p-1.5 ring-1 ring-white/10 backdrop-blur-sm">
            {!isActivityInfo ? (
              <ActivityStatusBadge status={displayStatus} locale={locale} />
            ) : null}
            <span className="rounded-md bg-white/88 px-2.5 py-1 text-xs font-medium leading-none text-zinc-700 shadow-sm">
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
            {shouldShowParticipantCount ? (
              <span className="flex items-start gap-2">
                <UsersRound className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="min-w-0">{participantLabel}</span>
              </span>
            ) : null}
          </div>
        </CardContent>
      </AnalyticsLink>

      {showPrimaryAction ? (
        <div className="px-4 pb-4 pt-0 sm:px-5 sm:pb-5">
          <AnalyticsLink
            href={actionHref}
            event={{
              name: actionEventName,
              entityId: analyticsEntity.entityId,
              entityType: analyticsEntity.entityType,
              sourceSurface,
              properties: baseAnalyticsProperties,
            }}
          >
            <Button className="h-10 w-full rounded-full border-0 bg-[#d88d72] text-white hover:bg-[#c87b61]">
              {actionLabel}
            </Button>
          </AnalyticsLink>
        </div>
      ) : null}
    </Card>
  );
}
