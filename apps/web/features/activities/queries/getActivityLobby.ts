import { prisma } from "@/lib/prisma";
import { attachActivityFavoriteStates } from "@/features/favorites/queries/getViewerActivityFavorite";
import { attachActivityFriendSignals } from "@/features/friends/queries/getActivityFriendSignals";
import { getViewerFriendIds } from "@/features/friends/queries/getViewerFriendIds";
import type { ActivityCardViewModel } from "../types";
import {
  activityCardSelect,
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
  activity: {
    select: activityCardSelect,
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
  return attachActivityFavoriteStates(
    await attachActivityFriendSignals(activities, viewerProfileId),
    viewerProfileId,
  );
}

export async function getActivityLobby(
  viewerProfileId: string,
): Promise<ActivityLobbyViewModel> {
  const friendIds = await getViewerFriendIds(viewerProfileId);
  const visibleWhere = getVisibleActivityWhere({
    includeEnded: true,
    includePast: true,
  });

  const [
    createdActivities,
    joinedParticipations,
    favoriteRecords,
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

  const joinedActivities = joinedParticipations.map((item) =>
    getActivityCardViewModel(item.activity),
  );
  const favoriteActivities = favoriteRecords.map((item) =>
    getActivityCardViewModel(item.activity),
  );
  const friendJoinedActivities = Array.from(
    new Map(
      friendJoinedParticipations.map((item) => {
        const activity = getActivityCardViewModel(item.activity);
        return [activity.id, activity] as const;
      }),
    ).values(),
  ).slice(0, activityLobbySectionLimit);

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
      favoriteActivities,
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
