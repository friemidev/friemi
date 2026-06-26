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
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";
import type { ActivityCardViewModel } from "../types";
import {
  getActivityDateLabel,
  getActivityDisplayStatus,
  getActivityFloatingNow,
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

type AnalyticsLinkEvent = ComponentProps<typeof AnalyticsLink>["event"];

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
    return "border-zinc-300 bg-zinc-200 text-zinc-600 shadow-[0_12px_24px_rgba(113,113,122,0.16)]";
  }

  if (tone === "pending") {
    return "border-[#e2bc67] bg-[#fff0bd] text-[#765113] shadow-[0_14px_26px_rgba(198,156,73,0.2)]";
  }

  if (tone === "joined" || tone === "neutral") {
    return "border-[#d6b193] bg-[#f2ddcf] text-[#70432f] shadow-[0_14px_26px_rgba(154,91,61,0.18)]";
  }

  if (tone === "activity") {
    return "border-[#8fc1d6] bg-[#dceef7] text-[#245e76] shadow-[0_14px_26px_rgba(84,139,167,0.16)]";
  }

  return "border-[#d97f61] bg-[#e48768] text-white shadow-[0_16px_30px_rgba(216,129,98,0.3)]";
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
    "absolute inset-y-0 z-20 focus-visible:z-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d88d72]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffaf3]";
  const sharedPanelClassName =
    "pointer-events-none absolute inset-y-0 z-30 flex w-[calc(200%+1px)] items-center justify-center gap-2 rounded-[13px] border px-4 text-[13px] font-semibold leading-none whitespace-nowrap opacity-0 shadow-none transition-[opacity,transform,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-0.5 group-hover:opacity-100 group-focus-visible:-translate-y-0.5 group-focus-visible:opacity-100 motion-reduce:transition-none";

  return (
    <div className="hidden justify-center sm:flex">
      <div
        className="relative isolate h-10 w-[9.65rem] overflow-hidden rounded-[14px] border border-[#e0bea0] bg-[#fffaf3] shadow-[0_10px_20px_rgba(122,82,49,0.10),inset_0_1px_0_rgba(255,255,255,0.9)] transition-transform duration-200 hover:-translate-y-0.5"
        data-lobby-split-action="desktop"
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 z-0 w-1/2 bg-[#fff0e6]"
        />
        <span
          aria-hidden="true"
          className="absolute inset-y-0 right-0 z-0 w-1/2 bg-[#fffdf9]"
        />
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 z-0 h-6 w-px -translate-y-1/2 bg-[#e5ccb3]"
        />
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 z-10 flex w-1/2 items-center justify-center text-[#c86548]"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-[#e48768] text-white shadow-[0_8px_16px_rgba(216,129,98,0.24)]">
            <PrimaryIcon className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </span>
        <span
          aria-hidden="true"
          className="absolute inset-y-0 right-0 z-10 flex w-1/2 items-center justify-center text-[#6b4b34]"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-[10px] border border-[#d9b993] bg-white shadow-[0_8px_16px_rgba(95,67,41,0.11)]">
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
              "left-0 group-hover:shadow-[0_16px_28px_rgba(216,129,98,0.28)] group-focus-visible:shadow-[0_16px_28px_rgba(216,129,98,0.28)]",
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
              "right-0 border-[#4f3d30] bg-[#342820] text-[#fff6e8] group-hover:shadow-[0_16px_28px_rgba(47,37,31,0.24)] group-focus-visible:shadow-[0_16px_28px_rgba(47,37,31,0.24)]",
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
    : withLocale(locale, `/activities/${activity.id}`);
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
  const PrimaryActionIcon = getPrimaryActionIcon({
    isActivityInfo,
    isOwnActivity,
    tone: resolvedActionConfig.tone,
  });
  const useCompactDualActions = showPrimaryAction && Boolean(copyActivityHref);
  const compactPrimaryActionClassName =
    resolvedActionConfig.tone === "muted"
      ? "border border-zinc-300 bg-zinc-200 text-zinc-600 shadow-[0_8px_18px_rgba(113,113,122,0.12)] group-hover:border-zinc-400 group-hover:bg-zinc-300 group-hover:text-zinc-800"
      : resolvedActionConfig.tone === "neutral"
        ? "border border-[#8ab89c] bg-[#e2f0e7] text-[#1e5b42] shadow-[0_12px_24px_rgba(40,98,73,0.16)] group-hover:border-[#5e9779] group-hover:bg-[#edf7f0] group-hover:text-[#12412f]"
      : resolvedActionConfig.tone === "joined"
          ? "border border-[#85b89b] bg-[#dff0e6] text-[#1f6348] shadow-[0_12px_24px_rgba(43,112,82,0.18)] group-hover:border-[#589577] group-hover:bg-[#edf8f1] group-hover:text-[#124332]"
          : resolvedActionConfig.tone === "pending"
            ? "border border-[#f0cd7e] bg-[#fff2c9] text-[#8f6410] shadow-[0_12px_24px_rgba(220,178,67,0.22)] group-hover:border-[#e2b34c] group-hover:bg-[#fff7dd] group-hover:text-[#6f4d08]"
            : resolvedActionConfig.tone === "activity"
              ? "border border-[#8ac4a1] bg-[#e2f4e8] text-[#1a6447] shadow-[0_12px_24px_rgba(42,110,80,0.18)] group-hover:border-[#5f9b7b] group-hover:bg-[#eff8f2] group-hover:text-[#114631]"
              : "border border-[#74c59b] bg-[#9fe0ba] text-[#114631] shadow-[0_14px_28px_rgba(97,191,142,0.24)] group-hover:border-[#53b07f] group-hover:bg-[#87d5ab] group-hover:text-[#0a3625]";
  const compactSecondaryActionClassName =
    "border border-[#e6b2c4] bg-[#f7d8e4] text-[#6f3150] shadow-[0_12px_24px_rgba(188,105,142,0.22)] group-hover:border-[#d68daa] group-hover:bg-[#fde7ef] group-hover:text-[#55213b]";

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
                ? "grid-cols-[minmax(0,1fr)_2.5rem] justify-center gap-2 sm:flex sm:grid-cols-none sm:justify-center sm:gap-6"
                : copyActivityHref
                ? "grid-cols-1 sm:grid-cols-[minmax(4.75rem,0.84fr)_minmax(5.75rem,1fr)]"
                : "grid-cols-1",
            )}
          >
            {showPrimaryAction ? (
              <AnalyticsLink
                href={actionHref}
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
                className={cn(
                  "group min-w-0 rounded-full focus-visible:outline-none",
                  useCompactDualActions
                    ? "relative w-full justify-self-stretch sm:hidden"
                    : null,
                )}
              >
                {useCompactDualActions ? (
                  <>
                    <span
                      title={buttonLabel}
                      className={cn(
                        "flex h-10 min-h-10 w-full min-w-0 items-center justify-center gap-1.5 overflow-hidden rounded-[14px] px-3 text-[13px] font-semibold leading-none whitespace-nowrap transition duration-150 ease-out group-active:translate-y-px group-focus-visible:ring-2 group-focus-visible:ring-[#0d4b36]/35 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-paper sm:hidden",
                        compactPrimaryActionClassName,
                      )}
                    >
                      <PrimaryActionIcon
                        className="h-3.5 w-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="min-w-0 truncate">{buttonLabel}</span>
                    </span>
                    <span
                      className={cn(
                        "hidden min-h-9 min-w-0 items-center justify-center gap-1.5 rounded-full px-5 text-[13px] font-semibold leading-none whitespace-nowrap transition duration-200 ease-out group-hover:-translate-y-0.5 group-hover:shadow-[0_18px_32px_rgba(0,0,0,0.14)] group-active:translate-y-0 group-focus-visible:ring-2 group-focus-visible:ring-[#0d4b36]/35 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-paper sm:inline-flex",
                        compactPrimaryActionClassName,
                      )}
                    >
                      <PrimaryActionIcon
                        className="h-4 w-4 shrink-0"
                        aria-hidden="true"
                      />
                      <span>{buttonLabel}</span>
                    </span>
                  </>
                ) : (
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
                )}
              </AnalyticsLink>
            ) : null}
            {copyActivityHref ? (
              <Link
                href={copyActivityHref}
                className={cn(
                  "group min-w-0 rounded-full focus-visible:outline-none",
                  useCompactDualActions
                    ? "relative h-10 w-10 justify-self-end rounded-[14px] sm:hidden"
                    : null,
                )}
                title={useCompactDualActions ? getCopyTeamButtonLabel(locale) : undefined}
                aria-label={
                  useCompactDualActions ? getCopyTeamButtonLabel(locale) : undefined
                }
              >
                {useCompactDualActions ? (
                  <>
                    <span
                      className={cn(
                        "flex h-10 min-h-10 w-10 min-w-10 items-center justify-center rounded-[14px] px-0 transition duration-150 ease-out group-active:translate-y-px group-focus-visible:ring-2 group-focus-visible:ring-[#9a4f72]/30 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-paper sm:hidden",
                        compactSecondaryActionClassName,
                      )}
                    >
                      <CopyPlus
                        className="h-4 w-4 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="sr-only">
                        {getCopyTeamButtonLabel(locale)}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "hidden min-h-9 min-w-0 items-center justify-center gap-1.5 rounded-full px-5 text-[13px] font-semibold leading-none whitespace-nowrap transition duration-200 ease-out group-hover:-translate-y-0.5 group-hover:shadow-[0_18px_32px_rgba(0,0,0,0.12)] group-active:translate-y-0 group-focus-visible:ring-2 group-focus-visible:ring-[#9a4f72]/30 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-paper sm:inline-flex",
                        compactSecondaryActionClassName,
                      )}
                    >
                      <CopyPlus className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{getCopyTeamButtonLabel(locale)}</span>
                    </span>
                  </>
                ) : (
                  <span className="flex h-10 min-h-10 w-full min-w-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border border-[#d9c8ad] bg-white px-2.5 text-xs font-semibold leading-none text-[#5f4f3f] shadow-sm transition duration-150 ease-out hover:bg-white group-hover:-translate-y-0.5 group-active:translate-y-0 group-focus-visible:ring-2 group-focus-visible:ring-[#d88d72]/25 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-paper sm:h-11 sm:min-h-11 sm:px-3 sm:text-[13px]">
                    <Copy
                      className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 truncate">
                      {getCopyTeamButtonLabel(locale)}
                    </span>
                  </span>
                )}
              </Link>
            ) : null}
            {useCompactDualActions && copyActivityHref ? (
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
            ) : null}
          </div>
        </div>
      ) : null}
    </Card>
  );
}
