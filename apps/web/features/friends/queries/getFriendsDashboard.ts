import { prisma } from "@/lib/prisma";
import {
  compareOptionalFriendNearestActivities,
  getFriendNearestActivitySignals,
  type FriendNearestActivitySignalViewModel,
} from "./getFriendNearestActivitySignals";

export const friendListLimit = 50;
export const friendRequestListLimit = 20;

export type FriendUserViewModel = {
  id: string;
  nickname: string;
  friendCode: string | null;
  bio: string | null;
  avatarUrl: string | null;
};

export type FriendActivitySummaryViewModel =
  FriendNearestActivitySignalViewModel;

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
  const hasPublicNickname = user.nickname.trim().length > 0;

  return {
    id: user.id,
    nickname: hasPublicNickname
      ? user.nickname
      : user.friendCode
        ? `NF ${user.friendCode}`
        : "NF",
    friendCode: user.friendCode,
    bio: user.bio,
    avatarUrl: hasPublicNickname ? user.avatarUrl : null,
  };
}

function sortFriendsForDashboard(friends: FriendViewModel[]) {
  return [...friends].sort((friendA, friendB) => {
    const firstActivityA = friendA.recentActivities[0]?.startAt;
    const firstActivityB = friendB.recentActivities[0]?.startAt;
    const activityOrder = compareOptionalFriendNearestActivities(
      friendA.recentActivities[0],
      friendB.recentActivities[0],
    );

    if (activityOrder !== 0 || firstActivityA || firstActivityB) {
      return activityOrder || friendA.id.localeCompare(friendB.id);
    }

    return (
      new Date(friendB.createdAt).getTime() -
        new Date(friendA.createdAt).getTime() ||
      friendA.id.localeCompare(friendB.id)
    );
  });
}

export async function getPendingIncomingFriendRequests(
  viewerProfileId: string,
) {
  const incomingRequests = await prisma.friendRequest.findMany({
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
          friendCode: true,
          bio: true,
          avatarUrl: true,
        },
      },
    },
  });

  return incomingRequests.map((request) => ({
    id: request.id,
    message: request.message,
    createdAt: request.createdAt.toISOString(),
    user: mapUser(request.requester),
  }));
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
            friendCode: true,
            bio: true,
            avatarUrl: true,
          },
        },
        userB: {
          select: {
            id: true,
            nickname: true,
            friendCode: true,
            bio: true,
            avatarUrl: true,
          },
        },
      },
    }),
    getPendingIncomingFriendRequests(viewerProfileId),
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
            friendCode: true,
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
  const activitiesByFriendId = await getFriendNearestActivitySignals({
    friendIds: mappedFriends.map((friend) => friend.user.id),
    viewerProfileId,
  });

  const friends = mappedFriends.map((friend) => ({
    id: friend.id,
    createdAt: friend.createdAt,
    user: friend.user,
    recentActivities: activitiesByFriendId.get(friend.user.id) ?? [],
  }));

  return {
    friends: sortFriendsForDashboard(friends),
    incomingRequests,
    outgoingRequests: outgoingRequests.map((request) => ({
      id: request.id,
      message: request.message,
      createdAt: request.createdAt.toISOString(),
      user: mapUser(request.receiver),
    })),
  };
}
