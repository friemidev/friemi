import Link from "next/link";
import { UsersRound } from "lucide-react";
import { ActivityCard } from "@/features/activities/components/ActivityCard";
import { getFriendsCopy } from "@/features/friends/copy";
import { getCopy } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProfileIdentityForm } from "./ProfileIdentityForm";
import { ProfileOverviewPanel } from "./ProfileOverviewPanel";
import { ProfileParticipationCard } from "./ProfileParticipationCard";
import {
  profileActivityListLimit,
  type ProfileDashboardViewModel,
  type PublicProfileViewModel,
} from "../queries/getProfileDashboard";

type ProfileDashboardViewProps = {
  dashboard: ProfileDashboardViewModel;
  hasDashboardError?: boolean;
  isSelf?: boolean;
  locale: string;
  profile: PublicProfileViewModel;
};

export function ProfileDashboardView({
  dashboard,
  hasDashboardError = false,
  isSelf = false,
  locale,
  profile,
}: ProfileDashboardViewProps) {
  const t = getCopy(locale);
  const friendsCopy = getFriendsCopy(locale);
  const profileInitial = profile.nickname.trim().slice(0, 1) || "N";
  const hiddenCreatedActivityCount = Math.max(
    dashboard.createdActivityCount - dashboard.createdActivities.length,
    0,
  );
  const hiddenParticipationCount = Math.max(
    dashboard.participationCount - dashboard.participations.length,
    0,
  );
  const showPrivateParticipation = isSelf;

  return (
    <div className="space-y-8">
      <section>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="grid min-w-0 gap-4">
            <div className="flex min-w-0 items-center gap-4">
              {profile.avatarUrl ? (
                // User avatars are stored as remote URLs from Clerk/user data.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarUrl}
                  alt={profile.nickname}
                  className="h-16 w-16 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-moss text-xl font-semibold text-white">
                  {profileInitial}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-moss">
                  {t.profile.title}
                </p>
                <h1 className="mt-1 truncate text-3xl font-semibold tracking-normal text-ink">
                  {profile.nickname}
                </h1>
                {profile.bio ? (
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-500">
                    {profile.bio}
                  </p>
                ) : null}
              </div>
            </div>
            {isSelf && profile.friendCode ? (
              <ProfileIdentityForm
                friendCode={profile.friendCode}
                locale={locale}
                nickname={profile.nickname}
              />
            ) : null}
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
            <ProfileOverviewPanel
              createdCount={dashboard.createdActivityCount}
              joinedCount={dashboard.participationCount}
              followers={dashboard.followers}
              followersCount={dashboard.followersCount}
              following={dashboard.following}
              followingCount={dashboard.followingCount}
              locale={locale}
              createdLabel={t.profile.createdCount}
              joinedLabel={t.profile.participationCount}
              showJoinedCount={showPrivateParticipation}
            />
            {isSelf ? (
              <Link
                href={withLocale(locale, "/messages")}
                className="inline-flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md bg-white px-4 text-sm font-medium text-zinc-950 shadow-sm ring-1 ring-zinc-200 transition hover:bg-zinc-50 sm:w-fit"
              >
                <UsersRound className="h-4 w-4" />
                {friendsCopy.openFriends}
              </Link>
            ) : null}
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
            <h2 className="text-xl font-semibold text-ink">
              {t.profile.createdTitle}
            </h2>

            {dashboard.createdActivities.length === 0 ? (
              <EmptyState
                title={t.profile.createdEmptyTitle}
                description={t.profile.createdEmptyDescription}
              />
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {dashboard.createdActivities.map((activity) => (
                    <ActivityCard
                      key={activity.id}
                      activity={activity}
                      locale={locale}
                    />
                  ))}
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

          {showPrivateParticipation ? (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-ink">
                {t.profile.participationTitle}
              </h2>

              {dashboard.participations.length === 0 ? (
                <EmptyState
                  title={t.profile.participationEmptyTitle}
                  description={t.profile.participationEmptyDescription}
                />
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    {dashboard.participations.map((participation) => (
                      <ProfileParticipationCard
                        key={participation.id}
                        participation={participation}
                        locale={locale}
                      />
                    ))}
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
          ) : null}
        </>
      )}
    </div>
  );
}
