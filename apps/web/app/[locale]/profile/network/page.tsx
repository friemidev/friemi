import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/PageContainer";
import { ProfileNetworkMobilePage } from "@/features/profile/components/ProfileMobileSubpages";
import { ensureCurrentUserProfile } from "@/lib/auth";
import {
  getProfileDashboard,
  type ProfileDashboardViewModel,
} from "@/features/profile/queries/getProfileDashboard";
import {
  getProfileVisitSummary,
  getRecentProfileVisitors,
} from "@/features/profile-visits/queries/getProfileVisitors";

type ProfileNetworkPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: {
    follow: false,
    index: false,
  },
};

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

const emptyVisitSummary = {
  todayViewCount: 0,
  totalViewCount: 0,
  uniqueVisitorCount: 0,
};

export default async function ProfileNetworkPage({
  params,
}: ProfileNetworkPageProps) {
  const { locale } = await params;
  const profile = await ensureCurrentUserProfile(locale, "/profile/network");
  const dashboard = await getProfileDashboard(profile.id).catch(
    (error: unknown) => {
      console.error("Failed to load profile network", error);

      return getEmptyProfileDashboard();
    },
  );
  const visitResult = await Promise.all([
    getProfileVisitSummary(profile.id),
    getRecentProfileVisitors(profile.id, 3),
  ])
    .then(([summary, visitors]) => ({
      summary,
      visitors,
    }))
    .catch((error: unknown) => {
      console.error("Failed to load profile network visitors", error);

      return {
        summary: emptyVisitSummary,
        visitors: [],
      };
    });

  return (
    <PageContainer className="max-md:px-0 max-md:py-0">
      <ProfileNetworkMobilePage
        dashboard={dashboard}
        locale={locale}
        recentVisitors={visitResult.visitors}
        visitSummary={visitResult.summary}
      />
    </PageContainer>
  );
}
