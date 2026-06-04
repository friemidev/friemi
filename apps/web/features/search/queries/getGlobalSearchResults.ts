import { prisma } from "@/lib/prisma";
import { attachActivityFavoriteStates, attachPublicEventFavoriteStates } from "@/features/favorites/queries/getViewerActivityFavorite";
import {
  activityCardSelect,
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
const merchantResultLimit = 5;
const userResultLimit = 6;

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
};

export async function getGlobalSearchResults(
  rawQuery: string,
  currentUserProfileId?: string | null,
): Promise<GlobalSearchResults> {
  const query = normalizeGlobalSearchQuery(rawQuery);
  const terms = getGlobalSearchTerms(query);

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
    };
  }

  const now = new Date();
  const searchableActivityWhere = getVisibleActivityWhere({
    includeEnded: true,
    includePast: true,
    now,
  });
  const activeActivityWhere = getVisibleActivityWhere({ now });
  const endedActivityWhere = getActivityTimeStateWhere("ENDED", now);
  const activitySearchWhere = {
    AND: terms.map((term) => ({
      OR: [
        { title: { contains: term, mode: "insensitive" as const } },
        { description: { contains: term, mode: "insensitive" as const } },
        { city: { contains: term, mode: "insensitive" as const } },
        { address: { contains: term, mode: "insensitive" as const } },
      ],
    })),
  };
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
      getUpcomingPublicEventWhere(now),
      {
        AND: terms.map((term) => ({
          OR: [
            { title: { contains: term, mode: "insensitive" as const } },
            { description: { contains: term, mode: "insensitive" as const } },
            { city: { contains: term, mode: "insensitive" as const } },
            { address: { contains: term, mode: "insensitive" as const } },
          ],
        })),
      },
    ],
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
      endedActivityResultWhere,
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
  endedActivityWhere: Prisma.ActivityWhereInput,
) {
  const activeActivities = await prisma.activity.findMany({
    where: activeActivityWhere,
    orderBy: [{ startAt: "asc" }, { id: "asc" }],
    take: activityResultLimit,
    select: activityCardSelect,
  });

  if (activeActivities.length >= activityResultLimit) {
    return activeActivities;
  }

  const endedActivities = await prisma.activity.findMany({
    where: endedActivityWhere,
    orderBy: [{ startAt: "desc" }, { id: "asc" }],
    take: activityResultLimit - activeActivities.length,
    select: activityCardSelect,
  });

  return [...activeActivities, ...endedActivities];
}
