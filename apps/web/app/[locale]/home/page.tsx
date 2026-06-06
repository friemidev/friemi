import Link from "next/link";
import { Sparkles } from "lucide-react";
import { HomeFooter } from "@/components/layout/HomeFooter";
import { PageContainer } from "@/components/layout/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { ActivityCard } from "@/features/activities/components/ActivityCard";
import { ActivityModeTabs } from "@/features/activities/components/ActivityModeTabs";
import { getActivities } from "@/features/activities/queries/getActivities";
import { getOptionalCurrentUserProfile } from "@/lib/auth";
import { getCopy } from "@/lib/copy";
import { createPerformanceTracker } from "@/lib/performance";
import { withLocale } from "@/lib/routes";

type HomePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  const perf = createPerformanceTracker({
    locale,
    route: "/home",
  });
  const t = getCopy(locale);
  const viewerProfile = await perf.measure("viewer.profile", () =>
    getOptionalCurrentUserProfile(),
  );
  const activitiesResult = await perf.measure("home.activities", () =>
    getActivities({
      limit: 4,
      viewerProfileId: viewerProfile?.id,
    })
      .then((activities) => ({ activities, error: null }))
      .catch((error: unknown) => {
        console.error("Failed to load home activities", error);
        return { activities: [], error };
      }),
  );

  perf.finish({
    activityCount: activitiesResult.activities.length,
    hasViewer: Boolean(viewerProfile),
  });

  return (
    <>
      <PageContainer className="space-y-9 pb-6 md:space-y-12">
        <section className="py-3 md:py-10">
          <div className="max-w-3xl space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/78 px-3 py-1 text-xs text-zinc-600 ring-1 ring-black/10 sm:text-sm">
              <Sparkles className="h-4 w-4 text-[#b98355]" />
              {t.home.eyebrow}
            </div>
            <div className="space-y-3 sm:space-y-4">
              <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-normal text-ink sm:text-5xl lg:text-6xl">
                {t.home.title}
              </h1>
              <p className="text-xl font-medium leading-snug text-moss sm:text-2xl">
                {t.home.tagline}
              </p>
              <p className="max-w-xl text-base leading-7 text-zinc-700 sm:text-lg">
                {t.home.description}
              </p>
            </div>
            <div className="max-w-md pt-2">
              <ActivityModeTabs current="activities" locale={locale} />
            </div>
          </div>
        </section>

        <section className="space-y-3 sm:space-y-4">
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
            <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {activitiesResult.activities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  isAuthenticated={Boolean(viewerProfile)}
                  locale={locale}
                  showFavoriteButton
                  sourceSurface="home_recent"
                />
              ))}
            </div>
          )}
        </section>
      </PageContainer>
      <HomeFooter locale={locale} />
    </>
  );
}
