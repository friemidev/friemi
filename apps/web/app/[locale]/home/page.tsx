import Link from "next/link";
import { ArrowRight, Compass, Sparkles, UsersRound } from "lucide-react";
import { HomeFooter } from "@/components/layout/HomeFooter";
import { PageContainer } from "@/components/layout/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { ActivityCard } from "@/features/activities/components/ActivityCard";
import {
  attachActivityCardViewerStates,
  getActivities,
} from "@/features/activities/queries/getActivities";
import { isPublicEventCard } from "@/features/activities/utils/activityCardKind";
import { DetailSourceRestore } from "@/features/navigation/components/DetailSourceRestore";
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
  const [viewerProfile, baseActivitiesResult] = await Promise.all([
    perf.measure("viewer.profile", () => getOptionalCurrentUserProfileSnapshot()),
    perf.measure("home.activities", () =>
      getActivities({
        limit: 4,
      })
        .then((activities) => ({ activities, error: null }))
        .catch((error: unknown) => {
          console.error("Failed to load home activities", error);
          return { activities: [], error };
        }),
    ),
  ]);
  const activitiesResult =
    viewerProfile && baseActivitiesResult.activities.length > 0
      ? await perf.measure("home.viewerState", () =>
          attachActivityCardViewerStates(
            baseActivitiesResult.activities,
            viewerProfile.id,
          )
            .then((activities) => ({
              activities,
              error: baseActivitiesResult.error,
            }))
            .catch((error: unknown) => {
              console.error("Failed to load home activity viewer state", error);
              return baseActivitiesResult;
            }),
        )
      : baseActivitiesResult;

  perf.finish({
    activityCount: activitiesResult.activities.length,
    hasViewer: Boolean(viewerProfile),
  });

  return (
    <>
      <PageContainer className="space-y-9 pb-6 md:space-y-12">
        <DetailSourceRestore sourceKey="home" />
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
                className="group inline-flex min-w-0 items-center gap-2 rounded-2xl border border-team-border bg-team-bg p-2.5 text-sm font-semibold text-[#8b563b] shadow-[0_8px_20px_rgba(142,94,61,0.08)] transition hover:-translate-y-0.5 hover:border-[#d79c78] hover:bg-coral-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-coral/35 sm:p-3"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-coral text-white shadow-[0_6px_14px_rgba(216,141,114,0.22)]">
                  <UsersRound className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-left">
                  {homeActions.lobby}
                </span>
                <ArrowRight className="hidden h-4 w-4 shrink-0 transition group-hover:translate-x-0.5 sm:block" />
              </Link>
              <Link
                href={withLocale(locale, "/activities")}
                className="group inline-flex min-w-0 items-center gap-2 rounded-2xl border border-event-border bg-event-bg p-2.5 text-sm font-semibold text-[#346b82] shadow-[0_8px_20px_rgba(54,107,130,0.06)] transition hover:-translate-y-0.5 hover:border-[#8ec3d8] hover:bg-[#edf9fd] focus:outline-none focus-visible:ring-2 focus-visible:ring-event-accent/40 sm:p-3"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#e8f6fb] text-[#346b82] ring-1 ring-event-border">
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
          <div className="flex items-end justify-between gap-4 border-t border-sand pt-5 sm:pt-6">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <h2 className="truncate text-2xl font-semibold tracking-normal text-ink">
                  {t.home.recentTitle}
                </h2>
                <span className="shrink-0 rounded-full bg-white/78 px-2.5 py-1 text-xs font-semibold text-[#8a7455] ring-1 ring-sand">
                  {activitiesResult.activities.length}
                </span>
              </div>
              <p className="mt-1 text-sm text-zinc-600">
                {t.home.recentDescription}
              </p>
            </div>
            <Link
              className="hidden h-9 shrink-0 items-center rounded-full bg-white/82 px-3.5 text-sm font-semibold text-moss shadow-sm ring-1 ring-black/10 transition hover:bg-white sm:inline-flex"
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
              actionHref={withLocale(locale, "/activities")}
              actionLabel={t.common.viewAll}
              title={t.home.emptyPreviewTitle}
              description={t.home.emptyRecentDescription}
            />
          ) : (
            <div className="grid gap-3 min-[380px]:grid-cols-2 sm:gap-4 lg:grid-cols-4">
              {activitiesResult.activities.map((activity) => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  isAuthenticated={Boolean(viewerProfile)}
                  locale={locale}
                  mobileDense
                  showFavoriteButton
                  showPrimaryAction={!isPublicEventCard(activity)}
                  sourceSurface="home_recent"
                  detailSourceKey="home"
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
