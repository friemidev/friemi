import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { ProfileDashboardView } from "@/features/profile/components/ProfileDashboardView";
import { DetailSourceReturnLink } from "@/features/navigation/components/DetailSourceReturnLink";
import { getOptionalCurrentUserProfile } from "@/lib/auth";
import {
  getProfileDashboard,
  getPublicProfileDashboard,
  getPublicProfileById,
  type ProfileDashboardViewModel,
} from "@/features/profile/queries/getProfileDashboard";

type PublicProfilePageProps = {
  params: Promise<{
    locale: string;
    profileId: string;
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

export default async function PublicProfilePage({
  params,
}: PublicProfilePageProps) {
  const { locale, profileId } = await params;
  const viewerProfile = await getOptionalCurrentUserProfile();
  const isSelf = viewerProfile?.id === profileId;
  const profile = await getPublicProfileById(profileId, {
    includePrivateFields: isSelf,
  });

  if (!profile) {
    notFound();
  }

  const dashboardPromise = isSelf
    ? getProfileDashboard(profile.id)
    : getPublicProfileDashboard(profile.id, viewerProfile?.id);
  const dashboardResult = await dashboardPromise
    .then((dashboard) => ({ dashboard, error: null }))
    .catch((error: unknown) => {
      console.error("Failed to load public profile dashboard", error);

      return {
        dashboard: getEmptyProfileDashboard(),
        error,
      };
    });

  return (
    <PageContainer className="space-y-4">
      <DetailSourceReturnLink locale={locale} />
      <ProfileDashboardView
        dashboard={dashboardResult.dashboard}
        hasDashboardError={Boolean(dashboardResult.error)}
        isAuthenticated={Boolean(viewerProfile)}
        isSelf={isSelf}
        locale={locale}
        profile={profile}
      />
    </PageContainer>
  );
}
