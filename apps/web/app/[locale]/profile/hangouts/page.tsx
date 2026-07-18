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
    momentCount: 0,
    createdActivities: [],
    participations: [],
    favoriteActivities: [],
    friends: [],
    followers: [],
    following: [],
    moments: [],
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

export default async function ProfileHangoutsPage({
  params,
}: ProfileHangoutsPageProps) {
  const { locale } = await params;
  const profile = await ensureCurrentUserProfile(locale, "/profile/hangouts");
  const dashboard = await getProfileDashboard(profile.id).catch((error: unknown) => {
    console.error("Failed to load profile hangouts", error);

    return getEmptyProfileDashboard();
  });

  return (
    <PageContainer className="max-md:px-0 max-md:py-0">
      <ProfileHangoutsMobilePage
        dashboard={dashboard}
        locale={locale}
      />
    </PageContainer>
  );
}
