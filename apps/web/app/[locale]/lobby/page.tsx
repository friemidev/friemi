import type { Metadata } from "next";
import { headers } from "next/headers";
import { PageContainer } from "@/components/layout/PageContainer";
import { activityCategoryOptions } from "@/features/activities/utils/activityFilters";
import {
  ActivityLobbyPreviewView,
  ActivityLobbyView,
} from "@/features/activities/components/ActivityLobbyView";
import {
  MobileLobbyV23View,
  type MobileLobbyV23TabId,
} from "@/features/activities/components/MobileLobbyV23View";
import {
  createEmptyActivityLobbyFeedPage,
  getActivityLobby,
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
    filter?: string | string[];
    price?: string | string[];
    status?: string | string[];
    tab?: string | string[];
  }>;
};

const lobbyFilterIds = [
  "all",
  "open",
  "created",
  "joined",
  "favorites",
  "friendHosted",
  "friendJoined",
] as const;

const lobbyStatusFilterIds = ["all", "ongoing", "ended"] as const;
const mobileLobbyTabIds = [
  "nearby",
  "mine",
  "friends",
  "today",
  "popular",
] as const;

function getSingleQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getInitialMobileLobbyTab({
  filter,
  tab,
}: {
  filter: string | undefined;
  tab: string | undefined;
}): MobileLobbyV23TabId {
  const explicitTab = mobileLobbyTabIds.find((item) => item === tab);

  if (explicitTab) {
    return explicitTab;
  }

  if (filter === "friendJoined" || filter === "friendHosted") {
    return "friends";
  }

  if (filter === "open") {
    return "popular";
  }

  return "nearby";
}

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
  const categoryParam = getSingleQueryValue(query.category);
  const filterParam = getSingleQueryValue(query.filter);
  const priceParam = getSingleQueryValue(query.price);
  const statusParam = getSingleQueryValue(query.status);
  const tabParam = getSingleQueryValue(query.tab);
  const initialCategoryFilter =
    activityCategoryOptions.find((category) => category === categoryParam) ??
    null;
  const initialFilter =
    lobbyFilterIds.find((filter) => filter === filterParam) ?? "all";
  const initialStatusFilter =
    lobbyStatusFilterIds.find((status) => status === statusParam) ?? "all";
  const initialMobileTab = getInitialMobileLobbyTab({
    filter: filterParam,
    tab: tabParam,
  });
  const initialFreeOnly = priceParam === "free";
  const perf = createPerformanceTracker({
    locale,
    route: "/lobby",
  });
  const viewerState = await perf.measure("viewer.profile", () =>
    getOptionalLayoutViewerState(),
  );
  const profile = viewerState.profile;

  if (!profile) {
    const previewActivities = await perf.measure("lobby.preview", () =>
      getActivityLobbyPreview().catch((error: unknown) => {
        console.error("Failed to load public activity lobby preview", error);

        return [];
      }),
    );
    perf.finish(
      {
        hasViewer: false,
        previewCount: previewActivities.length,
      },
      {
        route: `/${locale}/lobby`,
        routeKey: "lobby",
      },
    );

    return (
      <>
        <MobileLobbyV23View
          activeTab={initialMobileTab}
          activities={previewActivities}
          initialCategoryFilter={initialCategoryFilter}
          initialFreeOnly={initialFreeOnly}
          isSignedIn={false}
          locale={locale}
        />
        <PageContainer className="hidden space-y-6 py-5 sm:space-y-8 sm:py-8 md:block">
          <ActivityLobbyPreviewView
            activities={previewActivities}
            initialCategoryFilter={initialCategoryFilter}
            locale={locale}
          />
        </PageContainer>
      </>
    );
  }

  const lobby = await perf.measure("lobby.initialData", () =>
    getActivityLobby(profile.id).catch((error: unknown) => {
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
  perf.finish(
    {
      createdCount: lobby.createdActivities.length,
      deferredSections: true,
      favoriteCount: lobby.favoriteActivities.length,
      hasViewer: true,
      joinedCount: lobby.joinedActivities.length,
    },
    {
      route: `/${locale}/lobby`,
      routeKey: "lobby",
      userProfileId: profile.id,
    },
  );

  return (
    <>
      <MobileLobbyV23View
        activeTab={initialMobileTab}
        activities={[
          ...lobby.allActivityFeed.activities,
          ...lobby.allActivities,
          ...lobby.openActivities,
          ...lobby.starterActivities,
          ...lobby.joinedActivities,
          ...lobby.createdActivities,
        ]}
        friendActivities={[
          ...lobby.friendJoinedActivities,
          ...lobby.friendHostedActivities,
        ]}
        initialCategoryFilter={initialCategoryFilter}
        initialFreeOnly={initialFreeOnly}
        isSignedIn
        locale={locale}
        mineActivities={[...lobby.createdActivities, ...lobby.joinedActivities]}
      />
      <PageContainer className="hidden space-y-6 py-5 sm:space-y-8 sm:py-8 md:block">
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
          initialFilter={initialFilter}
          initialCategoryFilter={initialCategoryFilter}
          initialStatusFilter={initialStatusFilter}
          starterActivities={lobby.starterActivities}
          locale={locale}
        />
      </PageContainer>
    </>
  );
}
