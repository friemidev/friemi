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
  getActivities,
  activityCardSelect,
  getActivityCoverTone,
  getActivityCardViewModel,
  getLegacyPublicActivityInfoWhere,
  getVisibleActivityWhere,
} from "./getActivities";
import type { Prisma } from "@prisma/client";

const activityLobbySectionLimit = 6;
const visibleLobbyParticipationStatuses = ["JOINED", "APPROVED", "PENDING"] as const;

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
  openActivities: ActivityCardViewModel[];
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
          favoriteCount: activity.favoriteCount,
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
  const viewerParticipationByActivityId = new Map(
    (
      await prisma.activityParticipant.findMany({
        where: {
          userProfileId: viewerProfileId,
          activityId: {
            in: teamActivitiesWithState.map((activity) => activity.id),
          },
        },
        select: {
          activityId: true,
          status: true,
        },
        orderBy: [{ joinedAt: "desc" }, { id: "desc" }],
      })
    ).map((participation) => [participation.activityId, participation.status]),
  );
  const publicEventFavoriteById = new Map(
    publicEventActivitiesWithState.map((activity) => [activity.id, activity]),
  );
  const teamActivityById = new Map(
    teamActivitiesWithState.map((activity) => [
      activity.id,
      {
        ...activity,
        viewerParticipationStatus:
          viewerParticipationByActivityId.get(activity.id) ?? null,
      },
    ]),
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
    favoriteCount: publicEvent.favoriteCount,
    participantCount: publicEvent.teamCount,
    priceText: publicEvent.priceText ?? "",
    status: "RECRUITING",
    visibility: "PUBLIC",
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

function getLobbyActivityKey(activity: ActivityCardViewModel) {
  if (activity.type === "PUBLIC_EVENT" && activity.publicEventId) {
    return `public:${activity.publicEventId}`;
  }

  return `activity:${activity.id}`;
}

async function decorateLobbyActivitySections(
  sections: ActivityCardViewModel[][],
  viewerProfileId: string,
) {
  const activityByKey = new Map<string, ActivityCardViewModel>();

  for (const section of sections) {
    for (const activity of section) {
      const key = getLobbyActivityKey(activity);

      if (!activityByKey.has(key)) {
        activityByKey.set(key, activity);
      }
    }
  }

  const decoratedActivities = await decorateLobbyActivities(
    [...activityByKey.values()],
    viewerProfileId,
  );
  const decoratedByKey = new Map(
    decoratedActivities.map((activity) => [
      getLobbyActivityKey(activity),
      activity,
    ]),
  );

  return sections.map((section) =>
    section.map(
      (activity) => decoratedByKey.get(getLobbyActivityKey(activity)) ?? activity,
    ),
  );
}

export async function getActivityLobby(
  viewerProfileId: string,
): Promise<ActivityLobbyViewModel> {
  const publicEventFavorite = getPublicEventFavoriteDelegate();
  const friendIds = await getViewerFriendIds(viewerProfileId);
  const visibleWhere = getVisibleActivityWhere({
    includeEnded: true,
    includePast: true,
    visibility: null,
  });
  const openVisibleWhere = getVisibleActivityWhere({
    includeEnded: false,
    includePast: false,
    visibility: null,
  });
  const accessibleWhere: Prisma.ActivityWhereInput = {
    AND: [
      visibleWhere,
      {
        OR: [
          {
            visibility: "PUBLIC",
          },
          {
            organizerId: viewerProfileId,
          },
          {
            participants: {
              some: {
                userProfileId: viewerProfileId,
                status: {
                  in: [...visibleLobbyParticipationStatuses],
                },
              },
            },
          },
          ...(friendIds.length > 0
            ? [
                {
                  AND: [
                    { visibility: "PRIVATE" as const },
                    { organizerId: { in: friendIds } },
                  ],
                },
              ]
            : []),
        ],
      },
    ],
  };

  const [
    openActivities,
    createdActivities,
    joinedParticipations,
    favoriteRecords,
    publicEventFavoriteRecords,
    friendHostedActivities,
    friendJoinedParticipations,
  ] = await Promise.all([
    prisma.activity.findMany({
      where: {
        AND: [
          openVisibleWhere,
          { visibility: "PUBLIC" },
          { NOT: getLegacyPublicActivityInfoWhere() },
        ],
      },
      orderBy: [{ startAt: "asc" }, { id: "asc" }],
      take: activityLobbySectionLimit * 5,
      select: activityCardSelect,
    }),
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
        status: {
          in: [...visibleLobbyParticipationStatuses],
        },
        activity: visibleWhere,
      },
      orderBy: [{ joinedAt: "desc" }, { id: "asc" }],
      take: activityLobbySectionLimit,
      select: lobbyParticipationSelect,
    }),
    prisma.activityFavorite.findMany({
      where: {
        userProfileId: viewerProfileId,
        activity: accessibleWhere,
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
            status: {
              in: [...visibleLobbyParticipationStatuses],
            },
            activity: accessibleWhere,
          },
          orderBy: [{ joinedAt: "desc" }, { id: "asc" }],
          take: activityLobbySectionLimit * 2,
          select: lobbyParticipationSelect,
        })
      : Promise.resolve([]),
  ]);

  const openActivityCards = openActivities
    .map(getActivityCardViewModel)
    .filter(isJoinableTeamCard)
    .slice(0, activityLobbySectionLimit);
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
  const createdActivityCards = createdActivities.map(getActivityCardViewModel);
  const friendHostedActivityCards = friendHostedActivities.map(
    getActivityCardViewModel,
  );
  const [
    decoratedOpenActivities,
    decoratedCreatedActivities,
    decoratedJoinedActivities,
    decoratedFavoriteActivities,
    decoratedFriendHostedActivities,
    decoratedFriendJoinedActivities,
  ] = await decorateLobbyActivitySections(
    [
      openActivityCards,
      createdActivityCards,
      joinedActivities,
      mergedFavoriteActivities,
      friendHostedActivityCards,
      friendJoinedActivities,
    ],
    viewerProfileId,
  );

  return {
    openActivities: decoratedOpenActivities,
    createdActivities: decoratedCreatedActivities,
    joinedActivities: decoratedJoinedActivities,
    favoriteActivities: decoratedFavoriteActivities,
    friendHostedActivities: decoratedFriendHostedActivities,
    friendJoinedActivities: decoratedFriendJoinedActivities,
  };
}

export async function getActivityLobbyPreview() {
  return getActivities({
    includePast: false,
    limit: 12,
    viewerProfileId: null,
  });
}
