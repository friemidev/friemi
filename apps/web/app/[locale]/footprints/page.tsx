import type { Metadata } from "next";
import { ImageResourcePreloader } from "@/components/media/ImageResourcePreloader";
import { FootprintsMobilePage } from "@/features/moments/components/FootprintsMobilePage";
import { getActivityRoomChatRoster } from "@/features/activity-room-chat/services/activityRoomChat";
import { getDirectMessageFriendRoster } from "@/features/direct-messages/queries/getDirectMessages";
import { getMomentFeedPage } from "@/features/moments/queries/getMomentFeed";
import { getOfficialMessageRoster } from "@/features/official-messages/services/officialMessages";
import { canCreatePlanet } from "@/features/planets/queries/planetCreationEligibility";
import { getPlanetSquarePage } from "@/features/planets/queries/planetQueries";
import { getPlanetChatRoster } from "@/features/planets/services/planetChat";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";
import { createPerformanceTracker } from "@/lib/performance";
import { withLocale } from "@/lib/routes";
import {
  buildPageShareMetadata,
  getGeneralPageShareDescription,
  getCanonicalMetadataBaseUrl,
} from "@/lib/share-metadata";

type FootprintsPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams?: Promise<{
    scope?: string;
    tab?: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: FootprintsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const title =
    locale === "zh-CN" ? "世界" : locale === "fr" ? "Monde" : "World";

  return buildPageShareMetadata({
    baseUrl: getCanonicalMetadataBaseUrl(),
    description: getGeneralPageShareDescription(locale),
    path: withLocale(locale, "/footprints"),
    title: `${title} · Friemi`,
  });
}

export default async function FootprintsPage({
  params,
  searchParams,
}: FootprintsPageProps) {
  const { locale } = await params;
  const query = await searchParams;
  const requestedTab =
    query?.tab === "message"
      ? "message"
      : query?.tab === "moment"
        ? "moment"
        : query?.tab === "planet" || query?.tab === "profile"
          ? "planet"
          : null;
  const requestedMomentScope =
    query?.scope === "mine"
      ? "MINE"
      : query?.scope === "mutual"
        ? "MUTUAL"
        : query?.scope === "following"
          ? "FOLLOWING"
          : "PUBLIC";
  const perf = createPerformanceTracker({
    locale,
    route: "/footprints",
  });
  const profile = await perf.measure("viewer.profile", () =>
    getOptionalCurrentUserProfileSnapshot(),
  );
  const initialTab = requestedTab ?? "moment";
  const viewerProfileId = profile?.id ?? null;
  const [
    momentsResult,
    messageFriendsResult,
    officialMessagesResult,
    activityRoomChatsResult,
    planetChatsResult,
    planetsResult,
    canCreateResult,
  ] = await Promise.all([
    initialTab === "moment"
      ? perf
          .measure("moments.feed", () =>
            getMomentFeedPage(viewerProfileId, { limit: 8 }),
          )
          .then((page) => ({ page, error: null }))
          .catch((error: unknown) => {
            console.error("Failed to load moment feed", error);

            return {
              page: { hasMore: false, items: [], nextCursor: null },
              error,
            };
          })
      : Promise.resolve({
          page: { hasMore: false, items: [], nextCursor: null },
          error: null,
        }),
    profile && initialTab === "message"
      ? perf
          .measure("messages.friendRoster", () =>
            getDirectMessageFriendRoster(profile.id),
          )
          .then((friends) => ({ friends, error: null }))
          .catch((error: unknown) => {
            console.error("Failed to load footprints message roster", error);

            return {
              friends: [],
              error,
            };
          })
      : Promise.resolve({ friends: [], error: null }),
    profile && initialTab === "message"
      ? perf
          .measure("messages.official", () =>
            getOfficialMessageRoster(profile.id, locale),
          )
          .then((roster) => ({ roster, error: null }))
          .catch((error: unknown) => {
            console.error("Failed to load official message roster", error);

            return {
              roster: null,
              error,
            };
          })
      : Promise.resolve({ roster: null, error: null }),
    profile && initialTab === "message"
      ? perf
          .measure("messages.activityRooms", () =>
            getActivityRoomChatRoster(profile.id),
          )
          .then((rooms) => ({ rooms, error: null }))
          .catch((error: unknown) => {
            console.error("Failed to load footprints room chat roster", error);

            return {
              rooms: [],
              error,
            };
          })
      : Promise.resolve({ rooms: [], error: null }),
    profile && initialTab === "message"
      ? perf
          .measure("messages.planetChats", () =>
            getPlanetChatRoster(profile.id, locale),
          )
          .then((planetChats) => ({ planetChats, error: null }))
          .catch((error: unknown) => {
            console.error(
              "Failed to load footprints planet chat roster",
              error,
            );

            return {
              planetChats: [],
              error,
            };
          })
      : Promise.resolve({ planetChats: [], error: null }),
    initialTab === "planet"
      ? perf
          .measure("planets.square", () =>
            getPlanetSquarePage(viewerProfileId, { limit: 12 }),
          )
          .then((page) => ({ page, error: null }))
          .catch((error: unknown) => {
            console.error("Failed to load footprints planet square", error);

            return {
              page: { hasMore: false, items: [], nextCursor: null },
              error,
            };
          })
      : Promise.resolve({
          page: { hasMore: false, items: [], nextCursor: null },
          error: null,
        }),
    initialTab === "planet"
      ? perf
          .measure("planets.canCreate", () => canCreatePlanet(profile))
          .then((canCreate) => ({ canCreate, error: null }))
          .catch((error: unknown) => {
            console.error(
              "Failed to resolve planet creation eligibility",
              error,
            );

            return {
              canCreate: false,
              error,
            };
          })
      : Promise.resolve({ canCreate: false, error: null }),
  ]);
  perf.finish(
    {
      initialTab,
      activityRoomChatCount: activityRoomChatsResult.rooms.length,
      messageFriendCount: messageFriendsResult.friends.length,
      officialMessageLoaded:
        initialTab === "message" && !officialMessagesResult.error,
      planetChatCount: planetChatsResult.planetChats.length,
      momentCount: momentsResult.page.items.length,
      planetCount: planetsResult.page.items.length,
      planetCreationEligibilityLoaded:
        initialTab === "planet" && !canCreateResult.error,
    },
    {
      route: `/${locale}/footprints`,
      routeKey: "footprints",
      sourceSurface: "footprints",
      userProfileId: viewerProfileId,
    },
  );

  const initialImageSources =
    initialTab === "moment"
      ? momentsResult.page.items.flatMap((moment) =>
          moment.images.map((image) => image.url),
        )
      : initialTab === "message"
        ? messageFriendsResult.friends.map(
            (friend) => friend.friend.avatarUrl,
          )
        : planetsResult.page.items.map((planet) => planet.coverImageUrl);

  return (
    <>
      <ImageResourcePreloader limit={5} sources={initialImageSources} />
      <FootprintsMobilePage
        locale={locale}
        initialMomentScope={requestedMomentScope}
        initialTab={initialTab}
        moments={momentsResult.page.items}
        momentFeedHasMore={momentsResult.page.hasMore}
        momentFeedNextCursor={momentsResult.page.nextCursor}
        momentFeedLoaded={initialTab === "moment"}
        momentFeedError={Boolean(momentsResult.error)}
        messageFriends={messageFriendsResult.friends}
        officialMessages={officialMessagesResult.roster}
        activityRoomChats={activityRoomChatsResult.rooms}
        planetChats={planetChatsResult.planetChats}
        messageRosterLoaded={!profile || initialTab === "message"}
        messageRosterError={Boolean(
          messageFriendsResult.error ||
          officialMessagesResult.error ||
          activityRoomChatsResult.error ||
          planetChatsResult.error,
        )}
        profile={
          profile
            ? {
                id: profile.id,
                nickname: profile.nickname,
                avatarUrl: profile.avatarUrl,
                bio: profile.bio,
                friendCode: profile.friendCode,
                isCoCreator: profile.isCoCreator,
              }
            : null
        }
        planets={planetsResult.page.items}
        planetSquareHasMore={planetsResult.page.hasMore}
        planetSquareNextCursor={planetsResult.page.nextCursor}
        planetSquareLoaded={initialTab === "planet"}
        planetSquareError={Boolean(planetsResult.error)}
        canCreatePlanet={canCreateResult.canCreate}
      />
    </>
  );
}
