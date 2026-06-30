import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getFriendshipPair } from "@/features/friends/utils/friendship";

export const maxActivityCoManagers = 3;

export type ActivityManagementRole = "ORGANIZER" | "CO_MANAGER" | "NONE";

type ActivityManagementClient = Prisma.TransactionClient | PrismaClient;

export function canManageActivity(role: ActivityManagementRole) {
  return role === "ORGANIZER" || role === "CO_MANAGER";
}

export async function getActivityManagementRole(
  activityId: string,
  profileId: string | null | undefined,
  client: ActivityManagementClient = prisma,
): Promise<ActivityManagementRole> {
  if (!profileId) {
    return "NONE";
  }

  const activity = await client.activity.findUnique({
    where: {
      id: activityId,
    },
    select: {
      organizerId: true,
      coManagers: {
        where: {
          managerProfileId: profileId,
        },
        select: {
          id: true,
        },
        take: 1,
      },
    },
  });

  if (!activity) {
    return "NONE";
  }

  if (activity.organizerId === profileId) {
    return "ORGANIZER";
  }

  return activity.coManagers.length > 0 ? "CO_MANAGER" : "NONE";
}

export async function assertCanManageActivity(
  activityId: string,
  profileId: string,
  client: ActivityManagementClient = prisma,
) {
  const role = await getActivityManagementRole(activityId, profileId, client);

  return {
    ok: canManageActivity(role),
    role,
  };
}

export async function areProfilesFriends(
  profileId: string,
  otherProfileId: string,
  client: ActivityManagementClient = prisma,
) {
  const pair = getFriendshipPair(profileId, otherProfileId);
  const friendship = await client.friendship.findUnique({
    where: {
      userAId_userBId: pair,
    },
    select: {
      id: true,
    },
  });

  return Boolean(friendship);
}
