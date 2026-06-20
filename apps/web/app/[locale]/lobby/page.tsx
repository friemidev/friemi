import type { Metadata } from "next";
import { headers } from "next/headers";
import { PageContainer } from "@/components/layout/PageContainer";
import {
  ActivityLobbyPreviewView,
  ActivityLobbyView,
} from "@/features/activities/components/ActivityLobbyView";
import {
  createEmptyActivityLobbyFeedPage,
  getActivityLobbyInitial,
  getActivityLobbyPreview,
  getLobbySwipePublicEventActivities,
} from "@/features/activities/queries/getActivityLobby";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";
import { getCopy } from "@/lib/copy";
import { createPerformanceTracker } from "@/lib/performance";
import { withLocale } from "@/lib/routes";
import {
  buildPageShareMetadata,
  generalPageShareDescription,
  getRequestBaseUrl,
} from "@/lib/share-metadata";

type ActivityLobbyPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: ActivityLobbyPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = getCopy(locale);
  const requestHeaders = await headers();
  const baseUrl = getRequestBaseUrl(requestHeaders);

  return buildPageShareMetadata({
    baseUrl,
    description: generalPageShareDescription,
    path: withLocale(locale, "/lobby"),
    title: `${t.activityLobby.title} · Next Fun`,
  });
}

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
    const [previewActivities, swipeActivities] = await perf.measure(
      "lobby.preview",
      () =>
        Promise.all([
          getActivityLobbyPreview(),
          getLobbySwipePublicEventActivities(null, { limit: 8 }),
        ]).catch((error: unknown) => {
          console.error("Failed to load public activity lobby preview", error);

          return [[], []];
        }),
    );
    perf.finish({
      hasViewer: false,
      previewCount: previewActivities.length,
      swipeCount: swipeActivities.length,
    }, {
      route: `/${locale}/lobby`,
      routeKey: "lobby",
    });

    return (
      <PageContainer className="space-y-6 py-5 sm:space-y-8 sm:py-8">
        <ActivityLobbyPreviewView
          activities={previewActivities}
          locale={locale}
          swipeActivities={swipeActivities}
        />
      </PageContainer>
    );
  }

  const lobby = await perf.measure("lobby.initialData", () =>
    getActivityLobbyInitial(profile.id).catch((error: unknown) => {
      console.error("Failed to load activity lobby", error);

      return {
        allActivities: [],
        allActivityFeed: createEmptyActivityLobbyFeedPage(),
        openActivities: [],
        createdActivities: [],
        joinedActivities: [],
        favoriteActivities: [],
        friendHostedActivities: [],
        friendJoinedActivities: [],
        starterActivities: [],
        swipeActivities: [],
      };
    }),
  );
  perf.finish({
    createdCount: lobby.createdActivities.length,
    deferredSections: true,
    favoriteCount: lobby.favoriteActivities.length,
    hasViewer: true,
    joinedCount: lobby.joinedActivities.length,
    swipeCount: lobby.swipeActivities.length,
  }, {
    route: `/${locale}/lobby`,
    routeKey: "lobby",
    userProfileId: profile.id,
  });

  return (
    <PageContainer className="space-y-6 py-5 sm:space-y-8 sm:py-8">
      <ActivityLobbyView
        allActivities={lobby.allActivities}
        allActivityFeed={lobby.allActivityFeed}
        openActivities={lobby.openActivities}
        createdActivities={lobby.createdActivities}
        deferredFilters={["favorites", "friendHosted", "friendJoined"]}
        joinedActivities={lobby.joinedActivities}
        favoriteActivities={lobby.favoriteActivities}
        friendHostedActivities={lobby.friendHostedActivities}
        friendJoinedActivities={lobby.friendJoinedActivities}
        starterActivities={lobby.starterActivities}
        swipeActivities={lobby.swipeActivities}
        locale={locale}
      />
    </PageContainer>
  );
}
