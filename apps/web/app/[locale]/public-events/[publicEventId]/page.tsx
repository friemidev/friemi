import { notFound } from "next/navigation";
import { headers } from "next/headers";
import {
  CalendarDays,
  CircleX,
  MapPin,
  Ticket,
  UsersRound,
} from "lucide-react";
import { Button } from "@chill-club/ui";
import { PageContainer } from "@/components/layout/PageContainer";
import { AnalyticsExternalLink } from "@/features/analytics/components/AnalyticsExternalLink";
import { AnalyticsLink } from "@/features/analytics/components/AnalyticsLink";
import { ActivityCopyButton } from "@/features/activities/components/ActivityCopyButton";
import { ActivityRichDescription } from "@/features/activities/components/ActivityRichDescription";
import { normalizeAnalyticsLocale } from "@/features/analytics/events";
import { queueAnalyticsEvent } from "@/features/analytics/server";
import { inferAnalyticsSourceSurfaceFromReferrer } from "@/features/analytics/utils";
import { ActivityCard } from "@/features/activities/components/ActivityCard";
import { ActivityMapPreview } from "@/features/activities/components/ActivityMapPreview";
import { ActivityShareTools } from "@/features/activities/components/ActivityShareTools";
import { getCategoryLabel } from "@/lib/copy";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";
import { createPerformanceTracker } from "@/lib/performance";
import { withLocale } from "@/lib/routes";
import { getPublicEventCopy } from "@/features/public-events/copy";
import { getTicketCtaLabel } from "@/features/public-events/utils/ticketCta";
import { ReportDialog } from "@/features/reports/components/ReportDialog";
import {
  getEventDateLabel,
  getEventPriceLabel,
} from "@/features/public-events/components/PublicEventCard";
import { getPublicEventById } from "@/features/public-events/queries/getPublicEvents";
import { getPublicEventLocationDisplay } from "@/features/public-events/utils/locationDisplay";
import { ActivityCoverImage } from "@/features/activities/components/ActivityCoverImage";
import { PublicEventFavoriteButton } from "@/features/favorites/components/PublicEventFavoriteButton";
import { DetailSourceReturnLink } from "@/features/navigation/components/DetailSourceReturnLink";
import { DetailSourceRestore } from "@/features/navigation/components/DetailSourceRestore";
import { ManualTranslationBundle } from "@/features/translations/components/ManualTranslation";
import { ActivityWeatherWidget } from "@/features/weather/components/ActivityWeatherWidget";
import { getActivityWeatherWidgetInput } from "@/features/weather/activityWeather";
import { getCopy } from "@/lib/copy";

type PublicEventDetailPageProps = {
  params: Promise<{
    locale: string;
    publicEventId: string;
  }>;
};

export const dynamic = "force-dynamic";

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
  const viewerProfile = await perf.measure("viewer.profile", () =>
    getOptionalCurrentUserProfileSnapshot(),
  );
  const publicEvent = await perf.measure("publicEvent.detail", () =>
    getPublicEventById(publicEventId, viewerProfile?.id),
  );

  if (!publicEvent) {
    notFound();
  }

  const requestHeaders = await headers();
  const referrer = requestHeaders.get("referer");
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") ? "http" : "https");
  const publicEventPath = withLocale(locale, `/public-events/${publicEvent.id}`);
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
    <PageContainer className="space-y-5 py-4 sm:space-y-6 sm:py-8">
      <DetailSourceRestore sourceKey="public_event" />
      <DetailSourceReturnLink
        className="h-8 bg-white/60 px-3 text-xs shadow-none sm:h-9 sm:text-sm"
        locale={locale}
      />
      <div className="relative flex min-h-[13rem] items-end overflow-hidden rounded-[1.25rem] bg-[#d9e9ee] p-3 shadow-[0_18px_42px_rgba(58,49,34,0.14)] sm:min-h-64 sm:p-6 md:min-h-[26rem]">
        <ActivityCoverImage
          src={publicEvent.coverImageUrl}
          overlayClassName="bg-gradient-to-t from-black/72 via-black/22 to-black/8"
        />
        <div className="absolute right-3 top-3 z-30 flex items-center gap-2 sm:right-6 sm:top-6">
          <PublicEventFavoriteButton
            favoriteCount={publicEvent.favoriteCount}
            publicEventId={publicEvent.id}
            isAuthenticated={Boolean(viewerProfile)}
            isFavorited={Boolean(publicEvent.isFavorited)}
            locale={locale}
            redirectPath={`/public-events/${publicEvent.id}`}
            sourceSurface="public_event_detail"
          />
          <ReportDialog
            className="bg-white/95 text-zinc-900 shadow-sm ring-1 ring-black/10 hover:bg-white hover:text-ink"
            isAuthenticated={Boolean(viewerProfile)}
            locale={locale}
            redirectPath={`/public-events/${publicEvent.id}`}
            targetId={publicEvent.id}
            targetType="PUBLIC_EVENT"
            variant="icon"
          />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/74 via-black/28 to-transparent" />
        <div className="relative z-10 max-w-4xl space-y-3 sm:space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-ink shadow-sm">
              {getCategoryLabel(publicEvent.category, locale)}
            </span>
            <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-medium text-zinc-700 shadow-sm">
              {t.detailSource}
            </span>
            {isCancelled ? (
              <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">
                {t.cancelledBadge}
              </span>
            ) : null}
          </div>
          <div className="inline-block max-w-3xl rounded-[1.25rem] bg-[rgba(18,16,13,0.58)] px-3 py-3 shadow-[0_18px_36px_rgba(0,0,0,0.28)] ring-1 ring-white/10 sm:rounded-[1.5rem] sm:px-5 sm:py-4">
            <h1 className="text-2xl font-semibold leading-tight tracking-normal text-white [text-shadow:0_4px_24px_rgba(0,0,0,0.58)] sm:text-4xl md:text-5xl">
              {publicEvent.title}
            </h1>
          </div>
        </div>
      </div>

      <section className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="min-w-0 space-y-6 lg:order-1">
          <div className="rounded-[1.25rem] border border-[#d8ccb4] bg-white/78 p-4 shadow-sm sm:p-5">
            <h2 className="text-lg font-semibold text-ink">
              {t.eventInfoTitle}
            </h2>
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
                    <span className="rounded-full bg-[#fff8ec] px-2.5 py-1 text-xs font-semibold text-[#8a6a40] ring-1 ring-[#dccba8]">
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
        </article>

        <aside className="order-first h-fit w-full min-w-0 max-w-full rounded-[1.25rem] border border-sand bg-white/80 p-4 shadow-sm sm:p-5 lg:sticky lg:top-24 lg:order-2">
          <div className="mb-4 rounded-xl border border-[#dccba8] bg-[#fff8ec] px-3 py-3 text-sm leading-6 text-zinc-700">
            <div className="flex items-center gap-2 font-semibold text-ink">
              <Ticket className="h-4 w-4 text-[#8a6a40]" />
              {t.publicEventRuleTitle}
            </div>
            <p className="mt-1 text-sm leading-6 text-zinc-600">
              {t.publicEventRuleDescription}
            </p>
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
            className="mb-4 h-10 w-full gap-2 rounded-full bg-white px-4 text-sm font-semibold text-ink ring-1 ring-[#dccba8] hover:bg-[#fff8ec]"
            failedLabel={appCopy.activityShare.copyFailed}
            label={t.copyEventInfo}
            successLabel={t.copyEventInfoSuccess}
            value={eventSummaryCopyValue}
          >
            {t.copyEventInfo}
          </ActivityCopyButton>
          <div className="mb-4">
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
          {weatherInput ? (
            <ActivityWeatherWidget
              className="mb-4"
              date={weatherInput.date}
              latitude={weatherInput.latitude}
              locale={locale}
              locationQuery={weatherInput.locationQuery}
              longitude={weatherInput.longitude}
            />
          ) : null}
          {isCancelled ? (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm leading-6 text-red-700">
              <div className="flex items-center gap-2 font-semibold">
                <CircleX className="h-4 w-4" />
                {t.cancelledBadge}
              </div>
              <p className="mt-1 text-sm leading-6">{t.eventCancelled}</p>
            </div>
          ) : null}

          <div className="space-y-3 rounded-[1.1rem] border border-sand bg-white/68 p-3 text-sm text-zinc-700 sm:p-4">
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
            <p className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2">
              <UsersRound className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0 break-words">
                {t.teamCount(publicEvent.teamCount)}
              </span>
            </p>
          </div>
          {canOpenTicketLink && publicEvent.ticketUrl ? (
            <AnalyticsExternalLink
              className="mt-5 inline-flex h-11 w-full min-w-0 items-center justify-center gap-2 rounded-full bg-[#d88d72] px-4 text-sm font-semibold text-white transition hover:bg-[#c87b61]"
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
            <p className="mt-5 rounded-xl bg-white/80 px-3 py-3 text-sm text-zinc-600 ring-1 ring-[#dccba8]">
              {unavailableReason}
            </p>
          ) : (
            <AnalyticsLink
              className="mt-5 block"
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
              <Button className="h-11 w-full whitespace-nowrap rounded-full bg-[#d88d72] text-white hover:bg-[#c87b61]">
                {t.teamUp}
              </Button>
            </AnalyticsLink>
          )}
        </aside>
      </section>
    </PageContainer>
  );
}
