import { Badge } from "@chill-club/ui";
import { PageContainer } from "@/components/layout/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { ActivityCard } from "@/features/activities/components/ActivityCard";
import { getActivities } from "@/features/activities/queries/getActivities";
import { getCopy } from "@/lib/copy";

type ActivitiesPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function ActivitiesPage({ params }: ActivitiesPageProps) {
  const { locale } = await params;
  const t = getCopy(locale);
  const activitiesResult = await getActivities()
    .then((activities) => ({ activities, error: null }))
    .catch((error: unknown) => {
      console.error("Failed to load activities", error);
      return { activities: [], error };
    });

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

      {activitiesResult.error ? (
        <EmptyState
          title={t.common.loadFailed}
          description={t.common.retryDatabase}
        />
      ) : activitiesResult.activities.length === 0 ? (
        <EmptyState
          title={t.activities.emptyTitle}
          description={t.activities.emptyDescription}
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
