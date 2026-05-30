import { PageContainer } from "@/components/layout/PageContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { FriendsDashboard } from "@/features/friends/components/FriendsDashboard";
import { getFriendsDashboard } from "@/features/friends/queries/getFriendsDashboard";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { getCopy } from "@/lib/copy";

type FriendsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function FriendsPage({ params }: FriendsPageProps) {
  const { locale } = await params;
  const commonCopy = getCopy(locale).common;
  const profile = await ensureCurrentUserProfile(locale);
  const dashboardResult = await getFriendsDashboard(profile.id)
    .then((dashboard) => ({ dashboard, error: null }))
    .catch((error: unknown) => {
      console.error("Failed to load friends dashboard", error);
      return {
        dashboard: {
          friends: [],
          incomingRequests: [],
          outgoingRequests: [],
        },
        error,
      };
    });

  return (
    <PageContainer className="space-y-6">
      {dashboardResult.error ? (
        <EmptyState
          title={commonCopy.loadFailed}
          description={commonCopy.retryDatabase}
        />
      ) : (
        <FriendsDashboard
          dashboard={dashboardResult.dashboard}
          locale={locale}
        />
      )}
    </PageContainer>
  );
}
