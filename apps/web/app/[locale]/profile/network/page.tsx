import { PageContainer } from "@/components/layout/PageContainer";
import { ProfileNetworkMobilePage } from "@/features/profile/components/ProfileMobileSubpages";
import { ensureCurrentUserProfile } from "@/lib/auth";
import {
  getProfileDashboard,
  type ProfileDashboardViewModel,
} from "@/features/profile/queries/getProfileDashboard";

type ProfileNetworkPageProps = {
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
      pendingFriendRequest: null,
    },
  };
}

export default async function ProfileNetworkPage({
  params,
}: ProfileNetworkPageProps) {
  const { locale } = await params;
  const profile = await ensureCurrentUserProfile(locale, "/profile/network");
  const dashboard = await getProfileDashboard(profile.id).catch((error: unknown) => {
    console.error("Failed to load profile network", error);

    return getEmptyProfileDashboard();
  });

  return (
    <PageContainer className="max-md:px-0 max-md:py-0">
      <ProfileNetworkMobilePage
        currentUserFriendCode={profile.friendCode}
        dashboard={dashboard}
        locale={locale}
      />
    </PageContainer>
  );
}
