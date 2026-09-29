import type { Prisma } from "@prisma/client";

export function getMomentLinkableActivityWhere(
  profileId: string,
): Prisma.ActivityWhereInput {
  return {
    status: { notIn: ["DRAFT", "CANCELLED"] },
    OR: [
      { organizerId: profileId },
      {
        participants: {
          some: {
            userProfileId: profileId,
            status: { in: ["JOINED", "APPROVED"] },
          },
        },
      },
    ],
  };
}
