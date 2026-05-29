import { prisma } from "@/lib/prisma";

export async function getViewerFollowState(
  followerId: string | null | undefined,
  followingId: string,
): Promise<boolean> {
  if (!followerId || !followingId || followerId === followingId) {
    return false;
  }

  const relation = await prisma.userFollow.findUnique({
    where: {
      followerId_followingId: {
        followerId,
        followingId,
      },
    },
    select: {
      id: true,
    },
  });

  return Boolean(relation);
}
