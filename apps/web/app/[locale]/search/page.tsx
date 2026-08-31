import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Image from "next/image";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, Clock3, MapPin, Store } from "lucide-react";
import type { ReactNode } from "react";
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
  getGlobalSearchHangoutRecommendations,
  getGlobalSearchMainActivityResults,
  getGlobalSearchRecommendations,
  getGlobalSearchResults,
  type GlobalSearchMerchantViewModel,
  type GlobalSearchRecommendations,
  type GlobalSearchUserViewModel,
} from "@/features/search/queries/getGlobalSearchResults";
import type { ActivityCardViewModel } from "@/features/activities/types";
import { ResponsiveSearchActivityCards } from "@/features/search/components/ResponsiveSearchActivityCards";
import {
  getGlobalSearchHref,
  getSingleGlobalSearchParam,
  isCanonicalGlobalSearchParams,
  normalizeGlobalSearchQuery,
  normalizeGlobalSearchSource,
  type GlobalSearchParams,
  type GlobalSearchSource,
} from "@/features/search/utils/searchQuery";
import { brand } from "@/lib/brand";
import { getCopy } from "@/lib/copy";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";
import { createPerformanceTracker } from "@/lib/performance";
import { withLocale } from "@/lib/routes";
import { buildNoIndexMetadata } from "@/lib/seo";

type SearchPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams?: Promise<GlobalSearchParams>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: SearchPageProps): Promise<Metadata> {
  const { locale } = await params;

  return buildNoIndexMetadata({
    canonicalPath: withLocale(locale, "/search"),
    follow: true,
  });
}

function SearchSectionHeader({
  count,
  title,
}: {
  count: number;
  title: string;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <h2 className="text-lg font-semibold tracking-normal text-ink">
        {title}
      </h2>
      <span className="shrink-0 text-xs font-semibold leading-5 text-[#156240]">
        {count}
      </span>
    </div>
  );
}

function SearchEndedOnlyEmptyState({
  endedCount,
  locale,
  query,
  source,
}: {
  endedCount: number;
  locale: string;
  query: string;
  source: GlobalSearchSource | null;
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
        href={getGlobalSearchHref(locale, query, {
          includeEnded: true,
          source,
        })}
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
      className="group flex min-w-0 items-start gap-3 py-4 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sand-strong"
      aria-label={t.openMerchant(merchant.name)}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#ECF5EF] text-moss">
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
        <span className="mt-2 inline-flex text-xs font-medium text-[#156240]">
          {t.merchantActivityCount(merchant.activityCount)}
        </span>
      </span>
    </ContextualDetailLink>
  );
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

function SearchRecommendedActivities({
  activities,
  isAuthenticated,
  locale,
  title,
  viewerProfileId,
}: {
  activities: ActivityCardViewModel[];
  isAuthenticated: boolean;
  locale: string;
  title: string;
  viewerProfileId: string | null;
}) {
  if (activities.length === 0) {
    return null;
  }

  return (
    <SearchRecommendationSection title={title}>
      <ResponsiveSearchActivityCards
        activities={activities}
        isAuthenticated={isAuthenticated}
        locale={locale}
        viewerProfileId={viewerProfileId}
      />
    </SearchRecommendationSection>
  );
}

function SearchRecommendationsView({
  includeUsers = true,
  isAuthenticated,
  locale,
  recommendations,
  showEmptyState = true,
  viewerProfileId,
}: {
  includeUsers?: boolean;
  isAuthenticated: boolean;
  locale: string;
  recommendations: GlobalSearchRecommendations;
  showEmptyState?: boolean;
  viewerProfileId: string | null;
}) {
  const t = getCopy(locale).globalSearch;
  const hasRecommendations =
    (includeUsers && recommendations.users.length > 0) ||
    recommendations.hangouts.length > 0 ||
    recommendations.activities.length > 0;

  if (!hasRecommendations && showEmptyState) {
    return (
      <div className="flex min-h-[18rem] flex-col items-center justify-center text-center">
        <span className="flex h-28 w-28 items-center justify-center overflow-hidden">
          <Image
            src={brand.emptyContentIllustrationPath}
            alt=""
            width={2048}
            height={2048}
            className="h-full w-full scale-[1.55] object-contain"
          />
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

  if (!hasRecommendations) {
    return null;
  }

  return (
    <div className="space-y-7">
      {includeUsers ? (
        <SearchRecommendedUsers users={recommendations.users} locale={locale} />
      ) : null}
      <SearchRecommendedActivities
        activities={recommendations.hangouts}
        isAuthenticated={isAuthenticated}
        locale={locale}
        title={t.recommendationsHangoutsTitle}
        viewerProfileId={viewerProfileId}
      />
      <SearchRecommendedActivities
        activities={recommendations.activities}
        isAuthenticated={isAuthenticated}
        locale={locale}
        title={t.recommendationsActivitiesTitle}
        viewerProfileId={viewerProfileId}
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
  const source = normalizeGlobalSearchSource(
    getSingleGlobalSearchParam(rawSearchParams, "source"),
  );
  const rawIncludeEnded =
    getSingleGlobalSearchParam(rawSearchParams, "ended") === "1";
  const query = normalizeGlobalSearchQuery(rawQuery);

  if (!isCanonicalGlobalSearchParams(rawSearchParams)) {
    redirect(
      getGlobalSearchHref(locale, query, {
        includeEnded: rawIncludeEnded,
        source,
      }),
    );
  }

  const includeEnded = Boolean(query && rawIncludeEnded);
  const searchHref = getGlobalSearchHref(locale, query, {
    includeEnded,
    source,
  });
  const backHref =
    source === "messages"
      ? withLocale(locale, "/footprints?tab=message")
      : withLocale(locale, "/mobile-home");
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
  const shouldLoadInitialRelatedResults =
    query && mainActivityResult.result && !mainActivityResult.result.hasMore;
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
  const shouldLoadRecommendations = !query || !hasResults;
  const recommendationResult = shouldLoadRecommendations
    ? await perf.measure("search.recommendations", () =>
        getGlobalSearchRecommendations(viewerProfile?.id)
          .then((result) => ({ result, error: null }))
          .catch((error: unknown) => {
            console.error(
              "Failed to load global search recommendations",
              error,
            );
            return { result: null, error };
          }),
      )
    : { result: null, error: null };
  const userFallbackHangoutResult =
    query && hasResults && searchResult.result?.userCount === 0
      ? await perf.measure("search.userFallbackHangouts", () =>
          getGlobalSearchHangoutRecommendations(viewerProfile?.id)
            .then((result) => ({ result, error: null }))
            .catch((error: unknown) => {
              console.error(
                "Failed to load user fallback hangout recommendations",
                error,
              );
              return { result: null, error };
            }),
        )
      : { result: null, error: null };

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
          fallbackHref={backHref}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#D6D5B2] bg-white text-[#111210] transition active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </SearchBackButton>
        <GlobalSearchForm
          locale={locale}
          defaultQuery={query}
          source={source}
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
            isAuthenticated={Boolean(viewerProfile)}
            locale={locale}
            recommendations={recommendationResult.result}
            viewerProfileId={viewerProfile?.id ?? null}
          />
        ) : null
      ) : !hasResults && hiddenEndedMainCount > 0 ? (
        <SearchEndedOnlyEmptyState
          endedCount={hiddenEndedMainCount}
          locale={locale}
          query={query}
          source={source}
        />
      ) : !hasResults ? (
        <section className="space-y-5">
          <EmptyState
            title={t.noResultsTitle}
            description={t.noResultsDescription(query)}
            actionHref={withLocale(locale, "/activities")}
            actionLabel={t.browseRecentActivities}
            className="border-none bg-white p-4 shadow-none sm:p-6"
            imageSrc={brand.emptyContentIllustrationPath}
            imageWidth={2048}
            imageHeight={2048}
            imageContainerClassName="h-24 w-24 rounded-none bg-transparent ring-0 sm:h-28 sm:w-28"
            imageClassName="scale-[1.65] object-contain"
          />
          {recommendationResult.result ? (
            <SearchRecommendationsView
              includeUsers={false}
              isAuthenticated={Boolean(viewerProfile)}
              locale={locale}
              recommendations={recommendationResult.result}
              showEmptyState={false}
              viewerProfileId={viewerProfile?.id ?? null}
            />
          ) : null}
        </section>
      ) : searchResult.result ? (
        <div className="space-y-8">
          <p className="text-sm leading-6 text-zinc-500">
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
                    isAuthenticated={Boolean(viewerProfile)}
                    locale={locale}
                    query={query}
                    redirectPath={searchHref.replace(`/${locale}`, "")}
                    totalCount={searchResult.result.userCount}
                    users={searchResult.result.users}
                  />
                </>
              ) : (
                <p className="py-2 text-sm leading-6 text-zinc-500">
                  {t.noUserResults}
                </p>
              )}
            </section>
          ) : (
            <>
              <section className="space-y-3">
                <SearchSectionHeader title={t.usersTitle} count={0} />
                <p className="py-2 text-sm leading-6 text-zinc-500">
                  {t.noUserResults}
                </p>
              </section>
              {userFallbackHangoutResult.result?.length ? (
                <SearchRecommendedActivities
                  activities={userFallbackHangoutResult.result}
                  isAuthenticated={Boolean(viewerProfile)}
                  locale={locale}
                  title={t.recommendationsHangoutsTitle}
                  viewerProfileId={viewerProfile?.id ?? null}
                />
              ) : null}
            </>
          )}

          {mixedActivityResultCount > 0 || relatedActivityCount > 0 ? (
            <section className="space-y-3">
              <SearchSectionHeader
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
                <p className="py-2 text-sm leading-6 text-zinc-500">
                  {t.loadFailedDescription}
                </p>
              ) : (
                <p className="py-2 text-sm leading-6 text-zinc-500">
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
                <div className="divide-y divide-[#EFEFEA]">
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
                <p className="py-2 text-sm leading-6 text-zinc-500">
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
