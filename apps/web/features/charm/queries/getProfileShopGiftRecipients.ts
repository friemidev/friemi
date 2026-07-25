import { prisma } from "@/lib/prisma";

export type ProfileShopGiftRecipient = {
  id: string;
  avatarUrl: string | null;
  friendCode: string | null;
  nickname: string;
};

function mapGiftRecipient(user: ProfileShopGiftRecipient) {
  const hasNickname = user.nickname.trim().length > 0;

  return {
    id: user.id,
    avatarUrl: hasNickname ? user.avatarUrl : null,
    friendCode: user.friendCode,
    nickname: hasNickname
      ? user.nickname
      : user.friendCode
        ? `NF ${user.friendCode}`
        : "Friemi",
  };
}

export async function getProfileShopGiftRecipients(viewerProfileId: string) {
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ userAId: viewerProfileId }, { userBId: viewerProfileId }],
    },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: 50,
    select: {
      id: true,
      userAId: true,
      userA: {
        select: {
          id: true,
          avatarUrl: true,
          friendCode: true,
          nickname: true,
        },
      },
      userB: {
        select: {
          id: true,
          avatarUrl: true,
          friendCode: true,
          nickname: true,
        },
      },
    },
  });

  return friendships.map((friendship) =>
    mapGiftRecipient(
      friendship.userAId === viewerProfileId
        ? friendship.userB
        : friendship.userA,
    ),
  );
}
