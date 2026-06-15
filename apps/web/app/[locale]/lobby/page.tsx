import { PageContainer } from "@/components/layout/PageContainer";
import {
  ActivityLobbyPreviewView,
  ActivityLobbyView,
} from "@/features/activities/components/ActivityLobbyView";
import {
  getActivityLobby,
  getActivityLobbyPreview,
} from "@/features/activities/queries/getActivityLobby";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";
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
    getOptionalCurrentUserProfileSnapshot(),
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
    }, {
      route: `/${locale}/lobby`,
      routeKey: "lobby",
    });

    return (
      <PageContainer className="space-y-6 py-5 sm:space-y-8 sm:py-8">
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
        allActivities: [],
        openActivities: [],
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
  }, {
    route: `/${locale}/lobby`,
    routeKey: "lobby",
    userProfileId: profile.id,
  });

  return (
    <PageContainer className="space-y-6 py-5 sm:space-y-8 sm:py-8">
      <ActivityLobbyView
        allActivities={lobby.allActivities}
        openActivities={lobby.openActivities}
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
