import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock3,
  MapPin,
  Search,
  Store,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@chill-club/ui";
import { PageContainer } from "@/components/layout/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { AnalyticsLink } from "@/features/analytics/components/AnalyticsLink";
import { ContextualDetailLink } from "@/features/navigation/components/ContextualDetailLink";
import { DetailSourceRestore } from "@/features/navigation/components/DetailSourceRestore";
import { normalizeAnalyticsLocale } from "@/features/analytics/events";
import { recordOperationLatency } from "@/features/analytics/latency";
import { GlobalSearchForm } from "@/features/search/components/GlobalSearchForm";
import { SearchBackButton } from "@/features/search/components/SearchBackButton";
import { GlobalSearchUserResults } from "@/features/search/components/GlobalSearchUserResults";
import { SearchActivityResultsFeed } from "@/features/search/components/SearchActivityResultsFeed";
import { SearchHighlightedText } from "@/features/search/components/SearchHighlightedText";
import { queueAnalyticsEvent } from "@/features/analytics/server";
import {
  getGlobalSearchMainActivityResults,
  getGlobalSearchRecommendations,
  getGlobalSearchResults,
  type GlobalSearchMerchantViewModel,
  type GlobalSearchRecommendations,
  type GlobalSearchUserViewModel,
} from "@/features/search/queries/getGlobalSearchResults";
import type { ActivityCardViewModel } from "@/features/activities/types";
import {
  getActivityDateLabel,
  getActivityLocationLabel,
} from "@/features/activities/utils/activityDisplay";
import { getActivityDetailPath } from "@/features/activities/utils/activityRoutes";
import {
  getGlobalSearchHref,
  getSingleGlobalSearchParam,
  isCanonicalGlobalSearchParams,
  normalizeGlobalSearchQuery,
  type GlobalSearchParams,
} from "@/features/search/utils/searchQuery";
import { brand } from "@/lib/brand";
import { getCategoryLabel, getCopy } from "@/lib/copy";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";
import { createPerformanceTracker } from "@/lib/performance";
import { withLocale } from "@/lib/routes";

type SearchPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams?: Promise<GlobalSearchParams>;
};

export const dynamic = "force-dynamic";

function SearchSectionHeader({
  action,
  count,
  title,
}: {
  action?: ReactNode;
  count: number;
  title: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-normal text-ink">
          {title}
        </h2>
        <Badge className="shrink-0 bg-white/85 text-[#156240] ring-1 ring-[#D6D5B2]">
          {count}
        </Badge>
      </div>
      {action ? <div className="sm:shrink-0">{action}</div> : null}
    </div>
  );
}

function SearchEndedFilterBar({
  hiddenEndedCount,
  includeEnded,
  locale,
  query,
}: {
  hiddenEndedCount: number;
  includeEnded: boolean;
  locale: string;
  query: string;
}) {
  const t = getCopy(locale).globalSearch;
  const nextHref = getGlobalSearchHref(locale, query, {
    includeEnded: !includeEnded,
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <AnalyticsLink
        href={nextHref}
        aria-pressed={includeEnded}
        className={
          includeEnded
            ? "inline-flex h-9 items-center justify-center gap-2 rounded-full bg-[#F1F2EC] px-3.5 text-sm font-semibold text-[#156240] ring-1 ring-[#8AB68E] transition hover:bg-[#F1F2EC]"
            : "inline-flex h-9 items-center justify-center gap-2 rounded-full bg-white/85 px-3.5 text-sm font-semibold text-[#156240] ring-1 ring-[#D6D5B2] transition hover:bg-white"
        }
        event={{
          name: "filter_applied",
          sourceSurface: "global_search",
          properties: {
            filter_count: includeEnded ? 0 : 1,
            filter_names: ["include_ended"],
            hidden_ended_count: hiddenEndedCount,
            next_include_ended: !includeEnded,
            scope: "global_search",
          },
        }}
      >
        <span
          className={
            includeEnded
              ? "flex h-4 w-4 items-center justify-center rounded-[0.32rem] bg-[#369758] text-white shadow-sm"
              : "h-4 w-4 rounded-[0.32rem] border border-[#8AB68E] bg-white shadow-inner"
          }
          aria-hidden="true"
        >
          {includeEnded ? (
            <span className="text-[11px] font-bold leading-none">✓</span>
          ) : null}
        </span>
        {includeEnded ? t.hideEndedResults : t.showEndedResults}
      </AnalyticsLink>
      <span className="text-xs leading-5 text-zinc-500">
        {includeEnded
          ? t.endedResultsShownHint
          : hiddenEndedCount > 0
            ? t.endedResultsHiddenWithCount(hiddenEndedCount)
            : t.endedResultsHiddenHint}
      </span>
    </div>
  );
}

function SearchEndedOnlyEmptyState({
  endedCount,
  locale,
  query,
}: {
  endedCount: number;
  locale: string;
  query: string;
}) {
  const t = getCopy(locale).globalSearch;

  return (
    <div className="relative overflow-hidden rounded-[1.35rem] border border-[#D6D5B2] bg-white/[0.76] p-6 text-center shadow-[0_14px_34px_rgba(21,98,64,0.06)] sm:p-8">
      <span
        className="pointer-events-none absolute inset-x-8 -top-14 h-24 rounded-full bg-[#F1F2EC]/55 blur-2xl"
        aria-hidden="true"
      />
      <span className="relative mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F1F2EC] p-2.5 ring-1 ring-[#D6D5B2]">
        <Image
          src={brand.emptyStateIconPath}
          alt=""
          width={56}
          height={56}
          className="h-full w-full object-contain"
        />
        <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#156240] ring-1 ring-[#8AB68E]">
          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </span>
      <h2 className="relative mt-4 text-base font-semibold text-[#1D1D1B]">
        {t.onlyEndedResultsTitle}
      </h2>
      <p className="relative mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
        {t.onlyEndedResultsDescription(endedCount)}
      </p>
      <AnalyticsLink
        href={getGlobalSearchHref(locale, query, { includeEnded: true })}
        className="relative mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#156240] px-5 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(21,98,64,0.18)] transition hover:bg-[#369758]"
        event={{
          name: "filter_applied",
          sourceSurface: "global_search",
          properties: {
            filter_count: 1,
            filter_names: ["include_ended"],
            hidden_ended_count: endedCount,
            next_include_ended: true,
            scope: "global_search",
          },
        }}
      >
        <Clock3 className="h-4 w-4" aria-hidden="true" />
        {t.showEndedResults}
      </AnalyticsLink>
    </div>
  );
}

function MerchantResultCard({
  locale,
  merchant,
  query,
}: {
  locale: string;
  merchant: GlobalSearchMerchantViewModel;
  query: string;
}) {
  const t = getCopy(locale).globalSearch;
  const href = withLocale(locale, `/merchants/${merchant.slug}`);
  const location = [merchant.city, merchant.address]
    .filter(Boolean)
    .join(" · ");

  return (
    <ContextualDetailLink
      href={href}
      detailSource={{
        sourceKey: "search",
        targetKey: `merchant:${merchant.slug}`,
        targetKind: "merchant",
      }}
      data-detail-source-target={`merchant:${merchant.slug}`}
      className="group flex min-w-0 items-start gap-3 rounded-xl border border-sand bg-white/80 p-4 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-sand-strong"
      aria-label={t.openMerchant(merchant.name)}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-moss/10 text-moss ring-1 ring-moss/15">
        {merchant.logoUrl ? (
          // Merchant logos are tiny thumbnails; using img keeps remote source
          // support independent from Next image domain config.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={merchant.logoUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <Store className="h-5 w-5" aria-hidden="true" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center justify-between gap-3">
          <span className="truncate text-base font-semibold text-ink">
            <SearchHighlightedText text={merchant.name} query={query} />
          </span>
          <ArrowRight
            className="h-4 w-4 shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-ink"
            aria-hidden="true"
          />
        </span>
        <span className="mt-1 line-clamp-2 text-sm leading-5 text-zinc-600">
          {merchant.description}
        </span>
        <span className="mt-3 flex min-w-0 items-center gap-2 text-sm text-zinc-500">
          <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{location || merchant.city}</span>
        </span>
        <span className="mt-2 inline-flex rounded-full bg-team-bg px-2.5 py-1 text-xs font-medium text-[#156240] ring-1 ring-[#D6D5B2]">
          {t.merchantActivityCount(merchant.activityCount)}
        </span>
      </span>
    </ContextualDetailLink>
  );
}

function getSearchRecommendationActivityHref(
  activity: ActivityCardViewModel,
  locale: string,
) {
  if (activity.type === "PUBLIC_EVENT") {
    return withLocale(locale, `/public-events/${activity.publicEventId ?? activity.id}`);
  }

  return withLocale(locale, getActivityDetailPath(activity.id));
}

function SearchRecommendationSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-[1.05rem] font-bold tracking-normal text-[#111210]">
        {title}
      </h2>
      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
    </section>
  );
}

function SearchUserAvatar({ user }: { user: GlobalSearchUserViewModel }) {
  const initial = user.nickname.trim().charAt(0).toUpperCase() || "F";

  if (user.avatarUrl) {
    return (
      // User avatars may come from Clerk or storage; img keeps remote support.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatarUrl}
        alt=""
        className="h-14 w-14 rounded-full object-cover"
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0A8D70] text-xl font-bold text-white">
      {initial}
    </span>
  );
}

function SearchRecommendedUsers({
  locale,
  users,
}: {
  locale: string;
  users: GlobalSearchUserViewModel[];
}) {
  const t = getCopy(locale).globalSearch;

  if (users.length === 0) {
    return null;
  }

  return (
    <SearchRecommendationSection title={t.recommendationsUsersTitle}>
      <div className="flex w-max gap-4 pr-4">
        {users.map((user) => (
          <ContextualDetailLink
            key={user.id}
            href={withLocale(locale, `/profile/${user.id}`)}
            detailSource={{
              sourceKey: "search",
              targetKey: `profile:${user.id}`,
              targetKind: "profile",
            }}
            className="flex w-[4.4rem] shrink-0 flex-col items-center gap-2"
            aria-label={t.openUserProfile(user.nickname)}
          >
            <SearchUserAvatar user={user} />
            <span className="w-full truncate text-center text-xs font-bold text-[#111210]">
              {user.nickname}
            </span>
          </ContextualDetailLink>
        ))}
      </div>
    </SearchRecommendationSection>
  );
}

function SearchRecommendationImage({
  alt,
  src,
}: {
  alt: string;
  src: string | null;
}) {
  if (src) {
    return (
      // Cover URLs can come from external event feeds or storage.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <span className="absolute inset-0 flex items-center justify-center bg-[#F6F7F2]">
      <Image
        src={brand.logoFullBackgroundPath}
        alt=""
        width={58}
        height={58}
        className="h-12 w-12 rounded-xl object-cover"
      />
    </span>
  );
}

function SearchRecommendedActivityCard({
  activity,
  locale,
  sourceKind,
}: {
  activity: ActivityCardViewModel;
  locale: string;
  sourceKind: "activity" | "hangout";
}) {
  const copy = getCopy(locale);
  const isPublicEvent = activity.type === "PUBLIC_EVENT";
  const href = getSearchRecommendationActivityHref(activity, locale);
  const detailTargetKind = isPublicEvent ? "public_event" : "activity";
  const participantLabel =
    activity.capacity > 0
      ? `${activity.participantCount}/${activity.capacity}`
      : `${activity.participantCount}`;

  return (
    <ContextualDetailLink
      href={href}
      detailSource={{
        sourceKey: "search",
        targetKey: `${detailTargetKind}:${activity.publicEventId ?? activity.id}`,
        targetKind: detailTargetKind,
      }}
      className="group w-[10.25rem] shrink-0 snap-start overflow-hidden rounded-[0.9rem] border border-[#E1DDC8] bg-white transition active:scale-[0.99]"
      aria-label={activity.title}
    >
      <div className="relative h-[6.65rem] overflow-hidden bg-[#F6F7F2]">
        <SearchRecommendationImage
          src={activity.coverImageUrl}
          alt={activity.title}
        />
        <span className="absolute left-2 top-2 max-w-[7.2rem] truncate rounded-full bg-white/92 px-2 py-0.5 text-[10px] font-semibold text-[#0A7652]">
          {getCategoryLabel(activity.category, locale)}
        </span>
      </div>
      <div className="min-h-[5.75rem] px-2.5 py-2.5">
        <h3 className="line-clamp-2 text-[12px] font-bold leading-4 text-[#111210]">
          {activity.title}
        </h3>
        <p className="mt-2 flex min-w-0 items-center gap-1 text-[10px] font-bold text-[#111210]/62">
          {sourceKind === "hangout" ? (
            <>
              <UsersRound className="h-3 w-3 shrink-0 text-[#0A7652]" />
              <span className="truncate">
                {participantLabel} {copy.common.people} · {activity.city}
              </span>
            </>
          ) : (
            <>
              <CalendarDays className="h-3 w-3 shrink-0 text-[#0A7652]" />
              <span className="truncate">
                {getActivityDateLabel(activity, locale)}
              </span>
            </>
          )}
        </p>
        <p className="mt-1 flex min-w-0 items-center gap-1 text-[10px] font-bold text-[#111210]/52">
          <MapPin className="h-3 w-3 shrink-0 text-[#0A7652]" />
          <span className="truncate">
            {sourceKind === "hangout"
              ? getActivityDateLabel(activity, locale)
              : getActivityLocationLabel(activity)}
          </span>
        </p>
      </div>
    </ContextualDetailLink>
  );
}

function SearchRecommendedActivities({
  activities,
  locale,
  sourceKind,
  title,
}: {
  activities: ActivityCardViewModel[];
  locale: string;
  sourceKind: "activity" | "hangout";
  title: string;
}) {
  if (activities.length === 0) {
    return null;
  }

  return (
    <SearchRecommendationSection title={title}>
      <div className="flex w-max snap-x snap-mandatory gap-3 pr-4">
        {activities.map((activity) => (
          <SearchRecommendedActivityCard
            key={`${sourceKind}-${activity.publicEventId ?? activity.id}`}
            activity={activity}
            locale={locale}
            sourceKind={sourceKind}
          />
        ))}
      </div>
    </SearchRecommendationSection>
  );
}

function SearchRecommendationsView({
  locale,
  recommendations,
}: {
  locale: string;
  recommendations: GlobalSearchRecommendations;
}) {
  const t = getCopy(locale).globalSearch;
  const hasRecommendations =
    recommendations.users.length > 0 ||
    recommendations.hangouts.length > 0 ||
    recommendations.activities.length > 0;

  if (!hasRecommendations) {
    return (
      <div className="flex min-h-[18rem] flex-col items-center justify-center text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F6F7F2] text-[#0A7652]">
          <Search className="h-5 w-5" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-base font-bold text-[#111210]">
          {t.recommendationsEmptyTitle}
        </h2>
        <p className="mt-2 max-w-xs text-sm leading-6 text-zinc-500">
          {t.recommendationsEmptyDescription}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <SearchRecommendedUsers users={recommendations.users} locale={locale} />
      <SearchRecommendedActivities
        activities={recommendations.hangouts}
        locale={locale}
        sourceKind="hangout"
        title={t.recommendationsHangoutsTitle}
      />
      <SearchRecommendedActivities
        activities={recommendations.activities}
        locale={locale}
        sourceKind="activity"
        title={t.recommendationsActivitiesTitle}
      />
    </div>
  );
}

export default async function SearchPage({
  params,
  searchParams,
}: SearchPageProps) {
  const { locale } = await params;
  const perf = createPerformanceTracker({
    locale,
    route: "/search",
  });
  const rawSearchParams = (await searchParams) ?? {};
  const rawQuery = getSingleGlobalSearchParam(rawSearchParams, "q");
  const rawIncludeEnded =
    getSingleGlobalSearchParam(rawSearchParams, "ended") === "1";
  const query = normalizeGlobalSearchQuery(rawQuery);

  if (!isCanonicalGlobalSearchParams(rawSearchParams)) {
    redirect(
      getGlobalSearchHref(locale, query, {
        includeEnded: rawIncludeEnded,
      }),
    );
  }

  const includeEnded = Boolean(query && rawIncludeEnded);
  const t = getCopy(locale).globalSearch;
  const analyticsLocale = normalizeAnalyticsLocale(locale);
  const viewerProfile = await perf.measure("viewer.profile", () =>
    getOptionalCurrentUserProfileSnapshot().catch((error: unknown) => {
      console.error("Failed to load viewer profile for global search", error);
      return null;
    }),
  );
  const [searchResult, mainActivityResult] = query
    ? await Promise.all([
        perf.measure("search.results", () =>
          getGlobalSearchResults(query, viewerProfile?.id, {
            includeEnded,
          })
            .then((result) => ({ result, error: null }))
            .catch((error: unknown) => {
              console.error("Failed to load global search results", error);
              return { result: null, error };
            }),
        ),
        perf.measure("search.mainActivityResults", () =>
          getGlobalSearchMainActivityResults(query, viewerProfile?.id, {
            includeEnded,
          })
            .then((result) => ({ result, error: null }))
            .catch((error: unknown) => {
              console.error(
                "Failed to load global search activity results",
                error,
              );
              return { result: null, error };
            }),
        ),
      ])
    : [
        { result: null, error: null },
        { result: null, error: null },
      ];
  const recommendationResult = !query
    ? await perf.measure("search.recommendations", () =>
        getGlobalSearchRecommendations(viewerProfile?.id)
          .then((result) => ({ result, error: null }))
          .catch((error: unknown) => {
            console.error("Failed to load global search recommendations", error);
            return { result: null, error };
          }),
      )
    : { result: null, error: null };
  const shouldLoadInitialRelatedResults =
    query &&
    mainActivityResult.result &&
    !mainActivityResult.result.hasMore;
  const relatedActivityResult = shouldLoadInitialRelatedResults
    ? await perf.measure("search.relatedActivityResults", () =>
        getGlobalSearchMainActivityResults(query, viewerProfile?.id, {
          includeEnded,
          mode: "related",
        })
          .then((result) => ({ result, error: null }))
          .catch((error: unknown) => {
            console.error(
              "Failed to load related search activity results",
              error,
            );
            return { result: null, error };
          }),
      )
    : { result: null, error: null };
  const relatedActivityCount = relatedActivityResult.result?.totalCount ?? 0;
  const mainActivityCount = mainActivityResult.result?.activityCount ?? 0;
  const mainPublicEventCount = mainActivityResult.result?.publicEventCount ?? 0;
  const mixedActivityResultCount =
    mainActivityResult.result?.totalCount ??
    mainActivityCount + mainPublicEventCount;
  const hiddenEndedMainCount = searchResult.result
    ? searchResult.result.hiddenEndedActivityCount +
      searchResult.result.hiddenEndedPublicEventCount
    : 0;
  const totalCount = searchResult.result
    ? searchResult.result.userCount +
      searchResult.result.merchantCount +
      mixedActivityResultCount
    : mixedActivityResultCount;
  const hasResults = totalCount > 0 || relatedActivityCount > 0;

  if (query && searchResult.result) {
    const requestHeaders = await headers();

    queueAnalyticsEvent(
      {
        locale: analyticsLocale,
        name: "search_submitted",
        route: `/${locale}/search`,
        sourceSurface: "global_search",
        properties: {
          activity_count: mainActivityCount,
          keyword_length: query.length,
          merchant_count: searchResult.result.merchantCount,
          public_event_count: mainPublicEventCount,
          result_count: totalCount,
          scope: "global",
          has_hidden_ended_results: hiddenEndedMainCount > 0,
          include_ended: includeEnded,
          user_count: searchResult.result.userCount,
        },
      },
      {
        referrer: requestHeaders.get("referer"),
        userAgent: requestHeaders.get("user-agent"),
        userProfileId: viewerProfile?.id,
      },
    );
  }

  const perfResult = perf.finish(
    {
      hasQuery: Boolean(query),
      resultCount: totalCount,
    },
    {
      route: `/${locale}/search`,
      routeKey: "search",
      sourceSurface: "global_search",
      userProfileId: viewerProfile?.id,
    },
  );
  const searchStep = perfResult.steps.find(
    (step) => step.label === "search.results",
  );

  if (query) {
    recordOperationLatency({
      durationMs: searchStep?.durationMs ?? perfResult.totalMs,
      locale,
      operationKey: "search",
      route: `/${locale}/search`,
      sourceSurface: "global_search",
      status: searchResult.error ? "failed" : "success",
      statusReason: searchResult.error ? "search_failed" : null,
      userProfileId: viewerProfile?.id,
      properties: {
        has_results: hasResults,
        hidden_ended_count: hiddenEndedMainCount,
        include_ended: includeEnded,
        result_count: totalCount,
      },
    });
  }

  return (
    <PageContainer
      className="max-w-3xl space-y-6 bg-white py-4 sm:py-8"
      mobileSafeBottom
      mobileSafeTop
    >
      <DetailSourceRestore sourceKey="search" />
      <div className="flex items-center gap-3">
        <SearchBackButton
          ariaLabel={t.back}
          fallbackHref={withLocale(locale, "/mobile-home")}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#D6D5B2] bg-white text-[#111210] transition active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </SearchBackButton>
        <GlobalSearchForm
          locale={locale}
          defaultQuery={query}
          variant="page"
          className="min-w-0 flex-1"
        />
      </div>

      {searchResult.error ? (
        <EmptyState
          title={t.loadFailedTitle}
          description={t.loadFailedDescription}
        />
      ) : !query ? (
        recommendationResult.error ? (
          <EmptyState
            title={t.loadFailedTitle}
            description={t.loadFailedDescription}
          />
        ) : recommendationResult.result ? (
          <SearchRecommendationsView
            locale={locale}
            recommendations={recommendationResult.result}
          />
        ) : null
      ) : !hasResults && hiddenEndedMainCount > 0 ? (
        <SearchEndedOnlyEmptyState
          endedCount={hiddenEndedMainCount}
          locale={locale}
          query={query}
        />
      ) : !hasResults ? (
        <EmptyState
          title={t.noResultsTitle}
          description={t.noResultsDescription(query)}
          actionHref={withLocale(locale, "/activities")}
          actionLabel={t.browseRecentActivities}
        />
      ) : searchResult.result ? (
        <div className="space-y-8">
          <p className="rounded-xl border border-sand bg-white/70 px-4 py-3 text-sm leading-6 text-zinc-600 shadow-sm">
            {totalCount > 0
              ? t.resultSummary(totalCount, query)
              : t.relatedOnlySummary(query)}
          </p>

          {searchResult.result.userCount > 0 ? (
            <section className="space-y-3">
              <SearchSectionHeader
                title={t.usersTitle}
                count={searchResult.result.userCount}
              />
              {searchResult.result.users.length > 0 ? (
                <>
                  <GlobalSearchUserResults
                    locale={locale}
                    query={query}
                    totalCount={searchResult.result.userCount}
                    users={searchResult.result.users}
                  />
                </>
              ) : (
                <p className="rounded-xl border border-dashed border-sand-strong bg-white/60 p-4 text-sm text-zinc-500">
                  {t.noUserResults}
                </p>
              )}
            </section>
          ) : null}

          {mixedActivityResultCount > 0 || relatedActivityCount > 0 ? (
            <section className="space-y-3">
              <SearchSectionHeader
                action={
                  query ? (
                    <SearchEndedFilterBar
                      hiddenEndedCount={hiddenEndedMainCount}
                      includeEnded={includeEnded}
                      locale={locale}
                      query={query}
                    />
                  ) : null
                }
                title={t.mainResultsTitle}
                count={
                  mixedActivityResultCount > 0
                    ? mixedActivityResultCount
                    : relatedActivityCount
                }
              />
              {mainActivityResult.result &&
              (mainActivityResult.result.items.length > 0 ||
                relatedActivityCount > 0) ? (
                <SearchActivityResultsFeed
                  initialActivities={mainActivityResult.result.items}
                  initialHasMore={mainActivityResult.result.hasMore}
                  initialNextOffset={mainActivityResult.result.nextOffset}
                  initialRelatedActivities={
                    relatedActivityResult.result?.items ?? []
                  }
                  initialRelatedHasMore={
                    relatedActivityResult.result?.hasMore ?? false
                  }
                  initialRelatedNextOffset={
                    relatedActivityResult.result?.nextOffset ?? 0
                  }
                  initialRelatedTotalCount={relatedActivityCount}
                  includeEnded={includeEnded}
                  isAuthenticated={Boolean(viewerProfile)}
                  locale={locale}
                  query={query}
                  totalCount={mainActivityResult.result.totalCount}
                  viewerProfileId={viewerProfile?.id ?? null}
                />
              ) : mainActivityResult.error ? (
                <p className="rounded-xl border border-dashed border-sand-strong bg-white/60 p-4 text-sm text-zinc-500">
                  {t.loadFailedDescription}
                </p>
              ) : (
                <p className="rounded-xl border border-dashed border-sand-strong bg-white/60 p-4 text-sm text-zinc-500">
                  {t.noMainResults}
                </p>
              )}
            </section>
          ) : null}

          {searchResult.result.merchantCount > 0 ? (
            <section className="space-y-3">
              <SearchSectionHeader
                title={t.merchantsTitle}
                count={searchResult.result.merchantCount}
              />
              {searchResult.result.merchants.length > 0 ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  {searchResult.result.merchants.map((merchant) => (
                    <MerchantResultCard
                      key={merchant.id}
                      merchant={merchant}
                      locale={locale}
                      query={query}
                    />
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-sand-strong bg-white/60 p-4 text-sm text-zinc-500">
                  {t.noMerchantResults}
                </p>
              )}
            </section>
          ) : null}
        </div>
      ) : null}
    </PageContainer>
  );
}
