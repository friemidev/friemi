import type { Prisma } from "@prisma/client";
import { isPlanetCategory } from "../utils/planetCategories";

export async function updatePlanetCategoryInDatabase(
  db: Pick<Prisma.TransactionClient, "planet" | "planetMember">,
  input: { planetId: string; profileId: string; category: string },
) {
  if (!isPlanetCategory(input.category)) return { status: "invalid" } as const;

  const membership = await db.planetMember.findFirst({
    where: { planetId: input.planetId, profileId: input.profileId },
    select: { role: true, status: true },
  });
  if (
    membership?.status !== "APPROVED" ||
    (membership.role !== "OWNER" && membership.role !== "ADMIN")
  ) {
    return { status: "forbidden" } as const;
  }

  const planet = await db.planet.update({
    where: {
      id: input.planetId,
      members: {
        some: {
          profileId: input.profileId,
          status: "APPROVED",
          role: { in: ["OWNER", "ADMIN"] },
        },
      },
    },
    data: { tags: [input.category] },
    select: { slug: true },
  });
  return {
    status: "saved",
    category: input.category,
    slug: planet.slug,
  } as const;
}
