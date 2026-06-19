import { unstable_cache } from "next/cache";
import { getPublicEventFavoriteDelegate, prisma } from "@/lib/prisma";
import { attachActivityFavoriteStates } from "@/features/favorites/queries/getViewerActivityFavorite";
import { attachPublicEventFavoriteStates } from "@/features/favorites/queries/getViewerActivityFavorite";
import { getActivityFriendSignalMap } from "@/features/friends/queries/getActivityFriendSignals";
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
  getLegacyPublicActivityInfoWhere,
  getVisibleActivityWhere,
} from "./getActivities";
import { applyOrganizerParticipationDefaults } from "./applyOrganizerParticipationDefaults";
import { buildPrivateActivityFriendAccessWhere } from "../utils/activityShareAccess";
import type { Prisma } from "@prisma/client";

const activityLobbySectionLimit = 6;
const activityLobbyFeedLimit = 48;
const activityLobbyArchivedFeedLimit = activityLobbyFeedLimit;
const activityLobbyPreviewLimit = activityLobbyFeedLimit * 2;
const activityLobbyStarterLimit = 8;
const activityLobbySwipeLimit = 24;
const visibleLobbyParticipationStatuses = ["JOINED", "APPROVED", "PENDING"] as const;
export const OPEN_LOBBY_ACTIVITIES_TAG = "open-lobby-activities";

const baseTeamCardWhere: Prisma.ActivityWhereInput = {
  type: { not: "PUBLIC_EVENT" },
};

const strictTeamCardWhere: Prisma.ActivityWhereInput = {
  AND: [baseTeamCardWhere, { NOT: getLegacyPublicActivityInfoWhere() }],
};

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

const getCachedOpenLobbyActivities = unstable_cache(
  async () =>
    prisma.activity.findMany({
      where: {
        AND: [
          getVisibleActivityWhere({
            includeEnded: false,
            includePast: false,
            visibility: null,
          }),
          { visibility: "PUBLIC" },
          strictTeamCardWhere,
        ],
      },
      orderBy: [{ startAt: "asc" }, { id: "asc" }],
      take: activityLobbySectionLimit,
      select: activityCardSelect,
    }),
  ["open-lobby-activities"],
  { revalidate: 60, tags: [OPEN_LOBBY_ACTIVITIES_TAG] },
);

export type ActivityLobbySectionId =
  | "open"
  | "created"
  | "joined"
  | "favorites"
  | "friendHosted"
  | "friendJoined";

export type ActivityLobbyViewModel = {
  allActivities: ActivityCardViewModel[];
  openActivities: ActivityCardViewModel[];
  createdActivities: ActivityCardViewModel[];
  joinedActivities: ActivityCardViewModel[];
  favoriteActivities: ActivityCardViewModel[];
  friendHostedActivities: ActivityCardViewModel[];
  friendJoinedActivities: ActivityCardViewModel[];
  starterActivities: ActivityCardViewModel[];
  swipeActivities: ActivityCardViewModel[];
};

type ActivityLobbyQueryContext = {
  accessibleActiveWhere: Prisma.ActivityWhereInput;
  accessibleWhere: Prisma.ActivityWhereInput;
  activeVisibleWhere: Prisma.ActivityWhereInput;
  archivedWhere: Prisma.ActivityWhereInput;
  friendIds: string[];
  ownTeamCardWhere: Prisma.ActivityWhereInput;
  teamCardWhere: Prisma.ActivityWhereInput;
  visibleWhere: Prisma.ActivityWhereInput;
};

async function decorateLobbyActivities(
  activities: ActivityCardViewModel[],
  viewerProfileId: string,
  viewerFriendIds: string[],
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
          ticketUrl: activity.ticketUrl ?? null,
          ticketLabel: activity.ticketLabel ?? null,
          status: "SCHEDULED",
          favoriteCount: activity.favoriteCount,
          teamCount: activity.participantCount,
          isFavorited: activity.isFavorited,
        })),
        viewerProfileId,
      ),
      attachActivityFavoriteStates(teamActivities, viewerProfileId),
    ]);
  const [teamActivitySignalMap, viewerParticipationByActivityId] =
    await Promise.all([
      getActivityFriendSignalMap(
        teamActivities.map((activity) => activity.id),
        viewerProfileId,
        viewerFriendIds,
      ),
      prisma.activityParticipant.findMany({
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
      }).then(
        (participations) =>
          new Map(
            participations.map((participation) => [
              participation.activityId,
              participation.status,
            ]),
          ),
      ),
    ]);
  const publicEventFavoriteById = new Map(
    publicEventActivitiesWithState.map((activity) => [activity.id, activity]),
  );
  const teamActivityById = new Map(
    teamActivitiesWithState.map((activity) => [
      activity.id,
      {
        ...activity,
        friendSignal: teamActivitySignalMap.get(activity.id) ?? null,
        viewerParticipationStatus:
          viewerParticipationByActivityId.get(activity.id) ?? null,
      },
    ]),
  );

  const activitiesWithViewerState = activities.map((activity) => {
    if (activity.type === "PUBLIC_EVENT" && activity.publicEventId) {
      const publicEventId = activity.publicEventId ?? activity.id;

      return {
        ...activity,
        isFavorited: publicEventFavoriteById.get(publicEventId)?.isFavorited,
      };
    }

    return teamActivityById.get(activity.id) ?? activity;
  });

  return applyOrganizerParticipationDefaults(activitiesWithViewerState);
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
    ticketUrl: publicEvent.ticketUrl,
    ticketLabel: publicEvent.ticketLabel,
    merchant: null,
    isFavorited: publicEvent.isFavorited,
  };
}

export async function getLobbySwipePublicEventActivities(
  viewerProfileId?: string | null,
) {
  const now = new Date();
  const publicEvents = await prisma.publicEvent.findMany({
    where: {
      startAt: {
        gt: now,
      },
      status: "SCHEDULED",
      visibility: "PUBLIC",
    },
    orderBy: [{ startAt: "asc" }, { id: "asc" }],
    take: activityLobbySwipeLimit,
    select: publicEventSelect,
  });
  const publicEventCards = publicEvents.map(getPublicEventCardViewModel);
  const cardsWithFavoriteState = await attachPublicEventFavoriteStates(
    publicEventCards,
    viewerProfileId,
  );

  return cardsWithFavoriteState.map(mapPublicEventToActivityCard);
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

function isEndedLobbyActivity(activity: ActivityCardViewModel) {
  if (activity.status === "ENDED" || activity.status === "CANCELLED") {
    return true;
  }

  const endBoundary = activity.endAt ?? activity.startAt;

  return new Date(endBoundary).getTime() < Date.now();
}

function compareLobbyActivityTime(
  left: ActivityCardViewModel,
  right: ActivityCardViewModel,
) {
  const leftEnded = isEndedLobbyActivity(left);
  const rightEnded = isEndedLobbyActivity(right);

  if (leftEnded !== rightEnded) {
    return leftEnded ? 1 : -1;
  }

  const leftTime = new Date(left.startAt).getTime();
  const rightTime = new Date(right.startAt).getTime();

  return leftEnded
    ? rightTime - leftTime || left.id.localeCompare(right.id)
    : leftTime - rightTime || left.id.localeCompare(right.id);
}

function getArchivedLobbyActivityWhere(now: Date): Prisma.ActivityWhereInput {
  return {
    OR: [
      {
        status: "ENDED",
      },
      {
        endAt: {
          lt: now,
        },
      },
      {
        AND: [
          {
            endAt: null,
          },
          {
            startAt: {
              lt: now,
            },
          },
        ],
      },
    ],
  };
}

function buildLobbyPriorityFeed({
  createdActivities,
  favoriteActivities,
  feedActivities,
  friendHostedActivities,
  friendJoinedActivities,
  joinedActivities,
  openActivities,
}: {
  createdActivities: ActivityCardViewModel[];
  favoriteActivities: ActivityCardViewModel[];
  feedActivities: ActivityCardViewModel[];
  friendHostedActivities: ActivityCardViewModel[];
  friendJoinedActivities: ActivityCardViewModel[];
  joinedActivities: ActivityCardViewModel[];
  openActivities: ActivityCardViewModel[];
}) {
  const priorityGroups = [
    createdActivities,
    joinedActivities,
    favoriteActivities,
    friendHostedActivities,
    friendJoinedActivities,
    openActivities,
  ].map((activities) => [...activities].sort(compareLobbyActivityTime));
  const priorityKeys = new Set(
    priorityGroups.flatMap((activities) => activities.map(getLobbyActivityKey)),
  );
  const remainingFeedActivities = [...feedActivities]
    .filter((activity) => !priorityKeys.has(getLobbyActivityKey(activity)))
    .sort(compareLobbyActivityTime);
  const orderedActivities = [
    ...priorityGroups.flat(),
    ...remainingFeedActivities,
  ];

  return Array.from(
    new Map(
      orderedActivities.map((activity) => [getLobbyActivityKey(activity), activity]),
    ).values(),
  );
}

async function decorateLobbyActivitySections(
  sections: ActivityCardViewModel[][],
  viewerProfileId: string,
  viewerFriendIds: string[],
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
    viewerFriendIds,
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

async function getLobbyQueryContext(
  viewerProfileId: string,
): Promise<ActivityLobbyQueryContext> {
  const friendIds = await getViewerFriendIds(viewerProfileId);
  const now = new Date();
  const visibleWhere = getVisibleActivityWhere({
    includeEnded: true,
    includePast: true,
    visibility: null,
    now,
  });
  const activeVisibleWhere = getVisibleActivityWhere({
    includeEnded: false,
    includePast: false,
    visibility: null,
    now,
  });
  const teamCardWhere = strictTeamCardWhere;
  const ownTeamCardWhere = baseTeamCardWhere;
  const accessibleFeedTeamWhere: Prisma.ActivityWhereInput = {
    OR: [
      strictTeamCardWhere,
      {
        AND: [{ organizerId: viewerProfileId }, ownTeamCardWhere],
      },
    ],
  };
  const getAccessibleWhere = (
    baseWhere: Prisma.ActivityWhereInput,
  ): Prisma.ActivityWhereInput => ({
    AND: [
      baseWhere,
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
          ...buildPrivateActivityFriendAccessWhere(friendIds),
        ],
      },
    ],
  });
  const accessibleWhere = getAccessibleWhere(visibleWhere);
  const accessibleActiveWhere = getAccessibleWhere(activeVisibleWhere);
  const archivedWhere = getArchivedLobbyActivityWhere(now);

  return {
    accessibleActiveWhere,
    accessibleWhere,
    activeVisibleWhere,
    archivedWhere,
    friendIds,
    ownTeamCardWhere,
    teamCardWhere,
    visibleWhere,
  };
}

async function getOpenLobbySection(
  viewerProfileId: string,
  context: ActivityLobbyQueryContext,
) {
  const [openActivities, ownedOpenActivities] = await Promise.all([
    getCachedOpenLobbyActivities(),
    prisma.activity.findMany({
      where: {
        AND: [
          context.activeVisibleWhere,
          { organizerId: viewerProfileId },
          { visibility: "PUBLIC" },
          context.ownTeamCardWhere,
        ],
      },
      orderBy: [{ startAt: "asc" }, { id: "asc" }],
      take: activityLobbySectionLimit,
      select: activityCardSelect,
    }),
  ]);

  return Array.from(
    new Map(
      [...openActivities, ...ownedOpenActivities].map((activity) => [
        activity.id,
        getActivityCardViewModel(activity),
      ]),
    ).values(),
  );
}

async function getCreatedLobbySection(
  viewerProfileId: string,
  context: ActivityLobbyQueryContext,
) {
  const createdActivities = await prisma.activity.findMany({
    where: {
      AND: [
        context.visibleWhere,
        { organizerId: viewerProfileId },
        context.ownTeamCardWhere,
      ],
    },
    orderBy: [{ startAt: "asc" }, { id: "asc" }],
    take: activityLobbySectionLimit,
    select: activityCardSelect,
  });

  return createdActivities.map(getActivityCardViewModel);
}

async function getJoinedLobbySection(
  viewerProfileId: string,
  context: ActivityLobbyQueryContext,
) {
  const joinedParticipations = await prisma.activityParticipant.findMany({
    where: {
      userProfileId: viewerProfileId,
      status: {
        in: [...visibleLobbyParticipationStatuses],
      },
      activity: {
        AND: [context.visibleWhere, context.teamCardWhere],
      },
    },
    orderBy: [{ joinedAt: "desc" }, { id: "asc" }],
    take: activityLobbySectionLimit,
    select: lobbyParticipationSelect,
  });

  return joinedParticipations
    .map((item) => getActivityCardViewModel(item.activity))
    .filter(isJoinableTeamCard);
}

async function getFavoriteLobbySection(
  viewerProfileId: string,
  context: ActivityLobbyQueryContext,
) {
  const publicEventFavorite = getPublicEventFavoriteDelegate();
  const [favoriteRecords, publicEventFavoriteRecords] = await Promise.all([
    prisma.activityFavorite.findMany({
      where: {
        userProfileId: viewerProfileId,
        activity: context.accessibleWhere,
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
  ]);
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

  return [...favoriteActivityCards, ...favoritePublicEventCards]
    .sort(
      (left, right) =>
        right.createdAt.getTime() - left.createdAt.getTime() ||
        left.activity.id.localeCompare(right.activity.id),
    )
    .map((item) => item.activity)
    .slice(0, activityLobbySectionLimit);
}

async function getFriendHostedLobbySection(context: ActivityLobbyQueryContext) {
  if (context.friendIds.length === 0) {
    return [];
  }

  const friendHostedActivities = await prisma.activity.findMany({
    where: {
      AND: [
        context.visibleWhere,
        { organizerId: { in: context.friendIds } },
        context.teamCardWhere,
      ],
    },
    orderBy: [{ startAt: "asc" }, { id: "asc" }],
    take: activityLobbySectionLimit,
    select: activityCardSelect,
  });

  return friendHostedActivities.map(getActivityCardViewModel);
}

async function getFriendJoinedLobbySection(context: ActivityLobbyQueryContext) {
  if (context.friendIds.length === 0) {
    return [];
  }

  const friendJoinedParticipations = await prisma.activityParticipant.findMany({
    where: {
      userProfileId: {
        in: context.friendIds,
      },
      status: {
        in: [...visibleLobbyParticipationStatuses],
      },
      activity: {
        AND: [context.accessibleWhere, context.teamCardWhere],
      },
    },
    orderBy: [{ joinedAt: "desc" }, { id: "asc" }],
    take: activityLobbySectionLimit * 2,
    select: lobbyParticipationSelect,
  });

  return Array.from(
    new Map(
      friendJoinedParticipations.map((item) => {
        const activity = getActivityCardViewModel(item.activity);
        return [activity.id, activity] as const;
      }),
    ).values(),
  ).slice(0, activityLobbySectionLimit);
}

export async function getActivityLobbyInitial(
  viewerProfileId: string,
): Promise<ActivityLobbyViewModel> {
  const context = await getLobbyQueryContext(viewerProfileId);
  const [
    activeFeedActivities,
    archivedFeedActivities,
    openActivities,
    createdActivities,
    joinedActivities,
    swipeActivities,
  ] = await Promise.all([
    prisma.activity.findMany({
      where: {
        AND: [context.accessibleActiveWhere, strictTeamCardWhere],
      },
      orderBy: [{ startAt: "asc" }, { id: "asc" }],
      take: activityLobbyFeedLimit,
      select: activityCardSelect,
    }),
    prisma.activity.findMany({
      where: {
        AND: [context.accessibleWhere, strictTeamCardWhere, context.archivedWhere],
      },
      orderBy: [{ startAt: "desc" }, { id: "asc" }],
      take: activityLobbyArchivedFeedLimit,
      select: activityCardSelect,
    }),
    getOpenLobbySection(viewerProfileId, context),
    getCreatedLobbySection(viewerProfileId, context),
    getJoinedLobbySection(viewerProfileId, context),
    getLobbySwipePublicEventActivities(viewerProfileId),
  ]);

  const feedActivityCards = [
    ...activeFeedActivities,
    ...archivedFeedActivities,
  ].map(getActivityCardViewModel);
  const priorityFeedActivities = buildLobbyPriorityFeed({
    feedActivities: feedActivityCards,
    openActivities,
    createdActivities,
    joinedActivities,
    favoriteActivities: [],
    friendHostedActivities: [],
    friendJoinedActivities: [],
  });
  const [
    decoratedAllActivities,
    decoratedOpenActivities,
    decoratedCreatedActivities,
    decoratedJoinedActivities,
  ] = await decorateLobbyActivitySections(
    [
      priorityFeedActivities,
      openActivities,
      createdActivities,
      joinedActivities,
    ],
    viewerProfileId,
    context.friendIds,
  );
  const shouldOfferStarterActivities =
    (createdActivities.length === 0 && joinedActivities.length === 0) ||
    priorityFeedActivities.length < 3;
  const starterActivityCards = shouldOfferStarterActivities
    ? decoratedOpenActivities.slice(0, activityLobbyStarterLimit)
    : [];

  return {
    allActivities: decoratedAllActivities,
    openActivities: decoratedOpenActivities,
    createdActivities: decoratedCreatedActivities,
    joinedActivities: decoratedJoinedActivities,
    favoriteActivities: [],
    friendHostedActivities: [],
    friendJoinedActivities: [],
    starterActivities: starterActivityCards,
    swipeActivities,
  };
}

export async function getActivityLobbySection(
  viewerProfileId: string,
  sectionId: ActivityLobbySectionId,
) {
  const context = await getLobbyQueryContext(viewerProfileId);
  const activities =
    sectionId === "open"
      ? await getOpenLobbySection(viewerProfileId, context)
      : sectionId === "created"
        ? await getCreatedLobbySection(viewerProfileId, context)
        : sectionId === "joined"
          ? await getJoinedLobbySection(viewerProfileId, context)
          : sectionId === "favorites"
            ? await getFavoriteLobbySection(viewerProfileId, context)
            : sectionId === "friendHosted"
              ? await getFriendHostedLobbySection(context)
              : await getFriendJoinedLobbySection(context);

  return decorateLobbyActivities(activities, viewerProfileId, context.friendIds);
}

export async function getActivityLobby(
  viewerProfileId: string,
): Promise<ActivityLobbyViewModel> {
  const [initialLobby, favoriteActivities, friendHostedActivities, friendJoinedActivities] =
    await Promise.all([
      getActivityLobbyInitial(viewerProfileId),
      getActivityLobbySection(viewerProfileId, "favorites"),
      getActivityLobbySection(viewerProfileId, "friendHosted"),
      getActivityLobbySection(viewerProfileId, "friendJoined"),
    ]);

  const priorityFeedActivities = buildLobbyPriorityFeed({
    feedActivities: initialLobby.allActivities,
    openActivities: initialLobby.openActivities,
    createdActivities: initialLobby.createdActivities,
    joinedActivities: initialLobby.joinedActivities,
    favoriteActivities,
    friendHostedActivities,
    friendJoinedActivities,
  });

  return {
    allActivities: priorityFeedActivities,
    openActivities: initialLobby.openActivities,
    createdActivities: initialLobby.createdActivities,
    joinedActivities: initialLobby.joinedActivities,
    favoriteActivities,
    friendHostedActivities,
    friendJoinedActivities,
    starterActivities: initialLobby.starterActivities,
    swipeActivities: initialLobby.swipeActivities,
  };
}

export async function getActivityLobbyPreview() {
  const now = new Date();
  const publicTeamWhere: Prisma.ActivityWhereInput = {
    AND: [
      getVisibleActivityWhere({
        includeEnded: true,
        includePast: true,
        visibility: null,
        now,
      }),
      { visibility: "PUBLIC" },
      strictTeamCardWhere,
    ],
  };
  const publicActiveTeamWhere: Prisma.ActivityWhereInput = {
    AND: [
      getVisibleActivityWhere({
        includeEnded: false,
        includePast: false,
        visibility: null,
        now,
      }),
      { visibility: "PUBLIC" },
      strictTeamCardWhere,
    ],
  };
  const [activeActivities, archivedActivities] = await Promise.all([
    prisma.activity.findMany({
      where: publicActiveTeamWhere,
      orderBy: [{ startAt: "asc" }, { id: "asc" }],
      take: activityLobbyPreviewLimit,
      select: activityCardSelect,
    }),
    prisma.activity.findMany({
      where: {
        AND: [publicTeamWhere, getArchivedLobbyActivityWhere(now)],
      },
      orderBy: [{ startAt: "desc" }, { id: "asc" }],
      take: activityLobbyPreviewLimit,
      select: activityCardSelect,
    }),
  ]);
  const activities = [...activeActivities, ...archivedActivities].map(
    getActivityCardViewModel,
  );

  return Array.from(
    new Map(
      activities
        .sort(compareLobbyActivityTime)
        .map((activity) => [activity.id, activity]),
    ).values(),
  ).slice(0, activityLobbyPreviewLimit);
}
