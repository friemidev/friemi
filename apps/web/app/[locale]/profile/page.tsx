import Link from "next/link";
import { UsersRound } from "lucide-react";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { PageContainer } from "@/components/layout/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { ActivityCard } from "@/features/activities/components/ActivityCard";
import { getFriendsCopy } from "@/features/friends/copy";
import { ProfileIdentityForm } from "@/features/profile/components/ProfileIdentityForm";
import { ProfileOverviewPanel } from "@/features/profile/components/ProfileOverviewPanel";
import { ProfileParticipationCard } from "@/features/profile/components/ProfileParticipationCard";
import {
  getProfileDashboard,
  profileActivityListLimit,
} from "@/features/profile/queries/getProfileDashboard";
import { getCopy } from "@/lib/copy";
import { withLocale } from "@/lib/routes";

type ProfilePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { locale } = await params;
  const t = getCopy(locale);
  const friendsCopy = getFriendsCopy(locale);
  const profile = await ensureCurrentUserProfile(locale);
  const dashboardResult = await getProfileDashboard(profile.id)
    .then((dashboard) => ({ dashboard, error: null }))
    .catch((error: unknown) => {
      console.error("Failed to load profile dashboard", error);
      return {
        dashboard: {
          createdActivityCount: 0,
          participationCount: 0,
          followersCount: 0,
          followingCount: 0,
          createdActivities: [],
          participations: [],
          followers: [],
          following: [],
        },
        error,
      };
    });
  const profileInitial = profile.nickname.trim().slice(0, 1) || "N";
  const hasDashboardError = Boolean(dashboardResult.error);
  const hiddenCreatedActivityCount = Math.max(
    dashboardResult.dashboard.createdActivityCount -
      dashboardResult.dashboard.createdActivities.length,
    0,
  );
  const hiddenParticipationCount = Math.max(
    dashboardResult.dashboard.participationCount -
      dashboardResult.dashboard.participations.length,
    0,
  );

  return (
    <PageContainer className="space-y-8">
      <section className="rounded-lg border border-black/10 bg-white/75 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid min-w-0 gap-4">
            <div className="flex min-w-0 items-center gap-4">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={`${profile.nickname} 的头像`}
                  className="h-16 w-16 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-moss text-xl font-semibold text-white">
                  {profileInitial}
                </div>
              )}
              <div className="min-w-0">
                <h1 className="truncate text-3xl font-semibold tracking-normal text-ink">
                  {t.profile.title}
                </h1>
                <p className="mt-2 truncate text-sm text-zinc-600">
                  {profile.nickname}
                </p>
                <p className="mt-1 truncate text-sm text-zinc-500">
                  {profile.email ?? t.profile.emailFallback}
                </p>
              </div>
            </div>
            <ProfileIdentityForm
              friendCode={profile.friendCode}
              locale={locale}
              nickname={profile.nickname}
            />
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
            <ProfileOverviewPanel
              createdCount={dashboardResult.dashboard.createdActivityCount}
              joinedCount={dashboardResult.dashboard.participationCount}
              followers={dashboardResult.dashboard.followers}
              followersCount={dashboardResult.dashboard.followersCount}
              following={dashboardResult.dashboard.following}
              followingCount={dashboardResult.dashboard.followingCount}
              locale={locale}
              createdLabel={t.profile.createdCount}
              joinedLabel={t.profile.participationCount}
            />
            <Link
              href={withLocale(locale, "/messages")}
              className="inline-flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md bg-white px-4 text-sm font-medium text-zinc-950 shadow-sm ring-1 ring-zinc-200 transition hover:bg-zinc-50 sm:w-fit"
            >
              <UsersRound className="h-4 w-4" />
              {friendsCopy.openFriends}
            </Link>
          </div>
        </div>
      </section>

      {hasDashboardError ? (
        <EmptyState
          title={t.profile.errorTitle}
          description={t.profile.errorDescription}
        />
      ) : (
        <>
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-ink">
                {t.profile.createdTitle}
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                {t.profile.createdDescription}
              </p>
            </div>

            {dashboardResult.dashboard.createdActivities.length === 0 ? (
              <EmptyState
                title={t.profile.createdEmptyTitle}
                description={t.profile.createdEmptyDescription}
              />
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {dashboardResult.dashboard.createdActivities.map(
                    (activity) => (
                      <ActivityCard
                        key={activity.id}
                        activity={activity}
                        locale={locale}
                      />
                    ),
                  )}
                </div>
                {hiddenCreatedActivityCount > 0 ? (
                  <p className="text-sm text-zinc-500">
                    {t.profile.hiddenCreated(
                      profileActivityListLimit,
                      hiddenCreatedActivityCount,
                    )}
                  </p>
                ) : null}
              </>
            )}
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-ink">
                {t.profile.participationTitle}
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                {t.profile.participationDescription}
              </p>
            </div>

            {dashboardResult.dashboard.participations.length === 0 ? (
              <EmptyState
                title={t.profile.participationEmptyTitle}
                description={t.profile.participationEmptyDescription}
              />
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  {dashboardResult.dashboard.participations.map(
                    (participation) => (
                      <ProfileParticipationCard
                        key={participation.id}
                        participation={participation}
                        locale={locale}
                      />
                    ),
                  )}
                </div>
                {hiddenParticipationCount > 0 ? (
                  <p className="text-sm text-zinc-500">
                    {t.profile.hiddenParticipation(
                      profileActivityListLimit,
                      hiddenParticipationCount,
                    )}
                  </p>
                ) : null}
              </>
            )}
          </section>
        </>
      )}
    </PageContainer>
  );
}
