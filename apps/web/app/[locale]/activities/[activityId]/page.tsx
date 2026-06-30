import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import {
  formatActivityDate,
} from "@chill-club/shared";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  MapPin,
  Pencil,
  ShieldAlert,
  Route,
  Store,
  Ticket,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { Button } from "@chill-club/ui";
import { PageContainer } from "@/components/layout/PageContainer";
import { AnalyticsExternalLink } from "@/features/analytics/components/AnalyticsExternalLink";
import { AnalyticsLink } from "@/features/analytics/components/AnalyticsLink";
import { ActivityAnalyticsSummaryPanel } from "@/features/analytics/components/ActivityAnalyticsSummaryPanel";
import { normalizeAnalyticsLocale } from "@/features/analytics/events";
import { getActivityAnalyticsSummary } from "@/features/analytics/queries/getActivityAnalyticsSummary";
import { queueAnalyticsEvent } from "@/features/analytics/server";
import {
  getAnalyticsEntityForActivityDetail,
  inferAnalyticsSourceSurfaceFromReferrer,
} from "@/features/analytics/utils";
import { ActivityStatusBadge } from "@/features/activities/components/ActivityStatusBadge";
import { CancelActivityForm } from "@/features/activities/components/CancelActivityForm";
import { ClaimAutoCreatedActivityCelebration } from "@/features/activities/components/ClaimAutoCreatedActivityCelebration";
import { ClaimAutoCreatedActivityButton } from "@/features/activities/components/ClaimAutoCreatedActivityButton";
import { ActivityCoManagerPanel } from "@/features/activities/components/ActivityCoManagerPanel";
import { ActivityCommentsSection } from "@/features/activities/components/ActivityCommentsSection";
import { ActivityAnnouncementComposer } from "@/features/activities/components/ActivityAnnouncementComposer";
import { ActivityCopyButton } from "@/features/activities/components/ActivityCopyButton";
import { ActivityCoverImage } from "@/features/activities/components/ActivityCoverImage";
import { ActivityCoverImageManager } from "@/features/activities/components/ActivityCoverImageManager";
import { ActivityMapPreview } from "@/features/activities/components/ActivityMapPreview";
import { ActivityRichDescription } from "@/features/activities/components/ActivityRichDescription";
import { ActivityShareTools } from "@/features/activities/components/ActivityShareTools";
import { JoinActivityForm } from "@/features/activities/components/JoinActivityForm";
import { ParticipationApprovalPanel } from "@/features/activities/components/ParticipationApprovalPanel";
import { TeamDetailMobileCtaSheet } from "@/features/activities/components/TeamDetailMobileCtaSheet";
import {
  getActivityById,
  getActivityShareMetadataById,
} from "@/features/activities/queries/getActivityById";
import { getActivityComments } from "@/features/activities/queries/getActivityComments";
import { getActivityCoManagerDashboard } from "@/features/activities/queries/getActivityCoManagerDashboard";
import { getActivityViewerParticipation } from "@/features/activities/queries/getActivityViewerParticipation";
import { getPendingParticipants } from "@/features/activities/queries/getPendingParticipants";
import {
  getActivityDateLabel,
  getActivityDisplayStatus,
  getActivityItineraryItems,
  getActivityLocationLabel,
  getActivityOrganizerInitial,
  getActivityParticipantPercent,
  getActivityPriceLabel,
  getActivitySeatLabel,
} from "@/features/activities/utils/activityDisplay";
import { FollowButton } from "@/features/follow/components/FollowButton";
import { getFollowCopy } from "@/features/follow/copy";
import { getViewerFollowState } from "@/features/follow/queries/getViewerFollowState";
import { ActivityFavoriteButton } from "@/features/favorites/components/ActivityFavoriteButton";
import { getViewerActivityFavorite } from "@/features/favorites/queries/getViewerActivityFavorite";
import { ActivityFriendSignalPanel } from "@/features/friends/components/ActivityFriendSignalPanel";
import { getActivityFriendSignal } from "@/features/friends/queries/getActivityFriendSignals";
import { getViewerFriendIds } from "@/features/friends/queries/getViewerFriendIds";
import { ContextualDetailLink } from "@/features/navigation/components/ContextualDetailLink";
import { DetailSourceReturnLink } from "@/features/navigation/components/DetailSourceReturnLink";
import { DetailSourceRestore } from "@/features/navigation/components/DetailSourceRestore";
import { ActivityOrganizerContactForm } from "@/features/direct-messages/components/ActivityOrganizerContactForm";
import { getPublicEventCopy } from "@/features/public-events/copy";
import { getTicketCtaLabel } from "@/features/public-events/utils/ticketCta";
import { ReportDialog } from "@/features/reports/components/ReportDialog";
import { UserProfilePreviewPopover } from "@/features/profile/components/UserProfilePreviewPopover";
import { MobileNavSectionOverride } from "@/components/navigation/MobileNavSectionOverride";
import { ManualTranslationBundle } from "@/features/translations/components/ManualTranslation";
import { ActivityWeatherWidget } from "@/features/weather/components/ActivityWeatherWidget";
import { getActivityWeatherWidgetInput } from "@/features/weather/activityWeather";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";
import { getCategoryLabel, getCopy, getTypeLabel } from "@/lib/copy";
import { cn } from "@/lib/utils";
import { createPerformanceTracker } from "@/lib/performance";
import { withLocale } from "@/lib/routes";
import {
  buildCanonicalUrl,
  buildDetailShareMetadata,
  buildFallbackShareMetadata,
  buildTeamShareImageUrl,
  buildTeamShareMetadata,
  getRequestBaseUrl,
  getShareDateLabel,
  getShareLocationLabel,
  getSharePriceLabel,
  resolveShareImageUrl,
} from "@/lib/share-metadata";
import {
  ensurePrivateActivityShareToken,
  getPrivateActivitySharePath,
} from "@/features/activities/utils/activityShareAccess";

type ActivityDetailPageProps = {
  params: Promise<{
    locale: string;
    activityId: string;
  }>;
  searchParams: Promise<{
    access?: string;
    claimed?: string;
  }>;
};

const participantAvatarTones = [
  "bg-coral text-white",
  "bg-sage text-white",
  "bg-meadow text-white",
  "bg-forest text-white",
  "bg-sand text-white",
  "bg-outline text-white",
];

type DetailViewerParticipationStatus =
  | "JOINED"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED"
  | null;

function getStableParticipantAvatarTone(value: string) {
  const total = [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return participantAvatarTones[total % participantAvatarTones.length];
}

function getParticipantInitial(nickname: string) {
  return nickname.trim().charAt(0).toUpperCase() || "N";
}

function getAutoCreatedTeamCopy(locale: string) {
  if (locale === "fr") {
    return {
      claimHint:
        "Cette équipe a été créée à partir d'une activité populaire. Réclamez-la pour modifier l'heure et le lieu.",
      deadlinePrefix: "Réclamation ouverte jusqu'au",
    };
  }

  if (locale === "en") {
    return {
      claimHint:
        "This team was created from a popular activity. Claim it to edit the time, location, and plan details.",
      deadlinePrefix: "Claim window ends at",
    };
  }

  return {
    claimHint:
      "这是由热门活动自动生成的组局，认领后你就可以修改时间、地点和组局信息。",
    deadlinePrefix: "认领截止",
  };
}

function formatClaimDeadline(locale: string, value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function isLikelyExternalUrl(value: string | null | undefined) {
  const trimmedValue = value?.trim() ?? "";

  return (
    /^https?:\/\//i.test(trimmedValue) ||
    /^www\./i.test(trimmedValue) ||
    /^[^\s]+\.[^\s]{2,}(?:\/\S*)?$/i.test(trimmedValue)
  );
}

function normalizeExternalUrl(value: string | null | undefined) {
  const trimmedValue = value?.trim() ?? "";

  if (!isLikelyExternalUrl(trimmedValue)) {
    return null;
  }

  return /^https?:\/\//i.test(trimmedValue)
    ? trimmedValue
    : `https://${trimmedValue}`;
}

function shouldTreatProtectedLocationAsOnline(activity: {
  address: string;
  city: string;
}) {
  const label = `${activity.city} ${activity.address}`.toLowerCase();

  return (
    isLikelyExternalUrl(activity.address) ||
    /网址|链接|线上|online|url|link|lien|en ligne|site web/.test(label)
  );
}

function getProtectedAccessNoticeCopy(locale: string, requiresApproval: boolean) {
  const detailCopy = getCopy(locale).activityDetail;

  return requiresApproval
    ? detailCopy.hiddenAddressApprovalNotice
    : detailCopy.hiddenAddressNotice;
}

function getProtectedOnlineLinkNoticeCopy(
  locale: string,
  requiresApproval: boolean,
) {
  const detailCopy = getCopy(locale).activityDetail;

  return requiresApproval
    ? detailCopy.hiddenOnlineLinkApprovalNotice
    : detailCopy.hiddenOnlineLinkNotice;
}

function getTeamDetailCtaCopy(locale: string) {
  if (locale === "fr") {
    return {
      eyebrow: "Prochaine étape",
      title: "Rejoindre ce plan",
      organizerTitle: "Gérer ce plan",
    };
  }

  if (locale === "en") {
    return {
      eyebrow: "Next step",
      title: "Join this plan",
      organizerTitle: "Manage this plan",
    };
  }

  return {
    eyebrow: "下一步",
    title: "报名这个组局",
    organizerTitle: "管理这个组局",
  };
}

function getTeamDetailCtaTitle({
  isClosed,
  isFull,
  isOrganizer,
  locale,
  requiresApproval,
  viewerParticipationStatus,
}: {
  isClosed: boolean;
  isFull: boolean;
  isOrganizer: boolean;
  locale: string;
  requiresApproval: boolean;
  viewerParticipationStatus: DetailViewerParticipationStatus;
}) {
  const t = getCopy(locale).join;
  const ctaCopy = getTeamDetailCtaCopy(locale);

  if (isOrganizer) {
    return ctaCopy.organizerTitle;
  }

  if (isClosed) {
    return t.closedTitle;
  }

  if (viewerParticipationStatus === "PENDING") {
    return t.pendingTitle;
  }

  if (
    viewerParticipationStatus === "JOINED" ||
    viewerParticipationStatus === "APPROVED"
  ) {
    return t.joinedTitle;
  }

  if (isFull) {
    return t.fullTitle;
  }

  return requiresApproval ? t.submitApproval : ctaCopy.title;
}

function getTeamOwnerCtaCopy(locale: string) {
  if (locale === "fr") {
    return {
      contactParticipants: "Contacter les inscrits",
      contactParticipantsDescription:
        "Ouvrir la liste pour retrouver les profils et reprendre contact.",
      manage: "Gérer le plan",
      manageDescription:
        "Modifier les infos visibles, l'horaire, l'adresse ou les règles.",
      managerTitle: "Espace gestionnaire",
      review: "Voir les inscriptions",
      reviewDescription:
        "Consulter les personnes inscrites et les demandes en attente.",
      title: "Espace organisateur",
    };
  }

  if (locale === "en") {
    return {
      contactParticipants: "Contact participants",
      contactParticipantsDescription:
        "Open the list to find profiles and follow up with people.",
      manage: "Manage plan",
      manageDescription:
        "Edit visible details, time, address, or participation rules.",
      managerTitle: "Manager space",
      review: "View signups",
      reviewDescription:
        "Check joined people and requests waiting for review.",
      title: "Organizer space",
    };
  }

  return {
    contactParticipants: "联系参与者",
    contactParticipantsDescription: "打开名单，查看资料并继续联系参与者。",
    manage: "管理组局",
    manageDescription: "修改展示信息、时间地点或报名规则。",
    managerTitle: "管理人空间",
    review: "查看报名",
    reviewDescription: "查看已报名成员和待审核申请。",
    title: "发起人空间",
  };
}

function getApprovalModeNoticeCopy(locale: string) {
  if (locale === "fr") {
    return {
      autoDescription:
        "Les personnes sont ajoutées à la liste des participants après inscription.",
      autoTitle: "Inscription directe",
      organizerEmptyDescription:
        "Les prochaines demandes apparaîtront dans l'espace de validation.",
      organizerEmptyTitle: "Validation active",
      organizerPendingDescription:
        "Traitez-les avant que les places ne soient comptabilisées.",
      organizerPendingTitle: (count: number) =>
        `${count} demande${count > 1 ? "s" : ""} en attente`,
      requiredDescription:
        "La demande passe d'abord par l'organisateur, puis compte une fois validée.",
      requiredTitle: "Validation requise",
      reviewAction: "Valider",
    };
  }

  if (locale === "en") {
    return {
      autoDescription:
        "People are added to the participant list after joining.",
      autoTitle: "Direct join",
      organizerEmptyDescription:
        "New requests will appear in the review area when people apply.",
      organizerEmptyTitle: "Review is on",
      organizerPendingDescription:
        "Review them before they count toward available seats.",
      organizerPendingTitle: (count: number) =>
        `${count} pending request${count === 1 ? "" : "s"}`,
      requiredDescription:
        "The organizer reviews requests first. Approved requests count toward seats.",
      requiredTitle: "Approval required",
      reviewAction: "Review",
    };
  }

  return {
    autoDescription: "报名后会直接进入参与名单。",
    autoTitle: "直接报名",
    organizerEmptyDescription: "新的报名申请会显示在审核区，处理后才计入人数。",
    organizerEmptyTitle: "已开启报名审核",
    organizerPendingDescription: "处理通过后才会计入报名人数。",
    organizerPendingTitle: (count: number) => `${count} 个报名待审核`,
    requiredDescription: "报名后先由发起人确认，通过后才会计入人数。",
    requiredTitle: "报名需审核",
    reviewAction: "去审核",
  };
}

function ApprovalModeNotice({
  className,
  isOrganizer,
  locale,
  pendingCount = 0,
  requiresApproval,
}: {
  className?: string;
  isOrganizer: boolean;
  locale: string;
  pendingCount?: number;
  requiresApproval: boolean;
}) {
  const copy = getApprovalModeNoticeCopy(locale);
  const hasPendingRequests =
    isOrganizer && requiresApproval && pendingCount > 0;
  const Icon = requiresApproval ? ShieldAlert : CheckCircle2;
  const title = isOrganizer
    ? hasPendingRequests
      ? copy.organizerPendingTitle(pendingCount)
      : requiresApproval
        ? copy.organizerEmptyTitle
        : copy.autoTitle
    : requiresApproval
      ? copy.requiredTitle
      : copy.autoTitle;
  const description = isOrganizer
    ? hasPendingRequests
      ? copy.organizerPendingDescription
      : requiresApproval
        ? copy.organizerEmptyDescription
        : copy.autoDescription
    : requiresApproval
      ? copy.requiredDescription
      : copy.autoDescription;

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-2xl px-3 py-2.5 text-left ring-1",
        requiresApproval
          ? "bg-[#FFF5E6]/90 text-[#8A3B21] ring-coral/35"
          : "bg-white/82 text-[#156240] ring-[#8AB68E]/55",
        className,
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/88",
          requiresApproval ? "text-coral" : "text-[#156240]",
        )}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold leading-5">{title}</p>
        <p className="mt-0.5 text-xs font-medium leading-5 opacity-[0.82]">
          {description}
        </p>
      </div>
      {hasPendingRequests ? (
        <Link
          href="#participation-approval"
          className="mt-0.5 inline-flex h-8 shrink-0 items-center justify-center rounded-full bg-white px-3 text-xs font-extrabold text-[#156240] ring-1 ring-[#8AB68E]/55 transition hover:-translate-y-0.5 hover:bg-[#FEFFF9]"
        >
          {copy.reviewAction}
        </Link>
      ) : null}
    </div>
  );
}

function ProtectedDetailNotice({
  icon = "address",
  label,
}: {
  icon?: "address" | "link";
  label: string;
}) {
  const Icon = icon === "link" ? ExternalLink : ShieldAlert;

  return (
    <div className="rounded-[1rem] border border-[#D6D5B2] bg-[#FEFFF9] px-3 py-2.5 text-sm font-semibold leading-6 text-[#156240] shadow-sm">
      <span className="flex min-w-0 items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 break-words">{label}</span>
      </span>
    </div>
  );
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
  searchParams,
}: ActivityDetailPageProps): Promise<Metadata> {
  const { locale, activityId } = await params;
  const { access: accessToken } = await searchParams;
  const requestHeaders = await headers();
  const baseUrl = getRequestBaseUrl(requestHeaders);
  const activityPath = withLocale(locale, `/activities/${activityId}`);
  const activity = await getActivityShareMetadataById(
    activityId,
    accessToken ?? null,
  );

  if (!activity) {
    return buildFallbackShareMetadata(baseUrl, activityPath);
  }

  const canonicalUrl = buildCanonicalUrl(
    baseUrl,
    activityPath,
    activity.visibility === "PRIVATE" ? { access: accessToken } : undefined,
  );
  const dateLabel = getShareDateLabel({
    endAt: activity.endAt,
    floating: true,
    locale,
    startAt: activity.startAt,
  });
  const locationLabel = getShareLocationLabel({
    address: activity.address,
    city: activity.city,
  });
  const priceLabel = getSharePriceLabel(
    activity.priceType,
    activity.priceText,
    locale,
  );

  if (!activity.publicEventId) {
    return buildTeamShareMetadata({
      canonicalUrl,
      capacity: activity.capacity,
      coverImageUrl: activity.coverImageUrl,
      dateLabel,
      locale,
      locationLabel,
      participantCount: activity.participantCount,
      priceLabel,
      shareImageUrl: buildTeamShareImageUrl({
        accessToken:
          activity.visibility === "PRIVATE" ? (accessToken ?? null) : null,
        activityId,
        baseUrl,
        locale,
      }),
      wechatShareImageUrl: resolveShareImageUrl(
        activity.coverImageUrl,
        baseUrl,
      ),
      title: activity.title,
    });
  }

  return buildDetailShareMetadata({
    canonicalUrl,
    coverImageUrl: activity.coverImageUrl,
    dateLabel,
    description: activity.description,
    locationLabel,
    priceLabel,
    title: activity.title,
  });
}

export default async function ActivityDetailPage({
  params,
  searchParams,
}: ActivityDetailPageProps) {
  const { locale, activityId } = await params;
  const { access: accessToken, claimed: claimedSuccess } = await searchParams;
  const perf = createPerformanceTracker({
    locale,
    route: "/activities/[activityId]",
  });
  const t = getCopy(locale);
  const analyticsLocale = normalizeAnalyticsLocale(locale);
  const publicEventCopy = getPublicEventCopy(locale);
  const followLabels = getFollowCopy(locale);
  const viewerProfile = await perf.measure("activity.viewerProfile", () =>
    getOptionalCurrentUserProfileSnapshot(),
  );
  const viewerFriendIds = viewerProfile?.id
    ? await perf.measure("activity.viewerFriends", () =>
        getViewerFriendIds(viewerProfile.id),
      )
    : [];
  const [activity, activityIsFavorited] = await Promise.all([
    perf.measure("activity.primary", () =>
      getActivityById(
        activityId,
        viewerProfile?.id ?? null,
        viewerFriendIds,
        accessToken ?? null,
      ),
    ),
    perf.measure("activity.favoriteState", () =>
      getViewerActivityFavorite(activityId, viewerProfile?.id),
    ),
  ]);

  if (!activity) {
    notFound();
  }

  const weatherInput = getActivityWeatherWidgetInput(activity);
  const isPrivateActivity = activity.visibility === "PRIVATE";
  const shareToken =
    isPrivateActivity && viewerProfile?.id === activity.organizer.id
      ? await ensurePrivateActivityShareToken(activity.id)
      : activity.shareEnabled && activity.shareToken
        ? activity.shareToken
        : null;
  const privateSharePath =
    isPrivateActivity && (accessToken || shareToken)
      ? getPrivateActivitySharePath({
          activityId: activity.id,
          locale,
          shareToken: accessToken || shareToken || "",
        })
      : null;

  const requestHeaders = await headers();
  const referrer = requestHeaders.get("referer");
  const detailAnalyticsEntity = getAnalyticsEntityForActivityDetail(activity);
  const detailSourceSurface = inferAnalyticsSourceSurfaceFromReferrer(
    referrer,
    "activity_list",
  );

  queueAnalyticsEvent(
    {
      locale: analyticsLocale,
      name: activity.isActivityInfo
        ? "public_event_detail_viewed"
        : "activity_detail_viewed",
      route: `/${locale}/activities/${activity.id}`,
      entityId: detailAnalyticsEntity.entityId,
      entityType: detailAnalyticsEntity.entityType,
      sourceSurface: detailSourceSurface,
      properties: {
        category: activity.category,
        city: activity.city,
        item_kind: detailAnalyticsEntity.itemKind,
        status: activity.status,
      },
    },
    {
      referrer,
      userAgent: requestHeaders.get("user-agent"),
      userProfileId: viewerProfile?.id,
    },
  );

  if (activity.isActivityInfo) {
    const activityCategoryLabel = getCategoryLabel(activity.category, locale);
    const activityDateLabel = getActivityDateLabel(activity, locale);
    const activityLocationLabel = getActivityLocationLabel(activity);
    const activityAddressUrl = normalizeExternalUrl(activity.address);
    const activityShareLocationLabel = activityAddressUrl
      ? t.activityDetail.onlineLink
      : activityLocationLabel;
    const activityPriceLabel = getActivityPriceLabel(activity, locale);
    const activityEndBoundary = new Date(activity.endAt ?? activity.startAt);
    const isCancelled = activity.status === "CANCELLED";
    const isEndedByTime = activityEndBoundary <= new Date();
    const canCreateTeam = !isCancelled && !isEndedByTime;
    const canOpenTicketLink = Boolean(activity.ticketUrl) && canCreateTeam;
    const ticketCtaLabel = getTicketCtaLabel(locale, activity.ticketLabel);
    const unavailableReason = isCancelled
      ? publicEventCopy.eventCancelled
      : publicEventCopy.eventEnded;
    perf.finish(
      {
        itemKind: "public_event",
        hasViewer: Boolean(viewerProfile),
      },
      {
        referrer,
        route: `/${locale}/activities/${activity.id}`,
        routeKey: "public_event_detail",
        sourceSurface: "public_event_detail",
        userAgent: requestHeaders.get("user-agent"),
        userProfileId: viewerProfile?.id,
      },
    );

    return (
      <PageContainer className="space-y-6">
        <MobileNavSectionOverride
          section={activity.isActivityInfo ? "activities" : "lobby"}
        />
        <DetailSourceRestore sourceKey="activity_detail" />
        <DetailSourceReturnLink
          className="h-8 bg-white/60 px-3 text-xs shadow-none sm:h-9 sm:text-sm"
          locale={locale}
        />
        <div className="relative flex min-h-[12rem] items-end overflow-hidden rounded-[1.25rem] bg-moss p-3 shadow-[0_16px_36px_rgba(29,29,27,0.12)] sm:min-h-52 sm:p-5 md:min-h-72">
          <ActivityCoverImage
            src={activity.coverImageUrl}
            overlayClassName="bg-gradient-to-t from-black/76 via-black/34 to-black/12"
          />
          <div className="absolute right-3 top-4 z-30 flex items-start gap-2 sm:right-5 sm:top-6">
            <ActivityFavoriteButton
              activityId={activity.id}
              favoriteCount={activity.favoriteCount}
              isAuthenticated={Boolean(viewerProfile)}
              isFavorited={activityIsFavorited}
              locale={locale}
              redirectPath={`/activities/${activity.id}`}
              sourceSurface="public_event_detail"
            />
            <ReportDialog
              className="bg-white/90 text-zinc-800 shadow-sm ring-1 ring-black/10 hover:bg-white hover:text-ink"
              isAuthenticated={Boolean(viewerProfile)}
              locale={locale}
              redirectPath={`/activities/${activity.id}`}
              targetId={activity.id}
              targetType="ACTIVITY"
              variant="icon"
            />
          </div>
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/62 to-transparent" />
          <div className="relative max-w-3xl space-y-2 rounded-[1.15rem] bg-black/24 p-3 ring-1 ring-white/10 backdrop-blur-sm sm:space-y-3 sm:p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-white/95 px-2.5 py-1 text-xs font-semibold text-ink shadow-sm">
                {activityCategoryLabel}
              </span>
              <span className="rounded-md bg-white/85 px-2.5 py-1 text-xs font-medium text-zinc-700 shadow-sm">
                {publicEventCopy.detailSource}
              </span>
            </div>
            <h1 className="text-2xl font-semibold leading-tight tracking-normal text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.45)] sm:text-4xl md:text-5xl">
              {activity.title}
            </h1>
          </div>
        </div>

        <section className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <article className="min-w-0 space-y-6 lg:order-1">
            <div className="rounded-lg border border-black/10 bg-white/70 p-4 sm:p-5">
              <h2 className="text-lg font-semibold text-ink">
                {publicEventCopy.eventInfoTitle}
              </h2>
              <ActivityRichDescription
                className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-600"
                copyFailedLabel={t.activityShare.copyFailed}
                copyLabel={t.activityShare.copyLink}
                copySuccessLabel={t.activityShare.copied}
                entityId={detailAnalyticsEntity.entityId}
                entityType={detailAnalyticsEntity.entityType}
                locale={locale}
                sourceSurface="public_event_detail"
                text={activity.description}
              />
              <ManualTranslationBundle
                accessToken={accessToken ?? null}
                entityId={activity.id}
                entityType="activity"
                fields={[
                  {
                    field: "title",
                    label: t.translation.fields.title,
                    text: activity.title,
                  },
                  {
                    field: "description",
                    label: t.translation.fields.description,
                    text: activity.description,
                  },
                  {
                    field: "address",
                    label: t.translation.fields.address,
                    text: activityLocationLabel,
                  },
                  {
                    field: "priceText",
                    label: t.translation.fields.priceText,
                    text: activity.priceText,
                  },
                ]}
                locale={locale}
              />
            </div>

            {!activityAddressUrl &&
            (activity.latitude !== null ||
              activity.longitude !== null ||
              activityLocationLabel.trim()) ? (
              <>
                <ActivityMapPreview
                  address={activityLocationLabel}
                  city={activity.city}
                  latitude={activity.latitude}
                  longitude={activity.longitude}
                  openLabel={t.activityDetail.openGoogleMaps}
                  queryAddress={activity.address}
                  title={t.activityDetail.locationMapTitle}
                />
                {activity.isAddressHiddenFromViewer ? (
                  <p className="-mt-3 rounded-md border border-[#D6D5B2] bg-[#FEFFF9] px-3 py-2 text-sm font-medium text-[#156240]">
                    {t.activityDetail.hiddenAddressNotice}
                  </p>
                ) : null}
              </>
            ) : null}
          </article>

          <aside className="order-first h-fit w-full min-w-0 max-w-full rounded-[1.25rem] border border-black/10 bg-white/80 p-4 shadow-sm sm:p-5 lg:sticky lg:top-24 lg:order-2">
            <div className="mb-5 rounded-xl border border-[#8AB68E] bg-[#FEFFF9] px-3 py-3 text-sm leading-6 text-zinc-700">
              <div className="flex items-center gap-2 font-semibold text-ink">
                <Ticket className="h-4 w-4 text-[#156240]" />
                {publicEventCopy.publicEventRuleTitle}
              </div>
              <p className="mt-1 text-sm leading-6 text-zinc-600">
                {publicEventCopy.publicEventRuleDescription}
              </p>
            </div>

            <div className="mb-5">
              <ActivityShareTools
                activityTitle={activity.title}
                analyticsEntityId={detailAnalyticsEntity.entityId}
                analyticsEntityType={detailAnalyticsEntity.entityType}
                analyticsSourceSurface="public_event_detail"
                categoryLabel={activityCategoryLabel}
                coverImageUrl={activity.coverImageUrl}
                dateLabel={activityDateLabel}
                description={activity.description}
                locationLabel={activityShareLocationLabel}
                locale={locale}
                priceLabel={activityPriceLabel}
                shareKind="activity"
              />
            </div>

            {weatherInput ? (
              <ActivityWeatherWidget
                className="mb-5"
                date={weatherInput.date}
                latitude={weatherInput.latitude}
                locale={locale}
                locationQuery={weatherInput.locationQuery}
                longitude={weatherInput.longitude}
              />
            ) : null}

            <div className="space-y-4 text-sm text-zinc-700">
              <p className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="min-w-0 break-words">{activityDateLabel}</span>
                <ActivityCopyButton
                  analyticsEvent={{
                    name: "field_copied",
                    entityId: detailAnalyticsEntity.entityId,
                    entityType: detailAnalyticsEntity.entityType,
                    sourceSurface: "public_event_detail",
                    properties: {
                      field_name: "time",
                    },
                  }}
                  failedLabel={t.activityShare.copyFailed}
                  label={t.activityShare.copyTime}
                  successLabel={t.activityShare.copied}
                  value={activityDateLabel}
                />
              </p>
              {activityAddressUrl ? (
                <p className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-start gap-2">
                  <ExternalLink className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="min-w-0">
                    <span className="block font-semibold text-[#156240]">
                      {t.activityDetail.onlineLink}
                    </span>
                    <span className="block break-all text-zinc-600">
                      {activityAddressUrl}
                    </span>
                  </span>
                  <AnalyticsExternalLink
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[#156240] ring-1 ring-[#8AB68E] transition hover:bg-[#FEFFF9]"
                    event={{
                      name: "ticket_link_clicked",
                      entityId: detailAnalyticsEntity.entityId,
                      entityType: detailAnalyticsEntity.entityType,
                      sourceSurface: "public_event_detail",
                      properties: {
                        item_kind: detailAnalyticsEntity.itemKind,
                      },
                    }}
                    href={activityAddressUrl}
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </AnalyticsExternalLink>
                  <ActivityCopyButton
                    analyticsEvent={{
                      name: "field_copied",
                      entityId: detailAnalyticsEntity.entityId,
                      entityType: detailAnalyticsEntity.entityType,
                      sourceSurface: "public_event_detail",
                      properties: {
                        field_name: "online_link",
                      },
                    }}
                    failedLabel={t.activityShare.copyFailed}
                    label={t.activityShare.copyLink}
                    successLabel={t.activityShare.copied}
                    value={activityAddressUrl}
                  />
                </p>
              ) : (
                <p className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="min-w-0 break-words">
                    {activityLocationLabel}
                  </span>
                  <ActivityCopyButton
                    analyticsEvent={{
                      name: "field_copied",
                      entityId: detailAnalyticsEntity.entityId,
                      entityType: detailAnalyticsEntity.entityType,
                      sourceSurface: "public_event_detail",
                      properties: {
                        field_name: "location",
                      },
                    }}
                    failedLabel={t.activityShare.copyFailed}
                    label={t.activityShare.copyLocation}
                    successLabel={t.activityShare.copied}
                    value={activityLocationLabel}
                  />
                </p>
              )}
              <p className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2">
                <WalletCards className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="min-w-0 break-words">
                  {activityPriceLabel}
                </span>
                <ActivityCopyButton
                  analyticsEvent={{
                    name: "field_copied",
                    entityId: detailAnalyticsEntity.entityId,
                    entityType: detailAnalyticsEntity.entityType,
                    sourceSurface: "public_event_detail",
                    properties: {
                      field_name: "price",
                    },
                  }}
                  failedLabel={t.activityShare.copyFailed}
                  label={t.activityShare.copyPrice}
                  successLabel={t.activityShare.copied}
                  value={activityPriceLabel}
                />
              </p>
            </div>

            <div className="mt-6 grid gap-3">
              {canOpenTicketLink && activity.ticketUrl ? (
                <AnalyticsExternalLink
                  className="inline-flex min-h-11 min-w-0 max-w-full items-center justify-center gap-2 rounded-full bg-[#369758] px-4 py-2 text-center text-sm font-semibold leading-tight text-white shadow-[0_10px_22px_rgba(54,151,88,0.18)] transition hover:bg-[#156240]"
                  event={{
                    name: "ticket_link_clicked",
                    entityId: detailAnalyticsEntity.entityId,
                    entityType: detailAnalyticsEntity.entityType,
                    sourceSurface: "public_event_detail",
                    properties: {
                      item_kind: detailAnalyticsEntity.itemKind,
                    },
                  }}
                  href={activity.ticketUrl}
                >
                  <span className="min-w-0 leading-tight">
                    {ticketCtaLabel}
                  </span>
                  <ExternalLink className="h-4 w-4" />
                </AnalyticsExternalLink>
              ) : null}
              {activity.officialUrl ? (
                <AnalyticsExternalLink
                  className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white px-4 text-sm font-medium text-ink ring-1 ring-black/10 transition hover:bg-zinc-50"
                  event={{
                    name: "public_event_source_clicked",
                    entityId: detailAnalyticsEntity.entityId,
                    entityType: detailAnalyticsEntity.entityType,
                    sourceSurface: "public_event_detail",
                    properties: {
                      source_kind: "official_page",
                    },
                  }}
                  href={activity.officialUrl}
                >
                  {publicEventCopy.officialPage}
                  <ExternalLink className="h-4 w-4" />
                </AnalyticsExternalLink>
              ) : null}
              {canCreateTeam ? (
                <AnalyticsLink
                  href={withLocale(
                    locale,
                    `/activities/${activity.id}/teams/new`,
                  )}
                  event={{
                    name: "team_create_started",
                    entityId: detailAnalyticsEntity.entityId,
                    entityType: detailAnalyticsEntity.entityType,
                    sourceSurface: "public_event_detail",
                    properties: {
                      category: activity.category,
                      city: activity.city,
                      item_kind: detailAnalyticsEntity.itemKind,
                    },
                  }}
                >
                  <Button className="h-11 w-full whitespace-nowrap rounded-full">
                    {publicEventCopy.teamUp}
                  </Button>
                </AnalyticsLink>
              ) : (
                <p className="rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-600">
                  {unavailableReason}
                </p>
              )}
            </div>
          </aside>
        </section>
      </PageContainer>
    );
  }

  const [
    viewerParticipation,
    isFollowingOrganizer,
    comments,
    friendSignal,
    coManagerDashboard,
  ] =
    await perf.measure("activity.viewerData", () =>
      Promise.all([
        getActivityViewerParticipation(activity.id, viewerProfile?.id),
        getViewerFollowState(viewerProfile?.id, activity.organizer.id),
        getActivityComments(
          activity.id,
          viewerProfile?.id ?? null,
          viewerFriendIds,
        ),
        getActivityFriendSignal(
          activity.id,
          viewerProfile?.id,
          viewerFriendIds,
        ),
        getActivityCoManagerDashboard(activity.id, viewerProfile?.id),
      ]),
    );
  const participantPercent = getActivityParticipantPercent(activity);
  const displayStatus = getActivityDisplayStatus(activity);
  const itineraryItems = getActivityItineraryItems(activity);
  const activityEndBoundary = new Date(activity.endAt ?? activity.startAt);
  const isEndedByTime = activityEndBoundary <= new Date();
  const isClosed =
    !["RECRUITING", "CONFIRMED"].includes(activity.status) || isEndedByTime;
  const isCancelled = activity.status === "CANCELLED";
  const isFull =
    activity.capacity > 0 && activity.participantCount >= activity.capacity;
  const isOrganizer = viewerProfile?.id === activity.organizer.id;
  const isCoManager = coManagerDashboard?.role === "CO_MANAGER";
  const isTeamOperator = isOrganizer || isCoManager;
  const canManageCrewCover =
    isTeamOperator &&
    !activity.isActivityInfo &&
    activity.type !== "PUBLIC_EVENT";
  const canContactOrganizer = !isTeamOperator;
  const canEditActivity = isTeamOperator && !isCancelled && !isEndedByTime;
  const activityDetailPath = `/activities/${activity.id}`;
  const activityEditHref = withLocale(locale, `/activities/${activity.id}/edit`);
  const activityCategoryLabel = getCategoryLabel(activity.category, locale);
  const activityDateLabel = getActivityDateLabel(activity, locale);
  const activityLocationLabel = getActivityLocationLabel(activity);
  const activityAddressUrl = activity.isAddressHiddenFromViewer
    ? null
    : normalizeExternalUrl(activity.address);
  const activityShareLocationLabel = activityAddressUrl
    ? t.activityDetail.onlineLink
    : activityLocationLabel;
  const protectedLocationIsOnline =
    activity.isAddressHiddenFromViewer &&
    shouldTreatProtectedLocationAsOnline(activity);
  const protectedLocationNotice = activity.isAddressHiddenFromViewer
    ? protectedLocationIsOnline
      ? getProtectedOnlineLinkNoticeCopy(locale, activity.requiresApproval)
      : getProtectedAccessNoticeCopy(locale, activity.requiresApproval)
    : null;
  const autoCreatedTeam = activity.autoCreatedTeam;
  const autoCreatedTeamCopy = getAutoCreatedTeamCopy(locale);
  const autoCreatedClaimDeadline = formatClaimDeadline(
    locale,
    autoCreatedTeam?.claimableUntil ?? null,
  );
  const activityParticipantLabel =
    activity.capacity > 0
      ? `${activity.participantCount}/${activity.capacity} ${t.common.people}`
      : `${activity.participantCount} ${t.common.people}`;
  const participantPreview = activity.participantPreview ?? [];
  const ticketUrl =
    activity.ticketUrl ?? activity.publicEvent?.ticketUrl ?? null;
  const ticketLabel = getTicketCtaLabel(
    locale,
    activity.ticketLabel ?? activity.publicEvent?.ticketLabel,
  );
  const canOpenTicketLink =
    Boolean(ticketUrl) && !isCancelled && !isEndedByTime;
  const activityPriceLabel = getActivityPriceLabel(activity, locale);
  const activityVisibilityLabel =
    activity.visibility === "PRIVATE"
      ? t.activityDetail.visibilityPrivate
      : t.activityDetail.visibilityPublic;
  const teamDetailCtaCopy = getTeamDetailCtaCopy(locale);
  const teamOwnerCtaCopy = getTeamOwnerCtaCopy(locale);
  const teamDetailCtaTitle = getTeamDetailCtaTitle({
    isClosed,
    isFull,
    isOrganizer: isTeamOperator,
    locale,
    requiresApproval: activity.requiresApproval,
    viewerParticipationStatus: viewerParticipation?.status ?? null,
  });
  const canViewAnnouncements =
    isTeamOperator ||
    viewerParticipation?.status === "JOINED" ||
    viewerParticipation?.status === "APPROVED" ||
    viewerParticipation?.status === "PENDING";
  const teamOperatorSpaceTitle = isCoManager
    ? teamOwnerCtaCopy.managerTitle
    : teamOwnerCtaCopy.title;
  const [pendingParticipants, analyticsSummary] = await perf.measure(
    "activity.organizerData",
    () =>
      Promise.all([
        isTeamOperator && activity.requiresApproval && viewerProfile
          ? getPendingParticipants(activity.id, viewerProfile.id)
          : Promise.resolve([]),
        isTeamOperator
          ? getActivityAnalyticsSummary(activity.id)
          : Promise.resolve(null),
      ]),
  );
  perf.finish(
    {
      commentCount: comments.length,
      hasViewer: Boolean(viewerProfile),
      isOrganizer: isTeamOperator,
      itemKind: "team",
    },
    {
      referrer,
      route: `/${locale}/activities/${activity.id}`,
      routeKey: "activity_detail",
      sourceSurface: "activity_detail",
      userAgent: requestHeaders.get("user-agent"),
      userProfileId: viewerProfile?.id,
    },
  );

  return (
    <PageContainer className="space-y-6">
      <DetailSourceRestore sourceKey="activity_detail" />
      <ClaimAutoCreatedActivityCelebration
        active={claimedSuccess === "1"}
        editHref={activityEditHref}
        locale={locale}
      />
      <DetailSourceReturnLink
        className="h-8 bg-white/60 px-3 text-xs shadow-none sm:h-9 sm:text-sm"
        locale={locale}
      />
      <div className="relative flex min-h-[12rem] items-end overflow-hidden rounded-[1.25rem] bg-moss p-3 shadow-[0_16px_36px_rgba(29,29,27,0.12)] sm:min-h-52 sm:p-5 md:min-h-72">
        <ActivityCoverImage
          src={activity.coverImageUrl}
          overlayClassName="bg-gradient-to-t from-black/76 via-black/34 to-black/12"
        />
        <div className="absolute right-3 top-4 z-30 flex items-center gap-2 sm:right-5 sm:top-6">
          {!isTeamOperator ? (
            <ActivityFavoriteButton
              activityId={activity.id}
              favoriteCount={activity.favoriteCount}
              isAuthenticated={Boolean(viewerProfile)}
              isFavorited={activityIsFavorited}
              locale={locale}
              redirectPath={`/activities/${activity.id}`}
              sourceSurface="activity_detail"
            />
          ) : null}
          {canManageCrewCover ? (
            <ActivityCoverImageManager
              activityId={activity.id}
              fallbackCoverImageUrl={activity.coverImageUrl}
              initialCoverImageUrl={activity.customCoverImageUrl ?? null}
              locale={locale}
              triggerTone="detail"
            />
          ) : null}
          <ReportDialog
            className="bg-white/90 text-zinc-800 shadow-sm ring-1 ring-black/10 hover:bg-white hover:text-ink"
            isAuthenticated={Boolean(viewerProfile)}
            locale={locale}
            redirectPath={`/activities/${activity.id}`}
            targetId={activity.id}
            targetType="ACTIVITY"
            variant="icon"
          />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/62 to-transparent" />
        <div className="relative max-w-3xl space-y-2 rounded-[1.15rem] bg-black/24 p-3 ring-1 ring-white/10 backdrop-blur-sm sm:space-y-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-white/95 px-2.5 py-1 text-xs font-semibold text-ink shadow-sm">
              {activityCategoryLabel}
            </span>
            <ActivityStatusBadge status={displayStatus} locale={locale} />
          </div>
          <h1 className="text-2xl font-semibold leading-tight tracking-normal text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.45)] sm:text-4xl md:text-5xl">
            {activity.title}
          </h1>
        </div>
      </div>

      <section className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="min-w-0 space-y-6 lg:order-1">
          <div className="rounded-lg border border-black/10 bg-white/70 p-4 sm:p-5">
            <h2 className="text-lg font-semibold text-ink">
              {t.activityDetail.descriptionTitle}
            </h2>
            <ActivityRichDescription
              className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-600"
              copyFailedLabel={t.activityShare.copyFailed}
              copyLabel={t.activityShare.copyLink}
              copySuccessLabel={t.activityShare.copied}
              entityId={detailAnalyticsEntity.entityId}
              entityType={detailAnalyticsEntity.entityType}
              locale={locale}
              sourceSurface="activity_detail"
              text={activity.description}
            />
            <ManualTranslationBundle
              accessToken={accessToken ?? null}
              entityId={activity.id}
              entityType="activity"
              fields={[
                {
                  field: "title",
                  label: t.translation.fields.title,
                  text: activity.title,
                },
                {
                  field: "description",
                  label: t.translation.fields.description,
                  text: activity.description,
                },
                {
                  field: "address",
                  label: t.translation.fields.address,
                  text: activityLocationLabel,
                },
                {
                  field: "priceText",
                  label: t.translation.fields.priceText,
                  text: activity.priceText,
                },
                {
                  field: "itinerary",
                  label: t.translation.fields.itinerary,
                  text: activity.itinerary,
                },
              ]}
              locale={locale}
            />
          </div>

          <div className="rounded-lg border border-black/10 bg-white/70 p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <Route className="h-5 w-5 text-moss" />
              <h2 className="text-lg font-semibold text-ink">
                {t.activityDetail.itineraryTitle}
              </h2>
            </div>
            {itineraryItems.length > 0 ? (
              <ol className="mt-4 space-y-3">
                {itineraryItems.map((item, index) => (
                  <li
                    key={`${item}-${index}`}
                    className="flex gap-3 text-sm leading-6 text-zinc-600"
                  >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-moss text-xs font-semibold text-white">
                      {index + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-sm leading-7 text-zinc-500">
                {t.activityDetail.emptyItinerary}
              </p>
            )}
          </div>

          {protectedLocationNotice ? (
            <ProtectedDetailNotice
              icon={protectedLocationIsOnline ? "link" : "address"}
              label={protectedLocationNotice}
            />
          ) : !activityAddressUrl &&
            (activity.latitude !== null ||
              activity.longitude !== null ||
              activityLocationLabel.trim()) ? (
            <div>
              <ActivityMapPreview
                address={activityLocationLabel}
                city={activity.city}
                latitude={activity.latitude}
                longitude={activity.longitude}
                openLabel={t.activityDetail.openGoogleMaps}
                queryAddress={activity.address}
                title={t.activityDetail.locationMapTitle}
              />
            </div>
          ) : null}

          {activity.publicEvent ? (
            <div className="rounded-[1.25rem] border border-[#8AB68E] bg-[#FEFFF9] p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#156240] ring-1 ring-[#8AB68E]">
                    <ExternalLink className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#156240]">
                      {publicEventCopy.linkedEventTitle}
                    </p>
                    <p className="mt-1 line-clamp-2 text-base font-semibold text-ink">
                      {activity.publicEvent.title}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-zinc-600">
                      {publicEventCopy.linkedEventDescription}
                    </p>
                    {activity.publicEvent.status === "CANCELLED" ? (
                      <p className="mt-3 inline-flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-sm font-medium leading-6 text-red-700 ring-1 ring-red-200">
                        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{publicEventCopy.eventCancelled}</span>
                      </p>
                    ) : null}
                  </div>
                </div>
                <Link
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white px-4 text-sm font-medium text-ink ring-1 ring-black/10 transition hover:bg-zinc-50"
                  href={withLocale(
                    locale,
                    `/public-events/${activity.publicEvent.id}`,
                  )}
                >
                  {publicEventCopy.linkedEventCta}
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ) : null}

          {isTeamOperator && activity.requiresApproval ? (
            <ParticipationApprovalPanel
              activityId={activity.id}
              locale={locale}
              pendingParticipants={pendingParticipants}
            />
          ) : null}

          {activity.merchant ? (
            <div className="rounded-lg border border-black/10 bg-white/70 p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-moss" />
                <h2 className="text-lg font-semibold text-ink">
                  {t.merchant.detailTitle}
                </h2>
              </div>
              <div className="mt-4 flex flex-col gap-3 rounded-md bg-paper/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-ink">
                    {activity.merchant.name}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">
                    {activity.merchant.city}
                  </p>
                </div>
                <ContextualDetailLink
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-white px-4 text-sm font-medium text-ink ring-1 ring-black/10 transition hover:bg-zinc-50"
                  href={withLocale(
                    locale,
                    `/merchants/${activity.merchant.slug}`,
                  )}
                  detailSource={{
                    sourceKey: "activity_detail",
                    targetKey: `merchant:${activity.merchant.slug}`,
                    targetKind: "merchant",
                  }}
                  data-detail-source-target={`merchant:${activity.merchant.slug}`}
                >
                  {t.merchant.viewProfile}
                  <ExternalLink className="h-4 w-4" />
                </ContextualDetailLink>
              </div>
            </div>
          ) : null}

          <div className="rounded-lg border border-black/10 bg-white/70 p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <UserRound className="h-5 w-5 text-moss" />
              <h2 className="text-lg font-semibold text-ink">
                {t.activityDetail.organizerTitle}
              </h2>
            </div>
            <div className="mt-4 flex items-start gap-3">
              <UserProfilePreviewPopover
                avatarUrl={activity.organizer.avatarUrl}
                isAuthenticated={Boolean(viewerProfile)}
                locale={locale}
                nickname={activity.organizer.nickname}
                profileId={activity.organizer.id}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-100 text-sm font-semibold text-ink">
                  {activity.organizer.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={activity.organizer.avatarUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    getActivityOrganizerInitial(activity)
                  )}
                </div>
              </UserProfilePreviewPopover>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">
                  {activity.organizer.nickname}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
                  <span>
                    {followLabels.followers} {activity.organizer.followerCount}
                  </span>
                  <span>
                    {followLabels.followingCount}{" "}
                    {activity.organizer.followingCount}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-6 text-zinc-600">
                  {activity.organizer.bio ?? t.activityDetail.emptyOrganizerBio}
                </p>
              </div>
            </div>
            {!isOrganizer ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <FollowButton
                  buttonClassName="h-10 rounded-full border border-[#8AB68E] bg-[#FEFFF9] px-5 text-[#156240] shadow-none hover:bg-white"
                  fullWidth={false}
                  isAuthenticated={Boolean(viewerProfile)}
                  isFollowing={isFollowingOrganizer}
                  locale={locale}
                  redirectPath={`/activities/${activity.id}`}
                  targetUserProfileId={activity.organizer.id}
                />
              </div>
            ) : null}
          </div>

          <ActivityAnnouncementsSection
            activityId={activity.id}
            announcements={activity.announcements}
            canView={canViewAnnouncements}
            isOrganizer={isTeamOperator}
            locale={locale}
          />

          <ActivityCommentsSection
            activityId={activity.id}
            comments={comments}
            isAuthenticated={Boolean(viewerProfile)}
            locale={locale}
            translationAccessToken={accessToken ?? null}
            viewerProfileId={viewerProfile?.id ?? null}
          />
        </article>

        <aside className="order-first flex h-fit w-full min-w-0 max-w-full flex-col lg:sticky lg:top-24 lg:order-2">
          <div className="order-1 hidden rounded-[1.35rem] border border-coral/45 bg-[linear-gradient(145deg,#FFF5E6_0%,#FEFFF9_54%,#F1F2EC_100%)] p-4 shadow-[0_18px_42px_rgba(240,145,130,0.14)] ring-1 ring-white md:block">
            <div className="mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-forest">
                {teamDetailCtaCopy.eyebrow}
              </p>
              <h2 className="mt-1 text-xl font-extrabold leading-tight text-ink">
                {teamDetailCtaTitle}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-forest">
                <span className="rounded-full bg-white/88 px-3 py-1 ring-1 ring-sage/70">
                  {getActivitySeatLabel(activity, locale)}
                </span>
                <span className="rounded-full bg-white/88 px-3 py-1 ring-1 ring-sage/70">
                  {activityParticipantLabel}
                </span>
              </div>
              <ApprovalModeNotice
                className="mt-3"
                isOrganizer={isTeamOperator}
                locale={locale}
                pendingCount={pendingParticipants.length}
                requiresApproval={activity.requiresApproval}
              />
            </div>

            {isTeamOperator ? (
              <div className="grid gap-3">
                <div className="grid gap-2 rounded-2xl border border-[#8AB68E]/55 bg-white/82 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                  <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <ShieldAlert className="h-4 w-4 text-forest" />
                    {teamOperatorSpaceTitle}
                  </p>
                  {canEditActivity ? (
                    <Link
                      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#156240] px-4 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(21,98,64,0.18)] transition hover:-translate-y-0.5 hover:bg-[#369758]"
                      href={activityEditHref}
                    >
                      <Pencil className="h-4 w-4" />
                      {teamOwnerCtaCopy.manage}
                    </Link>
                  ) : null}
                  {canEditActivity ? (
                    <p className="px-1 text-xs leading-5 text-[#156240]/70">
                      {teamOwnerCtaCopy.manageDescription}
                    </p>
                  ) : null}
                  <a
                    className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-[#8AB68E]/80 bg-[#FEFFF9] px-4 text-sm font-semibold text-[#156240] transition hover:-translate-y-0.5 hover:bg-[#F1F2EC]"
                    href={
                      activity.requiresApproval
                        ? "#participation-approval"
                        : "#activity-participants"
                    }
                  >
                    <ClipboardList className="h-4 w-4" />
                    {teamOwnerCtaCopy.review}
                  </a>
                  <a
                    className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-[#D6D5B2] bg-[#FFF5E6]/82 px-4 text-sm font-semibold text-[#156240] transition hover:-translate-y-0.5 hover:bg-white"
                    href="#activity-participants"
                  >
                    <UsersRound className="h-4 w-4" />
                    {teamOwnerCtaCopy.contactParticipants}
                  </a>
                  <p className="px-1 text-xs leading-5 text-zinc-500">
                    {teamOwnerCtaCopy.reviewDescription}
                  </p>
                </div>
                {coManagerDashboard ? (
                  <ActivityCoManagerPanel
                    dashboard={coManagerDashboard}
                    locale={locale}
                  />
                ) : null}
                <div className="grid gap-2 rounded-2xl border border-sand bg-white/74 p-3">
                  {!isCancelled && !isEndedByTime ? (
                    <p className="text-xs leading-5 text-zinc-500">
                      {t.activityOwner.cancelDescription}
                    </p>
                  ) : null}
                  <CancelActivityForm
                    activityId={activity.id}
                    activityTitle={activity.title}
                    disabled={isCancelled || isEndedByTime}
                    locale={locale}
                  />
                  {isCancelled ? (
                    <p className="text-xs leading-5 text-zinc-500">
                      {t.activityOwner.cancelledHint}
                    </p>
                  ) : isEndedByTime ? (
                    <p className="text-xs leading-5 text-zinc-500">
                      {t.activityOwner.endedHint}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="grid gap-3">
                <JoinActivityForm
                  activityId={activity.id}
                  activityTitle={activity.title}
                  accessToken={accessToken ?? null}
                  compactUnauthenticated
                  formInstanceId="desktop"
                  locale={locale}
                  requiresApproval={activity.requiresApproval}
                  isFull={isFull}
                  isClosed={isClosed}
                  isOrganizer={isOrganizer}
                  isAuthenticated={Boolean(viewerProfile)}
                  viewerParticipationStatus={
                    viewerParticipation?.status ?? null
                  }
                />
                {canContactOrganizer ? (
                  <ContactOrganizerForm
                    accessToken={accessToken ?? null}
                    activityId={activity.id}
                    isAuthenticated={Boolean(viewerProfile)}
                    locale={locale}
                    organizerNickname={activity.organizer.nickname}
                    organizerProfileId={activity.organizer.id}
                  />
                ) : null}
              </div>
            )}
          </div>

          <div
            id="activity-participants"
            className="order-2 mt-3 scroll-mt-24 rounded-[1.25rem] border border-[#8AB68E] bg-[#FEFFF9] p-4 shadow-sm"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#156240]">
                    {t.activityDetail.participants}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-zinc-600">
                    {activityParticipantLabel}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink ring-1 ring-[#8AB68E]">
                  {getActivitySeatLabel(activity, locale)}
                </span>
              </div>
              {activity.capacity > 0 ? (
                <div className="h-2 overflow-hidden rounded-full bg-[#D6D5B2]">
                  <div
                    className="h-full rounded-full bg-[#369758]"
                    style={{ width: `${participantPercent}%` }}
                  />
                </div>
              ) : null}
              {participantPreview.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {participantPreview.map((participant) => (
                    <span key={participant.id}>
                      <UserProfilePreviewPopover
                        avatarUrl={participant.avatarUrl}
                        isAuthenticated={Boolean(viewerProfile)}
                        isGuest={participant.kind !== "user"}
                        locale={locale}
                        nickname={participant.nickname}
                        profileId={participant.id}
                      >
                        <span
                          className="group relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-white text-xs font-semibold shadow-sm outline-none ring-1 ring-[#8AB68E] transition hover:-translate-y-0.5 focus-visible:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#369758]"
                          aria-label={participant.nickname}
                          title={participant.nickname}
                        >
                          <span
                            className={`flex h-full w-full items-center justify-center overflow-hidden rounded-full text-[11px] font-semibold ${getStableParticipantAvatarTone(participant.id)}`}
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
                              getParticipantInitial(participant.nickname)
                            )}
                          </span>
                        </span>
                      </UserProfilePreviewPopover>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="order-3 mt-3">
            <ActivityShareTools
              activityTitle={activity.title}
              analyticsEntityId={detailAnalyticsEntity.entityId}
              analyticsEntityType={detailAnalyticsEntity.entityType}
              analyticsSourceSurface="activity_detail"
              categoryLabel={activityCategoryLabel}
              coverImageUrl={activity.coverImageUrl}
              dateLabel={activityDateLabel}
              description={activity.description}
              locationLabel={activityShareLocationLabel}
              locale={locale}
              priceLabel={activityPriceLabel}
              shareKind="team"
              sharePath={privateSharePath}
            />
          </div>

          {weatherInput ? (
            <ActivityWeatherWidget
              className="order-4 mt-3"
              date={weatherInput.date}
              latitude={weatherInput.latitude}
              locale={locale}
              locationQuery={weatherInput.locationQuery}
              longitude={weatherInput.longitude}
            />
          ) : null}

          <div className="order-5 mt-3 space-y-3 rounded-[1.1rem] border border-sand bg-white/68 p-3 text-sm text-zinc-700 sm:p-4">
            <p className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0 break-words">{activityDateLabel}</span>
              <ActivityCopyButton
                analyticsEvent={{
                  name: "field_copied",
                  entityId: detailAnalyticsEntity.entityId,
                  entityType: detailAnalyticsEntity.entityType,
                  sourceSurface: "activity_detail",
                  properties: {
                    field_name: "time",
                  },
                }}
                failedLabel={t.activityShare.copyFailed}
                label={t.activityShare.copyTime}
                successLabel={t.activityShare.copied}
                value={activityDateLabel}
              />
            </p>
            {protectedLocationNotice ? (
              <p className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2 text-[#156240]">
                {protectedLocationIsOnline ? (
                  <ExternalLink className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <span className="min-w-0 break-words font-semibold">
                  {protectedLocationNotice}
                </span>
              </p>
            ) : activityAddressUrl ? (
              <p className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-start gap-2">
                <ExternalLink className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="min-w-0">
                  <span className="block font-semibold text-[#156240]">
                    {t.activityDetail.onlineLink}
                  </span>
                  <span className="block break-all text-zinc-600">
                    {activityAddressUrl}
                  </span>
                </span>
                <AnalyticsExternalLink
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[#156240] ring-1 ring-[#8AB68E] transition hover:bg-[#FEFFF9]"
                  event={{
                    name: "ticket_link_clicked",
                    entityId: detailAnalyticsEntity.entityId,
                    entityType: detailAnalyticsEntity.entityType,
                    sourceSurface: "activity_detail",
                    properties: {
                      item_kind: detailAnalyticsEntity.itemKind,
                    },
                  }}
                  href={activityAddressUrl}
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </AnalyticsExternalLink>
                <ActivityCopyButton
                  analyticsEvent={{
                    name: "field_copied",
                    entityId: detailAnalyticsEntity.entityId,
                    entityType: detailAnalyticsEntity.entityType,
                    sourceSurface: "activity_detail",
                    properties: {
                      field_name: "online_link",
                    },
                  }}
                  failedLabel={t.activityShare.copyFailed}
                  label={t.activityShare.copyLink}
                  successLabel={t.activityShare.copied}
                  value={activityAddressUrl}
                />
              </p>
            ) : (
              <p className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="min-w-0 break-words">
                  {activityLocationLabel}
                </span>
                <ActivityCopyButton
                  analyticsEvent={{
                    name: "field_copied",
                    entityId: detailAnalyticsEntity.entityId,
                    entityType: detailAnalyticsEntity.entityType,
                    sourceSurface: "activity_detail",
                    properties: {
                      field_name: "location",
                    },
                  }}
                  failedLabel={t.activityShare.copyFailed}
                  label={t.activityShare.copyLocation}
                  successLabel={t.activityShare.copied}
                  value={activityLocationLabel}
                />
              </p>
            )}
            <p className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2">
              <span className="flex min-w-0 items-center gap-2 text-zinc-500">
                <WalletCards className="h-4 w-4 shrink-0" />
                {t.activityDetail.price}
              </span>
              <span className="min-w-0 break-words text-right font-medium text-ink">
                {activityPriceLabel}
              </span>
              <ActivityCopyButton
                analyticsEvent={{
                  name: "field_copied",
                  entityId: detailAnalyticsEntity.entityId,
                  entityType: detailAnalyticsEntity.entityType,
                  sourceSurface: "activity_detail",
                  properties: {
                    field_name: "price",
                  },
                }}
                failedLabel={t.activityShare.copyFailed}
                label={t.activityShare.copyPrice}
                successLabel={t.activityShare.copied}
                value={activityPriceLabel}
              />
            </p>
            <p className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2 text-zinc-600">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0">
                {activity.requiresApproval
                  ? t.activityDetail.approvalRequired
                  : t.activityDetail.approvalAuto}
              </span>
            </p>

            {canOpenTicketLink && ticketUrl ? (
              <AnalyticsExternalLink
                className="inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-2 rounded-full bg-[#369758] px-4 py-2 text-center text-sm font-semibold leading-tight text-white shadow-[0_10px_22px_rgba(54,151,88,0.18)] transition hover:bg-[#156240]"
                event={{
                  name: "ticket_link_clicked",
                  entityId: detailAnalyticsEntity.entityId,
                  entityType: detailAnalyticsEntity.entityType,
                  sourceSurface: "activity_detail",
                  properties: {
                    item_kind: detailAnalyticsEntity.itemKind,
                  },
                }}
                href={ticketUrl}
              >
                <span className="min-w-0 leading-tight">{ticketLabel}</span>
                <ExternalLink className="h-4 w-4" />
              </AnalyticsExternalLink>
            ) : null}

            {activity.publicEvent ? (
              <Link
                className="inline-flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white px-4 text-sm font-medium text-ink ring-1 ring-black/10 transition hover:bg-zinc-50"
                href={withLocale(
                  locale,
                  `/public-events/${activity.publicEvent.id}`,
                )}
              >
                {publicEventCopy.linkedEventCta}
                <ExternalLink className="h-4 w-4" />
              </Link>
            ) : null}

            {autoCreatedTeam?.isClaimable && !isTeamOperator ? (
              <div className="mt-3 rounded-2xl border border-[#8AB68E] bg-[#FEFFF9] p-3">
                {autoCreatedClaimDeadline ? (
                  <p className="text-[11px] font-semibold text-[#156240]">
                    {autoCreatedTeamCopy.deadlinePrefix}{" "}
                    {autoCreatedClaimDeadline}
                  </p>
                ) : null}
                <p className="mt-2 text-xs leading-5 text-[#156240]">
                  {autoCreatedTeamCopy.claimHint}
                </p>
                {autoCreatedTeam.isClaimable ? (
                  <div className="mt-3">
                    <ClaimAutoCreatedActivityButton
                      activityId={activity.id}
                      isAuthenticated={Boolean(viewerProfile)}
                      locale={locale}
                      redirectPath={activityDetailPath}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="order-6 mt-4 space-y-4 text-sm text-zinc-700 lg:mt-5">
            <p className="grid grid-cols-[minmax(0,1fr)_minmax(0,50%)] items-start gap-3">
              <span className="flex min-w-0 items-center gap-2 text-zinc-500">
                <ClipboardList className="h-4 w-4 shrink-0" />
                {t.activityDetail.type}
              </span>
              <span className="min-w-0 break-words text-right font-medium text-ink">
                {getTypeLabel(activity.type, locale)}
              </span>
            </p>
            <p className="grid grid-cols-[minmax(0,1fr)_minmax(0,50%)] items-start gap-3">
              <span className="flex min-w-0 items-center gap-2 text-zinc-500">
                <UsersRound className="h-4 w-4 shrink-0" />
                {t.activityDetail.visibility}
              </span>
              <span className="min-w-0 break-words text-right font-medium text-ink">
                {activityVisibilityLabel}
              </span>
            </p>
            {activity.destination ? (
              <p className="grid grid-cols-[minmax(0,1fr)_minmax(0,50%)] items-start gap-3">
                <span className="min-w-0 text-zinc-500">
                  {t.activityDetail.destination}
                </span>
                <span className="min-w-0 break-words text-right font-medium text-ink">
                  {activity.destination}
                </span>
              </p>
            ) : null}
            {activity.minParticipants ? (
              <p className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <span className="min-w-0 text-zinc-500">
                  {t.activityDetail.minParticipants}
                </span>
                <span className="shrink-0 text-right font-medium text-ink">
                  {activity.minParticipants} {t.common.people}
                </span>
              </p>
            ) : null}
            <ActivityFriendSignalPanel locale={locale} signal={friendSignal} />
          </div>

          <div className="order-7 mt-6 hidden lg:block">
            <ActivityAnalyticsSummaryPanel
              locale={locale}
              summary={analyticsSummary}
            />
          </div>
        </aside>
        {!isTeamOperator ? (
          <TeamDetailMobileCtaSheet
            activityTitle={activity.title}
            locale={locale}
            participantLabel={activityParticipantLabel}
            statusLabel={getActivitySeatLabel(activity, locale)}
          >
            <div className="grid gap-3">
              <ApprovalModeNotice
                isOrganizer={false}
                locale={locale}
                requiresApproval={activity.requiresApproval}
              />
              <JoinActivityForm
                activityId={activity.id}
                activityTitle={activity.title}
                accessToken={accessToken ?? null}
                compactUnauthenticated
                formInstanceId="mobile"
                locale={locale}
                requiresApproval={activity.requiresApproval}
                isFull={isFull}
                isClosed={isClosed}
                isOrganizer={isOrganizer}
                isAuthenticated={Boolean(viewerProfile)}
                viewerParticipationStatus={viewerParticipation?.status ?? null}
              />
              {canContactOrganizer ? (
                <ContactOrganizerForm
                  accessToken={accessToken ?? null}
                  activityId={activity.id}
                  isAuthenticated={Boolean(viewerProfile)}
                  locale={locale}
                  organizerNickname={activity.organizer.nickname}
                  organizerProfileId={activity.organizer.id}
                />
              ) : null}
            </div>
          </TeamDetailMobileCtaSheet>
        ) : null}
        {isTeamOperator ? (
          <TeamDetailMobileCtaSheet
            activityTitle={activity.title}
            locale={locale}
            mode="manage"
            participantLabel={activityParticipantLabel}
            statusLabel={getActivitySeatLabel(activity, locale)}
          >
            <div className="grid gap-3">
              <ApprovalModeNotice
                isOrganizer
                locale={locale}
                pendingCount={pendingParticipants.length}
                requiresApproval={activity.requiresApproval}
              />
              {canEditActivity ? (
                <Link
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#156240] px-4 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(21,98,64,0.18)] transition active:scale-[0.98]"
                  href={activityEditHref}
                >
                  <Pencil className="h-4 w-4" />
                  {teamOwnerCtaCopy.manage}
                </Link>
              ) : null}
              <a
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[#8AB68E]/80 bg-[#FEFFF9] px-4 text-sm font-semibold text-[#156240] transition active:scale-[0.98]"
                href={
                  activity.requiresApproval
                    ? "#participation-approval"
                    : "#activity-participants"
                }
              >
                <ClipboardList className="h-4 w-4" />
                {teamOwnerCtaCopy.review}
              </a>
              <a
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[#D6D5B2] bg-[#FFF5E6]/82 px-4 text-sm font-semibold text-[#156240] transition active:scale-[0.98]"
                href="#activity-participants"
              >
                <UsersRound className="h-4 w-4" />
                {teamOwnerCtaCopy.contactParticipants}
              </a>
              {coManagerDashboard ? (
                <ActivityCoManagerPanel
                  dashboard={coManagerDashboard}
                  locale={locale}
                />
              ) : null}
              <div className="rounded-2xl border border-sand bg-white/76 p-3">
                {!isCancelled && !isEndedByTime ? (
                  <p className="mb-2 text-xs leading-5 text-zinc-500">
                    {t.activityOwner.cancelDescription}
                  </p>
                ) : null}
                <CancelActivityForm
                  activityId={activity.id}
                  activityTitle={activity.title}
                  disabled={isCancelled || isEndedByTime}
                  locale={locale}
                />
              </div>
            </div>
          </TeamDetailMobileCtaSheet>
        ) : null}
      </section>
    </PageContainer>
  );
}

function ContactOrganizerForm({
  accessToken,
  activityId,
  isAuthenticated,
  locale,
  organizerNickname,
  organizerProfileId,
}: {
  accessToken?: string | null;
  activityId: string;
  isAuthenticated: boolean;
  locale: string;
  organizerNickname: string;
  organizerProfileId: string;
}) {
  const t = getCopy(locale);
  const label = isAuthenticated
    ? t.activityDetail.contactOrganizer
    : t.activityDetail.contactOrganizerLogin;

  return (
    <ActivityOrganizerContactForm
      accessToken={accessToken}
      activityId={activityId}
      hint={t.activityDetail.contactOrganizerHint}
      isAuthenticated={isAuthenticated}
      label={label}
      locale={locale}
      organizerNickname={organizerNickname}
      organizerProfileId={organizerProfileId}
    />
  );
}

function getAnnouncementSectionCopy(locale: string) {
  if (locale === "fr") {
    return {
      title: "Annonces du groupe",
      empty: "Aucune annonce pour le moment.",
      organizerEmpty:
        "Utilisez cet espace pour prévenir tout le monde d'un changement d'heure, d'un point de rendez-vous ou d'un rappel utile.",
      participantEmpty:
        "Les nouvelles annonces de l'organisateur apparaîtront ici.",
      locked:
        "Rejoignez cette activité pour voir les annonces du groupe et les mises à jour de l'organisateur.",
      organizerLabel: "Organisateur",
      latestLabel: "Nouveau",
    };
  }

  if (locale === "en") {
    return {
      title: "Group announcements",
      empty: "No announcements yet.",
      organizerEmpty:
        "Use this space to notify everyone about time changes, meeting points, or quick reminders.",
      participantEmpty: "New organizer announcements will appear here.",
      locked:
        "Join this activity to view group announcements and organizer updates.",
      organizerLabel: "Organizer",
      latestLabel: "Latest",
    };
  }

  return {
    title: "群公告",
    empty: "暂时还没有公告。",
    organizerEmpty: "这里可以统一通知时间变化、集合点、注意事项等。",
    participantEmpty: "发起人的新公告会显示在这里。",
    locked: "报名后可见群公告和发起人的最新通知。",
    organizerLabel: "发起人",
    latestLabel: "最新",
  };
}

function ActivityAnnouncementsSection({
  activityId,
  announcements,
  canView,
  isOrganizer,
  locale,
}: {
  activityId: string;
  announcements: {
    id: string;
    authorName: string;
    content: string;
    createdAt: string;
    isByOrganizer: boolean;
  }[];
  canView: boolean;
  isOrganizer: boolean;
  locale: string;
}) {
  const copy = getAnnouncementSectionCopy(locale);

  return (
    <section className="rounded-[1.35rem] border border-sand bg-white/72 p-4 shadow-[0_18px_42px_rgba(21,98,64,0.06)] ring-1 ring-white/70">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-[#156240]" />
          <h2 className="text-lg font-semibold text-ink">{copy.title}</h2>
        </div>

        {isOrganizer && canView ? (
          <ActivityAnnouncementComposer
            activityId={activityId}
            locale={locale}
            compact
          />
        ) : null}
      </div>

      {!canView ? (
        <p className="mt-4 rounded-[1rem] border border-dashed border-[#D6D5B2] bg-[#FEFFF9] px-4 py-3 text-sm leading-6 text-[#156240]">
          {copy.locked}
        </p>
      ) : null}

      {canView && announcements.length > 0 ? (
        <div className="mt-4 grid gap-2.5">
          {announcements.map((announcement) => (
            <article
              key={announcement.id}
              className={cn(
                "rounded-[1rem] border bg-[#FEFFF9] px-4 py-3 shadow-sm",
                announcement.id === announcements[0]?.id
                  ? "border-[#8AB68E] ring-1 ring-[#8AB68E]/35"
                  : "border-[#D6D5B2]",
              )}
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#8E8383]">
                <span className="rounded-full bg-white px-2.5 py-1 font-semibold text-[#156240] ring-1 ring-[#8AB68E]/45">
                  {announcement.authorName || copy.organizerLabel}
                </span>
                {announcement.id === announcements[0]?.id ? (
                  <span className="rounded-full bg-[#156240] px-2.5 py-1 font-semibold text-white">
                    {copy.latestLabel}
                  </span>
                ) : null}
                <span>{formatActivityDate(announcement.createdAt, locale)}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-ink">
                {announcement.content}
              </p>
            </article>
          ))}
        </div>
      ) : canView ? (
        <div className="mt-4 rounded-[1rem] border border-dashed border-[#D6D5B2] bg-[#FEFFF9] px-4 py-3">
          <p className="text-sm leading-6 text-[#156240]">
            {isOrganizer ? copy.organizerEmpty : copy.participantEmpty}
          </p>
        </div>
      ) : null}
    </section>
  );
}
