import { prisma } from "@/lib/prisma";

export const friendListLimit = 50;
export const friendRequestListLimit = 20;

export type FriendUserViewModel = {
  id: string;
  nickname: string;
  email: string | null;
  bio: string | null;
  avatarUrl: string | null;
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

  return {
    friends: friendships.map((friendship) => ({
      id: friendship.id,
      createdAt: friendship.createdAt.toISOString(),
      user: mapUser(
        friendship.userAId === viewerProfileId
          ? friendship.userB
          : friendship.userA,
      ),
    })),
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
