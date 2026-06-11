import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  MapPin,
  MessageCircle,
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
import { ActivityCommentsSection } from "@/features/activities/components/ActivityCommentsSection";
import { ActivityCopyButton } from "@/features/activities/components/ActivityCopyButton";
import { ActivityCoverImage } from "@/features/activities/components/ActivityCoverImage";
import { ActivityMapPreview } from "@/features/activities/components/ActivityMapPreview";
import { ActivityShareTools } from "@/features/activities/components/ActivityShareTools";
import { JoinActivityForm } from "@/features/activities/components/JoinActivityForm";
import { ParticipationApprovalPanel } from "@/features/activities/components/ParticipationApprovalPanel";
import { getActivityById } from "@/features/activities/queries/getActivityById";
import { getActivityComments } from "@/features/activities/queries/getActivityComments";
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
import { openActivityOrganizerConversationAction } from "@/features/direct-messages/actions/directMessageActions";
import { getPublicEventCopy } from "@/features/public-events/copy";
import { ReportDialog } from "@/features/reports/components/ReportDialog";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";
import { getCategoryLabel, getCopy, getTypeLabel } from "@/lib/copy";
import { createPerformanceTracker } from "@/lib/performance";
import { withLocale } from "@/lib/routes";

type ActivityDetailPageProps = {
  params: Promise<{
    locale: string;
    activityId: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function ActivityDetailPage({
  params,
}: ActivityDetailPageProps) {
  const { locale, activityId } = await params;
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
      getActivityById(activityId, viewerProfile?.id ?? null, viewerFriendIds),
    ),
    perf.measure("activity.favoriteState", () =>
      getViewerActivityFavorite(activityId, viewerProfile?.id),
    ),
  ]);

  if (!activity) {
    notFound();
  }

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
    const activityPriceLabel = getActivityPriceLabel(activity, locale);
    const activityEndBoundary = new Date(activity.endAt ?? activity.startAt);
    const isCancelled = activity.status === "CANCELLED";
    const isEndedByTime = activityEndBoundary <= new Date();
    const canCreateTeam = !isCancelled && !isEndedByTime;
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
        <div className="relative flex min-h-52 items-end overflow-hidden rounded-[1.25rem] bg-moss p-4 shadow-[0_16px_36px_rgba(58,49,34,0.12)] sm:p-5 md:min-h-72">
          <ActivityCoverImage
            src={activity.coverImageUrl}
            overlayClassName="bg-gradient-to-t from-black/76 via-black/34 to-black/12"
          />
          <div className="absolute right-4 top-4 z-30 flex items-start gap-2 sm:right-5 sm:top-5">
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
              isAuthenticated={Boolean(viewerProfile)}
              locale={locale}
              redirectPath={`/activities/${activity.id}`}
              targetId={activity.id}
              targetType="ACTIVITY"
              variant="icon"
            />
          </div>
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/62 to-transparent" />
          <div className="relative max-w-3xl space-y-3 rounded-[1.15rem] bg-black/26 p-3 ring-1 ring-white/10 backdrop-blur-sm sm:p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-white/95 px-2.5 py-1 text-xs font-semibold text-ink shadow-sm">
                {activityCategoryLabel}
              </span>
              <span className="rounded-md bg-white/85 px-2.5 py-1 text-xs font-medium text-zinc-700 shadow-sm">
                {publicEventCopy.detailSource}
              </span>
            </div>
            <h1 className="text-3xl font-semibold leading-tight tracking-normal text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.45)] sm:text-4xl md:text-5xl">
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
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-zinc-600">
                {activity.description}
              </p>
            </div>

            {activity.latitude !== null && activity.longitude !== null ? (
              <ActivityMapPreview
                address={activityLocationLabel}
                latitude={activity.latitude}
                longitude={activity.longitude}
                openLabel={t.activityDetail.openMap}
                title={t.activityDetail.locationMapTitle}
              />
            ) : null}
          </article>

          <aside className="order-first h-fit w-full min-w-0 max-w-full rounded-[1.25rem] border border-black/10 bg-white/80 p-4 shadow-sm sm:p-5 lg:sticky lg:top-24 lg:order-2">
            <div className="mb-5 rounded-xl border border-[#dccba8] bg-[#fff8ec] px-3 py-3 text-sm leading-6 text-zinc-700">
              <div className="flex items-center gap-2 font-semibold text-ink">
                <Ticket className="h-4 w-4 text-[#8a6a40]" />
                {publicEventCopy.publicEventRuleTitle}
              </div>
              <p className="mt-1 text-sm leading-6 text-zinc-600">
                {publicEventCopy.publicEventRuleDescription}
              </p>
            </div>

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

  const [viewerParticipation, isFollowingOrganizer, comments, friendSignal] =
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
  const canContactOrganizer = !isOrganizer;
  const canEditActivity = isOrganizer && !isCancelled && !isEndedByTime;
  const activityCategoryLabel = getCategoryLabel(activity.category, locale);
  const activityDateLabel = getActivityDateLabel(activity, locale);
  const activityLocationLabel = getActivityLocationLabel(activity);
  const activityParticipantLabel =
    activity.capacity > 0
      ? `${activity.participantCount}/${activity.capacity} ${t.common.people}`
      : `${activity.participantCount} ${t.common.people}`;
  const activityPriceLabel = getActivityPriceLabel(activity, locale);
  const activityVisibilityLabel =
    activity.visibility === "PRIVATE"
      ? t.activityDetail.visibilityPrivate
      : t.activityDetail.visibilityPublic;
  const [pendingParticipants, analyticsSummary] = await perf.measure(
    "activity.organizerData",
    () =>
      Promise.all([
        isOrganizer && activity.requiresApproval && viewerProfile
          ? getPendingParticipants(activity.id, viewerProfile.id)
          : Promise.resolve([]),
        isOrganizer
          ? getActivityAnalyticsSummary(activity.id)
          : Promise.resolve(null),
      ]),
  );
  perf.finish(
    {
      commentCount: comments.length,
      hasViewer: Boolean(viewerProfile),
      isOrganizer,
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
      <div className="relative flex min-h-52 items-end overflow-hidden rounded-[1.25rem] bg-moss p-4 shadow-[0_16px_36px_rgba(58,49,34,0.12)] sm:p-5 md:min-h-72">
        <ActivityCoverImage
          src={activity.coverImageUrl}
          overlayClassName="bg-gradient-to-t from-black/76 via-black/34 to-black/12"
        />
        <div className="absolute right-4 top-4 z-30 flex items-center gap-2 sm:right-5 sm:top-5">
          <ActivityFavoriteButton
            activityId={activity.id}
            favoriteCount={activity.favoriteCount}
            isAuthenticated={Boolean(viewerProfile)}
            isFavorited={activityIsFavorited}
            locale={locale}
            redirectPath={`/activities/${activity.id}`}
            sourceSurface="activity_detail"
          />
          <ReportDialog
            isAuthenticated={Boolean(viewerProfile)}
            locale={locale}
            redirectPath={`/activities/${activity.id}`}
            targetId={activity.id}
            targetType="ACTIVITY"
            variant="icon"
          />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/62 to-transparent" />
        <div className="relative max-w-3xl space-y-3 rounded-[1.15rem] bg-black/26 p-3 ring-1 ring-white/10 backdrop-blur-sm sm:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-white/95 px-2.5 py-1 text-xs font-semibold text-ink shadow-sm">
              {activityCategoryLabel}
            </span>
            <ActivityStatusBadge status={displayStatus} locale={locale} />
          </div>
          <h1 className="text-3xl font-semibold leading-tight tracking-normal text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.45)] sm:text-4xl md:text-5xl">
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
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-zinc-600">
              {activity.description}
            </p>
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

          {activity.latitude !== null && activity.longitude !== null ? (
            <ActivityMapPreview
              address={activityLocationLabel}
              latitude={activity.latitude}
              longitude={activity.longitude}
              openLabel={t.activityDetail.openMap}
              title={t.activityDetail.locationMapTitle}
            />
          ) : null}

          {activity.publicEvent ? (
            <div className="rounded-[1.25rem] border border-[#d8ccb4] bg-[#fbf7ef] p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#b77955] ring-1 ring-[#d8ccb4]">
                    <ExternalLink className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#8a6a40]">
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

          {isOrganizer && activity.requiresApproval ? (
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
                <Link
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-white px-4 text-sm font-medium text-ink ring-1 ring-black/10 transition hover:bg-zinc-50"
                  href={withLocale(
                    locale,
                    `/merchants/${activity.merchant.slug}`,
                  )}
                >
                  {t.merchant.viewProfile}
                  <ExternalLink className="h-4 w-4" />
                </Link>
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
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-ink">
                {getActivityOrganizerInitial(activity)}
              </div>
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
                  buttonClassName="h-10 rounded-full border border-[#d9c6ad] bg-[#fff8ed] px-5 text-[#6f5434] shadow-none hover:bg-white"
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

          <ActivityCommentsSection
            activityId={activity.id}
            comments={comments}
            isAuthenticated={Boolean(viewerProfile)}
            locale={locale}
            viewerProfileId={viewerProfile?.id ?? null}
          />

          <div className="lg:hidden">
            <ActivityShareTools
              activityTitle={activity.title}
              analyticsEntityId={detailAnalyticsEntity.entityId}
              analyticsEntityType={detailAnalyticsEntity.entityType}
              analyticsSourceSurface="activity_detail"
              categoryLabel={activityCategoryLabel}
              coverImageUrl={activity.coverImageUrl}
              dateLabel={activityDateLabel}
              description={activity.description}
              locationLabel={activityLocationLabel}
              locale={locale}
              priceLabel={activityPriceLabel}
            />
          </div>
        </article>

        <aside className="order-first flex h-fit w-full min-w-0 max-w-full flex-col rounded-[1.25rem] border border-black/10 bg-white/80 p-4 shadow-sm sm:p-5 lg:sticky lg:top-24 lg:order-2">
          <div className="order-1 rounded-[1.25rem] border border-[#dccba8] bg-[#fff8ec] p-4 shadow-sm">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a6a40]">
                    {t.activityDetail.participants}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-zinc-600">
                    {activityParticipantLabel}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink ring-1 ring-[#dccba8]">
                  {getActivitySeatLabel(activity, locale)}
                </span>
              </div>
              {activity.capacity > 0 ? (
                <div className="h-2 overflow-hidden rounded-full bg-[#eadfcf]">
                  <div
                    className="h-full rounded-full bg-[#d88d72]"
                    style={{ width: `${participantPercent}%` }}
                  />
                </div>
              ) : null}
            </div>
          </div>

          <div className="order-2 mt-4 space-y-4 text-sm text-zinc-700 lg:order-3 lg:mt-5">
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
          </div>

          <div className="order-3 mt-4 grid gap-3 rounded-[1.25rem] border border-[#dccba8] bg-[#fff8ec] p-3 shadow-sm sm:p-4 lg:order-2">
            {isOrganizer ? (
              <div className="grid gap-2 rounded-2xl border border-[#e5d7bf] bg-white/80 p-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <ShieldAlert className="h-4 w-4 text-moss" />
                  {t.activityOwner.title}
                </p>
                {canEditActivity ? (
                  <Link
                    className="inline-flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white px-4 text-sm font-medium text-zinc-950 ring-1 ring-zinc-200 transition hover:bg-zinc-50"
                    href={withLocale(locale, `/activities/${activity.id}/edit`)}
                  >
                    <Pencil className="h-4 w-4" />
                    {t.activityDetail.editActivity}
                  </Link>
                ) : null}
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
            ) : (
              <>
                <JoinActivityForm
                  activityId={activity.id}
                  activityTitle={activity.title}
                  compactUnauthenticated
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
                    activityId={activity.id}
                    locale={locale}
                    organizerNickname={activity.organizer.nickname}
                    organizerProfileId={activity.organizer.id}
                  />
                ) : null}
              </>
            )}
          </div>

          <div className="order-4 mt-6 hidden lg:block">
            <ActivityAnalyticsSummaryPanel
              locale={locale}
              summary={analyticsSummary}
            />
          </div>
          <div className="order-5 mt-4 hidden lg:block">
            <ActivityShareTools
              activityTitle={activity.title}
              analyticsEntityId={detailAnalyticsEntity.entityId}
              analyticsEntityType={detailAnalyticsEntity.entityType}
              analyticsSourceSurface="activity_detail"
              categoryLabel={activityCategoryLabel}
              coverImageUrl={activity.coverImageUrl}
              dateLabel={activityDateLabel}
              description={activity.description}
              locationLabel={activityLocationLabel}
              locale={locale}
              priceLabel={activityPriceLabel}
            />
          </div>
        </aside>
      </section>
    </PageContainer>
  );
}

function ContactOrganizerForm({
  activityId,
  locale,
  organizerNickname,
  organizerProfileId,
}: {
  activityId: string;
  locale: string;
  organizerNickname: string;
  organizerProfileId: string;
}) {
  const t = getCopy(locale);

  return (
    <form
      action={openActivityOrganizerConversationAction}
      className="grid gap-2"
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="activityId" value={activityId} />
      <input
        type="hidden"
        name="organizerProfileId"
        value={organizerProfileId}
      />
      <Button
        type="submit"
        variant="secondary"
        className="h-10 w-full gap-2 rounded-full border border-[#d9c6ad] bg-[#fff8ed] text-[#6f5434] shadow-none hover:bg-white sm:h-11"
        aria-label={`${t.activityDetail.contactOrganizer}: ${organizerNickname}`}
      >
        <MessageCircle className="h-4 w-4 shrink-0 text-[#9c6f4e]" />
        {t.activityDetail.contactOrganizer}
      </Button>
      <p className="hidden px-1 text-xs leading-5 text-zinc-500 sm:block">
        {t.activityDetail.contactOrganizerHint}
      </p>
    </form>
  );
}
