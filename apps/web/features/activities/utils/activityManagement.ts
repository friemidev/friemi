import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

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

export async function areProfilesMutualFollows(
  profileId: string,
  otherProfileId: string,
  client: ActivityManagementClient = prisma,
) {
  const follows = await client.userFollow.findMany({
    where: {
      OR: [
        {
          followerId: profileId,
          followingId: otherProfileId,
        },
        {
          followerId: otherProfileId,
          followingId: profileId,
        },
      ],
    },
    select: {
      followerId: true,
      followingId: true,
    },
  });

  return (
    follows.some(
      (follow) =>
        follow.followerId === profileId &&
        follow.followingId === otherProfileId,
    ) &&
    follows.some(
      (follow) =>
        follow.followerId === otherProfileId &&
        follow.followingId === profileId,
    )
  );
}
