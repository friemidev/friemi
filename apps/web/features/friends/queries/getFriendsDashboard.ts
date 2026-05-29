import { prisma } from "@/lib/prisma";
import type { ActivityStatus, ParticipantStatus } from "@prisma/client";

export const friendListLimit = 50;
export const friendRequestListLimit = 20;
const friendActivityWindowDays = 30;
const dayInMs = 24 * 60 * 60 * 1000;
const effectiveParticipantStatuses: ParticipantStatus[] = [
  "JOINED",
  "APPROVED",
];
const visibleFriendActivityStatuses: ActivityStatus[] = [
  "OPEN",
  "FULL",
  "RECRUITING",
  "CONFIRMED",
];

export type FriendUserViewModel = {
  id: string;
  nickname: string;
  email: string | null;
  bio: string | null;
  avatarUrl: string | null;
};

export type FriendActivitySummaryViewModel = {
  id: string;
  title: string;
  startAt: string;
};

export type FriendRequestViewModel = {
  id: string;
  message: string | null;
  createdAt: string;
  user: FriendUserViewModel;
};

export type FriendViewModel = {
  id: string;
  createdAt: string;
  user: FriendUserViewModel;
  recentActivities: FriendActivitySummaryViewModel[];
};

export type FriendsDashboardViewModel = {
  friends: FriendViewModel[];
  incomingRequests: FriendRequestViewModel[];
  outgoingRequests: FriendRequestViewModel[];
};

function mapUser(user: FriendUserViewModel): FriendUserViewModel {
  return {
    id: user.id,
    nickname: user.nickname,
    email: user.email,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
  };
}

function sortFriendsForDashboard(friends: FriendViewModel[]) {
  return [...friends].sort((friendA, friendB) => {
    const firstActivityA = friendA.recentActivities[0]?.startAt;
    const firstActivityB = friendB.recentActivities[0]?.startAt;

    if (firstActivityA && firstActivityB) {
      return (
        new Date(firstActivityA).getTime() -
          new Date(firstActivityB).getTime() ||
        friendA.id.localeCompare(friendB.id)
      );
    }

    if (firstActivityA) {
      return -1;
    }

    if (firstActivityB) {
      return 1;
    }

    return (
      new Date(friendB.createdAt).getTime() -
        new Date(friendA.createdAt).getTime() ||
      friendA.id.localeCompare(friendB.id)
    );
  });
}

async function getFriendActivitySummaries(friendIds: string[]) {
  if (friendIds.length === 0) {
    return new Map<string, FriendActivitySummaryViewModel[]>();
  }

  const now = new Date();
  const windowEnd = new Date(
    now.getTime() + friendActivityWindowDays * dayInMs,
  );
  const participations = await prisma.activityParticipant.findMany({
    where: {
      userProfileId: {
        in: friendIds,
      },
      status: {
        in: effectiveParticipantStatuses,
      },
      activity: {
        startAt: {
          gte: now,
          lte: windowEnd,
        },
        status: {
          in: visibleFriendActivityStatuses,
        },
        visibility: "PUBLIC",
        organizer: {
          status: "ACTIVE",
        },
      },
    },
    orderBy: [{ activity: { startAt: "asc" } }, { id: "asc" }],
    select: {
      userProfileId: true,
      activity: {
        select: {
          id: true,
          title: true,
          startAt: true,
        },
      },
    },
  });
  const activitiesByFriendId = new Map<
    string,
    FriendActivitySummaryViewModel[]
  >();

  for (const participation of participations) {
    const activities =
      activitiesByFriendId.get(participation.userProfileId) ?? [];

    activities.push({
      id: participation.activity.id,
      title: participation.activity.title,
      startAt: participation.activity.startAt.toISOString(),
    });
    activitiesByFriendId.set(participation.userProfileId, activities);
  }

  return activitiesByFriendId;
}

export async function getFriendsDashboard(
  viewerProfileId: string,
): Promise<FriendsDashboardViewModel> {
  const [friendships, incomingRequests, outgoingRequests] = await Promise.all([
    prisma.friendship.findMany({
      where: {
        OR: [{ userAId: viewerProfileId }, { userBId: viewerProfileId }],
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: friendListLimit,
      select: {
        id: true,
        createdAt: true,
        userAId: true,
        userA: {
          select: {
            id: true,
            nickname: true,
            email: true,
            bio: true,
            avatarUrl: true,
          },
        },
        userB: {
          select: {
            id: true,
            nickname: true,
            email: true,
            bio: true,
            avatarUrl: true,
          },
        },
      },
    }),
    prisma.friendRequest.findMany({
      where: {
        receiverId: viewerProfileId,
        status: "PENDING",
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: friendRequestListLimit,
      select: {
        id: true,
        message: true,
        createdAt: true,
        requester: {
          select: {
            id: true,
            nickname: true,
            email: true,
            bio: true,
            avatarUrl: true,
          },
        },
      },
    }),
    prisma.friendRequest.findMany({
      where: {
        requesterId: viewerProfileId,
        status: "PENDING",
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: friendRequestListLimit,
      select: {
        id: true,
        message: true,
        createdAt: true,
        receiver: {
          select: {
            id: true,
            nickname: true,
            email: true,
            bio: true,
            avatarUrl: true,
          },
        },
      },
    }),
  ]);

  const mappedFriends = friendships.map((friendship) => ({
    id: friendship.id,
    createdAt: friendship.createdAt.toISOString(),
    user: mapUser(
      friendship.userAId === viewerProfileId
        ? friendship.userB
        : friendship.userA,
    ),
    recentActivities: [],
  }));
  const activitiesByFriendId = await getFriendActivitySummaries(
    mappedFriends.map((friend) => friend.user.id),
  );

  const friends = mappedFriends.map((friend) => ({
    id: friend.id,
    createdAt: friend.createdAt,
    user: friend.user,
    recentActivities: activitiesByFriendId.get(friend.user.id) ?? [],
  }));

  return {
    friends: sortFriendsForDashboard(friends),
    incomingRequests: incomingRequests.map((request) => ({
      id: request.id,
      message: request.message,
      createdAt: request.createdAt.toISOString(),
      user: mapUser(request.requester),
    })),
    outgoingRequests: outgoingRequests.map((request) => ({
      id: request.id,
      message: request.message,
      createdAt: request.createdAt.toISOString(),
      user: mapUser(request.receiver),
    })),
  };
}
