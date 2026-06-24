import { prisma } from "@/lib/prisma";
import { brand } from "@/lib/brand";
import { createActionPerformanceTracker } from "@/lib/performance";
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
export const globalSearchMainResultPageSize = 10;
const merchantResultLimit = 5;
const userResultLimit = 12;
const searchResultProbeSize = 1;

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
  activityCount: number;
  items: ActivityCardViewModel[];
  mode: GlobalSearchMainActivityResultMode;
  publicEventCount: number;
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

function splitProbeResults<T>(items: T[], limit: number) {
  const hasMore = items.length > limit;

  return {
    hasMore,
    items: hasMore ? items.slice(0, limit) : items,
    totalCount: hasMore ? limit + searchResultProbeSize : items.length,
  };
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
  const perf = createActionPerformanceTracker({
    action: "search.summary",
    metadata: {
      includeEnded,
      termCount: terms.length,
    },
  });

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
  const [usersWithProbe, merchantsWithProbe] = await Promise.all([
    perf.measure("user.list", () =>
      prisma.userProfile.findMany({
        where: userSearchWhere,
        orderBy: [{ nickname: "asc" }, { id: "asc" }],
        take: userResultLimit + searchResultProbeSize,
        select: {
          id: true,
          nickname: true,
          friendCode: true,
          avatarUrl: true,
        },
      }),
    ),
    perf.measure("merchant.list", () =>
      prisma.merchant.findMany({
        where: merchantSearchWhere,
        orderBy: [{ name: "asc" }, { id: "asc" }],
        take: merchantResultLimit + searchResultProbeSize,
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
    ),
  ]);
  const {
    items: users,
    totalCount: userCount,
    hasMore: hasMoreUsers,
  } = splitProbeResults(usersWithProbe, userResultLimit);
  const {
    items: merchants,
    totalCount: merchantCount,
    hasMore: hasMoreMerchants,
  } = splitProbeResults(merchantsWithProbe, merchantResultLimit);
  const userRelationshipStatuses = await perf.measure(
    "user.relationships",
    () =>
      getSearchUserRelationshipStatuses(
        currentUserProfileId,
        users.map((user) => user.id),
      ),
  );
  perf.finish({
    hasMoreMerchants,
    hasMoreUsers,
    merchantCount,
    userCount,
  });

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
    activities: [],
    activityCount: 0,
    publicEvents: [],
    publicEventCount: 0,
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
    hiddenEndedActivityCount: 0,
    hiddenEndedPublicEventCount: 0,
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
  const perf = createActionPerformanceTracker({
    action: "search.mainActivityResults",
    metadata: {
      includeEnded,
      limit,
      mode,
      offset,
      termCount: terms.length,
    },
  });

  if (terms.length === 0) {
    return {
      activityCount: 0,
      items: [],
      mode,
      publicEventCount: 0,
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
  const fetchLimit = offset + limit + searchResultProbeSize;
  const [activities, publicEvents] = await Promise.all([
    perf.measure("activity.list", () =>
      getSearchActivityResults(
        activeActivityResultWhere,
        includeEnded ? endedActivityResultWhere : null,
        fetchLimit,
      ),
    ),
    perf.measure("publicEvent.list", () =>
      prisma.publicEvent.findMany({
        where: publicEventSearchWhere,
        orderBy: [{ startAt: "asc" }, { id: "asc" }],
        take: fetchLimit,
        select: publicEventSelect,
      }),
    ),
  ]);
  const [activityResultsWithFavoriteState, publicEventResultsWithFavoriteState] =
    await perf.measure("favoriteState", () =>
      Promise.all([
        attachActivityFavoriteStates(
          activities.map(getActivityCardViewModel),
          currentUserProfileId,
        ),
        attachPublicEventFavoriteStates(
          publicEvents.map(getPublicEventCardViewModel),
          currentUserProfileId,
        ),
      ]),
    );
  const mixedResults = await perf.measure("merge.sort", async () => {
    const publicEventIdsAlreadyShownByActivity = new Set(
      activityResultsWithFavoriteState
        .map((activity) => activity.publicEventId)
        .filter(Boolean),
    );

    return [
      ...activityResultsWithFavoriteState,
      ...publicEventResultsWithFavoriteState
        .filter((event) => !publicEventIdsAlreadyShownByActivity.has(event.id))
        .map(mapPublicEventToSearchActivityCard),
    ].sort(
      mode === "related"
        ? sortRelatedSearchActivityCards.bind(null, terms)
        : sortSearchActivityCards,
    );
  });
  const items = mixedResults.slice(offset, offset + limit);
  const hasMore = mixedResults.length > offset + limit;
  const totalCount = hasMore
    ? offset + limit + searchResultProbeSize
    : mixedResults.length;
  const countedResults = mixedResults.slice(0, totalCount);
  const countedPublicEventCount = countedResults.filter(
    (activity) => activity.type === "PUBLIC_EVENT",
  ).length;
  const countedActivityCount = countedResults.length - countedPublicEventCount;
  const nextOffset = offset + items.length;

  perf.finish({
    activityCount: countedActivityCount,
    hasMore,
    itemCount: items.length,
    publicEventCount: countedPublicEventCount,
    totalCount,
  });

  return {
    activityCount: countedActivityCount,
    items,
    mode,
    publicEventCount: countedPublicEventCount,
    totalCount,
    hasMore: items.length > 0 && hasMore,
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

  return user.friendCode ? `NF ${user.friendCode}` : brand.name;
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
