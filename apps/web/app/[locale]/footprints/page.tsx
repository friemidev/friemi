import type { Metadata } from "next";
import { FootprintsMobilePage } from "@/features/moments/components/FootprintsMobilePage";
import { getDirectMessageFriendRoster } from "@/features/direct-messages/queries/getDirectMessages";
import { getMomentFeed } from "@/features/moments/queries/getMomentFeed";
import {
  getProfileDashboard,
  type ProfileDashboardViewModel,
} from "@/features/profile/queries/getProfileDashboard";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";
import { createPerformanceTracker } from "@/lib/performance";

type FootprintsPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams?: Promise<{
    tab?: string;
  }>;
};

export const dynamic = "force-dynamic";

function getEmptyProfileDashboard(): ProfileDashboardViewModel {
  return {
    createdActivityCount: 0,
    participationCount: 0,
    favoriteActivityCount: 0,
    friendCount: 0,
    followersCount: 0,
    followingCount: 0,
    createdActivities: [],
    participations: [],
    favoriteActivities: [],
    friends: [],
    followers: [],
    following: [],
    werewolfStats: {
      judgeCount: 0,
      lossCount: 0,
      playerGameCount: 0,
      winCount: 0,
      winRate: 0,
    },
    viewerRelationship: {
      friendshipId: null,
      isFriend: false,
      isFollowing: false,
      pendingFriendRequest: null,
    },
  };
}

export async function generateMetadata({
  params,
}: FootprintsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = locale === "zh-CN" ? "足迹" : "Trace";

  return {
    title: `${title} | Friemi`,
  };
}

export default async function FootprintsPage({
  params,
  searchParams,
}: FootprintsPageProps) {
  const { locale } = await params;
  const query = await searchParams;
  const initialTab =
    query?.tab === "message"
      ? "message"
      : query?.tab === "profile"
        ? "profile"
        : "moment";
  const perf = createPerformanceTracker({
    locale,
    route: "/footprints",
  });
  const profile = await perf.measure("viewer.profile", () =>
    getOptionalCurrentUserProfileSnapshot(),
  );
  const viewerProfileId = profile?.id ?? null;
  const [momentsResult, messageFriendsResult, dashboardResult] =
    await Promise.all([
      perf.measure("moments.feed", () => getMomentFeed(viewerProfileId))
        .then((moments) => ({ moments, error: null }))
        .catch((error: unknown) => {
          console.error("Failed to load moment feed", error);

          return {
            moments: [],
            error,
          };
        }),
      profile
        ? perf
            .measure("messages.friendRoster", () =>
              getDirectMessageFriendRoster(profile.id),
            )
            .then((friends) => ({ friends, error: null }))
            .catch((error: unknown) => {
              console.error("Failed to load footprints message roster", error);

              return {
                friends: [],
                error,
              };
            })
        : Promise.resolve({ friends: [], error: null }),
      profile
        ? perf
            .measure("profile.dashboard", () => getProfileDashboard(profile.id))
            .then((dashboard) => ({ dashboard, error: null }))
            .catch((error: unknown) => {
              console.error(
                "Failed to load footprints profile dashboard",
                error,
              );

              return {
                dashboard: getEmptyProfileDashboard(),
                error,
              };
            })
        : Promise.resolve({
            dashboard: getEmptyProfileDashboard(),
            error: null,
          }),
    ]);
  perf.finish(
    {
      initialTab,
      messageFriendCount: messageFriendsResult.friends.length,
      momentCount: momentsResult.moments.length,
      profileDashboardLoaded: Boolean(profile),
    },
    {
      route: `/${locale}/footprints`,
      routeKey: "footprints",
      sourceSurface: "footprints",
      userProfileId: viewerProfileId,
    },
  );

  return (
    <FootprintsMobilePage
      locale={locale}
      initialTab={initialTab}
      moments={momentsResult.moments}
      momentFeedError={Boolean(momentsResult.error)}
      messageFriends={messageFriendsResult.friends}
      messageRosterError={Boolean(messageFriendsResult.error)}
      profile={
        profile
          ? {
              id: profile.id,
              nickname: profile.nickname,
              avatarUrl: profile.avatarUrl,
              bio: profile.bio,
              friendCode: profile.friendCode,
              isCoCreator: profile.isCoCreator,
            }
          : null
      }
      profileDashboard={dashboardResult.dashboard}
      profileDashboardError={Boolean(dashboardResult.error)}
    />
  );
}
