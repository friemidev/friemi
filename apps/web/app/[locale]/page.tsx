import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@chill-club/ui";
import { PageContainer } from "@/components/layout/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { ActivityCard } from "@/features/activities/components/ActivityCard";
import { getActivities } from "@/features/activities/queries/getActivities";
import { getCopy } from "@/lib/copy";
import { withLocale } from "@/lib/routes";

type HomePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  const t = getCopy(locale);
  const activitiesResult = await getActivities({ limit: 3 })
    .then((activities) => ({ activities, error: null }))
    .catch((error: unknown) => {
      console.error("Failed to load home activities", error);
      return { activities: [], error };
    });

  return (
    <PageContainer className="space-y-12">
      <section className="grid gap-8 py-8 md:grid-cols-[1.05fr_0.95fr] md:items-center md:py-12 lg:gap-12">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-sm text-zinc-600 ring-1 ring-black/10">
            <Sparkles className="h-4 w-4 text-clay" />
            {t.home.eyebrow}
          </div>
          <div className="space-y-4">
            <h1 className="max-w-2xl text-4xl font-semibold tracking-normal text-ink sm:text-5xl lg:text-6xl">
              {t.home.title}
            </h1>
            <p className="text-xl font-medium text-moss sm:text-2xl">
              {t.home.tagline}
            </p>
            <p className="max-w-xl text-base leading-7 text-zinc-650">
              {t.home.description}
            </p>
          </div>
          <Link href={withLocale(locale, "/activities")}>
            <Button className="gap-2">
              {t.home.browseActivities}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="rounded-lg border border-black/10 bg-white/65 p-4 shadow-sm">
          <div className="grid gap-3">
            {activitiesResult.error ? (
              <div className="rounded-md bg-paper p-4">
                <p className="font-semibold text-ink">
                  {t.home.homeActivityFailedTitle}
                </p>
                <p className="mt-1 text-sm text-zinc-600">
                  {t.home.homeActivityFailedDescription}
                </p>
              </div>
            ) : activitiesResult.activities.length === 0 ? (
              <div className="rounded-md bg-paper p-4">
                <p className="font-semibold text-ink">
                  {t.home.emptyPreviewTitle}
                </p>
                <p className="mt-1 text-sm text-zinc-600">
                  {t.home.emptyPreviewDescription}
                </p>
              </div>
            ) : (
              activitiesResult.activities.slice(0, 2).map((activity) => (
                <div key={activity.id} className="rounded-md bg-paper p-4">
                  <p className="font-semibold text-ink">{activity.title}</p>
                  <p className="mt-1 text-sm text-zinc-600">
                    {activity.address}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-normal text-ink">
              {t.home.recentTitle}
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              {t.home.recentDescription}
            </p>
          </div>
          <Link
            className="hidden text-sm font-medium text-moss sm:inline"
            href={withLocale(locale, "/activities")}
          >
            {t.common.viewAll}
          </Link>
        </div>
        {activitiesResult.error ? (
          <EmptyState
            title={t.home.homeActivityFailedTitle}
            description={t.common.retryDatabase}
          />
        ) : activitiesResult.activities.length === 0 ? (
          <EmptyState
            title={t.home.emptyPreviewTitle}
            description={t.home.emptyRecentDescription}
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
      </section>
    </PageContainer>
  );
}
