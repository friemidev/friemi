import type { Metadata } from "next";
import { headers } from "next/headers";
import { PageContainer } from "@/components/layout/PageContainer";
import { activityCategoryOptions } from "@/features/activities/utils/activityFilters";
import {
  ActivityLobbyPreviewView,
  ActivityLobbyView,
} from "@/features/activities/components/ActivityLobbyView";
import {
  createEmptyActivityLobbyFeedPage,
  getActivityLobbyInitial,
  getActivityLobbyPreview,
} from "@/features/activities/queries/getActivityLobby";
import { getOptionalLayoutViewerState } from "@/lib/auth";
import { brand } from "@/lib/brand";
import { getCopy } from "@/lib/copy";
import { createPerformanceTracker } from "@/lib/performance";
import { withLocale } from "@/lib/routes";
import {
  buildPageShareMetadata,
  getGeneralPageShareDescription,
  getRequestBaseUrl,
} from "@/lib/share-metadata";

type ActivityLobbyPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams?: Promise<{
    category?: string | string[];
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
    description: getGeneralPageShareDescription(locale),
    path: withLocale(locale, "/lobby"),
    title: `${t.activityLobby.title} · ${brand.name}`,
  });
}

export default async function ActivityLobbyPage({
  params,
  searchParams,
}: ActivityLobbyPageProps) {
  const { locale } = await params;
  const query = (await searchParams) ?? {};
  const categoryParam = Array.isArray(query.category)
    ? query.category[0]
    : query.category;
  const initialCategoryFilter =
    activityCategoryOptions.find((category) => category === categoryParam) ??
    null;
  const perf = createPerformanceTracker({
    locale,
    route: "/lobby",
  });
  const viewerState = await perf.measure("viewer.profile", () =>
    getOptionalLayoutViewerState(),
  );
  const profile = viewerState.profile;

  if (!profile) {
    const previewActivities = await perf.measure(
      "lobby.preview",
      () => getActivityLobbyPreview(initialCategoryFilter ?? undefined).catch(
        (error: unknown) => {
          console.error("Failed to load public activity lobby preview", error);

          return [];
        },
      ),
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
          initialCategoryFilter={initialCategoryFilter}
          locale={locale}
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
      };
    }),
  );
  perf.finish({
    createdCount: lobby.createdActivities.length,
    deferredSections: true,
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
        allActivityFeed={lobby.allActivityFeed}
        openActivities={lobby.openActivities}
        createdActivities={lobby.createdActivities}
        deferredFilters={["favorites", "friendHosted", "friendJoined"]}
        joinedActivities={lobby.joinedActivities}
        favoriteActivities={lobby.favoriteActivities}
        friendHostedActivities={lobby.friendHostedActivities}
        friendJoinedActivities={lobby.friendJoinedActivities}
        initialCategoryFilter={initialCategoryFilter}
        starterActivities={lobby.starterActivities}
        locale={locale}
      />
    </PageContainer>
  );
}
