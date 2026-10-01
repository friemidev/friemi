import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type LinkablePlanetOption = {
  coverImageUrl: string | null;
  id: string;
  name: string;
  slug: string;
  tags: string[];
};

type PlanetQueryClient = Prisma.TransactionClient | PrismaClient;

function getManageablePlanetWhere(profileId: string): Prisma.PlanetWhereInput {
  return {
    visibility: "PUBLIC",
    OR: [
      { ownerId: profileId },
      {
        members: {
          some: {
            profileId,
            status: "APPROVED",
            role: { in: ["OWNER", "ADMIN"] },
          },
        },
      },
    ],
  };
}

export async function getLinkablePlanets(
  profileId: string,
  client: PlanetQueryClient = prisma,
): Promise<LinkablePlanetOption[]> {
  return client.planet.findMany({
    where: getManageablePlanetWhere(profileId),
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    select: {
      coverImageUrl: true,
      id: true,
      name: true,
      slug: true,
      tags: true,
    },
  });
}

export async function canLinkAllPlanets(
  profileId: string,
  planetIds: string[],
  client: PlanetQueryClient = prisma,
) {
  if (planetIds.length === 0) return true;

  const count = await client.planet.count({
    where: {
      ...getManageablePlanetWhere(profileId),
      id: { in: planetIds },
    },
  });

  return count === planetIds.length;
}
