import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, MapPin, Search, Store } from "lucide-react";
import { Badge } from "@chill-club/ui";
import { PageContainer } from "@/components/layout/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { ActivityCard } from "@/features/activities/components/ActivityCard";
import { GlobalSearchForm } from "@/features/search/components/GlobalSearchForm";
import {
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
import { withLocale } from "@/lib/routes";

type SearchPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams?: Promise<GlobalSearchParams>;
};

export const dynamic = "force-dynamic";

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
      <Badge className="shrink-0 bg-white text-zinc-600 ring-1 ring-zinc-200">
        {count}
      </Badge>
    </div>
  );
}

function MerchantResultCard({
  locale,
  merchant,
}: {
  locale: string;
  merchant: GlobalSearchMerchantViewModel;
}) {
  const t = getCopy(locale).globalSearch;
  const href = withLocale(locale, `/merchants/${merchant.slug}`);
  const location = [merchant.city, merchant.address]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={href}
      className="group flex min-w-0 items-start gap-3 rounded-lg border border-black/10 bg-white/80 p-4 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
      aria-label={t.openMerchant(merchant.name)}
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-moss/10 text-moss ring-1 ring-black/10">
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
            {merchant.name}
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
        <span className="mt-2 inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
          {t.merchantActivityCount(merchant.activityCount)}
        </span>
      </span>
    </Link>
  );
}

export default async function SearchPage({
  params,
  searchParams,
}: SearchPageProps) {
  const { locale } = await params;
  const rawSearchParams = (await searchParams) ?? {};
  const rawQuery = getSingleGlobalSearchParam(rawSearchParams, "q");
  const query = normalizeGlobalSearchQuery(rawQuery);

  if (!isCanonicalGlobalSearchParams(rawSearchParams)) {
    redirect(getGlobalSearchHref(locale, query));
  }

  const t = getCopy(locale).globalSearch;
  const searchResult = query
    ? await getGlobalSearchResults(query)
        .then((result) => ({ result, error: null }))
        .catch((error: unknown) => {
          console.error("Failed to load global search results", error);
          return { result: null, error };
        })
    : { result: null, error: null };
  const totalCount = searchResult.result
    ? searchResult.result.activityCount + searchResult.result.merchantCount
    : 0;
  const hasResults = totalCount > 0;

  return (
    <PageContainer className="space-y-6 py-5 sm:py-8">
      <div className="space-y-4">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-1 text-sm font-medium text-zinc-600 ring-1 ring-black/10">
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
      ) : !hasResults ? (
        <EmptyState
          title={t.noResultsTitle}
          description={t.noResultsDescription(query)}
        />
      ) : searchResult.result ? (
        <div className="space-y-8">
          <p className="rounded-lg border border-black/10 bg-white/70 px-4 py-3 text-sm text-zinc-600">
            {t.resultSummary(totalCount, query)}
          </p>

          {searchResult.result.activityCount > 0 ? (
            <section className="space-y-3">
              <SearchSectionHeader
                title={t.activitiesTitle}
                count={searchResult.result.activityCount}
              />
              {searchResult.result.activities.length > 0 ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {searchResult.result.activities.map((activity) => (
                      <ActivityCard
                        key={activity.id}
                        activity={activity}
                        locale={locale}
                      />
                    ))}
                  </div>
                  {searchResult.result.activityCount >
                  searchResult.result.activities.length ? (
                    <Link
                      href={`${withLocale(locale, "/activities")}?${new URLSearchParams({ q: query }).toString()}`}
                      className="inline-flex h-10 max-w-full items-center gap-2 whitespace-nowrap rounded-md bg-white px-3 text-sm font-medium text-ink ring-1 ring-black/10 transition hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
                    >
                      <span className="truncate">
                        {t.viewMoreActivities(
                          searchResult.result.activities.length,
                          searchResult.result.activityCount,
                        )}
                      </span>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  ) : null}
                </>
              ) : (
                <p className="rounded-lg border border-dashed border-zinc-300 bg-white/60 p-4 text-sm text-zinc-500">
                  {t.noActivityResults}
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
                    />
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-zinc-300 bg-white/60 p-4 text-sm text-zinc-500">
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
