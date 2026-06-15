import { prisma } from "@/lib/prisma";
import { attachActivityFavoriteStates, attachPublicEventFavoriteStates } from "@/features/favorites/queries/getViewerActivityFavorite";
import {
  activityCardSelect,
  getActivityCoverTone,
  getActivityCardViewModel,
  getActivityTimeStateWhere,
  getVisibleActivityWhere,
} from "@/features/activities/queries/getActivities";
import type { ActivityCardViewModel } from "@/features/activities/types";
import {
  getPublicEventCardViewModel,
  getUpcomingPublicEventWhere,
  publicEventSelect,
} from "@/features/public-events/queries/getPublicEvents";
import type { PublicEventCardViewModel } from "@/features/public-events/types";
import { normalizeFriendRequestSearchTerm } from "@/features/friends/queries/findFriendRequestTarget";
import {
  getFriendshipPair,
  getFriendshipPairKey,
} from "@/features/friends/utils/friendship";
import {
  getGlobalSearchTerms,
  normalizeGlobalSearchQuery,
} from "../utils/searchQuery";
import type { Prisma } from "@prisma/client";

const activityResultLimit = 6;
const publicEventResultLimit = 6;
export const globalSearchMainResultPageSize = 18;
const merchantResultLimit = 5;
const userResultLimit = 12;

export type GlobalSearchMainActivityResultMode = "strict" | "related";

export type GlobalSearchUserRelationshipStatus =
  | "AVAILABLE"
  | "SELF"
  | "FRIENDS"
  | "PENDING";

export type GlobalSearchMerchantViewModel = {
  id: string;
  slug: string;
  name: string;
  description: string;
  logoUrl: string | null;
  city: string;
  address: string | null;
  activityCount: number;
};

export type GlobalSearchUserViewModel = {
  id: string;
  nickname: string;
  friendCode: string | null;
  avatarUrl: string | null;
  relationshipStatus: GlobalSearchUserRelationshipStatus;
};

export type GlobalSearchResults = {
  query: string;
  users: GlobalSearchUserViewModel[];
  userCount: number;
  activities: ActivityCardViewModel[];
  activityCount: number;
  publicEvents: PublicEventCardViewModel[];
  publicEventCount: number;
  merchants: GlobalSearchMerchantViewModel[];
  merchantCount: number;
  hiddenEndedActivityCount: number;
  hiddenEndedPublicEventCount: number;
};

export type GlobalSearchMainActivityResults = {
  items: ActivityCardViewModel[];
  mode: GlobalSearchMainActivityResultMode;
  totalCount: number;
  hasMore: boolean;
  nextOffset: number;
};

function getActivityTermSearchWhere(term: string): Prisma.ActivityWhereInput {
  return {
    OR: [
      { title: { contains: term, mode: "insensitive" } },
      { description: { contains: term, mode: "insensitive" } },
      { city: { contains: term, mode: "insensitive" } },
      { address: { contains: term, mode: "insensitive" } },
    ],
  };
}

function getPublicEventTermSearchWhere(
  term: string,
): Prisma.PublicEventWhereInput {
  return {
    OR: [
      { title: { contains: term, mode: "insensitive" } },
      { description: { contains: term, mode: "insensitive" } },
      { city: { contains: term, mode: "insensitive" } },
      { address: { contains: term, mode: "insensitive" } },
    ],
  };
}

function getActivitySearchWhere(
  terms: string[],
  mode: GlobalSearchMainActivityResultMode,
): Prisma.ActivityWhereInput {
  const strictWhere = {
    AND: terms.map(getActivityTermSearchWhere),
  } satisfies Prisma.ActivityWhereInput;

  if (mode === "strict") {
    return strictWhere;
  }

  if (terms.length <= 1) {
    return {
      id: "__no_related_activity_results__",
    };
  }

  return {
    AND: [
      {
        OR: terms.map(getActivityTermSearchWhere),
      },
      {
        NOT: strictWhere,
      },
    ],
  };
}

function getPublicEventSearchWhere(
  terms: string[],
  mode: GlobalSearchMainActivityResultMode,
): Prisma.PublicEventWhereInput {
  const strictWhere = {
    AND: terms.map(getPublicEventTermSearchWhere),
  } satisfies Prisma.PublicEventWhereInput;

  if (mode === "strict") {
    return strictWhere;
  }

  if (terms.length <= 1) {
    return {
      id: "__no_related_public_event_results__",
    };
  }

  return {
    AND: [
      {
        OR: terms.map(getPublicEventTermSearchWhere),
      },
      {
        NOT: strictWhere,
      },
    ],
  };
}

function getSearchPublicEventBaseWhere(
  includeEnded: boolean,
  now: Date,
): Prisma.PublicEventWhereInput {
  return includeEnded
    ? {
        status: "SCHEDULED",
        visibility: "PUBLIC",
      }
    : getUpcomingPublicEventWhere(now);
}

function getEndedPublicEventWhere(now: Date): Prisma.PublicEventWhereInput {
  return {
    status: "SCHEDULED",
    visibility: "PUBLIC",
    OR: [
      {
        endAt: {
          lte: now,
        },
      },
      {
        AND: [
          {
            endAt: null,
          },
          {
            startAt: {
              lte: now,
            },
          },
        ],
      },
    ],
  };
}

function mapPublicEventToSearchActivityCard(
  event: PublicEventCardViewModel,
): ActivityCardViewModel {
  return {
    id: event.id,
    publicEventId: event.id,
    title: event.title,
    description: event.description,
    type: "PUBLIC_EVENT",
    category: event.category,
    city: event.city,
    address: event.address,
    latitude: event.latitude,
    longitude: event.longitude,
    startAt: event.startAt,
    endAt: event.endAt,
    capacity: 0,
    coverImageUrl: event.coverImageUrl,
    favoriteCount: event.favoriteCount,
    participantCount: event.teamCount,
    priceText: event.priceText ?? "",
    status: "RECRUITING",
    visibility: "PUBLIC",
    coverTone: getActivityCoverTone(event.id),
    isActivityInfo: true,
    officialUrl: event.officialUrl,
    merchant: null,
    friendSignal: null,
    isFavorited: event.isFavorited,
  };
}

function sortSearchActivityCards(
  left: ActivityCardViewModel,
  right: ActivityCardViewModel,
) {
  const leftTime = new Date(left.startAt).getTime();
  const rightTime = new Date(right.startAt).getTime();
  const leftEnded = isSearchActivityEnded(left);
  const rightEnded = isSearchActivityEnded(right);

  if (leftEnded !== rightEnded) {
    return leftEnded ? 1 : -1;
  }

  return (
    (leftEnded ? rightTime - leftTime : leftTime - rightTime) ||
    left.id.localeCompare(right.id)
  );
}

function isSearchActivityEnded(activity: ActivityCardViewModel) {
  if (activity.status === "ENDED" || activity.status === "CANCELLED") {
    return true;
  }

  const endBoundary = new Date(activity.endAt ?? activity.startAt).getTime();

  return Number.isFinite(endBoundary) && endBoundary <= Date.now();
}

function getSearchActivityMatchScore(
  activity: ActivityCardViewModel,
  terms: string[],
) {
  const weightedFields = [
    { value: activity.title, weight: 5 },
    { value: activity.city, weight: 3 },
    { value: activity.address, weight: 2 },
    { value: activity.category, weight: 2 },
    { value: activity.description, weight: 1 },
  ];

  return terms.reduce((score, term) => {
    const normalizedTerm = term.toLowerCase();

    return (
      score +
      weightedFields.reduce((fieldScore, field) => {
        const value = String(field.value ?? "").toLowerCase();

        return value.includes(normalizedTerm)
          ? fieldScore + field.weight
          : fieldScore;
      }, 0)
    );
  }, 0);
}

function sortRelatedSearchActivityCards(
  terms: string[],
  left: ActivityCardViewModel,
  right: ActivityCardViewModel,
) {
  return (
    getSearchActivityMatchScore(right, terms) -
      getSearchActivityMatchScore(left, terms) ||
    sortSearchActivityCards(left, right)
  );
}

export async function getGlobalSearchResults(
  rawQuery: string,
  currentUserProfileId?: string | null,
  options: {
    includeEnded?: boolean;
  } = {},
): Promise<GlobalSearchResults> {
  const query = normalizeGlobalSearchQuery(rawQuery);
  const terms = getGlobalSearchTerms(query);
  const includeEnded = options.includeEnded ?? false;

  if (terms.length === 0) {
    return {
      query,
      users: [],
      userCount: 0,
      activities: [],
      activityCount: 0,
      publicEvents: [],
      publicEventCount: 0,
      merchants: [],
      merchantCount: 0,
      hiddenEndedActivityCount: 0,
      hiddenEndedPublicEventCount: 0,
    };
  }

  const now = new Date();
  const activeActivityWhere = getVisibleActivityWhere({ now });
  const searchableActivityWhere = includeEnded
    ? getVisibleActivityWhere({
        includeEnded: true,
        includePast: true,
        now,
      })
    : activeActivityWhere;
  const endedActivityWhere = getActivityTimeStateWhere("ENDED", now);
  const activitySearchWhere = getActivitySearchWhere(terms, "strict");
  const activityWhere = {
    AND: [searchableActivityWhere, activitySearchWhere],
  };
  const activeActivityResultWhere = {
    AND: [activeActivityWhere, activitySearchWhere],
  };
  const endedActivityResultWhere = {
    AND: [searchableActivityWhere, activitySearchWhere, endedActivityWhere],
  };
  const publicEventSearchWhere = {
    AND: [
      getSearchPublicEventBaseWhere(includeEnded, now),
      getPublicEventSearchWhere(terms, "strict"),
    ],
  };
  const hiddenEndedActivityWhere = {
    AND: [
      getVisibleActivityWhere({ includeEnded: true, includePast: true, now }),
      activitySearchWhere,
      endedActivityWhere,
    ],
  };
  const hiddenEndedPublicEventWhere = {
    AND: [getEndedPublicEventWhere(now), getPublicEventSearchWhere(terms, "strict")],
  };
  const merchantSearchWhere = {
    isActive: true,
    AND: terms.map((term) => ({
      OR: [
        { name: { contains: term, mode: "insensitive" as const } },
        { description: { contains: term, mode: "insensitive" as const } },
        { city: { contains: term, mode: "insensitive" as const } },
        { address: { contains: term, mode: "insensitive" as const } },
      ],
    })),
  };
  const { friendCode } = normalizeFriendRequestSearchTerm(query);
  const userSearchWhere: Prisma.UserProfileWhereInput = friendCode
    ? {
        status: "ACTIVE",
        friendCode,
      }
    : {
        status: "ACTIVE",
        AND: terms.map((term) => ({
          OR: [
            {
              nickname: {
                contains: term,
                mode: "insensitive",
              },
            },
            {
              friendCode: {
                equals: term,
              },
            },
          ],
        })),
      };
  const [
    userCount,
    users,
    activityCount,
    activities,
    publicEventCount,
    publicEvents,
    merchantCount,
    merchants,
    hiddenEndedActivityCount,
    hiddenEndedPublicEventCount,
  ] = await Promise.all([
    prisma.userProfile.count({
      where: userSearchWhere,
    }),
    prisma.userProfile.findMany({
      where: userSearchWhere,
      orderBy: [{ nickname: "asc" }, { id: "asc" }],
      take: userResultLimit,
      select: {
        id: true,
        nickname: true,
        friendCode: true,
        avatarUrl: true,
      },
    }),
    prisma.activity.count({
      where: activityWhere,
    }),
    getSearchActivityResults(
      activeActivityResultWhere,
      includeEnded ? endedActivityResultWhere : null,
    ),
    prisma.publicEvent.count({
      where: publicEventSearchWhere,
    }),
    prisma.publicEvent.findMany({
      where: publicEventSearchWhere,
      orderBy: [{ startAt: "asc" }, { id: "asc" }],
      take: publicEventResultLimit,
      select: publicEventSelect,
    }),
    prisma.merchant.count({
      where: merchantSearchWhere,
    }),
    prisma.merchant.findMany({
      where: merchantSearchWhere,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: merchantResultLimit,
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        logoUrl: true,
        city: true,
        address: true,
        _count: {
          select: {
            activities: {
              where: activeActivityWhere,
            },
          },
        },
      },
    }),
    includeEnded
      ? Promise.resolve(0)
      : prisma.activity.count({
          where: hiddenEndedActivityWhere,
        }),
    includeEnded
      ? Promise.resolve(0)
      : prisma.publicEvent.count({
          where: hiddenEndedPublicEventWhere,
        }),
  ]);
  const userRelationshipStatuses = await getSearchUserRelationshipStatuses(
    currentUserProfileId,
    users.map((user) => user.id),
  );
  const [activityResultsWithFavoriteState, publicEventResultsWithFavoriteState] =
    await Promise.all([
      attachActivityFavoriteStates(
        activities.map(getActivityCardViewModel),
        currentUserProfileId,
      ),
      attachPublicEventFavoriteStates(
        publicEvents.map(getPublicEventCardViewModel),
        currentUserProfileId,
      ),
    ]);

  return {
    query,
    users: users.map((user) => ({
      id: user.id,
      nickname: getSearchUserDisplayName(user),
      friendCode: user.friendCode,
      avatarUrl: user.avatarUrl,
      relationshipStatus:
        userRelationshipStatuses.get(user.id) ?? "AVAILABLE",
    })),
    userCount,
    activities: activityResultsWithFavoriteState,
    activityCount,
    publicEvents: publicEventResultsWithFavoriteState,
    publicEventCount,
    merchants: merchants.map((merchant) => ({
      id: merchant.id,
      slug: merchant.slug,
      name: merchant.name,
      description: merchant.description,
      logoUrl: merchant.logoUrl,
      city: merchant.city,
      address: merchant.address,
      activityCount: merchant._count.activities,
    })),
    merchantCount,
    hiddenEndedActivityCount,
    hiddenEndedPublicEventCount,
  };
}

export async function getGlobalSearchMainActivityResults(
  rawQuery: string,
  currentUserProfileId?: string | null,
  options: {
    includeEnded?: boolean;
    limit?: number;
    mode?: GlobalSearchMainActivityResultMode;
    offset?: number;
  } = {},
): Promise<GlobalSearchMainActivityResults> {
  const query = normalizeGlobalSearchQuery(rawQuery);
  const terms = getGlobalSearchTerms(query);
  const includeEnded = options.includeEnded ?? false;
  const mode = options.mode ?? "strict";
  const limit = Math.min(
    Math.max(options.limit ?? globalSearchMainResultPageSize, 1),
    36,
  );
  const offset = Math.max(options.offset ?? 0, 0);

  if (terms.length === 0) {
    return {
      items: [],
      mode,
      totalCount: 0,
      hasMore: false,
      nextOffset: offset,
    };
  }

  const now = new Date();
  const activeActivityWhere = getVisibleActivityWhere({ now });
  const searchableActivityWhere = includeEnded
    ? getVisibleActivityWhere({
        includeEnded: true,
        includePast: true,
        now,
      })
    : activeActivityWhere;
  const endedActivityWhere = getActivityTimeStateWhere("ENDED", now);
  const activitySearchWhere = getActivitySearchWhere(terms, mode);
  const activityWhere = {
    AND: [searchableActivityWhere, activitySearchWhere],
  };
  const activeActivityResultWhere = {
    AND: [activeActivityWhere, activitySearchWhere],
  };
  const endedActivityResultWhere = {
    AND: [searchableActivityWhere, activitySearchWhere, endedActivityWhere],
  };
  const publicEventSearchWhere = {
    AND: [
      getSearchPublicEventBaseWhere(includeEnded, now),
      getPublicEventSearchWhere(terms, mode),
    ],
  };
  const fetchLimit = offset + limit;
  const [
    activityCount,
    activities,
    publicEventCount,
    publicEvents,
  ] = await Promise.all([
    prisma.activity.count({
      where: activityWhere,
    }),
    getSearchActivityResults(
      activeActivityResultWhere,
      includeEnded ? endedActivityResultWhere : null,
      fetchLimit,
    ),
    prisma.publicEvent.count({
      where: publicEventSearchWhere,
    }),
    prisma.publicEvent.findMany({
      where: publicEventSearchWhere,
      orderBy: [{ startAt: "asc" }, { id: "asc" }],
      take: fetchLimit,
      select: publicEventSelect,
    }),
  ]);
  const [activityResultsWithFavoriteState, publicEventResultsWithFavoriteState] =
    await Promise.all([
      attachActivityFavoriteStates(
        activities.map(getActivityCardViewModel),
        currentUserProfileId,
      ),
      attachPublicEventFavoriteStates(
        publicEvents.map(getPublicEventCardViewModel),
        currentUserProfileId,
      ),
    ]);
  const publicEventIdsAlreadyShownByActivity = new Set(
    activityResultsWithFavoriteState
      .map((activity) => activity.publicEventId)
      .filter(Boolean),
  );
  const mixedResults = [
    ...activityResultsWithFavoriteState,
    ...publicEventResultsWithFavoriteState
      .filter((event) => !publicEventIdsAlreadyShownByActivity.has(event.id))
      .map(mapPublicEventToSearchActivityCard),
  ].sort(
    mode === "related"
      ? sortRelatedSearchActivityCards.bind(null, terms)
      : sortSearchActivityCards,
  );
  const items = mixedResults.slice(offset, offset + limit);
  const totalCount = activityCount + publicEventCount;
  const nextOffset = offset + items.length;

  return {
    items,
    mode,
    totalCount,
    hasMore: items.length > 0 && nextOffset < totalCount,
    nextOffset,
  };
}

async function getSearchUserRelationshipStatuses(
  currentUserProfileId: string | null | undefined,
  userIds: string[],
) {
  const statuses = new Map<string, GlobalSearchUserRelationshipStatus>();

  userIds.forEach((userId) => {
    statuses.set(
      userId,
      currentUserProfileId && userId === currentUserProfileId
        ? "SELF"
        : "AVAILABLE",
    );
  });

  if (!currentUserProfileId) {
    return statuses;
  }

  const peerIds = userIds.filter((userId) => userId !== currentUserProfileId);

  if (peerIds.length === 0) {
    return statuses;
  }

  const friendshipPairs = peerIds.map((peerId) =>
    getFriendshipPair(currentUserProfileId, peerId),
  );
  const pendingPairKeys = peerIds.map((peerId) =>
    getFriendshipPairKey(currentUserProfileId, peerId),
  );
  const [friendships, pendingRequests] = await Promise.all([
    prisma.friendship.findMany({
      where: {
        OR: friendshipPairs,
      },
      select: {
        userAId: true,
        userBId: true,
      },
    }),
    prisma.friendRequest.findMany({
      where: {
        status: "PENDING",
        OR: [
          {
            pendingPairKey: {
              in: pendingPairKeys,
            },
          },
          {
            requesterId: currentUserProfileId,
            receiverId: {
              in: peerIds,
            },
          },
          {
            requesterId: {
              in: peerIds,
            },
            receiverId: currentUserProfileId,
          },
        ],
      },
      select: {
        requesterId: true,
        receiverId: true,
      },
    }),
  ]);

  friendships.forEach((friendship) => {
    const peerId =
      friendship.userAId === currentUserProfileId
        ? friendship.userBId
        : friendship.userAId;

    statuses.set(peerId, "FRIENDS");
  });

  pendingRequests.forEach((request) => {
    const peerId =
      request.requesterId === currentUserProfileId
        ? request.receiverId
        : request.requesterId;

    if (statuses.get(peerId) !== "FRIENDS") {
      statuses.set(peerId, "PENDING");
    }
  });

  return statuses;
}

function getSearchUserDisplayName(user: {
  nickname: string;
  friendCode: string | null;
}) {
  const nickname = user.nickname.trim();

  if (nickname) {
    return nickname;
  }

  return user.friendCode ? `NF ${user.friendCode}` : "Next Fun";
}

async function getSearchActivityResults(
  activeActivityWhere: Prisma.ActivityWhereInput,
  endedActivityWhere: Prisma.ActivityWhereInput | null,
  limit = activityResultLimit,
) {
  const activeActivities = await prisma.activity.findMany({
    where: activeActivityWhere,
    orderBy: [{ startAt: "asc" }, { id: "asc" }],
    take: limit,
    select: activityCardSelect,
  });

  if (activeActivities.length >= limit || !endedActivityWhere) {
    return activeActivities;
  }

  const endedActivities = await prisma.activity.findMany({
    where: endedActivityWhere,
    orderBy: [{ startAt: "desc" }, { id: "asc" }],
    take: limit - activeActivities.length,
    select: activityCardSelect,
  });

  return [...activeActivities, ...endedActivities];
}
