import { PageContainer } from "@/components/layout/PageContainer";
import { ActivityLobbyView } from "@/features/activities/components/ActivityLobbyView";
import { ActivityModeTabs } from "@/features/activities/components/ActivityModeTabs";
import { getActivityLobby } from "@/features/activities/queries/getActivityLobby";
import { ensureCurrentUserProfile } from "@/lib/auth";

type ActivityLobbyPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function ActivityLobbyPage({
  params,
}: ActivityLobbyPageProps) {
  const { locale } = await params;
  const profile = await ensureCurrentUserProfile(locale);
  const lobby = await getActivityLobby(profile.id).catch((error: unknown) => {
    console.error("Failed to load activity lobby", error);

    return {
      createdActivities: [],
      joinedActivities: [],
      favoriteActivities: [],
      friendHostedActivities: [],
      friendJoinedActivities: [],
    };
  });

  return (
    <PageContainer className="space-y-6 py-5 sm:space-y-8 sm:py-8">
      <ActivityModeTabs current="lobby" locale={locale} />
      <ActivityLobbyView
        createdActivities={lobby.createdActivities}
        joinedActivities={lobby.joinedActivities}
        favoriteActivities={lobby.favoriteActivities}
        friendHostedActivities={lobby.friendHostedActivities}
        friendJoinedActivities={lobby.friendJoinedActivities}
        locale={locale}
      />
    </PageContainer>
  );
}
