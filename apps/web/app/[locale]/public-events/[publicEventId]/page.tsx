import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  ArrowLeft,
  CalendarDays,
  CircleX,
  MapPin,
  Ticket,
  UsersRound,
} from "lucide-react";
import { Button } from "@chill-club/ui";
import { PageContainer } from "@/components/layout/PageContainer";
import { ActivityPriorityAdminMenu } from "@/components/admin/ActivityPriorityManagementClient";
import { AnalyticsExternalLink } from "@/features/analytics/components/AnalyticsExternalLink";
import { AnalyticsLink } from "@/features/analytics/components/AnalyticsLink";
import { ActivityCopyButton } from "@/features/activities/components/ActivityCopyButton";
import { ActivityHistoryBackButton } from "@/features/activities/components/ActivityHistoryBackButton";
import { ActivityRichDescription } from "@/features/activities/components/ActivityRichDescription";
import { normalizeAnalyticsLocale } from "@/features/analytics/events";
import { queueAnalyticsEvent } from "@/features/analytics/server";
import { inferAnalyticsSourceSurfaceFromReferrer } from "@/features/analytics/utils";
import { ActivityCard } from "@/features/activities/components/ActivityCard";
import { ActivityMapPreview } from "@/features/activities/components/ActivityMapPreview";
import { ActivityShareDialogButton } from "@/features/activities/components/ActivityShareDialogButton";
import {
  ActivityPosterDownloadButton,
  ActivityShareTools,
} from "@/features/activities/components/ActivityShareTools";
import { getCategoryLabel } from "@/lib/copy";
import { getActivityShareMetadataById } from "@/features/activities/queries/getActivityById";
import { getActivityDetailPath } from "@/features/activities/utils/activityRoutes";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";
import { createPerformanceTracker } from "@/lib/performance";
import { withLocale } from "@/lib/routes";
import { getPublicEventCopy } from "@/features/public-events/copy";
import { getTicketCtaLabel } from "@/features/public-events/utils/ticketCta";
import {
  getEventDateLabel,
  getEventPriceLabel,
} from "@/features/public-events/components/PublicEventCard";
import {
  getPublicEventById,
  getPublicEventShareMetadataById,
} from "@/features/public-events/queries/getPublicEvents";
import { getPublicEventLocationDisplay } from "@/features/public-events/utils/locationDisplay";
import { ActivityCoverImage } from "@/features/activities/components/ActivityCoverImage";
import { getActivityPriorityAdminSnapshot } from "@/features/activities/priority/adminActivityPriority";
import { PublicEventFavoriteButton } from "@/features/favorites/components/PublicEventFavoriteButton";
import { DetailSourceReturnLink } from "@/features/navigation/components/DetailSourceReturnLink";
import { DetailSourceRestore } from "@/features/navigation/components/DetailSourceRestore";
import { ManualTranslationBundle } from "@/features/translations/components/ManualTranslation";
import { ActivityWeatherWidget } from "@/features/weather/components/ActivityWeatherWidget";
import { getActivityWeatherWidgetInput } from "@/features/weather/activityWeather";
import { MobileNavSectionOverride } from "@/components/navigation/MobileNavSectionOverride";
import { getCopy } from "@/lib/copy";
import { isCurrentUserAdmin } from "@/lib/admin-auth";
import {
  buildCanonicalUrl,
  buildDetailShareMetadata,
  buildFallbackShareMetadata,
  getCanonicalMetadataBaseUrl,
  getShareDateLabel,
  getSharePriceLabel,
} from "@/lib/share-metadata";

type PublicEventDetailPageProps = {
  params: Promise<{
    locale: string;
    publicEventId: string;
  }>;
};

export const dynamic = "force-dynamic";

function getPublicEventDetailLayerTitle(locale: string) {
  return locale === "fr"
    ? "Détail de l'activité"
    : locale === "en"
      ? "Activity Detail"
      : "活动详情";
}

function PublicEventDetailHeader({
  backHref,
  title,
}: {
  backHref: string;
  title: string;
}) {
  return (
    <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_2.25rem] items-center gap-3 md:hidden">
      <ActivityHistoryBackButton
        ariaLabel={title}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#111210]/70 ring-1 ring-[#E7E1CA] transition active:scale-95"
        fallbackHref={backHref}
      >
        <ArrowLeft className="h-5 w-5" strokeWidth={2.4} />
      </ActivityHistoryBackButton>
      <p className="truncate text-center text-[18px] font-black leading-none tracking-normal text-[#111210]">
        {title}
      </p>
    </div>
  );
}

export async function generateMetadata({
  params,
}: PublicEventDetailPageProps): Promise<Metadata> {
  const { locale, publicEventId } = await params;
  const baseUrl = getCanonicalMetadataBaseUrl();
  const publicEventPath = withLocale(locale, `/public-events/${publicEventId}`);
  const publicEvent = await getPublicEventShareMetadataById(publicEventId);

  if (!publicEvent) {
    return buildFallbackShareMetadata(baseUrl, publicEventPath);
  }

  const metadata = buildDetailShareMetadata({
    canonicalUrl: buildCanonicalUrl(baseUrl, publicEventPath),
    coverImageUrl: publicEvent.coverImageUrl,
    dateLabel: getShareDateLabel({
      endAt: publicEvent.endAt,
      locale,
      startAt: publicEvent.startAt,
    }),
    description: publicEvent.description,
    locationLabel: getPublicEventLocationDisplay(publicEvent, locale).copyValue,
    priceLabel: getSharePriceLabel(
      publicEvent.priceType,
      publicEvent.priceText,
      locale,
    ),
    title: publicEvent.title,
  });

  return metadata;
}

export default async function PublicEventDetailPage({
  params,
}: PublicEventDetailPageProps) {
  const { locale, publicEventId } = await params;
  const perf = createPerformanceTracker({
    locale,
    route: "/public-events/[publicEventId]",
  });
  const t = getPublicEventCopy(locale);
  const appCopy = getCopy(locale);
  const analyticsLocale = normalizeAnalyticsLocale(locale);
  const [viewerProfile, isAdmin] = await Promise.all([
    perf.measure("viewer.profile", () =>
      getOptionalCurrentUserProfileSnapshot(),
    ),
    perf.measure("viewer.admin", () => isCurrentUserAdmin()),
  ]);
  const publicEvent = await perf.measure("publicEvent.detail", () =>
    getPublicEventById(publicEventId, viewerProfile?.id),
  );

  if (!publicEvent) {
    const activity = await perf.measure("publicEvent.activityFallback", () =>
      getActivityShareMetadataById(publicEventId),
    );

    if (activity?.publicEventId) {
      redirect(withLocale(locale, `/public-events/${activity.publicEventId}`));
    }

    if (activity) {
      redirect(withLocale(locale, getActivityDetailPath(activity.id)));
    }

    notFound();
  }

  const requestHeaders = await headers();
  const referrer = requestHeaders.get("referer");
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") ? "http" : "https");
  const publicEventPath = withLocale(
    locale,
    `/public-events/${publicEvent.id}`,
  );
  const publicEventUrl = host
    ? `${protocol}://${host}${publicEventPath}`
    : publicEventPath;
  const sourceSurface = inferAnalyticsSourceSurfaceFromReferrer(
    referrer,
    "activity_list",
  );

  queueAnalyticsEvent(
    {
      locale: analyticsLocale,
      name: "public_event_detail_viewed",
      route: `/${locale}/public-events/${publicEvent.id}`,
      entityId: publicEvent.id,
      entityType: "public_event",
      sourceSurface,
      properties: {
        category: publicEvent.category,
        city: publicEvent.city,
        team_count: publicEvent.teamCount,
      },
    },
    {
      referrer,
      userAgent: requestHeaders.get("user-agent"),
      userProfileId: viewerProfile?.id,
    },
  );

  const eventDateLabel = getEventDateLabel(publicEvent, locale);
  const eventPriceLabel = getEventPriceLabel(publicEvent, locale);
  const eventLocation = getPublicEventLocationDisplay(publicEvent, locale);
  const canShowMapLink =
    (publicEvent.latitude !== null && publicEvent.longitude !== null) ||
    !eventLocation.isGenericAddress;
  const weatherInput = getActivityWeatherWidgetInput(publicEvent);
  const eventSummaryCopyValue = [
    publicEvent.title,
    eventDateLabel,
    eventLocation.copyValue,
    eventPriceLabel,
    publicEventUrl,
  ].join("\n");
  const eventEndBoundary = new Date(publicEvent.endAt ?? publicEvent.startAt);
  const isCancelled = publicEvent.status === "CANCELLED";
  const isEnded = eventEndBoundary <= new Date();
  const canCreateTeam = !isCancelled && !isEnded;
  const canOpenTicketLink = Boolean(publicEvent.ticketUrl) && canCreateTeam;
  const coverOfficialUrl = publicEvent.officialUrl?.trim() || null;
  const activityPrioritySnapshot = isAdmin
    ? await perf.measure("activityPriority.snapshot", () =>
        getActivityPriorityAdminSnapshot({
          targetId: publicEvent.id,
          targetType: "PUBLIC_EVENT",
        }),
      )
    : null;
  const ticketCtaLabel = getTicketCtaLabel(locale, publicEvent.ticketLabel);
  const unavailableReason = isCancelled ? t.eventCancelled : t.eventEnded;
  const teamSectionDescription = isCancelled
    ? t.teamSectionUnavailableDescription
    : isEnded
      ? t.teamSectionEndedDescription
      : t.teamSectionDescription;
  perf.finish({
    hasViewer: Boolean(viewerProfile),
    teamCount: publicEvent.teamCount,
  });

  return (
    <PageContainer
      className="space-y-5 py-4 sm:space-y-6 sm:py-8"
      mobileSafeBottom
      mobileSafeTop
    >
      <MobileNavSectionOverride section="activities" />
      <DetailSourceRestore sourceKey="public_event" />
      <PublicEventDetailHeader
        backHref={withLocale(locale, "/activities")}
        title={getPublicEventDetailLayerTitle(locale)}
      />
      <DetailSourceReturnLink
        className="hidden h-8 bg-white/60 px-3 text-xs shadow-none sm:h-9 sm:text-sm md:inline-flex"
        locale={locale}
      />
      <div className="space-y-2 px-1 sm:px-0">
        <h1 className="text-[1.7rem] font-black leading-[1.06] tracking-normal text-ink sm:text-4xl md:text-5xl">
          {publicEvent.title}
        </h1>
      </div>
      <div className="relative aspect-[1.48/1] overflow-hidden rounded-[1.25rem] bg-[#F1F2EC] ring-1 ring-[#E7E1CA] sm:aspect-[16/9] md:aspect-[2.35/1]">
        {coverOfficialUrl ? (
          <AnalyticsExternalLink
            aria-label={t.officialPage}
            className="absolute inset-0 z-10 block"
            event={{
              name: "public_event_source_clicked",
              entityId: publicEvent.id,
              entityType: "public_event",
              sourceSurface: "public_event_detail",
              properties: {
                click_target: "cover",
              },
            }}
            href={coverOfficialUrl}
          >
            <ActivityCoverImage
              src={publicEvent.coverImageUrl}
              overlayClassName="bg-gradient-to-t from-black/16 via-transparent to-black/12"
            />
          </AnalyticsExternalLink>
        ) : (
          <ActivityCoverImage
            src={publicEvent.coverImageUrl}
            overlayClassName="bg-gradient-to-t from-black/16 via-transparent to-black/12"
          />
        )}
        <div className="absolute right-3 top-4 z-30 flex items-center gap-2 sm:right-5 sm:top-6">
          {activityPrioritySnapshot ? (
            <ActivityPriorityAdminMenu
              initialSnapshot={activityPrioritySnapshot}
              locale={locale}
              targetId={publicEvent.id}
              targetTitle={publicEvent.title}
              targetType="PUBLIC_EVENT"
            />
          ) : null}
          <PublicEventFavoriteButton
            favoriteCount={publicEvent.favoriteCount}
            publicEventId={publicEvent.id}
            isAuthenticated={Boolean(viewerProfile)}
            isFavorited={Boolean(publicEvent.isFavorited)}
            locale={locale}
            redirectPath={`/public-events/${publicEvent.id}`}
            sourceSurface="public_event_detail"
          />
          <ActivityShareDialogButton
            className="bg-white/95 text-zinc-900 ring-black/10 hover:bg-white md:hidden"
            closeLabel={appCopy.activityShare.closeShareHelp}
            label={appCopy.activityShare.activityTitle}
          >
            <ActivityShareTools
              activityTitle={publicEvent.title}
              analyticsEntityId={publicEvent.id}
              analyticsEntityType="public_event"
              analyticsSourceSurface="public_event_detail"
              categoryLabel={getCategoryLabel(publicEvent.category, locale)}
              collapsible={false}
              coverImageUrl={publicEvent.coverImageUrl}
              dateLabel={eventDateLabel}
              description={publicEvent.description}
              locationLabel={eventLocation.displayLabel}
              locale={locale}
              priceLabel={eventPriceLabel}
              shareKind="activity"
              sharePath={publicEventPath}
            />
          </ActivityShareDialogButton>
        </div>
      </div>

      <section className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="min-w-0 space-y-6 lg:order-1">
          {canShowMapLink ? (
            <ActivityMapPreview
              address={publicEvent.address}
              city={publicEvent.city}
              latitude={publicEvent.latitude}
              longitude={publicEvent.longitude}
              openLabel={appCopy.activityDetail.openGoogleMaps}
              title={appCopy.activityDetail.locationMapTitle}
            />
          ) : null}

          <div className="border-t border-[#E7E1CA] pt-4 md:rounded-[1.25rem] md:border md:border-[#D6D5B2] md:bg-white/78 md:p-5 md:shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="min-w-0 text-lg font-semibold text-ink">
                {t.eventInfoTitle}
              </h2>
              {weatherInput ? (
                <ActivityWeatherWidget
                  className="md:hidden"
                  date={weatherInput.date}
                  latitude={weatherInput.latitude}
                  locale={locale}
                  locationQuery={weatherInput.locationQuery}
                  longitude={weatherInput.longitude}
                  variant="compact"
                />
              ) : null}
            </div>
            <ActivityRichDescription
              className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-600"
              copyFailedLabel={appCopy.activityShare.copyFailed}
              copyLabel={appCopy.activityShare.copyLink}
              copySuccessLabel={appCopy.activityShare.copied}
              entityId={publicEvent.id}
              entityType="public_event"
              locale={locale}
              sourceSurface="public_event_detail"
              text={publicEvent.description}
            />
            <ManualTranslationBundle
              entityId={publicEvent.id}
              entityType="public_event"
              fields={[
                {
                  field: "title",
                  label: appCopy.translation.fields.title,
                  text: publicEvent.title,
                },
                {
                  field: "description",
                  label: appCopy.translation.fields.description,
                  text: publicEvent.description,
                },
                {
                  field: "address",
                  label: appCopy.translation.fields.address,
                  text: eventLocation.displayLabel,
                },
                {
                  field: "priceText",
                  label: appCopy.translation.fields.priceText,
                  text: publicEvent.priceText,
                },
              ]}
              locale={locale}
            />
          </div>

          {publicEvent.teams.length > 0 ? (
            <section className="space-y-4 scroll-mt-24" id="public-event-teams">
              <div className="flex flex-col gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-semibold tracking-normal text-ink">
                      {t.existingTeams}
                    </h2>
                    <span className="rounded-full bg-[#FEFFF9] px-2.5 py-1 text-xs font-semibold text-[#156240] ring-1 ring-[#8AB68E]">
                      {t.teamCount(publicEvent.teamCount)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-zinc-600">
                    {teamSectionDescription}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {publicEvent.teams.map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    isAuthenticated={Boolean(viewerProfile)}
                    locale={locale}
                    mobileDense
                    showFavoriteButton
                    sourceSurface="public_event_detail"
                    detailSourceKey="public_event"
                  />
                ))}
              </div>
            </section>
          ) : null}
        </article>

        <aside className="order-first h-fit w-full min-w-0 max-w-full space-y-3 lg:sticky lg:top-24 lg:order-2 lg:rounded-[1.25rem] lg:border lg:border-sand lg:bg-white/80 lg:p-4 lg:shadow-sm">
          <div className="grid grid-cols-2 gap-2 md:hidden">
            <ActivityCopyButton
              analyticsEvent={{
                name: "field_copied",
                entityId: publicEvent.id,
                entityType: "public_event",
                sourceSurface: "public_event_detail",
                properties: {
                  field_name: "event_summary",
                  location_is_generic: eventLocation.isGenericAddress,
                },
              }}
              className="h-10 w-full justify-center gap-2 rounded-full bg-white px-3 text-sm font-semibold text-[#156240] ring-1 ring-[#8AB68E] hover:bg-[#FEFFF9]"
              failedLabel={appCopy.activityShare.copyFailed}
              label={t.copyEventInfo}
              successLabel={t.copyEventInfoSuccess}
              value={eventSummaryCopyValue}
            >
              <span className="min-w-0 truncate">{t.copyEventInfo}</span>
            </ActivityCopyButton>
            <ActivityPosterDownloadButton
              activityTitle={publicEvent.title}
              analyticsEntityId={publicEvent.id}
              analyticsEntityType="public_event"
              analyticsSourceSurface="public_event_detail"
              categoryLabel={getCategoryLabel(publicEvent.category, locale)}
              coverImageUrl={publicEvent.coverImageUrl}
              dateLabel={eventDateLabel}
              description={publicEvent.description}
              locationLabel={eventLocation.displayLabel}
              locale={locale}
              priceLabel={eventPriceLabel}
              sharePath={publicEventPath}
            />
          </div>
          <ActivityCopyButton
            analyticsEvent={{
              name: "field_copied",
              entityId: publicEvent.id,
              entityType: "public_event",
              sourceSurface: "public_event_detail",
              properties: {
                field_name: "event_summary",
                location_is_generic: eventLocation.isGenericAddress,
              },
            }}
            className="hidden h-10 w-full gap-2 rounded-full bg-white px-4 text-sm font-semibold text-[#156240] ring-1 ring-[#8AB68E] hover:bg-[#FEFFF9] md:inline-flex"
            failedLabel={appCopy.activityShare.copyFailed}
            label={t.copyEventInfo}
            successLabel={t.copyEventInfoSuccess}
            value={eventSummaryCopyValue}
          >
            {t.copyEventInfo}
          </ActivityCopyButton>
          <div className="hidden md:block">
            <ActivityShareTools
              activityTitle={publicEvent.title}
              analyticsEntityId={publicEvent.id}
              analyticsEntityType="public_event"
              analyticsSourceSurface="public_event_detail"
              categoryLabel={getCategoryLabel(publicEvent.category, locale)}
              coverImageUrl={publicEvent.coverImageUrl}
              dateLabel={eventDateLabel}
              description={publicEvent.description}
              locationLabel={eventLocation.displayLabel}
              locale={locale}
              priceLabel={eventPriceLabel}
              shareKind="activity"
              sharePath={publicEventPath}
            />
          </div>

          <div className="space-y-3 border-t border-[#E7E1CA] pt-3 text-sm text-zinc-700 md:rounded-[1.1rem] md:border md:border-sand md:bg-white/68 md:p-4">
            <p className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0 break-words">{eventDateLabel}</span>
              <ActivityCopyButton
                analyticsEvent={{
                  name: "field_copied",
                  entityId: publicEvent.id,
                  entityType: "public_event",
                  sourceSurface: "public_event_detail",
                  properties: {
                    field_name: "time",
                  },
                }}
                failedLabel={appCopy.activityShare.copyFailed}
                label={appCopy.activityShare.copyTime}
                successLabel={appCopy.activityShare.copied}
                value={eventDateLabel}
              />
            </p>
            <p className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0 break-words">
                {eventLocation.displayLabel}
              </span>
              <ActivityCopyButton
                analyticsEvent={{
                  name: "field_copied",
                  entityId: publicEvent.id,
                  entityType: "public_event",
                  sourceSurface: "public_event_detail",
                  properties: {
                    field_name: "location",
                    location_is_generic: eventLocation.isGenericAddress,
                  },
                }}
                failedLabel={appCopy.activityShare.copyFailed}
                label={appCopy.activityShare.copyLocation}
                successLabel={appCopy.activityShare.copied}
                value={eventLocation.copyValue}
              />
            </p>
            <p className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2">
              <Ticket className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0 break-words">{eventPriceLabel}</span>
              <ActivityCopyButton
                analyticsEvent={{
                  name: "field_copied",
                  entityId: publicEvent.id,
                  entityType: "public_event",
                  sourceSurface: "public_event_detail",
                  properties: {
                    field_name: "price",
                  },
                }}
                failedLabel={appCopy.activityShare.copyFailed}
                label={appCopy.activityShare.copyPrice}
                successLabel={appCopy.activityShare.copied}
                value={eventPriceLabel}
              />
            </p>
            {publicEvent.teamCount > 0 ? (
              <p className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2">
                <UsersRound className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="min-w-0 break-words">
                  {t.teamCount(publicEvent.teamCount)}
                </span>
              </p>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-2 [&>*:only-child]:col-span-2 md:block md:space-y-3">
            {canOpenTicketLink && publicEvent.ticketUrl ? (
              <AnalyticsExternalLink
                className="inline-flex h-11 w-full min-w-0 items-center justify-center gap-2 rounded-full bg-[#369758] px-4 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(54,151,88,0.18)] transition hover:bg-[#156240]"
                event={{
                  name: "ticket_link_clicked",
                  entityId: publicEvent.id,
                  entityType: "public_event",
                  sourceSurface: "public_event_detail",
                  properties: {
                    category: publicEvent.category,
                    city: publicEvent.city,
                  },
                }}
                href={publicEvent.ticketUrl}
              >
                <span className="min-w-0 truncate">{ticketCtaLabel}</span>
                <Ticket className="h-4 w-4" />
              </AnalyticsExternalLink>
            ) : null}
            {!canCreateTeam ? (
              <p className="rounded-xl bg-white px-3 py-3 text-sm text-zinc-600 ring-1 ring-[#8AB68E]">
                {unavailableReason}
              </p>
            ) : (
              <AnalyticsLink
                className="block"
                href={withLocale(
                  locale,
                  `/public-events/${publicEvent.id}/teams/new`,
                )}
                event={{
                  name: "team_create_started",
                  entityId: publicEvent.id,
                  entityType: "public_event",
                  sourceSurface: "public_event_detail",
                  properties: {
                    category: publicEvent.category,
                    city: publicEvent.city,
                  },
                }}
              >
                <Button className="h-11 w-full whitespace-nowrap rounded-full bg-[#369758] text-white shadow-[0_10px_22px_rgba(54,151,88,0.18)] hover:bg-[#156240]">
                  {t.teamUp}
                </Button>
              </AnalyticsLink>
            )}
          </div>
          {isCancelled ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm leading-6 text-red-700">
              <div className="flex items-center gap-2 font-semibold">
                <CircleX className="h-4 w-4" />
                {t.cancelledBadge}
              </div>
              <p className="mt-1 text-sm leading-6">{t.eventCancelled}</p>
            </div>
          ) : null}
          {weatherInput ? (
            <ActivityWeatherWidget
              className="hidden md:block"
              date={weatherInput.date}
              latitude={weatherInput.latitude}
              locale={locale}
              locationQuery={weatherInput.locationQuery}
              longitude={weatherInput.longitude}
            />
          ) : null}
        </aside>
      </section>
    </PageContainer>
  );
}
