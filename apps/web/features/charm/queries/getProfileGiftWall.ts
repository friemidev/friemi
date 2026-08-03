import { prisma } from "@/lib/prisma";

export type ProfileGiftWallGiftItem = {
  charm: number;
  eventCount: number;
  giftEmoji: string;
  giftId: string;
  giftLabel: string;
  quantity: number;
};

export type ProfileGiftWallSenderItem = {
  charm: number;
  eventCount: number;
  quantity: number;
  sender: {
    avatarUrl: string | null;
    id: string;
    nickname: string;
  };
};

export type ProfileGiftWallViewModel = {
  lastGiftAt: string | null;
  senderCount: number;
  topGifts: ProfileGiftWallGiftItem[];
  topSenders: ProfileGiftWallSenderItem[];
  totalCharm: number;
  totalGiftCount: number;
};

function toNumber(value: bigint | number | null | undefined) {
  return Number(value ?? 0);
}

export async function getProfileGiftWall(
  profileId: string,
): Promise<ProfileGiftWallViewModel> {
  const where = {
    recipientProfileId: profileId,
  };
  const [summary, senderSummaryRows, topGifts, topSenderGroups, lastGift] =
    await Promise.all([
      prisma.charmGiftEvent.aggregate({
        where,
        _sum: {
          quantity: true,
          totalCharmDelta: true,
        },
      }),
      prisma.$queryRaw<
        {
          senderCount: bigint | number | null;
        }[]
      >`
        SELECT COUNT(DISTINCT "senderProfileId") AS "senderCount"
        FROM "CharmGiftEvent"
        WHERE "recipientProfileId" = ${profileId}
          AND "senderProfileId" IS NOT NULL
      `,
      prisma.charmGiftEvent.groupBy({
        by: ["giftId", "giftEmoji", "giftLabel"],
        where,
        _count: {
          _all: true,
        },
        _sum: {
          quantity: true,
          totalCharmDelta: true,
        },
        orderBy: [
          {
            _sum: {
              quantity: "desc",
            },
          },
          {
            _sum: {
              totalCharmDelta: "desc",
            },
          },
        ],
        take: 9,
      }),
      prisma.charmGiftEvent.groupBy({
        by: ["senderProfileId"],
        where: {
          ...where,
          senderProfileId: {
            not: null,
          },
        },
        _count: {
          _all: true,
        },
        _sum: {
          quantity: true,
          totalCharmDelta: true,
        },
        orderBy: [
          {
            _sum: {
              totalCharmDelta: "desc",
            },
          },
          {
            _sum: {
              quantity: "desc",
            },
          },
        ],
        take: 5,
      }),
      prisma.charmGiftEvent.findFirst({
        where,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          createdAt: true,
        },
      }),
    ]);
  const senderIds = topSenderGroups.flatMap((group) =>
    group.senderProfileId ? [group.senderProfileId] : [],
  );
  const senders =
    senderIds.length > 0
      ? await prisma.userProfile.findMany({
          where: {
            id: {
              in: senderIds,
            },
          },
          select: {
            avatarUrl: true,
            id: true,
            nickname: true,
          },
        })
      : [];
  const senderById = new Map(senders.map((sender) => [sender.id, sender]));

  return {
    lastGiftAt: lastGift?.createdAt.toISOString() ?? null,
    senderCount: toNumber(senderSummaryRows[0]?.senderCount),
    topGifts: topGifts.map((gift) => ({
      charm: gift._sum.totalCharmDelta ?? 0,
      eventCount: gift._count._all,
      giftEmoji: gift.giftEmoji,
      giftId: gift.giftId,
      giftLabel: gift.giftLabel,
      quantity: gift._sum.quantity ?? 0,
    })),
    topSenders: topSenderGroups.flatMap((group) => {
      if (!group.senderProfileId) {
        return [];
      }

      const sender = senderById.get(group.senderProfileId);

      if (!sender) {
        return [];
      }

      return [
        {
          charm: group._sum.totalCharmDelta ?? 0,
          eventCount: group._count._all,
          quantity: group._sum.quantity ?? 0,
          sender,
        },
      ];
    }),
    totalCharm: summary._sum.totalCharmDelta ?? 0,
    totalGiftCount: summary._sum.quantity ?? 0,
  };
}
