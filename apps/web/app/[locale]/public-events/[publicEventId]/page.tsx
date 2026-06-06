import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import {
  ArrowLeft,
  CalendarDays,
  CircleX,
  ExternalLink,
  Handshake,
  Info,
  MapPin,
  Ticket,
  UsersRound,
} from "lucide-react";
import { Button } from "@chill-club/ui";
import { PageContainer } from "@/components/layout/PageContainer";
import { AnalyticsExternalLink } from "@/features/analytics/components/AnalyticsExternalLink";
import { AnalyticsLink } from "@/features/analytics/components/AnalyticsLink";
import { normalizeAnalyticsLocale } from "@/features/analytics/events";
import { queueAnalyticsEvent } from "@/features/analytics/server";
import { inferAnalyticsSourceSurfaceFromReferrer } from "@/features/analytics/utils";
import { ActivityCard } from "@/features/activities/components/ActivityCard";
import { ActivityMapPreview } from "@/features/activities/components/ActivityMapPreview";
import { getCategoryLabel } from "@/lib/copy";
import { getOptionalCurrentUserProfile } from "@/lib/auth";
import { createPerformanceTracker } from "@/lib/performance";
import { withLocale } from "@/lib/routes";
import { getPublicEventCopy } from "@/features/public-events/copy";
import { ReportDialog } from "@/features/reports/components/ReportDialog";
import {
  getEventDateLabel,
  getEventPriceLabel,
} from "@/features/public-events/components/PublicEventCard";
import { getPublicEventById } from "@/features/public-events/queries/getPublicEvents";
import { ActivityCoverImage } from "@/features/activities/components/ActivityCoverImage";
import { PublicEventFavoriteButton } from "@/features/favorites/components/PublicEventFavoriteButton";

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
  const analyticsLocale = normalizeAnalyticsLocale(locale);
  const viewerProfile = await perf.measure("viewer.profile", () =>
    getOptionalCurrentUserProfile(),
  );
  const publicEvent = await perf.measure("publicEvent.detail", () =>
    getPublicEventById(publicEventId, viewerProfile?.id),
  );

  if (!publicEvent) {
    notFound();
  }

  const requestHeaders = await headers();
  const referrer = requestHeaders.get("referer");
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
  const eventEndBoundary = new Date(publicEvent.endAt ?? publicEvent.startAt);
  const isCancelled = publicEvent.status === "CANCELLED";
  const isEnded = eventEndBoundary <= new Date();
  const canCreateTeam = !isCancelled && !isEnded;
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
      <Link
        className="inline-flex items-center gap-2 text-sm font-medium text-moss transition hover:text-ink"
        href={withLocale(locale, "/activities")}
      >
        <ArrowLeft className="h-4 w-4" />
        {t.backToPublicEvents}
      </Link>

      <div className="relative flex min-h-64 items-end overflow-hidden rounded-[1.5rem] bg-[#d9e9ee] p-4 shadow-[0_18px_42px_rgba(58,49,34,0.14)] sm:p-6 md:min-h-[26rem]">
        <ActivityCoverImage
          src={publicEvent.coverImageUrl}
          overlayClassName="bg-gradient-to-t from-black/78 via-black/36 to-black/12"
        />
        <div className="absolute right-4 top-4 z-30 flex items-center gap-2 sm:right-6 sm:top-6">
          <PublicEventFavoriteButton
            publicEventId={publicEvent.id}
            isAuthenticated={Boolean(viewerProfile)}
            isFavorited={Boolean(publicEvent.isFavorited)}
            locale={locale}
            redirectPath={`/public-events/${publicEvent.id}`}
          />
          <ReportDialog
            isAuthenticated={Boolean(viewerProfile)}
            locale={locale}
            redirectPath={`/public-events/${publicEvent.id}`}
            targetId={publicEvent.id}
            targetType="PUBLIC_EVENT"
            variant="icon"
          />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/65 to-transparent" />
        <div className="relative max-w-4xl space-y-4 rounded-[1.25rem] bg-black/28 p-3 ring-1 ring-white/10 backdrop-blur-sm sm:p-4">
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
          <h1 className="text-3xl font-semibold leading-tight tracking-normal text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.48)] sm:text-4xl md:text-5xl">
            {publicEvent.title}
          </h1>
          <div className="grid gap-2 text-sm text-white/92 sm:grid-cols-3">
            <span className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-2 rounded-2xl bg-black/24 px-3 py-2 backdrop-blur">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0 break-words">{eventDateLabel}</span>
            </span>
            <span className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-2 rounded-2xl bg-black/24 px-3 py-2 backdrop-blur">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0 break-words">{publicEvent.address}</span>
            </span>
            <span className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-2 rounded-2xl bg-black/24 px-3 py-2 backdrop-blur">
              <UsersRound className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0">
                {t.teamCount(publicEvent.teamCount)}
              </span>
            </span>
          </div>
        </div>
      </div>

      <section className="grid gap-4 rounded-[1.25rem] border border-[#d8ccb4] bg-white/85 p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fff8ec] text-[#8a6a40] ring-1 ring-[#dccba8]">
            {canCreateTeam ? (
              <Handshake className="h-5 w-5" />
            ) : (
              <Info className="h-5 w-5" />
            )}
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-ink sm:text-lg">
              {canCreateTeam ? t.actionTitle : unavailableReason}
            </h2>
            <p className="mt-1 text-sm leading-6 text-zinc-600">
              {canCreateTeam ? t.actionDescription : teamSectionDescription}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          {publicEvent.teamCount > 0 ? (
            <a
              className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#eef5ea] px-4 text-sm font-semibold text-moss ring-1 ring-[#c1d2ba] transition hover:bg-[#e5f0df] hover:text-ink"
              href="#public-event-teams"
            >
              <UsersRound className="h-4 w-4" />
              {t.jumpToTeams}
            </a>
          ) : null}
          {publicEvent.officialUrl ? (
            <AnalyticsExternalLink
              className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white px-4 text-sm font-medium text-ink ring-1 ring-black/10 transition hover:bg-zinc-50"
              event={{
                name: "public_event_source_clicked",
                entityId: publicEvent.id,
                entityType: "public_event",
                sourceSurface: "public_event_detail",
                properties: {
                  source_kind: "official_page",
                },
              }}
              href={publicEvent.officialUrl}
            >
              {t.officialPage}
              <ExternalLink className="h-4 w-4" />
            </AnalyticsExternalLink>
          ) : null}
          {canCreateTeam ? (
            <AnalyticsLink
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
              <Button className="h-10 w-full whitespace-nowrap rounded-full bg-[#d88d72] text-white hover:bg-[#c87b61] sm:w-auto">
                {t.teamUp}
              </Button>
            </AnalyticsLink>
          ) : null}
        </div>
      </section>

      <section className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="min-w-0 space-y-6 lg:order-1">
          <section className="space-y-4 scroll-mt-24" id="public-event-teams">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-normal text-ink">
                  {t.existingTeams}
                </h2>
                <p className="mt-1 text-sm leading-6 text-zinc-600">
                  {teamSectionDescription}
                </p>
              </div>
              {canCreateTeam ? (
                <AnalyticsLink
                  className="hidden sm:block"
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
                  <Button className="w-full whitespace-nowrap sm:w-auto">
                    {t.teamUp}
                  </Button>
                </AnalyticsLink>
              ) : null}
            </div>

            {publicEvent.teams.length === 0 ? (
              <div className="rounded-[1.25rem] border border-dashed border-[#d8ccb4] bg-white/70 p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eef5ea] text-moss ring-1 ring-[#c1d2ba]">
                      <UsersRound className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-ink">
                        {t.noTeamsTitle}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-zinc-600">
                        {isCancelled
                          ? t.noTeamsUnavailableDescription
                          : isEnded
                            ? t.noTeamsEndedDescription
                            : t.noTeamsDescription}
                      </p>
                    </div>
                  </div>
                  {canCreateTeam ? (
                    <AnalyticsLink
                      className="shrink-0"
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
                      <Button className="w-full whitespace-nowrap rounded-full px-6 sm:w-auto">
                        {t.noTeamsCta}
                      </Button>
                    </AnalyticsLink>
                  ) : null}
                </div>
                {canCreateTeam ? (
                  <p className="mt-4 rounded-2xl bg-[#fff8ec] px-3 py-2 text-sm leading-6 text-zinc-600 ring-1 ring-[#dccba8]">
                    {t.publicEventRuleDescription}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {publicEvent.teams.map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    isAuthenticated={Boolean(viewerProfile)}
                    locale={locale}
                    showFavoriteButton
                    sourceSurface="public_event_detail"
                  />
                ))}
              </div>
            )}
          </section>

          <div className="rounded-lg border border-black/10 bg-white/70 p-4 sm:p-5">
            <h2 className="text-lg font-semibold text-ink">
              {t.eventInfoTitle}
            </h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-zinc-600">
              {publicEvent.description}
            </p>
          </div>

          {publicEvent.latitude !== null && publicEvent.longitude !== null ? (
            <ActivityMapPreview
              address={publicEvent.address}
              latitude={publicEvent.latitude}
              longitude={publicEvent.longitude}
              openLabel={
                locale === "fr"
                  ? "Ouvrir la carte"
                  : locale === "en"
                    ? "Open map"
                    : "打开地图"
              }
              title={
                locale === "fr"
                  ? "Lieu"
                  : locale === "en"
                    ? "Location"
                    : "活动地点"
              }
            />
          ) : null}
        </article>

        <aside className="h-fit w-full min-w-0 max-w-full rounded-[1.25rem] border border-black/10 bg-white/80 p-4 shadow-sm sm:p-5 lg:sticky lg:top-24 lg:order-2">
          <div className="mb-5 rounded-xl border border-[#dccba8] bg-[#fff8ec] px-3 py-3 text-sm leading-6 text-zinc-700">
            <div className="flex items-center gap-2 font-semibold text-ink">
              <Ticket className="h-4 w-4 text-[#8a6a40]" />
              {t.publicEventRuleTitle}
            </div>
            <p className="mt-1 text-sm leading-6 text-zinc-600">
              {t.publicEventRuleDescription}
            </p>
          </div>
          {isCancelled ? (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm leading-6 text-red-700">
              <div className="flex items-center gap-2 font-semibold">
                <CircleX className="h-4 w-4" />
                {t.cancelledBadge}
              </div>
              <p className="mt-1 text-sm leading-6">{t.eventCancelled}</p>
            </div>
          ) : null}

          <div className="space-y-4 text-sm text-zinc-700">
            <p className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0 break-words">{eventDateLabel}</span>
            </p>
            <p className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0 break-words">{publicEvent.address}</span>
            </p>
            <p className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2">
              <Ticket className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0 break-words">{eventPriceLabel}</span>
            </p>
            <p className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2">
              <UsersRound className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0 break-words">
                {t.teamCount(publicEvent.teamCount)}
              </span>
            </p>
          </div>

          <div className="mt-6 grid gap-3">
            {publicEvent.officialUrl ? (
              <AnalyticsExternalLink
                className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white px-4 text-sm font-medium text-ink ring-1 ring-black/10 transition hover:bg-zinc-50"
                event={{
                  name: "public_event_source_clicked",
                  entityId: publicEvent.id,
                  entityType: "public_event",
                  sourceSurface: "public_event_detail",
                  properties: {
                    source_kind: "official_page",
                  },
                }}
                href={publicEvent.officialUrl}
              >
                {t.officialPage}
                <ExternalLink className="h-4 w-4" />
              </AnalyticsExternalLink>
            ) : null}
            {!canCreateTeam ? (
              <p className="rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-600">
                {unavailableReason}
              </p>
            ) : (
              <AnalyticsLink
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
                <Button className="h-11 w-full whitespace-nowrap rounded-full">
                  {t.teamUp}
                </Button>
              </AnalyticsLink>
            )}
          </div>
        </aside>
      </section>
    </PageContainer>
  );
}
