import { prisma } from "@/lib/prisma";
import {
  getActivityManagementRole,
  maxActivityCoManagers,
  type ActivityManagementRole,
} from "../utils/activityManagement";

export type ActivityCoManagerUserViewModel = {
  id: string;
  nickname: string;
  friendCode: string | null;
  avatarUrl: string | null;
};

export type ActivityCoManagerViewModel = {
  id: string;
  addedAt: string;
  user: ActivityCoManagerUserViewModel;
};

export type ActivityCoManagerDashboardViewModel = {
  activityId: string;
  role: ActivityManagementRole;
  canEditManagers: boolean;
  maxManagers: number;
  coManagers: ActivityCoManagerViewModel[];
  availableFriends: ActivityCoManagerUserViewModel[];
};

function getPublicUserName(user: {
  friendCode: string | null;
  nickname: string;
}) {
  const nickname = user.nickname.trim();

  if (nickname) {
    return nickname;
  }

  return user.friendCode ? `NF ${user.friendCode}` : "NF";
}

function mapUser(user: ActivityCoManagerUserViewModel) {
  return {
    id: user.id,
    nickname: getPublicUserName(user),
    friendCode: user.friendCode,
    avatarUrl: user.avatarUrl,
  };
}

export async function getActivityCoManagerDashboard(
  activityId: string,
  viewerProfileId: string | null | undefined,
): Promise<ActivityCoManagerDashboardViewModel | null> {
  if (!viewerProfileId) {
    return null;
  }

  const activity = await prisma.activity.findUnique({
    where: {
      id: activityId,
    },
    select: {
      id: true,
      organizerId: true,
      coManagers: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          createdAt: true,
          manager: {
            select: {
              id: true,
              nickname: true,
              friendCode: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  if (!activity) {
    return null;
  }

  const role = await getActivityManagementRole(activity.id, viewerProfileId);

  if (role === "NONE") {
    return null;
  }

  const coManagers = activity.coManagers.map((coManager) => ({
    id: coManager.id,
    addedAt: coManager.createdAt.toISOString(),
    user: mapUser(coManager.manager),
  }));
  const coManagerIds = new Set(
    coManagers.map((coManager) => coManager.user.id),
  );
  const canEditManagers = role === "ORGANIZER";
  let availableFriends: ActivityCoManagerUserViewModel[] = [];

  if (canEditManagers) {
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ userAId: viewerProfileId }, { userBId: viewerProfileId }],
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      select: {
        userAId: true,
        userA: {
          select: {
            id: true,
            nickname: true,
            friendCode: true,
            avatarUrl: true,
            status: true,
          },
        },
        userB: {
          select: {
            id: true,
            nickname: true,
            friendCode: true,
            avatarUrl: true,
            status: true,
          },
        },
      },
    });

    availableFriends = friendships
      .map((friendship) =>
        friendship.userAId === viewerProfileId
          ? friendship.userB
          : friendship.userA,
      )
      .filter(
        (friend) =>
          friend.status === "ACTIVE" &&
          friend.id !== activity.organizerId &&
          !coManagerIds.has(friend.id),
      )
      .map(mapUser)
      .sort((left, right) => left.nickname.localeCompare(right.nickname));
  }

  return {
    activityId: activity.id,
    role,
    canEditManagers,
    maxManagers: maxActivityCoManagers,
    coManagers,
    availableFriends,
  };
}
