import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { CalendarDays, LayoutGrid, type LucideIcon } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { PaginationControl } from "@/components/ui/PaginationControl";
import { ActivityAgendaList } from "@/features/activities/components/ActivityAgendaList";
import { ActivityResultsFilterBar } from "@/features/activities/components/ActivityResultsFilterBar";
import { ActivityCard } from "@/features/activities/components/ActivityCard";
import { ActivityFilters } from "@/features/activities/components/ActivityFilters";
import { DetailSourceRestore } from "@/features/navigation/components/DetailSourceRestore";
import {
  getActivityList,
  getActivityFilterOptions,
  type ActivityListResult,
} from "@/features/activities/queries/getActivities";
import {
  getActiveActivityFilterCount,
  getActiveActivityFilterNames,
  getActivityFilterHref,
  getDefaultActivitySort,
  formatActivityTimeStatesQueryValue,
  hasActiveActivityFilters,
  isCanonicalActivityFilterSearchParams,
  normalizeActivityFilters,
  normalizeActivityFilterValues,
  type ActivityFilterSearchParams,
  type ActivityListViewMode,
} from "@/features/activities/utils/activityFilters";
import { isPublicEventCard } from "@/features/activities/utils/activityCardKind";
import { normalizeAnalyticsLocale } from "@/features/analytics/events";
import { queueAnalyticsEvent } from "@/features/analytics/server";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";
import { getCopy } from "@/lib/copy";
import { isMobileUserAgent } from "@/lib/mobile-root-lobby-entry";
import { createPerformanceTracker } from "@/lib/performance";
import { withLocale } from "@/lib/routes";
import {
  buildPageShareMetadata,
  generalPageShareDescription,
  getRequestBaseUrl,
} from "@/lib/share-metadata";
import { cn } from "@/lib/utils";
import {
  activityResultsFilterBarHeightClass,
  activityResultsFilterControlClass,
  activityResultsFilterShellClass,
  activityViewToggleBarHeightClass,
  activityViewToggleInnerHeightClass,
} from "@/features/activities/components/activityResultsFilterStyles";

type ActivitiesPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams?: Promise<ActivityFilterSearchParams>;
};

export const dynamic = "force-dynamic";

const mobileActivityPageSize = 14;
const agendaActivityPageSize = 50;

export async function generateMetadata({
  params,
}: ActivitiesPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = getCopy(locale);
  const requestHeaders = await headers();
  const baseUrl = getRequestBaseUrl(requestHeaders);

  return buildPageShareMetadata({
    baseUrl,
    description: generalPageShareDescription,
    path: withLocale(locale, "/activities"),
    title: `${t.activities.title} · Next Fun`,
  });
}

function ActivityListViewToggle({
  filters,
  locale,
}: {
  filters: ReturnType<typeof normalizeActivityFilters>;
  locale: string;
}) {
  const t = getCopy(locale);
  const activitiesHref = withLocale(locale, "/activities");
  const options: {
    icon: LucideIcon;
    label: string;
    mode: ActivityListViewMode;
  }[] = [
    {
      icon: LayoutGrid,
      label: t.activities.cardView,
      mode: "card",
    },
    {
      icon: CalendarDays,
      label: t.activities.dateView,
      mode: "date",
    },
  ];

  return (
    <nav
      aria-label={t.activities.viewToggleLabel}
      className={cn(
        activityResultsFilterShellClass,
        activityViewToggleBarHeightClass,
        "inline-grid grid-cols-2 gap-0.5",
      )}
    >
      {options.map((option) => {
        const Icon = option.icon;
        const isActive = filters.viewMode === option.mode;

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-full px-3 transition sm:min-w-[5.5rem]",
              activityViewToggleInnerHeightClass,
              activityResultsFilterControlClass,
              isActive
                ? "bg-ink text-white shadow-[0_8px_18px_rgba(20,20,20,0.14)]"
                : "text-[#6f4d34] hover:bg-[#fff8ec]",
            )}
            href={getActivityFilterHref(activitiesHref, {
              ...filters,
              viewMode: option.mode,
            })}
            key={option.mode}
            prefetch={false}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{option.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function ActivityPagination({
  filters,
  list,
  locale,
}: {
  filters: ReturnType<typeof normalizeActivityFilters>;
  list: ActivityListResult;
  locale: string;
}) {
  if (list.totalPages <= 1) {
    return null;
  }

  const activitiesHref = withLocale(locale, "/activities");

  return (
    <PaginationControl
      basePath={activitiesHref}
      currentPage={list.page}
      locale={locale}
      mode="link"
      query={{
        category: filters.category,
        city: filters.city,
        dateRange: filters.dateRange,
        q: filters.keyword,
        relation: filters.relation !== "ALL" ? filters.relation : undefined,
        sort:
          filters.sort !== getDefaultActivitySort(filters)
            ? filters.sort
            : undefined,
        time: formatActivityTimeStatesQueryValue(filters.timeStates),
        type: filters.type,
        view: filters.viewMode !== "card" ? filters.viewMode : undefined,
      }}
      totalPages={list.totalPages}
    />
  );
}

export default async function ActivitiesPage({
  params,
  searchParams,
}: ActivitiesPageProps) {
  const { locale } = await params;
  const rawSearchParams = (await searchParams) ?? {};
  const parsedFilters = normalizeActivityFilters(rawSearchParams);
  const explicitSort =
    typeof rawSearchParams.sort === "string" ? rawSearchParams.sort : undefined;
  const filters = normalizeActivityFilterValues({
    ...parsedFilters,
    page: String(parsedFilters.page),
    relation: "ALL",
    sort: explicitSort,
    type: undefined,
  });
  const perf = createPerformanceTracker({
    locale,
    metadata: {
      page: filters.page,
      sort: filters.sort,
      view: filters.viewMode,
    },
    route: "/activities",
  });
  const shouldResetDateViewPage = filters.viewMode === "date" && filters.page > 1;
  const canonicalFilters = shouldResetDateViewPage
    ? {
        ...filters,
        page: 1,
      }
    : filters;

  if (
    !isCanonicalActivityFilterSearchParams(rawSearchParams) ||
    parsedFilters.relation !== "ALL" ||
    Boolean(parsedFilters.type) ||
    parsedFilters.sort !== filters.sort ||
    shouldResetDateViewPage
  ) {
    redirect(
      getActivityFilterHref(withLocale(locale, "/activities"), canonicalFilters),
    );
  }

  const t = getCopy(locale);
  const analyticsLocale = normalizeAnalyticsLocale(locale);
  const hasFilters = hasActiveActivityFilters(filters);
  const viewerProfile = await perf.measure("viewer.profile", () =>
    getOptionalCurrentUserProfileSnapshot(),
  );
  const requestHeaders = await headers();
  const referrer = requestHeaders.get("referer");
  const userAgent = requestHeaders.get("user-agent");
  const isMobileRequest = isMobileUserAgent(userAgent);
  const [activitiesResult, filterOptions] = await perf.measure(
    "activity.data",
    () =>
      Promise.all([
        getActivityList(filters, {
          pageSize:
            filters.viewMode === "date"
              ? agendaActivityPageSize
              : isMobileRequest
                ? mobileActivityPageSize
                : undefined,
          publicInfoOnly: true,
          viewerProfileId: viewerProfile?.id,
        })
          .then((list) => ({ list, error: null }))
          .catch((error: unknown) => {
            console.error("Failed to load activities", error);
            return { list: null, error };
          }),
        getActivityFilterOptions({ publicInfoOnly: true }).catch(
          (error: unknown) => {
            console.error("Failed to load activity filter options", error);
            return { cities: [] };
          },
        ),
      ]),
  );

  if (activitiesResult.list && activitiesResult.list.page !== filters.page) {
    redirect(
      getActivityFilterHref(withLocale(locale, "/activities"), {
        ...filters,
        page: activitiesResult.list.page,
      }),
    );
  }

  if (activitiesResult.list) {
    const activeFilterNames = getActiveActivityFilterNames(filters);
    const filterCount = getActiveActivityFilterCount(filters);
    const publicEventCount = activitiesResult.list.activities.length;
    const commonOptions = {
      referrer,
      userAgent,
      userProfileId: viewerProfile?.id,
    };

    queueAnalyticsEvent(
      {
        locale: analyticsLocale,
        name: "activity_list_viewed",
        route: `/${locale}/activities`,
        sourceSurface: "activity_list",
        properties: {
          filter_count: filterCount,
          has_keyword: Boolean(filters.keyword),
          page: activitiesResult.list.page,
          page_size: activitiesResult.list.pageSize,
          public_event_count: publicEventCount,
          result_count: activitiesResult.list.activities.length,
          sort: filters.sort,
          team_count: 0,
          total_count: activitiesResult.list.totalCount,
          view_mode: filters.viewMode,
        },
      },
      commonOptions,
    );

    if (filters.keyword) {
      queueAnalyticsEvent(
        {
          locale: analyticsLocale,
          name: "search_submitted",
          route: `/${locale}/activities`,
          sourceSurface: "activity_list",
          properties: {
            filter_count: filterCount,
            keyword_length: filters.keyword.length,
            result_count: activitiesResult.list.totalCount,
            scope: "public_activity_info",
          },
        },
        commonOptions,
      );
    }

    if (filterCount > 0) {
      queueAnalyticsEvent(
        {
          locale: analyticsLocale,
          name: "filter_applied",
          route: `/${locale}/activities`,
          sourceSurface: "activity_list",
          properties: {
            filter_count: filterCount,
            filter_names: activeFilterNames,
            result_count: activitiesResult.list.totalCount,
            scope: "public_activity_info",
            view_mode: filters.viewMode,
          },
        },
        commonOptions,
      );
    }
  }

  perf.finish({
    hasFilters,
    resultCount: activitiesResult.list?.activities.length ?? 0,
    totalCount: activitiesResult.list?.totalCount ?? 0,
  }, {
    route: `/${locale}/activities`,
    routeKey: "activity_list",
    sourceSurface: "activity_list",
    userProfileId: viewerProfile?.id,
  });

  return (
    <PageContainer className="space-y-4 py-5 sm:space-y-6 sm:py-8">
      <DetailSourceRestore sourceKey="activity_list" />
      <ActivityFilters
        cities={filterOptions.cities}
        filters={filters}
        locale={locale}
        publicInfoOnly
        resultCount={activitiesResult.list?.totalCount ?? 0}
      />

      <div className="flex flex-col items-center gap-2 px-1 text-center sm:gap-3">
        <p className="max-w-[42rem] text-base font-medium leading-7 text-ink [text-wrap:balance] sm:text-[1.05rem] sm:leading-8">
          {t.activities.description}
        </p>
      </div>

      {activitiesResult.error ? (
        <EmptyState
          title={t.common.loadFailed}
          description={t.common.retryDatabase}
        />
      ) : !activitiesResult.list ||
        activitiesResult.list.activities.length === 0 ? (
        <EmptyState
          actionHref={hasFilters ? withLocale(locale, "/activities") : undefined}
          actionLabel={hasFilters ? t.activityFilters.reset : undefined}
          title={
            hasFilters
              ? t.activities.emptyFilteredTitle
              : t.activities.emptyTitle
          }
          description={
            hasFilters
              ? t.activities.emptyFilteredDescription
              : t.activities.emptyDescription
          }
        />
      ) : (
        <section className="space-y-3 border-t border-sand pt-4 sm:space-y-4">
          <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-ink sm:text-xl">
                {t.activities.title}
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500 sm:text-sm">
                {t.activityFilters.resultCount(
                  activitiesResult.list.totalCount,
                )}
              </p>
            </div>
            <ActivityResultsFilterBar
              filters={filters}
              locale={locale}
              viewToggle={
                <ActivityListViewToggle filters={filters} locale={locale} />
              }
            />
          </div>

          {filters.viewMode === "date" ? (
            <ActivityAgendaList
              activities={activitiesResult.list.activities}
              locale={locale}
              sort={filters.sort}
              totalCount={activitiesResult.list.totalCount}
            />
          ) : (
            <div className="grid gap-3 min-[380px]:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
              {activitiesResult.list.activities.map((activity) => (
                <ActivityCard
                  key={
                    isPublicEventCard(activity) && activity.publicEventId
                      ? `event-${activity.publicEventId}`
                      : activity.id
                  }
                  activity={activity}
                  isAuthenticated={Boolean(viewerProfile)}
                  isOwnActivity={
                    Boolean(viewerProfile) &&
                    activity.organizerId === viewerProfile?.id
                  }
                  locale={locale}
                  mobileDense
                  showFavoriteButton
                  showPrimaryAction={false}
                  sourceSurface="activity_list"
                  detailSourceKey="activity_list"
                />
              ))}
            </div>
          )}
          {filters.viewMode === "card" ? (
            <ActivityPagination
              filters={filters}
              list={activitiesResult.list}
              locale={locale}
            />
          ) : null}
        </section>
      )}
    </PageContainer>
  );
}
