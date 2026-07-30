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
  const follows = await prisma.userFollow.findMany({
    where: {
      followerId: viewerProfileId,
      following: {
        status: "ACTIVE",
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take: 50,
    select: {
      id: true,
      following: {
        select: {
          id: true,
          avatarUrl: true,
          friendCode: true,
          nickname: true,
        },
      },
    },
  });

  return follows.map((follow) => mapGiftRecipient(follow.following));
}
