import {
  CalendarDays,
  CirclePlus,
  Clock3,
  Copy,
  CopyPlus,
  Crown,
  MapPin,
  Settings2,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@chill-club/ui";
import Link from "next/link";
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
import { getAvatarInitial, sanitizeDisplayText } from "@/lib/display-text";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { getActivityDetailPath } from "../utils/activityRoutes";
import type { ActivityCardViewModel } from "../types";
import {
  getActivityDateLabel,
  getActivityDisplayStatus,
  getActivityFloatingNow,
  getActivityTimeState,
} from "../utils/activityDisplay";
import { ActivityCoverImage } from "./ActivityCoverImage";
import { ClaimAutoCreatedActivityCardAction } from "./ClaimAutoCreatedActivityCardAction";
import { MobileLobbyActionSheet } from "./MobileLobbyActionSheet";

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

type AnalyticsLinkEvent = ComponentProps<typeof AnalyticsLink>["event"];

const coverTones: Record<ActivityCardViewModel["coverTone"], string> = {
  moss: "bg-moss",
  clay: "bg-clay",
  sky: "bg-sky",
};

function getCardKindLabel(isActivityInfo: boolean, locale: string) {
  if (locale === "fr") {
    return isActivityInfo ? "Sortie" : "Équipe";
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
      return "Privé";
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

function getTeamParticipantLabels({
  capacity,
  count,
  locale,
}: {
  capacity: number;
  count: number;
  locale: string;
}) {
  if (capacity > 0) {
    const full =
      locale === "fr"
        ? `${count}/${capacity} inscrits`
        : locale === "en"
          ? `${count}/${capacity} joined`
          : `${count}/${capacity} 已报名`;

    return {
      compact: `${count}/${capacity}`,
      full,
    };
  }

  if (locale === "fr") {
    return {
      compact: `${count}`,
      full: `${count} inscrit${count > 1 ? "s" : ""}`,
    };
  }

  if (locale === "en") {
    return {
      compact: `${count}`,
      full: `${count} joined`,
    };
  }

  return {
    compact: `${count}人`,
    full: `已有 ${count} 人报名`,
  };
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
  const now =
    activity.type === "PUBLIC_EVENT" ? new Date() : getActivityFloatingNow();
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
  "bg-coral text-white",
  "bg-forest text-white",
  "bg-meadow text-white",
  "bg-sage text-white",
  "bg-danger text-white",
  "bg-outline text-white",
];

function getStableAvatarTone(value: string) {
  const total = [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return avatarTones[total % avatarTones.length];
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
      action: "Voir le détail",
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
      manageTeam: "Gérer le plan",
      viewActivity: "Voir l'activité",
      viewDetails: "Voir les détails",
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
  const isInactive = displayStatus === "ENDED" || displayStatus === "CANCELLED";
  const participationActionLabel = getParticipationActionLabel(
    activityCopy,
    viewerParticipationStatus ?? null,
  );

  if (isOwnActivity) {
    return {
      label: isActivityInfo ? cardCopy.viewActivity : cardCopy.manageTeam,
      tone: "neutral",
    };
  }

  if (participationActionLabel) {
    return {
      label: participationActionLabel,
      tone: viewerParticipationStatus === "PENDING" ? "pending" : "joined",
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

function getPrimaryActionIcon({
  isActivityInfo,
  isOwnActivity,
}: {
  isActivityInfo: boolean;
  isOwnActivity: boolean;
  tone: ActivityCardActionTone;
}) {
  if (isOwnActivity) {
    return Settings2;
  }

  if (!isActivityInfo) {
    return CirclePlus;
  }

  return CopyPlus;
}

function getCopyTeamButtonLabel(locale: string) {
  if (locale === "fr") {
    return "Relancer";
  }

  if (locale === "en") {
    return "Run it again";
  }

  return "再来一局";
}

function getSplitPrimaryActionClassName(tone: ActivityCardActionTone) {
  if (tone === "muted") {
    return "border-outline/35 bg-fog text-ink/60 shadow-[0_12px_24px_rgba(29,29,27,0.08)]";
  }

  if (tone === "pending") {
    return "border-sand bg-cream text-danger shadow-[0_14px_26px_rgba(181,48,31,0.12)]";
  }

  if (tone === "joined" || tone === "neutral") {
    return "border-sage bg-paper text-forest shadow-[0_14px_26px_rgba(21,98,64,0.14)]";
  }

  if (tone === "activity") {
    return "border-sage bg-ice text-forest shadow-[0_14px_26px_rgba(21,98,64,0.12)]";
  }

  return "border-coral bg-coral text-white shadow-[0_16px_30px_rgba(240,145,130,0.25)]";
}

function LobbySplitActionButton({
  primaryDetailSource,
  primaryEvent,
  primaryHref,
  primaryIcon: PrimaryIcon,
  primaryLabel,
  primaryTone,
  secondaryHref,
  secondaryLabel,
}: {
  primaryDetailSource?: DetailSourceInput;
  primaryEvent: AnalyticsLinkEvent;
  primaryHref: string;
  primaryIcon: LucideIcon;
  primaryLabel: string;
  primaryTone: ActivityCardActionTone;
  secondaryHref: string;
  secondaryLabel: string;
}) {
  const primaryToneClassName = getSplitPrimaryActionClassName(primaryTone);
  const sharedHalfLinkClassName =
    "absolute inset-y-0 z-20 focus-visible:z-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-meadow/35 focus-visible:ring-offset-2 focus-visible:ring-offset-cream";
  const sharedPanelClassName =
    "pointer-events-none absolute inset-y-0 z-30 flex w-[calc(200%+2px)] items-center justify-center gap-2 rounded-[1.45rem] border px-4 text-[13px] font-semibold leading-none whitespace-nowrap opacity-0 shadow-none transition-[opacity,transform,box-shadow] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-0.5 group-hover:opacity-100 group-focus-visible:-translate-y-0.5 group-focus-visible:opacity-100 motion-reduce:transition-none";

  return (
    <div className="hidden justify-center sm:flex">
      <div
        className="relative isolate h-12 w-[12.25rem] overflow-hidden rounded-[1.55rem] border border-rose bg-[linear-gradient(135deg,#FFF5E6_0%,#DEAAB3_52%,#FEFFF9_100%)] shadow-[0_14px_30px_rgba(240,145,130,0.14),inset_0_1px_0_rgba(255,255,255,0.94)] transition-transform duration-250 hover:-translate-y-0.5"
        data-lobby-split-action="desktop"
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-1.5 left-1.5 z-0 w-[calc(50%-0.375rem)] rounded-[1.2rem] bg-white/52"
        />
        <span
          aria-hidden="true"
          className="absolute inset-y-1.5 right-1.5 z-0 w-[calc(50%-0.375rem)] rounded-[1.2rem] bg-paper/72"
        />
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 z-0 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sand shadow-[0_0_0_5px_rgba(255,245,230,0.9)]"
        />
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 z-10 flex w-1/2 items-center justify-center text-white"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-coral text-white shadow-[0_9px_18px_rgba(240,145,130,0.28)]">
            <PrimaryIcon className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </span>
        <span
          aria-hidden="true"
          className="absolute inset-y-0 right-0 z-10 flex w-1/2 items-center justify-center text-forest"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-sage/70 bg-cream text-forest shadow-[0_9px_18px_rgba(21,98,64,0.08)]">
            <CopyPlus className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </span>
        <AnalyticsLink
          ariaLabel={primaryLabel}
          detailSource={primaryDetailSource}
          event={primaryEvent}
          href={primaryHref}
          className={cn(
            "group left-0 w-1/2 hover:z-40",
            sharedHalfLinkClassName,
          )}
        >
          <span
            className={cn(
              "left-0 group-hover:shadow-[0_16px_28px_rgba(54,151,88,0.26)] group-focus-visible:shadow-[0_16px_28px_rgba(54,151,88,0.26)]",
              sharedPanelClassName,
              primaryToneClassName,
            )}
          >
            <PrimaryIcon
              className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:rotate-90 group-focus-visible:rotate-90 motion-reduce:transition-none"
              aria-hidden="true"
            />
            <span>{primaryLabel}</span>
          </span>
        </AnalyticsLink>
        <Link
          href={secondaryHref}
          title={secondaryLabel}
          aria-label={secondaryLabel}
          className={cn(
            "group right-0 w-1/2 hover:z-40",
            sharedHalfLinkClassName,
          )}
        >
          <span
            className={cn(
              "right-0 border-sage bg-fog text-forest group-hover:shadow-[0_16px_28px_rgba(21,98,64,0.14)] group-focus-visible:shadow-[0_16px_28px_rgba(21,98,64,0.14)]",
              sharedPanelClassName,
            )}
          >
            <CopyPlus
              className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:-rotate-12 group-focus-visible:-rotate-12 motion-reduce:transition-none"
              aria-hidden="true"
            />
            <span>{secondaryLabel}</span>
          </span>
        </Link>
      </div>
    </div>
  );
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
    : withLocale(locale, getActivityDetailPath(activity.id));
  const actionHref = isOwnActivity
    ? cardHref
    : isActivityInfo &&
        displayStatus !== "ENDED" &&
        displayStatus !== "CANCELLED"
      ? withLocale(locale, activityInfoTeamHref)
      : cardHref;
  const copyActivityHref =
    !isActivityInfo && actionContext === "lobby"
      ? withLocale(locale, `/activities/new?copyActivityId=${activity.id}`)
      : null;
  const cardActionCopy = getCardActionCopy(locale);
  const participationActionLabel = getParticipationActionLabel(
    t,
    activity.viewerParticipationStatus ?? null,
  );
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
  const isProfileCard = actionContext === "profile";
  const isProfileOwnCard = isProfileCard && isOwnActivity;
  const autoCreatedTeam = activity.autoCreatedTeam;
  const showCoverKindBadge = !isProfileOwnCard;
  const showCoverVisibilityBadge = !isProfileCard && !isActivityInfo;
  const shouldShowParticipantCount = !isActivityInfo;
  const participantLabels = getTeamParticipantLabels({
    capacity: activity.capacity,
    count: activity.participantCount,
    locale,
  });
  const participantPreview = isTeamCard
    ? (activity.participantPreview ?? [])
    : [];
  const participantExtraCount = Math.max(
    activity.participantCount - participantPreview.length,
    0,
  );
  const isInactiveCard =
    displayStatus === "ENDED" || displayStatus === "CANCELLED";
  const isClaimableTeamCard =
    isTeamCard &&
    !isOwnActivity &&
    !isInactiveCard &&
    Boolean(autoCreatedTeam?.isClaimable);
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
        {participantPreview.slice(0, 4).map((participant) => {
          const nickname = sanitizeDisplayText(participant.nickname) || "N";

          return (
            <span
              key={participant.id}
              className={cn(
                "flex h-6 w-6 items-center justify-center overflow-hidden rounded-full text-[10px] font-semibold ring-2 max-[639px]:h-5 max-[639px]:w-5 max-[639px]:text-[9px]",
                participant.avatarUrl
                  ? "bg-white"
                  : getStableAvatarTone(participant.id),
                isTeamCard ? "ring-paper" : "ring-ice",
                isInactiveCard ? "ring-zinc-50 grayscale" : null,
              )}
              title={nickname}
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
                getAvatarInitial(nickname)
              )}
            </span>
          );
        })}
        {participantExtraCount > 0 ? (
          <span
            className={cn(
              "flex h-6 min-w-6 items-center justify-center rounded-full bg-sand px-1.5 text-[10px] font-semibold text-forest ring-2 ring-paper max-[639px]:h-5 max-[639px]:min-w-5 max-[639px]:text-[9px]",
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
      ? "bg-fog text-ink/60 hover:bg-fog"
      : resolvedActionConfig.tone === "neutral"
        ? "bg-team-bg text-forest ring-1 ring-team-border hover:bg-fog"
        : resolvedActionConfig.tone === "joined"
          ? "bg-rose text-danger ring-1 ring-coral/35 shadow-[0_8px_18px_rgba(240,145,130,0.12)] hover:bg-coral/20"
          : resolvedActionConfig.tone === "pending"
            ? "bg-cream text-danger ring-1 ring-sand shadow-[0_8px_18px_rgba(181,48,31,0.1)] hover:bg-rose/45"
            : resolvedActionConfig.tone === "activity"
              ? "bg-ice text-forest ring-1 ring-sage shadow-[0_8px_18px_rgba(21,98,64,0.1)] hover:bg-fog"
              : "bg-coral text-white shadow-[0_10px_22px_rgba(240,145,130,0.24)] hover:bg-coral-dark";
  const PrimaryActionIcon = getPrimaryActionIcon({
    isActivityInfo,
    isOwnActivity,
    tone: resolvedActionConfig.tone,
  });
  const useCompactDualActions = showPrimaryAction && Boolean(copyActivityHref);

  return (
    <Card
      data-detail-source-target={detailSourceTargetKey}
      className={cn(
        "group/card relative flex h-full flex-col overflow-visible rounded-[1.15rem] transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 sm:rounded-[1.55rem]",
        isInactiveCard
          ? "border-outline/30 bg-fog/90 text-ink/55 shadow-[0_10px_28px_rgba(29,29,27,0.07)] saturate-0"
          : isTeamCard
            ? "border-rose bg-cream shadow-[0_12px_34px_rgba(240,145,130,0.11)] ring-1 ring-rose hover:shadow-[0_18px_46px_rgba(240,145,130,0.18)] max-[639px]:shadow-[0_16px_36px_rgba(240,145,130,0.13)]"
            : "border-sage bg-paper shadow-[0_10px_30px_rgba(21,98,64,0.08)] ring-1 ring-fog hover:shadow-[0_18px_44px_rgba(21,98,64,0.13)] max-[639px]:shadow-[0_16px_36px_rgba(21,98,64,0.1)]",
        isTeamCard
          ? "before:absolute before:left-5 before:right-5 before:-top-px before:z-10 before:hidden before:h-1 before:rounded-full before:bg-coral sm:before:block"
          : "before:absolute before:left-5 before:right-5 before:-top-px before:z-10 before:hidden before:h-1 before:rounded-full before:bg-event-accent sm:before:block",
        !isInactiveCard && isTeamCard
          ? "hover:border-coral hover:ring-rose"
          : null,
      )}
    >
      {showFavoriteButton &&
      !isOwnActivity &&
      isActivityInfo &&
      activity.publicEventId ? (
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
              mobileDenseClass(
                "max-[639px]:size-8 max-[639px]:min-h-8 max-[639px]:min-w-8",
              ),
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
      {showFavoriteButton &&
      !isOwnActivity &&
      (!isActivityInfo || !activity.publicEventId) ? (
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
              mobileDenseClass(
                "max-[639px]:size-8 max-[639px]:min-h-8 max-[639px]:min-w-8",
              ),
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
            "relative mx-2.5 mt-2.5 flex h-28 items-end justify-between gap-2 overflow-hidden rounded-[1rem] p-3 sm:mx-3.5 sm:mt-3.5 sm:h-40 sm:rounded-[1.25rem] sm:p-4",
            mobileDenseClass(
              "max-[639px]:mx-2 max-[639px]:mt-2 max-[639px]:h-[6.6rem] max-[639px]:rounded-[0.9rem] max-[639px]:p-2.5",
            ),
            coverTones[activity.coverTone],
            isInactiveCard ? "grayscale" : null,
          )}
        >
          <ActivityCoverImage
            src={activity.coverImageUrl}
            overlayClassName={cn(
              isTeamCard
                ? "bg-gradient-to-t from-black/62 via-black/20 to-ink/12"
                : "bg-gradient-to-t from-black/46 via-black/10 to-transparent",
            )}
          />
          <div
            className={cn(
              "absolute inset-x-0 top-0 h-8 bg-gradient-to-b to-transparent",
              isTeamCard ? "from-ink/24" : "from-black/10",
            )}
          />
          {showCoverKindBadge ? (
            <span
              className={cn(
                "absolute left-3 top-3 z-10 inline-flex max-w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-extrabold leading-none shadow-[0_10px_24px_rgba(29,29,27,0.18)] ring-1 ring-white/75 sm:left-4 sm:top-4",
                mobileDenseClass(
                  "max-[639px]:left-2 max-[639px]:top-2 max-[639px]:gap-1 max-[639px]:px-2 max-[639px]:py-1 max-[639px]:text-[10px]",
                ),
                isTeamCard
                  ? "border-rose bg-cream text-ink"
                  : "border-sage bg-ice text-forest",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full shadow-[0_0_0_2px_rgba(255,255,255,0.8)]",
                  isTeamCard ? "bg-meadow" : "bg-sage",
                )}
                aria-hidden="true"
              />
              <span className="min-w-0 truncate">
                {getCardKindLabel(isActivityInfo, locale)}
              </span>
            </span>
          ) : null}
          {isOwnActivity ? (
            <span
              className={cn(
                "absolute top-3 z-10 inline-flex w-fit max-w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-full border border-sand bg-cream/95 px-3 py-1.5 text-xs font-bold leading-none text-forest shadow-[0_10px_24px_rgba(0,0,0,0.16)] backdrop-blur sm:top-4",
                mobileDenseClass(
                  "max-[639px]:top-2 max-[639px]:gap-1 max-[639px]:px-2 max-[639px]:py-1 max-[639px]:text-[10px]",
                ),
                isProfileOwnCard
                  ? "left-3 max-[639px]:left-2 sm:left-4"
                  : "right-3 max-[639px]:right-2 sm:right-4",
              )}
            >
              <Crown className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 truncate">
                {ownActivityLabels.badge}
              </span>
            </span>
          ) : null}
          <div
            className={cn(
              "relative mt-auto flex w-full items-end justify-between gap-2",
              isProfileOwnCard ? "gap-1.5" : null,
            )}
          >
            <div
              className={cn(
                "flex min-w-0 flex-wrap gap-1.5",
                isProfileOwnCard ? "gap-1" : null,
              )}
            >
              <span
                className={cn(
                  "max-w-full truncate rounded-md px-2.5 py-1 text-[11px] font-semibold leading-none shadow-[0_8px_18px_rgba(0,0,0,0.18)] ring-1 ring-white/10",
                  mobileDenseClass(
                    "max-[639px]:px-2 max-[639px]:py-0.5 max-[639px]:text-[10px]",
                  ),
                  isProfileOwnCard ? "px-2 py-0.5 text-[10px]" : null,
                  isTeamCard
                    ? "bg-[rgba(29,29,27,0.78)] text-cream"
                    : "bg-[rgba(29,29,27,0.72)] text-cream",
                )}
              >
                {getCategoryLabel(activity.category, locale)}
              </span>
              {showCoverVisibilityBadge ? (
                <span
                  className={cn(
                    "rounded-md bg-[rgba(255,245,230,0.94)] px-2.5 py-1 text-[11px] font-medium leading-none text-forest shadow-[0_8px_18px_rgba(0,0,0,0.18)]",
                    mobileDenseClass(
                      "max-[639px]:hidden max-[639px]:px-2 max-[639px]:py-0.5 max-[639px]:text-[10px]",
                    ),
                  )}
                >
                  {getCardVisibilityLabel(activity.visibility, locale)}
                </span>
              ) : null}
            </div>
            {!isTeamCard ? (
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span
                  className={cn(
                    "rounded-full bg-[rgba(255,245,230,0.96)] px-2.5 py-1 text-[11px] font-semibold leading-none text-forest shadow-[0_8px_18px_rgba(0,0,0,0.15)]",
                    mobileDenseClass(
                      "max-[639px]:px-2 max-[639px]:py-0.5 max-[639px]:text-[10px]",
                    ),
                    isProfileOwnCard ? "px-2 py-0.5 text-[10px]" : null,
                  )}
                >
                  {t.activityLabels.timeStates[timeState]}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <CardHeader
          className={cn(
            "p-4 pb-2 sm:p-5 sm:pb-2.5",
            mobileDenseClass("max-[639px]:p-3 max-[639px]:pb-1.5"),
          )}
        >
          <CardTitle
            className={cn(
              "line-clamp-2 text-base font-extrabold leading-snug tracking-normal sm:text-[1.08rem]",
              mobileDenseClass(
                "max-[639px]:text-[0.86rem] max-[639px]:leading-snug",
              ),
              isInactiveCard ? "text-zinc-600" : null,
              !isInactiveCard && isTeamCard ? "text-ink" : null,
              !isInactiveCard && !isTeamCard ? "text-ink" : null,
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
              "grid gap-2 text-sm font-medium text-forest/75",
              mobileDenseClass(
                "max-[639px]:gap-1.5 max-[639px]:text-[0.72rem]",
              ),
              isInactiveCard ? "text-zinc-500" : null,
            )}
          >
            {countdownLabel ? (
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-ice px-2.5 py-1 text-xs font-semibold text-forest ring-1 ring-sage">
                <Clock3 className="h-3.5 w-3.5 shrink-0" />
                {countdownLabel}
              </span>
            ) : null}
            <span className="flex items-start gap-2">
              <CalendarDays
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  isTeamCard ? "text-coral" : "text-sage",
                  mobileDenseClass("max-[639px]:h-3.5 max-[639px]:w-3.5"),
                )}
              />
              <span
                className={cn(
                  "min-w-0",
                  mobileDenseClass("max-[639px]:line-clamp-2"),
                )}
              >
                {getActivityDateLabel(activity, locale)}
              </span>
            </span>
            {isActivityInfo ? (
              <span className="flex items-start gap-2">
                <MapPin
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0 text-sage",
                    mobileDenseClass("max-[639px]:h-3.5 max-[639px]:w-3.5"),
                  )}
                />
                <span className="min-w-0 line-clamp-1">{activity.city}</span>
              </span>
            ) : null}
            {shouldShowParticipantCount ? (
              <span className="flex min-w-0 items-center gap-2">
                <UsersRound
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0 text-ink",
                    mobileDenseClass("max-[639px]:h-3.5 max-[639px]:w-3.5"),
                  )}
                />
                <span
                  className={cn(
                    "min-w-0",
                    mobileDenseClass("max-[639px]:truncate"),
                  )}
                >
                  <span
                    className={cn(mobileDense ? "max-[639px]:hidden" : null)}
                  >
                    {participantLabels.full}
                  </span>
                  {mobileDense ? (
                    <span className="hidden max-[639px]:inline">
                      {participantLabels.compact}
                    </span>
                  ) : null}
                </span>
                {participantAvatarStack ? (
                  <span
                    className={cn(
                      "ml-auto",
                      mobileDenseClass("max-[639px]:ml-0"),
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

      {showPrimaryAction || copyActivityHref ? (
        <div
          className={cn(
            "px-4 pb-4 pt-0 sm:px-5 sm:pb-5",
            mobileDenseClass("max-[639px]:px-3 max-[639px]:pb-3"),
          )}
        >
          <div
            className={cn(
              "grid items-center gap-2",
              useCompactDualActions
                ? "grid-cols-1 justify-center sm:flex sm:grid-cols-none sm:justify-center sm:gap-6"
                : copyActivityHref
                  ? "grid-cols-1 sm:grid-cols-[minmax(4.75rem,0.84fr)_minmax(5.75rem,1fr)]"
                  : "grid-cols-1",
            )}
          >
            {showPrimaryAction && !useCompactDualActions ? (
              isClaimableTeamCard ? (
                <ClaimAutoCreatedActivityCardAction
                  activityId={activity.id}
                  activityTitle={activity.title}
                  detailHref={cardHref}
                  isAuthenticated={isAuthenticated}
                  locale={locale}
                  redirectPath={getActivityDetailPath(activity.id)}
                  variant="single"
                />
              ) : (
                <AnalyticsLink
                  href={actionHref}
                  prefetch={actionHref === cardHref}
                  detailSource={
                    actionHref === cardHref ? detailSource : undefined
                  }
                  event={{
                    name: actionEventName,
                    entityId: analyticsEntity.entityId,
                    entityType: analyticsEntity.entityType,
                    sourceSurface,
                    properties: baseAnalyticsProperties,
                  }}
                  className="group min-w-0 rounded-full focus-visible:outline-none"
                >
                  <span
                    className={cn(
                      "flex h-10 min-h-10 w-full min-w-0 items-center justify-center overflow-hidden rounded-full border-0 px-3 text-center text-[13px] font-semibold leading-none whitespace-nowrap transition duration-150 ease-out group-hover:-translate-y-0.5 group-active:translate-y-0 group-focus-visible:ring-2 group-focus-visible:ring-coral/45 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-paper sm:h-11 sm:min-h-11",
                      copyActivityHref
                        ? "sm:px-2.5 sm:text-[13px]"
                        : "sm:px-4 sm:text-base",
                      actionToneClassName,
                    )}
                  >
                    <span className="min-w-0 truncate">{buttonLabel}</span>
                  </span>
                </AnalyticsLink>
              )
            ) : null}
            {copyActivityHref && !useCompactDualActions ? (
              <Link
                href={copyActivityHref}
                className="group min-w-0 rounded-full focus-visible:outline-none"
              >
                <span className="flex h-10 min-h-10 w-full min-w-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border border-sage bg-paper px-2.5 text-xs font-semibold leading-none text-forest shadow-sm transition duration-150 ease-out hover:bg-fog group-hover:-translate-y-0.5 group-active:translate-y-0 group-focus-visible:ring-2 group-focus-visible:ring-meadow/25 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-paper sm:h-11 sm:min-h-11 sm:px-3 sm:text-[13px]">
                  <Copy
                    className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 truncate">
                    {getCopyTeamButtonLabel(locale)}
                  </span>
                </span>
              </Link>
            ) : null}
            {useCompactDualActions && copyActivityHref ? (
              isClaimableTeamCard ? (
                <ClaimAutoCreatedActivityCardAction
                  activityId={activity.id}
                  activityTitle={activity.title}
                  detailHref={cardHref}
                  isAuthenticated={isAuthenticated}
                  locale={locale}
                  redirectPath={getActivityDetailPath(activity.id)}
                  secondaryHref={copyActivityHref}
                  secondaryLabel={getCopyTeamButtonLabel(locale)}
                  variant="split"
                />
              ) : (
                <>
                  <MobileLobbyActionSheet
                    activityTitle={activity.title}
                    primaryDetailSource={
                      actionHref === cardHref ? detailSource : undefined
                    }
                    primaryEvent={{
                      name: actionEventName,
                      entityId: analyticsEntity.entityId,
                      entityType: analyticsEntity.entityType,
                      sourceSurface,
                      properties: baseAnalyticsProperties,
                    }}
                    primaryHref={actionHref}
                    primaryIconName={
                      isOwnActivity
                        ? "settings"
                        : isActivityInfo
                          ? "copyPlus"
                          : "circlePlus"
                    }
                    primaryLabel={buttonLabel}
                    primaryTone={resolvedActionConfig.tone}
                    secondaryHref={copyActivityHref}
                    secondaryLabel={getCopyTeamButtonLabel(locale)}
                    locale={locale}
                  />
                  <LobbySplitActionButton
                    primaryDetailSource={
                      actionHref === cardHref ? detailSource : undefined
                    }
                    primaryEvent={{
                      name: actionEventName,
                      entityId: analyticsEntity.entityId,
                      entityType: analyticsEntity.entityType,
                      sourceSurface,
                      properties: baseAnalyticsProperties,
                    }}
                    primaryHref={actionHref}
                    primaryIcon={PrimaryActionIcon}
                    primaryLabel={buttonLabel}
                    primaryTone={resolvedActionConfig.tone}
                    secondaryHref={copyActivityHref}
                    secondaryLabel={getCopyTeamButtonLabel(locale)}
                  />
                </>
              )
            ) : null}
          </div>
        </div>
      ) : null}
    </Card>
  );
}
