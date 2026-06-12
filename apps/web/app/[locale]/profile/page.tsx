import { PageContainer } from "@/components/layout/PageContainer";
import { ProfileDashboardView } from "@/features/profile/components/ProfileDashboardView";
import { ensureCurrentUserProfile } from "@/lib/auth";
import {
  getProfileDashboard,
  type ProfileDashboardViewModel,
} from "@/features/profile/queries/getProfileDashboard";

type ProfilePageProps = {
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
    createdActivities: [],
    participations: [],
    favoriteActivities: [],
    friends: [],
    followers: [],
    following: [],
    viewerRelationship: {
      friendshipId: null,
      isFriend: false,
      isFollowing: false,
      pendingFriendRequest: null,
    },
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { locale } = await params;
  const profile = await ensureCurrentUserProfile(locale);
  const dashboardResult = await getProfileDashboard(profile.id)
    .then((dashboard) => ({ dashboard, error: null }))
    .catch((error: unknown) => {
      console.error("Failed to load profile dashboard", error);

      return {
        dashboard: getEmptyProfileDashboard(),
        error,
      };
    });

  return (
    <PageContainer>
      <ProfileDashboardView
        dashboard={dashboardResult.dashboard}
        hasDashboardError={Boolean(dashboardResult.error)}
        isSelf
        locale={locale}
        profile={{
          id: profile.id,
          nickname: profile.nickname,
          friendCode: profile.friendCode,
          avatarUrl: profile.avatarUrl,
          bio: profile.bio,
        }}
      />
    </PageContainer>
  );
}
