import { CalendarDays, Clock3, Crown, MapPin, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
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
import type {
  DetailSourceInput,
  DetailSourceKind,
} from "@/features/navigation/contextualDetailReturn";
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

type ActivityCardProps = {
  activity: ActivityCardViewModel;
  actionContext?: "default" | "lobby" | "profile";
  favoriteRedirectPath?: string;
  isAuthenticated?: boolean;
  isOwnActivity?: boolean;
  locale: string;
  mobileDense?: boolean;
  showFavoriteButton?: boolean;
  showPrimaryAction?: boolean;
  sourceSurface?: AnalyticsSourceSurface;
  detailSourceKey?: DetailSourceKind;
  detailSourceLabel?: string;
  detailSourceHref?: string;
  detailSourceState?: DetailSourceInput["sourceState"];
  titleContent?: ReactNode;
};

type ActivityCardActionTone =
  | "activity"
  | "joined"
  | "muted"
  | "neutral"
  | "pending"
  | "team";

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

  return isActivityInfo ? "活动" : "组局";
}

function getCardVisibilityLabel(
  visibility: ActivityCardViewModel["visibility"],
  locale: string,
) {
  if (visibility === "PRIVATE") {
    if (locale === "fr") {
      return "Prive";
    }

    if (locale === "en") {
      return "Private";
    }

    return "私人局";
  }

  if (locale === "fr") {
    return "Public";
  }

  if (locale === "en") {
    return "Open";
  }

  return "开放局";
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

function getCountdownLabel(activity: ActivityCardViewModel, locale: string) {
  const startAt = new Date(activity.startAt);
  const now = new Date();
  const hourMs = 60 * 60 * 1000;
  const dayMs = 24 * 60 * 60 * 1000;
  const diffMs = startAt.getTime() - now.getTime();

  if (diffMs <= 0) {
    return null;
  }

  const hoursUntilStart = Math.ceil(diffMs / hourMs);
  const daysUntilStart = Math.ceil(diffMs / dayMs);

  if (locale === "fr") {
    if (diffMs < hourMs) return "Dans moins d'1 h";
    if (hoursUntilStart < 24) return `Dans ${hoursUntilStart} h`;
    if (daysUntilStart === 1) return "Demain";

    return `Dans ${daysUntilStart} j`;
  }

  if (locale === "en") {
    if (diffMs < hourMs) return "Starts in <1h";
    if (hoursUntilStart < 24) return `Starts in ${hoursUntilStart}h`;
    if (daysUntilStart === 1) return "Starts tomorrow";

    return `${daysUntilStart}d to start`;
  }

  if (diffMs < hourMs) return "不到 1 小时开始";
  if (hoursUntilStart < 24) return `还有 ${hoursUntilStart} 小时开始`;
  if (daysUntilStart === 1) return "明天开始";

  return `还有 ${daysUntilStart} 天开始`;
}

const avatarTones = [
  "bg-[#e98472] text-white",
  "bg-[#72a7cf] text-white",
  "bg-[#72b68a] text-white",
  "bg-[#c795d8] text-white",
  "bg-[#d8aa64] text-white",
  "bg-[#7f88d8] text-white",
];

function getStableAvatarTone(value: string) {
  const total = [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return avatarTones[total % avatarTones.length];
}

function getAvatarInitial(nickname: string) {
  return nickname.trim().charAt(0).toUpperCase() || "N";
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

function getOwnActivityLabels(locale: string) {
  if (locale === "fr") {
    return {
      action: "Voir le detail",
      badge: "Ma sortie",
    };
  }

  if (locale === "en") {
    return {
      action: "View details",
      badge: "Mine",
    };
  }

  return {
    action: "查看活动",
    badge: "我发起",
  };
}

function getCardActionCopy(locale: string) {
  if (locale === "fr") {
    return {
      createTeam: "Organiser un plan",
      joinTeam: "Rejoindre le plan",
      manageTeam: "Gerer le plan",
      viewActivity: "Voir l'activite",
      viewDetails: "Voir les details",
    };
  }

  if (locale === "en") {
    return {
      createTeam: "Start a plan",
      joinTeam: "Join the plan",
      manageTeam: "Manage plan",
      viewActivity: "View activity",
      viewDetails: "View details",
    };
  }

  return {
    createTeam: "去组局",
    joinTeam: "报名加入",
    manageTeam: "管理组局",
    viewActivity: "查看活动",
    viewDetails: "查看详情",
  };
}

function getCardActionConfig({
  actionContext,
  activityCopy,
  cardCopy,
  displayStatus,
  isActivityInfo,
  isOwnActivity,
  viewerParticipationStatus,
}: {
  actionContext: "default" | "lobby" | "profile";
  activityCopy: ReturnType<typeof getCopy>;
  cardCopy: ReturnType<typeof getCardActionCopy>;
  displayStatus: ReturnType<typeof getActivityDisplayStatus>;
  isActivityInfo: boolean;
  isOwnActivity: boolean;
  viewerParticipationStatus: ActivityCardViewModel["viewerParticipationStatus"];
}): { label: string; tone: ActivityCardActionTone } {
  const isInactive =
    displayStatus === "ENDED" || displayStatus === "CANCELLED";
  const participationActionLabel = getParticipationActionLabel(
    activityCopy,
    viewerParticipationStatus ?? null,
  );

  if (isOwnActivity) {
    return {
      label:
        isActivityInfo
          ? cardCopy.viewActivity
          : cardCopy.manageTeam,
      tone: "neutral",
    };
  }

  if (participationActionLabel) {
    return {
      label: participationActionLabel,
      tone:
        viewerParticipationStatus === "PENDING" ? "pending" : "joined",
    };
  }

  if (!isActivityInfo && displayStatus === "FULL") {
    return {
      label: activityCopy.join.fullAction,
      tone: "muted",
    };
  }

  if (isActivityInfo) {
    return {
      label: isInactive ? cardCopy.viewActivity : cardCopy.createTeam,
      tone: isInactive ? "muted" : "activity",
    };
  }

  return {
    label: isInactive ? cardCopy.viewDetails : cardCopy.joinTeam,
    tone: isInactive ? "muted" : "team",
  };
}

export function ActivityCard({
  activity,
  actionContext = "default",
  favoriteRedirectPath = "/activities",
  isAuthenticated = false,
  isOwnActivity = false,
  locale,
  mobileDense = false,
  showFavoriteButton = false,
  showPrimaryAction = true,
  sourceSurface = "activity_list",
  detailSourceKey,
  detailSourceLabel,
  detailSourceHref,
  detailSourceState,
  titleContent,
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
  const actionHref = isOwnActivity
    ? cardHref
    : isActivityInfo &&
        displayStatus !== "ENDED" &&
        displayStatus !== "CANCELLED"
      ? withLocale(locale, activityInfoTeamHref)
      : cardHref;
  const cardActionCopy = getCardActionCopy(locale);
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
  const ownActivityLabels = getOwnActivityLabels(locale);
  const actionLabel = isOwnActivity
    ? ownActivityLabels.action
    : (participationActionLabel ??
      (!isActivityInfo && displayStatus === "FULL"
        ? t.join.fullAction
        : primaryActionLabel));
  const resolvedActionConfig = getCardActionConfig({
    actionContext,
    activityCopy: t,
    cardCopy: cardActionCopy,
    displayStatus,
    isActivityInfo,
    isOwnActivity,
    viewerParticipationStatus: activity.viewerParticipationStatus ?? null,
  });
  const buttonLabel = resolvedActionConfig.label;
  const activityLabel = t.activityLabels.activityAria(
    activity.title,
    getActivityDateLabel(activity, locale),
    activity.city,
  );
  const analyticsEntity = getAnalyticsEntityForActivity(activity);
  const detailSourceTargetKey = `${analyticsEntity.itemKind}:${analyticsEntity.entityId}`;
  const detailSource: DetailSourceInput | undefined = detailSourceKey
    ? {
        sourceHref: detailSourceHref,
        sourceKey: detailSourceKey,
        sourceLabel: detailSourceLabel,
        sourceState: detailSourceState,
        targetKey: detailSourceTargetKey,
        targetKind: isActivityInfo ? "public_event" : "activity",
      }
    : undefined;
  const canCreateTeam =
    isActivityInfo &&
    displayStatus !== "ENDED" &&
    displayStatus !== "CANCELLED";
  const isTeamCard = !isActivityInfo;
  const shouldShowParticipantCount = !isActivityInfo && activity.capacity > 0;
  const participantLabel = `${activity.participantCount}/${activity.capacity} ${t.activityDetail.participants}`;
  const participantPreview = isTeamCard
    ? (activity.participantPreview ?? [])
    : [];
  const participantExtraCount = Math.max(
    activity.participantCount - participantPreview.length,
    0,
  );
  const isInactiveCard =
    displayStatus === "ENDED" || displayStatus === "CANCELLED";
  const countdownLabel =
    isActivityInfo && timeState === "UPCOMING" && !isInactiveCard
      ? getCountdownLabel(activity, locale)
      : null;
  const friendSignal = !isActivityInfo ? activity.friendSignal : null;
  const actionEventName: AnalyticsEventName =
    canCreateTeam && !isOwnActivity
      ? "team_create_started"
      : "activity_card_clicked";
  const baseAnalyticsProperties = {
    category: activity.category,
    city: activity.city,
    display_status: displayStatus,
    item_kind: analyticsEntity.itemKind,
    time_state: timeState,
  };
  const participantAvatarStack =
    participantPreview.length > 0 ? (
      <span className="flex shrink-0 -space-x-2">
        {participantPreview.slice(0, 4).map((participant) => (
          <span
            key={participant.id}
            className={cn(
              "flex h-6 w-6 items-center justify-center overflow-hidden rounded-full text-[10px] font-semibold ring-2",
              participant.avatarUrl
                ? "bg-white"
                : getStableAvatarTone(participant.id),
              isTeamCard ? "ring-[#fffaf4]" : "ring-[#f8fdff]",
              isInactiveCard ? "ring-zinc-50 grayscale" : null,
            )}
            title={participant.nickname}
          >
            {participant.avatarUrl ? (
              // User avatars are stored as remote profile URLs.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={participant.avatarUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              getAvatarInitial(participant.nickname)
            )}
          </span>
        ))}
        {participantExtraCount > 0 ? (
          <span
            className={cn(
              "flex h-6 min-w-6 items-center justify-center rounded-full bg-[#f0ddcf] px-1.5 text-[10px] font-semibold text-[#6f4d34] ring-2 ring-[#fffaf4]",
              isInactiveCard ? "bg-zinc-200 text-zinc-500 ring-zinc-50" : null,
            )}
          >
            +{participantExtraCount}
          </span>
        ) : null}
      </span>
    ) : null;
  const mobileDenseClass = (className: string) =>
    mobileDense ? className : null;
  const actionToneClassName =
    resolvedActionConfig.tone === "muted"
      ? "bg-zinc-300 text-zinc-700 hover:bg-zinc-300"
      : resolvedActionConfig.tone === "neutral"
        ? "bg-team-bg text-[#6f4d34] ring-1 ring-[#dcc7b4] hover:bg-[#fff1e4]"
        : resolvedActionConfig.tone === "joined"
          ? "bg-coral-soft text-[#8f553b] ring-1 ring-[#e2b79d] shadow-[0_8px_18px_rgba(184,112,78,0.12)] hover:bg-[#ffe8d9]"
          : resolvedActionConfig.tone === "pending"
            ? "bg-[#f8e6b8] text-[#7b5622] ring-1 ring-[#e2c27c] shadow-[0_8px_18px_rgba(198,156,73,0.15)] hover:bg-[#f4dda1]"
            : resolvedActionConfig.tone === "activity"
              ? "bg-[#dceef7] text-[#245e76] ring-1 ring-[#9fc6d8] shadow-[0_8px_18px_rgba(84,139,167,0.14)] hover:bg-[#cde6f2]"
              : "bg-coral text-white shadow-[0_10px_22px_rgba(216,141,114,0.24)] hover:bg-coral-dark";

  return (
    <Card
      data-detail-source-target={detailSourceTargetKey}
      className={cn(
        "relative flex h-full flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg",
        isInactiveCard
          ? "border-zinc-200 bg-zinc-50/90 text-zinc-500 saturate-0"
          : isTeamCard
            ? "border-team-border bg-team-bg shadow-[0_8px_24px_rgba(142,94,61,0.08)] ring-1 ring-[#efd8c7]"
            : "border-event-border bg-event-bg shadow-[0_6px_18px_rgba(54,107,130,0.06)]",
        isTeamCard
          ? "before:absolute before:inset-x-0 before:top-0 before:z-10 before:h-1 before:bg-coral"
          : "before:absolute before:inset-x-0 before:top-0 before:z-10 before:h-1 before:bg-event-accent",
        !isInactiveCard && isTeamCard
          ? "hover:border-[#d79c78] hover:ring-[#e8c2aa]"
          : null,
      )}
    >
      {showFavoriteButton && !isOwnActivity && isActivityInfo && activity.publicEventId ? (
        <div
          className={cn(
            "absolute right-3 top-4 z-20 sm:top-5",
            mobileDenseClass("max-[639px]:right-2.5 max-[639px]:top-3"),
          )}
        >
          <PublicEventFavoriteButton
            favoriteCount={activity.favoriteCount}
            publicEventId={activity.publicEventId}
            className={cn(
              "size-9 min-h-9 min-w-9",
              mobileDenseClass("max-[639px]:size-8 max-[639px]:min-h-8 max-[639px]:min-w-8"),
            )}
            isAuthenticated={isAuthenticated}
            isFavorited={Boolean(activity.isFavorited)}
            locale={locale}
            redirectPath={favoriteRedirectPath}
            sourceSurface={sourceSurface}
            labelOverrides={getCardFavoriteLabels(locale)}
          />
        </div>
      ) : null}
      {showFavoriteButton && !isOwnActivity && (!isActivityInfo || !activity.publicEventId) ? (
        <div
          className={cn(
            "absolute right-3 top-4 z-20 sm:top-5",
            mobileDenseClass("max-[639px]:right-2.5 max-[639px]:top-3"),
          )}
        >
          <ActivityFavoriteButton
            activityId={activity.id}
            className={cn(
              "size-9 min-h-9 min-w-9",
              mobileDenseClass("max-[639px]:size-8 max-[639px]:min-h-8 max-[639px]:min-w-8"),
            )}
            favoriteCount={activity.favoriteCount}
            isAuthenticated={isAuthenticated}
            isFavorited={Boolean(activity.isFavorited)}
            locale={locale}
            redirectPath={favoriteRedirectPath}
            sourceSurface={sourceSurface}
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
        detailSource={detailSource}
      >
        <div
          className={cn(
            "relative flex h-28 items-end justify-between gap-2 overflow-hidden p-3 sm:h-36 sm:p-4",
            mobileDenseClass("max-[639px]:h-24 max-[639px]:p-2.5"),
            coverTones[activity.coverTone],
            isInactiveCard ? "grayscale" : null,
          )}
        >
          <ActivityCoverImage
            src={activity.coverImageUrl}
            overlayClassName={cn(
              isTeamCard
                ? "bg-gradient-to-t from-black/62 via-black/20 to-[#2b1d12]/12"
                : "bg-gradient-to-t from-black/46 via-black/10 to-transparent",
            )}
          />
          <div
            className={cn(
              "absolute inset-x-0 top-0 h-8 bg-gradient-to-b to-transparent",
              isTeamCard ? "from-[#4a2e1c]/24" : "from-black/10",
            )}
          />
          <span
            className={cn(
              "absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold leading-none shadow-[0_10px_24px_rgba(0,0,0,0.24)] backdrop-blur sm:left-4 sm:top-4",
              mobileDenseClass(
                "max-[639px]:left-2 max-[639px]:top-2 max-[639px]:gap-1 max-[639px]:px-2 max-[639px]:py-1 max-[639px]:text-[10px]",
              ),
              isTeamCard
                ? "border-[#f0b79f] bg-[#d88d72]/95 text-white"
                : "border-event-border bg-[#eefaff]/95 text-[#245e76]",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                isTeamCard ? "bg-white/85" : "bg-[#4e9ab8]",
              )}
              aria-hidden="true"
            />
            {getCardKindLabel(isActivityInfo, locale)}
          </span>
          {isOwnActivity ? (
            <span
              className={cn(
                "absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-[#f5c8b7] bg-[#fff7ed]/95 px-3 py-1.5 text-xs font-bold leading-none text-[#9a5139] shadow-[0_10px_24px_rgba(0,0,0,0.18)] backdrop-blur sm:right-4 sm:top-4",
                mobileDenseClass(
                  "max-[639px]:right-2 max-[639px]:top-2 max-[639px]:gap-1 max-[639px]:px-2 max-[639px]:py-1 max-[639px]:text-[10px]",
                ),
              )}
            >
              <Crown className="h-3.5 w-3.5 shrink-0" />
              {ownActivityLabels.badge}
            </span>
          ) : null}
          <div className="relative mt-auto flex w-full items-end justify-between gap-2">
            <div className="flex min-w-0 flex-wrap gap-1.5">
              <span
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-semibold leading-none shadow-[0_8px_18px_rgba(0,0,0,0.24)] ring-1 ring-white/10",
                  mobileDenseClass(
                    "max-[639px]:px-2 max-[639px]:py-0.5 max-[639px]:text-[10px]",
                  ),
                  isTeamCard
                    ? "bg-[rgba(103,59,34,0.84)] text-[#fff7ed]"
                    : "bg-[rgba(22,18,14,0.72)] text-[#fffaf2]",
                )}
              >
                {getCategoryLabel(activity.category, locale)}
              </span>
              {!isActivityInfo ? (
                <span
                  className={cn(
                    "rounded-md bg-[rgba(255,250,242,0.94)] px-2.5 py-1 text-[11px] font-medium leading-none text-[#6f4d34] shadow-[0_8px_18px_rgba(0,0,0,0.18)]",
                    mobileDenseClass(
                      "max-[639px]:hidden max-[639px]:px-2 max-[639px]:py-0.5 max-[639px]:text-[10px]",
                    ),
                  )}
                >
                  {getCardVisibilityLabel(activity.visibility, locale)}
                </span>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span
                className={cn(
                  "rounded-md bg-[rgba(255,250,242,0.96)] px-2.5 py-1 text-[11px] font-medium leading-none text-zinc-900 shadow-[0_8px_18px_rgba(0,0,0,0.18)]",
                  mobileDenseClass(
                    "max-[639px]:px-2 max-[639px]:py-0.5 max-[639px]:text-[10px]",
                  ),
                )}
              >
                {t.activityLabels.timeStates[timeState]}
              </span>
            </div>
          </div>
        </div>

        <CardHeader
          className={cn(
            "p-4 pb-2 sm:p-5 sm:pb-2",
            mobileDenseClass("max-[639px]:p-3 max-[639px]:pb-1.5"),
          )}
        >
          <CardTitle
            className={cn(
              "line-clamp-2 text-base leading-snug sm:text-lg",
              mobileDenseClass("max-[639px]:text-sm"),
              isInactiveCard ? "text-zinc-600" : null,
              !isInactiveCard && isTeamCard ? "text-[#24160f]" : null,
            )}
          >
            {titleContent ?? activity.title}
          </CardTitle>
        </CardHeader>

        <CardContent
          className={cn(
            "flex flex-1 flex-col space-y-3 p-4 pt-0 sm:p-5 sm:pt-0",
            mobileDenseClass(
              "max-[639px]:space-y-2 max-[639px]:p-3 max-[639px]:pt-0",
            ),
          )}
        >
          <div
            className={cn(
              "grid gap-2 text-sm text-zinc-600",
              mobileDenseClass("max-[639px]:gap-1.5 max-[639px]:text-xs"),
              isInactiveCard ? "text-zinc-500" : null,
            )}
          >
            {countdownLabel ? (
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#e8f6fb] px-2.5 py-1 text-xs font-semibold text-[#346b82] ring-1 ring-[#b9d7e5]">
                <Clock3 className="h-3.5 w-3.5 shrink-0" />
                {countdownLabel}
              </span>
            ) : null}
            <span className="flex items-start gap-2">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />
              <span
                className={cn(
                  "min-w-0",
                  mobileDenseClass("max-[639px]:line-clamp-2"),
                )}
              >
                {getActivityDateLabel(activity, locale)}
              </span>
            </span>
            <span className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0 line-clamp-1">{activity.city}</span>
            </span>
            {shouldShowParticipantCount ? (
              <span className="flex min-w-0 items-center gap-2">
                <UsersRound className="mt-0.5 h-4 w-4 shrink-0" />
                <span
                  className={cn(
                    "min-w-0",
                    mobileDenseClass("max-[639px]:truncate"),
                  )}
                >
                  {participantLabel}
                </span>
                {participantAvatarStack ? (
                  <span
                    className={cn(
                      "ml-auto",
                      mobileDenseClass("max-[639px]:hidden"),
                    )}
                  >
                    {participantAvatarStack}
                  </span>
                ) : null}
              </span>
            ) : null}
            {!mobileDense &&
            !shouldShowParticipantCount &&
            participantAvatarStack ? (
              <span className="flex min-w-0 items-center pl-6">
                {participantAvatarStack}
              </span>
            ) : null}
          </div>
          {friendSignal && friendSignal.count > 0 ? (
            <span
              className={cn(
                "inline-flex min-w-0 items-center gap-1.5 rounded-md bg-moss/10 px-2.5 py-1.5 text-xs font-semibold text-moss ring-1 ring-moss/15",
                isInactiveCard
                  ? "bg-zinc-100 text-zinc-500 ring-zinc-200"
                  : null,
              )}
            >
              <UsersRound className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {t.activityFriendSignal.cardSummary(friendSignal.count)}
              </span>
            </span>
          ) : null}
        </CardContent>
      </AnalyticsLink>

      {showPrimaryAction ? (
        <div
          className={cn(
            "px-4 pb-4 pt-0 sm:px-5 sm:pb-5",
            mobileDenseClass("max-[639px]:px-3 max-[639px]:pb-3"),
          )}
        >
          <AnalyticsLink
            href={actionHref}
            detailSource={actionHref === cardHref ? detailSource : undefined}
            event={{
              name: actionEventName,
              entityId: analyticsEntity.entityId,
              entityType: analyticsEntity.entityType,
              sourceSurface,
              properties: baseAnalyticsProperties,
            }}
          >
            <Button
              className={cn(
                "h-10 w-full rounded-full border-0",
                actionToneClassName,
              )}
            >
              {buttonLabel}
            </Button>
          </AnalyticsLink>
        </div>
      ) : null}
    </Card>
  );
}
