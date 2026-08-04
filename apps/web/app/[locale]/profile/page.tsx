import { PageContainer } from "@/components/layout/PageContainer";
import { ProfileDashboardView } from "@/features/profile/components/ProfileDashboardView";
import { DetailSourceReturnLink } from "@/features/navigation/components/DetailSourceReturnLink";
import { getPublicAchievementWall } from "@/features/achievements/queries/getUserAchievements";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";
import {
  getProfileDashboard,
  type ProfileDashboardViewModel,
  type PublicProfileViewModel,
} from "@/features/profile/queries/getProfileDashboard";
import { getUserPresenceState } from "@/features/profile/presence";

type ProfilePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const dynamic = "force-dynamic";

function getEmptyProfileDashboard(): ProfileDashboardViewModel {
  return {
    charmScore: 0,
    createdActivityCount: 0,
    participationCount: 0,
    favoriteActivityCount: 0,
    friendCount: 0,
    followersCount: 0,
    followingCount: 0,
    momentCount: 0,
    trustScore: 80,
    createdActivities: [],
    participations: [],
    favoriteActivities: [],
    friends: [],
    followers: [],
    following: [],
    moments: [],
    recentCharmGifts: [],
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
      isMutualFollow: false,
      pendingFriendRequest: null,
      targetFollowsViewer: false,
    },
  };
}

function getGuestProfile(locale: string): PublicProfileViewModel {
  if (locale === "fr") {
    return {
      id: "guest",
      nickname: "Visiteur",
      friendCode: null,
      avatarUrl: null,
      bio: "Connectez-vous quand vous voulez retrouver vos sorties, traces et relations.",
      isCoCreator: false,
      isOnline: false,
      presenceDisplayStatus: null,
      presenceStatus: "INVISIBLE",
    };
  }

  if (locale === "en") {
    return {
      id: "guest",
      nickname: "Guest",
      friendCode: null,
      avatarUrl: null,
      bio: "Sign in when you want to keep your plans, traces, and follows together.",
      isCoCreator: false,
      isOnline: false,
      presenceDisplayStatus: null,
      presenceStatus: "INVISIBLE",
    };
  }

  return {
    id: "guest",
    nickname: "游客",
    friendCode: null,
    avatarUrl: null,
    bio: "登录后可以同步你的聚吧、足迹和关注关系。",
    isCoCreator: false,
    isOnline: false,
    presenceDisplayStatus: null,
    presenceStatus: "INVISIBLE",
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { locale } = await params;
  const profile = await getOptionalCurrentUserProfileSnapshot();
  const [dashboardResult, publicAchievements] = profile
    ? await Promise.all([
        getProfileDashboard(profile.id)
          .then((dashboard) => ({ dashboard, error: null }))
          .catch((error: unknown) => {
            console.error("Failed to load profile dashboard", error);

            return {
              dashboard: getEmptyProfileDashboard(),
              error,
            };
          }),
        getPublicAchievementWall(profile.id).catch((error: unknown) => {
          console.error("Failed to load profile achievements", error);

          return [];
        }),
      ])
    : [
        {
          dashboard: getEmptyProfileDashboard(),
          error: null,
        },
        [],
      ];
  const isAuthenticated = Boolean(profile);
  const profilePresence = profile
    ? getUserPresenceState({
        lastActiveAt: profile.lastActiveAt,
        status: profile.presenceStatus,
      })
    : null;
  const profileViewModel = profile
    ? {
        id: profile.id,
        nickname: profile.nickname,
        friendCode: profile.friendCode,
        avatarUrl: profile.avatarUrl,
        bio: profile.bio,
        isCoCreator: profile.isCoCreator,
        isOnline: profilePresence?.isOnline ?? false,
        presenceDisplayStatus: profilePresence?.displayStatus ?? null,
        presenceStatus: profilePresence?.status ?? "ONLINE",
      }
    : getGuestProfile(locale);

  return (
    <PageContainer className="space-y-4 max-md:px-0 max-md:py-0">
      <DetailSourceReturnLink locale={locale} />
      <ProfileDashboardView
        dashboard={dashboardResult.dashboard}
        hasDashboardError={Boolean(dashboardResult.error)}
        isAuthenticated={isAuthenticated}
        isGuestPlaceholder={!isAuthenticated}
        isSelf={isAuthenticated}
        locale={locale}
        profile={profileViewModel}
        publicAchievements={publicAchievements}
      />
    </PageContainer>
  );
}
