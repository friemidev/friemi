import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { ProfileDashboardView } from "@/features/profile/components/ProfileDashboardView";
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
    followersCount: 0,
    followingCount: 0,
    createdActivities: [],
    participations: [],
    followers: [],
    following: [],
  };
}

export default async function PublicProfilePage({
  params,
}: PublicProfilePageProps) {
  const { locale, profileId } = await params;
  const [profile, viewerProfile] = await Promise.all([
    getPublicProfileById(profileId),
    getOptionalCurrentUserProfile(),
  ]);

  if (!profile) {
    notFound();
  }

  const isSelf = viewerProfile?.id === profile.id;
  const loadDashboard = isSelf ? getProfileDashboard : getPublicProfileDashboard;
  const dashboardResult = await loadDashboard(profile.id)
    .then((dashboard) => ({ dashboard, error: null }))
    .catch((error: unknown) => {
      console.error("Failed to load public profile dashboard", error);

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
        isSelf={isSelf}
        locale={locale}
        profile={profile}
      />
    </PageContainer>
  );
}
