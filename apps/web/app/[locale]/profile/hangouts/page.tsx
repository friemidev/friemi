import { PageContainer } from "@/components/layout/PageContainer";
import { ProfileHangoutsMobilePage } from "@/features/profile/components/ProfileMobileSubpages";
import { ensureCurrentUserProfile } from "@/lib/auth";
import {
  getProfileDashboard,
  type ProfileDashboardViewModel,
} from "@/features/profile/queries/getProfileDashboard";

type ProfileHangoutsPageProps = {
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

export default async function ProfileHangoutsPage({
  params,
  searchParams,
}: ProfileHangoutsPageProps) {
  const { locale } = await params;
  const query = await searchParams;
  const requestedTab =
    query?.tab === "participation"
      ? "participation"
      : query?.tab === "favorite"
        ? "favorite"
        : "created";
  const profile = await ensureCurrentUserProfile(locale, "/profile/hangouts");
  const dashboard = await getProfileDashboard(profile.id).catch(
    (error: unknown) => {
      console.error("Failed to load profile hangouts", error);

      return getEmptyProfileDashboard();
    },
  );

  return (
    <PageContainer className="max-md:px-0 max-md:py-0">
      <ProfileHangoutsMobilePage
        dashboard={dashboard}
        initialTab={requestedTab}
        locale={locale}
      />
    </PageContainer>
  );
}
