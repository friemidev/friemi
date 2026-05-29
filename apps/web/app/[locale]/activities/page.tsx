import { redirect } from "next/navigation";
import { Badge } from "@chill-club/ui";
import { PageContainer } from "@/components/layout/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { ActivityCard } from "@/features/activities/components/ActivityCard";
import { ActivityFilters } from "@/features/activities/components/ActivityFilters";
import {
  getActivities,
  getActivityFilterOptions,
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

type ActivitiesPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams?: Promise<ActivityFilterSearchParams>;
};

export const dynamic = "force-dynamic";

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
    getActivities({ filters })
      .then((activities) => ({ activities, error: null }))
      .catch((error: unknown) => {
        console.error("Failed to load activities", error);
        return { activities: [], error };
      }),
    getActivityFilterOptions().catch((error: unknown) => {
      console.error("Failed to load activity filter options", error);
      return { cities: [] };
    }),
  ]);

  return (
    <PageContainer className="space-y-7">
      <div>
        <h1 className="text-3xl font-semibold tracking-normal text-ink">
          {t.activities.title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
          {t.activities.description}
        </p>
      </div>

      <section className="flex flex-col gap-3 rounded-lg border border-black/10 bg-white/70 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-ink">
            {t.activities.scopeTitle}
          </p>
          <p className="text-sm leading-6 text-zinc-500">
            {t.activities.scopeDescription}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>{t.activityLabels.statuses.RECRUITING}</Badge>
          <Badge>{t.activityLabels.statuses.CONFIRMED}</Badge>
        </div>
      </section>

      <ActivityFilters
        cities={filterOptions.cities}
        filters={filters}
        locale={locale}
        resultCount={activitiesResult.activities.length}
      />

      {activitiesResult.error ? (
        <EmptyState
          title={t.common.loadFailed}
          description={t.common.retryDatabase}
        />
      ) : activitiesResult.activities.length === 0 ? (
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activitiesResult.activities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              locale={locale}
            />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
