import { PageContainer } from "@/components/layout/PageContainer";
import {
  ActivityLobbyPreviewView,
  ActivityLobbyView,
} from "@/features/activities/components/ActivityLobbyView";
import { ActivityModeTabs } from "@/features/activities/components/ActivityModeTabs";
import {
  getActivityLobby,
  getActivityLobbyPreview,
} from "@/features/activities/queries/getActivityLobby";
import { getOptionalCurrentUserProfile } from "@/lib/auth";
import { createPerformanceTracker } from "@/lib/performance";

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
  const perf = createPerformanceTracker({
    locale,
    route: "/lobby",
  });
  const profile = await perf.measure("viewer.profile", () =>
    getOptionalCurrentUserProfile(),
  );

  if (!profile) {
    const previewActivities = await perf.measure("lobby.preview", () =>
      getActivityLobbyPreview().catch((error: unknown) => {
        console.error("Failed to load public activity lobby preview", error);

        return [];
      }),
    );
    perf.finish({
      hasViewer: false,
      previewCount: previewActivities.length,
    });

    return (
      <PageContainer className="space-y-6 py-5 sm:space-y-8 sm:py-8">
        <ActivityModeTabs current="lobby" locale={locale} />
        <ActivityLobbyPreviewView
          activities={previewActivities}
          locale={locale}
        />
      </PageContainer>
    );
  }

  const lobby = await perf.measure("lobby.data", () =>
    getActivityLobby(profile.id).catch((error: unknown) => {
      console.error("Failed to load activity lobby", error);

      return {
        createdActivities: [],
        joinedActivities: [],
        favoriteActivities: [],
        friendHostedActivities: [],
        friendJoinedActivities: [],
      };
    }),
  );
  perf.finish({
    createdCount: lobby.createdActivities.length,
    favoriteCount: lobby.favoriteActivities.length,
    hasViewer: true,
    joinedCount: lobby.joinedActivities.length,
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
