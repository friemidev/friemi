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
  searchParams?: Promise<{
    friendCode?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function FriendsPage({
  params,
  searchParams,
}: FriendsPageProps) {
  const { locale } = await params;
  const query = await searchParams;
  const commonCopy = getCopy(locale).common;
  const profile = await ensureCurrentUserProfile(locale);
  const initialFriendCode =
    typeof query?.friendCode === "string" ? query.friendCode.trim() : "";
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
          currentUserFriendCode={profile.friendCode}
          dashboard={dashboardResult.dashboard}
          initialAddFriendCode={initialFriendCode || undefined}
          locale={locale}
        />
      )}
    </PageContainer>
  );
}
