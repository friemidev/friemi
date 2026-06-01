import { prisma } from "@/lib/prisma";

export async function getViewerFriendIds(viewerProfileId: string) {
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ userAId: viewerProfileId }, { userBId: viewerProfileId }],
    },
    select: {
      userAId: true,
      userBId: true,
    },
  });

  return Array.from(
    new Set(
      friendships.map((friendship) =>
        friendship.userAId === viewerProfileId
          ? friendship.userBId
          : friendship.userAId,
      ),
    ),
  );
}
