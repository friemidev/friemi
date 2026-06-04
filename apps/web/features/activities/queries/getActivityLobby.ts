import { getPublicEventFavoriteDelegate, prisma } from "@/lib/prisma";
import { attachActivityFavoriteStates } from "@/features/favorites/queries/getViewerActivityFavorite";
import { attachPublicEventFavoriteStates } from "@/features/favorites/queries/getViewerActivityFavorite";
import { attachActivityFriendSignals } from "@/features/friends/queries/getActivityFriendSignals";
import { getViewerFriendIds } from "@/features/friends/queries/getViewerFriendIds";
import {
  getPublicEventCardViewModel,
  publicEventSelect,
} from "@/features/public-events/queries/getPublicEvents";
import type { ActivityCardViewModel } from "../types";
import {
  activityCardSelect,
  getActivityCoverTone,
  getActivityCardViewModel,
  getVisibleActivityWhere,
} from "./getActivities";

const activityLobbySectionLimit = 6;

const lobbyParticipationSelect = {
  activity: {
    select: activityCardSelect,
  },
} as const;

const lobbyFavoriteSelect = {
  createdAt: true,
  activity: {
    select: activityCardSelect,
  },
} as const;

const lobbyPublicEventFavoriteSelect = {
  createdAt: true,
  publicEvent: {
    select: publicEventSelect,
  },
} as const;

type ActivityLobbyViewModel = {
  createdActivities: ActivityCardViewModel[];
  joinedActivities: ActivityCardViewModel[];
  favoriteActivities: ActivityCardViewModel[];
  friendHostedActivities: ActivityCardViewModel[];
  friendJoinedActivities: ActivityCardViewModel[];
};

async function decorateLobbyActivities(
  activities: ActivityCardViewModel[],
  viewerProfileId: string,
) {
  const publicEventActivities = activities.filter(
    (activity) => activity.type === "PUBLIC_EVENT" && Boolean(activity.publicEventId),
  );
  const teamActivities = activities.filter(
    (activity) => activity.type !== "PUBLIC_EVENT",
  );
  const [publicEventActivitiesWithState, teamActivitiesWithState] =
    await Promise.all([
      attachPublicEventFavoriteStates(
        publicEventActivities.map((activity) => ({
          id: activity.publicEventId ?? activity.id,
          title: activity.title,
          description: activity.description,
          category: activity.category,
          city: activity.city,
          address: activity.address,
          latitude: activity.latitude,
          longitude: activity.longitude,
          startAt: activity.startAt,
          endAt: activity.endAt,
          priceType: "FREE",
          priceText: activity.priceText,
          coverImageUrl: activity.coverImageUrl,
          officialUrl: activity.officialUrl ?? null,
          status: "SCHEDULED",
          teamCount: activity.participantCount,
          isFavorited: activity.isFavorited,
        })),
        viewerProfileId,
      ),
      attachActivityFavoriteStates(
        await attachActivityFriendSignals(teamActivities, viewerProfileId),
        viewerProfileId,
      ),
    ]);
  const publicEventFavoriteById = new Map(
    publicEventActivitiesWithState.map((activity) => [activity.id, activity]),
  );
  const teamActivityById = new Map(
    teamActivitiesWithState.map((activity) => [activity.id, activity]),
  );

  return activities.map((activity) => {
    if (activity.type === "PUBLIC_EVENT" && activity.publicEventId) {
      const publicEventId = activity.publicEventId ?? activity.id;

      return {
        ...activity,
        isFavorited: publicEventFavoriteById.get(publicEventId)?.isFavorited,
      };
    }

    return teamActivityById.get(activity.id) ?? activity;
  });
}

function mapPublicEventToActivityCard(
  publicEvent: ReturnType<typeof getPublicEventCardViewModel>,
): ActivityCardViewModel {
  return {
    id: publicEvent.id,
    publicEventId: publicEvent.id,
    title: publicEvent.title,
    description: publicEvent.description,
    type: "PUBLIC_EVENT",
    category: publicEvent.category,
    city: publicEvent.city,
    address: publicEvent.address,
    latitude: publicEvent.latitude,
    longitude: publicEvent.longitude,
    startAt: publicEvent.startAt,
    endAt: publicEvent.endAt,
    capacity: 0,
    coverImageUrl: publicEvent.coverImageUrl,
    participantCount: publicEvent.teamCount,
    priceText: publicEvent.priceText ?? "",
    status: "RECRUITING",
    coverTone: getActivityCoverTone(publicEvent.id),
    isActivityInfo: true,
    officialUrl: publicEvent.officialUrl,
    merchant: null,
    isFavorited: publicEvent.isFavorited,
  };
}

function isJoinableTeamCard(activity: ActivityCardViewModel) {
  return activity.type !== "PUBLIC_EVENT" && !activity.isActivityInfo;
}

export async function getActivityLobby(
  viewerProfileId: string,
): Promise<ActivityLobbyViewModel> {
  const publicEventFavorite = getPublicEventFavoriteDelegate();
  const friendIds = await getViewerFriendIds(viewerProfileId);
  const visibleWhere = getVisibleActivityWhere({
    includeEnded: true,
    includePast: true,
  });

  const [
    createdActivities,
    joinedParticipations,
    favoriteRecords,
    publicEventFavoriteRecords,
    friendHostedActivities,
    friendJoinedParticipations,
  ] = await Promise.all([
    prisma.activity.findMany({
      where: {
        AND: [visibleWhere, { organizerId: viewerProfileId }],
      },
      orderBy: [{ startAt: "asc" }, { id: "asc" }],
      take: activityLobbySectionLimit,
      select: activityCardSelect,
    }),
    prisma.activityParticipant.findMany({
      where: {
        userProfileId: viewerProfileId,
        activity: visibleWhere,
      },
      orderBy: [{ joinedAt: "desc" }, { id: "asc" }],
      take: activityLobbySectionLimit,
      select: lobbyParticipationSelect,
    }),
    prisma.activityFavorite.findMany({
      where: {
        userProfileId: viewerProfileId,
        activity: visibleWhere,
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: activityLobbySectionLimit,
      select: lobbyFavoriteSelect,
    }),
    publicEventFavorite
      ? publicEventFavorite.findMany({
          where: {
            userProfileId: viewerProfileId,
            publicEvent: {
              visibility: "PUBLIC",
            },
          },
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          take: activityLobbySectionLimit,
          select: lobbyPublicEventFavoriteSelect,
        })
      : Promise.resolve([]),
    friendIds.length > 0
      ? prisma.activity.findMany({
          where: {
            AND: [visibleWhere, { organizerId: { in: friendIds } }],
          },
          orderBy: [{ startAt: "asc" }, { id: "asc" }],
          take: activityLobbySectionLimit,
          select: activityCardSelect,
        })
      : Promise.resolve([]),
    friendIds.length > 0
      ? prisma.activityParticipant.findMany({
          where: {
            userProfileId: {
              in: friendIds,
            },
            activity: visibleWhere,
          },
          orderBy: [{ joinedAt: "desc" }, { id: "asc" }],
          take: activityLobbySectionLimit * 2,
          select: lobbyParticipationSelect,
        })
      : Promise.resolve([]),
  ]);

  const joinedActivities = joinedParticipations
    .map((item) => getActivityCardViewModel(item.activity))
    .filter(isJoinableTeamCard);
  const favoriteActivityCards = favoriteRecords.map((item) => ({
    activity: getActivityCardViewModel(item.activity),
    createdAt: item.createdAt,
  }));
  const favoritePublicEventCards = (
    publicEventFavoriteRecords as {
      createdAt: Date;
      publicEvent: Parameters<typeof getPublicEventCardViewModel>[0];
    }[]
  ).map((item) => ({
    activity: mapPublicEventToActivityCard(
      getPublicEventCardViewModel(item.publicEvent),
    ),
    createdAt: item.createdAt,
  }));
  const friendJoinedActivities = Array.from(
    new Map(
      friendJoinedParticipations.map((item) => {
        const activity = getActivityCardViewModel(item.activity);
        return [activity.id, activity] as const;
      }),
    ).values(),
  )
    .filter(isJoinableTeamCard)
    .slice(0, activityLobbySectionLimit);

  const mergedFavoriteActivities = [
    ...favoriteActivityCards,
    ...favoritePublicEventCards,
  ]
    .sort(
      (left, right) =>
        right.createdAt.getTime() - left.createdAt.getTime() ||
        left.activity.id.localeCompare(right.activity.id),
    )
    .map((item) => item.activity)
    .slice(0, activityLobbySectionLimit);

  return {
    createdActivities: await decorateLobbyActivities(
      createdActivities.map(getActivityCardViewModel),
      viewerProfileId,
    ),
    joinedActivities: await decorateLobbyActivities(
      joinedActivities,
      viewerProfileId,
    ),
    favoriteActivities: await decorateLobbyActivities(
      mergedFavoriteActivities,
      viewerProfileId,
    ),
    friendHostedActivities: await decorateLobbyActivities(
      friendHostedActivities.map(getActivityCardViewModel),
      viewerProfileId,
    ),
    friendJoinedActivities: await decorateLobbyActivities(
      friendJoinedActivities,
      viewerProfileId,
    ),
  };
}
