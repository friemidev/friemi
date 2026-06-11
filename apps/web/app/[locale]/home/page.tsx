import Link from "next/link";
import { ArrowRight, Compass, Sparkles, UsersRound } from "lucide-react";
import { HomeFooter } from "@/components/layout/HomeFooter";
import { PageContainer } from "@/components/layout/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { ActivityCard } from "@/features/activities/components/ActivityCard";
import { getActivities } from "@/features/activities/queries/getActivities";
import { isPublicEventCard } from "@/features/activities/utils/activityCardKind";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";
import { getCopy } from "@/lib/copy";
import { createPerformanceTracker } from "@/lib/performance";
import { withLocale } from "@/lib/routes";

type HomePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

function getHomeActionLabels(locale: string) {
  if (locale === "fr") {
    return {
      lobby: "Aller au hall",
      activities: "Decouvrir",
    };
  }

  if (locale === "en") {
    return {
      lobby: "Go to lobby",
      activities: "Discover activities",
    };
  }

  return {
    lobby: "前往组队",
    activities: "发现活动",
  };
}

export const dynamic = "force-dynamic";

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  const perf = createPerformanceTracker({
    locale,
    route: "/home",
  });
  const t = getCopy(locale);
  const homeActions = getHomeActionLabels(locale);
  const viewerProfile = await perf.measure("viewer.profile", () =>
    getOptionalCurrentUserProfileSnapshot(),
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
            <div className="grid max-w-[30rem] grid-cols-2 gap-2 pt-2 sm:gap-3">
              <Link
                href={withLocale(locale, "/lobby")}
                className="group inline-flex min-w-0 items-center gap-2 rounded-2xl border border-[#e1b89c] bg-[#fff8f3] p-2.5 text-sm font-semibold text-[#8b563b] shadow-[0_8px_20px_rgba(142,94,61,0.08)] transition hover:-translate-y-0.5 hover:border-[#d79c78] hover:bg-[#fff2e8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d88d72]/35 sm:p-3"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#d88d72] text-white shadow-[0_6px_14px_rgba(216,141,114,0.22)]">
                  <UsersRound className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-left">
                  {homeActions.lobby}
                </span>
                <ArrowRight className="hidden h-4 w-4 shrink-0 transition group-hover:translate-x-0.5 sm:block" />
              </Link>
              <Link
                href={withLocale(locale, "/activities")}
                className="group inline-flex min-w-0 items-center gap-2 rounded-2xl border border-[#b9d7e5] bg-[#f7fcff] p-2.5 text-sm font-semibold text-[#346b82] shadow-[0_8px_20px_rgba(54,107,130,0.06)] transition hover:-translate-y-0.5 hover:border-[#8ec3d8] hover:bg-[#edf9fd] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7eb7cf]/40 sm:p-3"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#e8f6fb] text-[#346b82] ring-1 ring-[#b9d7e5]">
                  <Compass className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-left">
                  {homeActions.activities}
                </span>
                <ArrowRight className="hidden h-4 w-4 shrink-0 transition group-hover:translate-x-0.5 sm:block" />
              </Link>
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
                  showPrimaryAction={!isPublicEventCard(activity)}
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
