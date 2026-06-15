import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { ArrowRight, Clock3, MapPin, Search, Store } from "lucide-react";
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
import { GlobalSearchUserResults } from "@/features/search/components/GlobalSearchUserResults";
import { SearchActivityResultsFeed } from "@/features/search/components/SearchActivityResultsFeed";
import { SearchHighlightedText } from "@/features/search/components/SearchHighlightedText";
import { queueAnalyticsEvent } from "@/features/analytics/server";
import {
  globalSearchMainResultPageSize,
  getGlobalSearchMainActivityResults,
  getGlobalSearchResults,
  type GlobalSearchMerchantViewModel,
} from "@/features/search/queries/getGlobalSearchResults";
import {
  getGlobalSearchHref,
  getSingleGlobalSearchParam,
  isCanonicalGlobalSearchParams,
  normalizeGlobalSearchQuery,
  type GlobalSearchParams,
} from "@/features/search/utils/searchQuery";
import { getCopy } from "@/lib/copy";
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
        <Badge className="shrink-0 bg-white/85 text-[#6b5b48] ring-1 ring-sand">
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
            ? "inline-flex h-9 items-center justify-center gap-2 rounded-full bg-coral-soft px-3.5 text-sm font-semibold text-[#8f553b] ring-1 ring-sand-strong transition hover:bg-[#f7e5d5]"
            : "inline-flex h-9 items-center justify-center gap-2 rounded-full bg-white/85 px-3.5 text-sm font-semibold text-[#5f5448] ring-1 ring-sand transition hover:bg-white"
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
              ? "flex h-4 w-4 items-center justify-center rounded-[0.32rem] bg-coral text-white shadow-sm"
              : "h-4 w-4 rounded-[0.32rem] border border-sand-strong bg-white shadow-inner"
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
    <div className="rounded-[1.25rem] border border-dashed border-sand-strong bg-white/70 p-6 text-center shadow-[0_12px_28px_rgba(99,78,48,0.05)] sm:p-8">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-team-bg text-[#8a6a40] ring-1 ring-sand">
        <Clock3 className="h-5 w-5" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-zinc-950">
        {t.onlyEndedResultsTitle}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
        {t.onlyEndedResultsDescription(endedCount)}
      </p>
      <AnalyticsLink
        href={getGlobalSearchHref(locale, query, { includeEnded: true })}
        className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-coral px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-coral-dark"
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
        <span className="mt-2 inline-flex rounded-full bg-team-bg px-2.5 py-1 text-xs font-medium text-[#6b5b48] ring-1 ring-sand">
          {t.merchantActivityCount(merchant.activityCount)}
        </span>
      </span>
    </ContextualDetailLink>
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
  const viewerProfile = query
    ? await perf.measure("viewer.profile", () =>
        getOptionalCurrentUserProfileSnapshot().catch((error: unknown) => {
          console.error(
            "Failed to load viewer profile for global search",
            error,
          );
          return null;
        }),
      )
    : null;
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
    query &&
    mainActivityResult.result &&
    mainActivityResult.result.totalCount <= globalSearchMainResultPageSize;
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
  const totalCount = searchResult.result
    ? searchResult.result.activityCount +
      searchResult.result.userCount +
      searchResult.result.merchantCount +
      searchResult.result.publicEventCount
    : 0;
  const relatedActivityCount = relatedActivityResult.result?.totalCount ?? 0;
  const hiddenEndedMainCount = searchResult.result
    ? searchResult.result.hiddenEndedActivityCount +
      searchResult.result.hiddenEndedPublicEventCount
    : 0;
  const hasResults = totalCount > 0 || relatedActivityCount > 0;
  const mixedActivityResultCount = searchResult.result
    ? searchResult.result.activityCount + searchResult.result.publicEventCount
    : 0;

  if (query && searchResult.result) {
    const requestHeaders = await headers();

    queueAnalyticsEvent(
      {
        locale: analyticsLocale,
        name: "search_submitted",
        route: `/${locale}/search`,
        sourceSurface: "global_search",
        properties: {
          activity_count: searchResult.result.activityCount,
          keyword_length: query.length,
          merchant_count: searchResult.result.merchantCount,
          public_event_count: searchResult.result.publicEventCount,
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
    <PageContainer className="space-y-6 py-5 sm:py-8">
      <DetailSourceRestore sourceKey="search" />
      <div className="space-y-4">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-1 text-sm font-medium text-[#6b5b48] ring-1 ring-sand">
            <Search className="h-4 w-4" aria-hidden="true" />
            {t.eyebrow}
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-normal text-ink sm:text-3xl">
            {t.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            {t.description}
          </p>
        </div>

        <GlobalSearchForm locale={locale} defaultQuery={query} variant="page" />
      </div>

      {searchResult.error ? (
        <EmptyState
          title={t.loadFailedTitle}
          description={t.loadFailedDescription}
        />
      ) : !query ? (
        <EmptyState title={t.emptyTitle} description={t.emptyDescription} />
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
