import type { Metadata } from "next";
import { FootprintsMobilePage } from "@/features/moments/components/FootprintsMobilePage";
import { getActivityRoomChatRoster } from "@/features/activity-room-chat/services/activityRoomChat";
import { getDirectMessageFriendRoster } from "@/features/direct-messages/queries/getDirectMessages";
import { getMomentFeed } from "@/features/moments/queries/getMomentFeed";
import { canCreatePlanet } from "@/features/planets/queries/planetCreationEligibility";
import { getPlanetSquare } from "@/features/planets/queries/planetQueries";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";
import { createPerformanceTracker } from "@/lib/performance";

type FootprintsPageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams?: Promise<{
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

  return {
    title: `${title} | Friemi`,
  };
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
    activityRoomChatsResult,
    planetsResult,
    canCreateResult,
  ] = await Promise.all([
      perf
        .measure("moments.feed", () => getMomentFeed(viewerProfileId))
        .then((moments) => ({ moments, error: null }))
        .catch((error: unknown) => {
          console.error("Failed to load moment feed", error);

          return {
            moments: [],
            error,
          };
        }),
      profile
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
      profile
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
      perf
        .measure("planets.square", () => getPlanetSquare(viewerProfileId))
        .then((planets) => ({ planets, error: null }))
        .catch((error: unknown) => {
          console.error("Failed to load footprints planet square", error);

          return {
            planets: [],
            error,
          };
        }),
      perf
        .measure("planets.canCreate", () => canCreatePlanet(profile))
        .then((canCreate) => ({ canCreate, error: null }))
        .catch((error: unknown) => {
          console.error("Failed to resolve planet creation eligibility", error);

          return {
            canCreate: false,
            error,
          };
        }),
    ]);
  perf.finish(
    {
      initialTab,
      activityRoomChatCount: activityRoomChatsResult.rooms.length,
      messageFriendCount: messageFriendsResult.friends.length,
      momentCount: momentsResult.moments.length,
      planetCount: planetsResult.planets.length,
      planetCreationEligibilityLoaded: !canCreateResult.error,
    },
    {
      route: `/${locale}/footprints`,
      routeKey: "footprints",
      sourceSurface: "footprints",
      userProfileId: viewerProfileId,
    },
  );

  return (
    <FootprintsMobilePage
      locale={locale}
      initialTab={initialTab}
      moments={momentsResult.moments}
      momentFeedError={Boolean(momentsResult.error)}
      messageFriends={messageFriendsResult.friends}
      activityRoomChats={activityRoomChatsResult.rooms}
      messageRosterError={Boolean(
        messageFriendsResult.error || activityRoomChatsResult.error,
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
      planets={planetsResult.planets}
      planetSquareError={Boolean(planetsResult.error)}
      canCreatePlanet={canCreateResult.canCreate}
    />
  );
}
