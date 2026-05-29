import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@chill-club/ui";
import { PageContainer } from "@/components/layout/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { ActivityCard } from "@/features/activities/components/ActivityCard";
import { ActivityFilters } from "@/features/activities/components/ActivityFilters";
import {
  getActivityList,
  getActivityFilterOptions,
  type ActivityListResult,
} from "@/features/activities/queries/getActivities";
import {
  getActivityFilterHref,
  hasActiveActivityFilters,
  isCanonicalActivityFilterSearchParams,
  normalizeActivityFilters,
  type ActivityFilterSearchParams,
} from "@/features/activities/utils/activityFilters";
import { getCopy } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import { cn } from "@/lib/utils";

type ActivitiesPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams?: Promise<ActivityFilterSearchParams>;
};

export const dynamic = "force-dynamic";

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

  const t = getCopy(locale);
  const activitiesHref = withLocale(locale, "/activities");
  const previousHref = getActivityFilterHref(activitiesHref, {
    ...filters,
    page: Math.max(list.page - 1, 1),
  });
  const nextHref = getActivityFilterHref(activitiesHref, {
    ...filters,
    page: Math.min(list.page + 1, list.totalPages),
  });
  const previousDisabled = list.page <= 1;
  const nextDisabled = list.page >= list.totalPages;
  const linkClassName =
    "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-white px-3 text-sm font-medium text-zinc-950 ring-1 ring-zinc-200 transition hover:bg-zinc-50 aria-disabled:pointer-events-none aria-disabled:opacity-45";
  const disabledClassName =
    "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-white px-3 text-sm font-medium text-zinc-400 ring-1 ring-zinc-200";

  return (
    <nav
      aria-label="Activity pagination"
      className="flex flex-col gap-3 rounded-lg border border-black/10 bg-white/70 p-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-center text-sm font-medium text-zinc-600 sm:text-left">
        {t.activityPagination.pageSummary(list.page, list.totalPages)}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
        {previousDisabled ? (
          <span className={cn(disabledClassName, "justify-self-stretch")}>
            <ChevronLeft className="h-4 w-4 shrink-0" />
            {t.activityPagination.previous}
          </span>
        ) : (
          <Link
            className={cn(linkClassName, "justify-self-stretch")}
            href={previousHref}
            prefetch={false}
          >
            <ChevronLeft className="h-4 w-4 shrink-0" />
            {t.activityPagination.previous}
          </Link>
        )}
        {nextDisabled ? (
          <span className={cn(disabledClassName, "justify-self-stretch")}>
            {t.activityPagination.next}
            <ChevronRight className="h-4 w-4 shrink-0" />
          </span>
        ) : (
          <Link
            className={cn(linkClassName, "justify-self-stretch")}
            href={nextHref}
            prefetch={false}
          >
            {t.activityPagination.next}
            <ChevronRight className="h-4 w-4 shrink-0" />
          </Link>
        )}
      </div>
    </nav>
  );
}

export default async function ActivitiesPage({
  params,
  searchParams,
}: ActivitiesPageProps) {
  const { locale } = await params;
  const rawSearchParams = (await searchParams) ?? {};
  const filters = normalizeActivityFilters(rawSearchParams);

  if (!isCanonicalActivityFilterSearchParams(rawSearchParams)) {
    redirect(getActivityFilterHref(withLocale(locale, "/activities"), filters));
  }

  const t = getCopy(locale);
  const hasFilters = hasActiveActivityFilters(filters);
  const [activitiesResult, filterOptions] = await Promise.all([
    getActivityList(filters)
      .then((list) => ({ list, error: null }))
      .catch((error: unknown) => {
        console.error("Failed to load activities", error);
        return { list: null, error };
      }),
    getActivityFilterOptions().catch((error: unknown) => {
      console.error("Failed to load activity filter options", error);
      return { cities: [] };
    }),
  ]);

  if (
    activitiesResult.list &&
    activitiesResult.list.page !== filters.page
  ) {
    redirect(
      getActivityFilterHref(withLocale(locale, "/activities"), {
        ...filters,
        page: activitiesResult.list.page,
      }),
    );
  }

  return (
    <PageContainer className="space-y-4 py-5 sm:space-y-6 sm:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-normal text-ink sm:text-3xl">
            {t.activities.title}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-600 sm:mt-2">
            {t.activities.description}
          </p>
        </div>
        <div className="hidden max-w-md flex-wrap justify-end gap-2 sm:flex">
          <Badge>{t.activityLabels.statuses.OPEN}</Badge>
          <Badge>{t.activityLabels.statuses.FULL}</Badge>
          <Badge>{t.activityLabels.timeStates.ONGOING}</Badge>
          <Badge>{t.activityLabels.timeStates.UPCOMING}</Badge>
          <Badge>{t.activityLabels.timeStates.ENDED}</Badge>
        </div>
      </div>

      <ActivityFilters
        cities={filterOptions.cities}
        filters={filters}
        locale={locale}
        resultCount={activitiesResult.list?.totalCount ?? 0}
      />

      {activitiesResult.error ? (
        <EmptyState
          title={t.common.loadFailed}
          description={t.common.retryDatabase}
        />
      ) : !activitiesResult.list || activitiesResult.list.activities.length === 0 ? (
        <EmptyState
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
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activitiesResult.list.activities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                locale={locale}
              />
            ))}
          </div>
          <ActivityPagination
            filters={filters}
            list={activitiesResult.list}
            locale={locale}
          />
        </>
      )}
    </PageContainer>
  );
}
