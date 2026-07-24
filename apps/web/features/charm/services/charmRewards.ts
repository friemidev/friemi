import { Prisma } from "@prisma/client";
import {
  blindBoxFragmentExchangeCount,
  calculateCharmDeltaFromGift,
  getCharmGiftLabel,
  getCharmProgress,
  newUserFriemiCheckSourceKey,
  successfulActivityFragmentReward,
} from "@/features/charm/charm";
import { prisma } from "@/lib/prisma";

export class CharmGiftUnavailableError extends Error {
  constructor(giftId: string) {
    super(`Charm gift is unavailable: ${giftId}`);
    this.name = "CharmGiftUnavailableError";
  }
}

export class BlindBoxFragmentBalanceError extends Error {
  constructor(profileId: string) {
    super(`Not enough blind-box fragments for profile: ${profileId}`);
    this.name = "BlindBoxFragmentBalanceError";
  }
}

type RecordReceivedCharmGiftInput = {
  allowSeasonalGifts?: boolean;
  giftId: string;
  locale?: string;
  quantity?: number | null;
  recipientProfileId: string;
  senderProfileId?: string | null;
  sourceContextId?: string | null;
  sourceSurface?: Prisma.CharmGiftEventCreateInput["sourceSurface"];
};

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function getUserCharmSummary(profileId: string) {
  const balance = await prisma.userCharmBalance.findUnique({
    where: {
      profileId,
    },
    select: {
      giftCount: true,
      lastGiftAt: true,
      score: true,
    },
  });
  const score = balance?.score ?? 0;

  return {
    giftCount: balance?.giftCount ?? 0,
    lastGiftAt: balance?.lastGiftAt ?? null,
    progress: getCharmProgress(score),
    score,
  };
}

export async function recordReceivedCharmGift({
  allowSeasonalGifts = false,
  giftId,
  locale = "zh-CN",
  quantity,
  recipientProfileId,
  senderProfileId = null,
  sourceContextId = null,
  sourceSurface = "PROFILE",
}: RecordReceivedCharmGiftInput) {
  const giftDelta = calculateCharmDeltaFromGift({
    allowDisabledGifts: true,
    giftId,
    quantity,
  });

  if (
    !giftDelta.gift.launchEnabled ||
    giftDelta.gift.charmValue <= 0 ||
    (!allowSeasonalGifts && giftDelta.gift.availability !== "standard")
  ) {
    throw new CharmGiftUnavailableError(giftId);
  }

  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const event = await tx.charmGiftEvent.create({
      data: {
        charmDelta: giftDelta.gift.charmValue,
        coinCost: giftDelta.gift.coinCost,
        giftEmoji: giftDelta.gift.emoji,
        giftId: giftDelta.gift.id,
        giftLabel: getCharmGiftLabel(giftDelta.gift, locale),
        quantity: giftDelta.quantity,
        recipientProfileId,
        senderProfileId,
        sourceContextId,
        sourceSurface,
        totalCharmDelta: giftDelta.totalCharmDelta,
      },
    });
    const balance = await tx.userCharmBalance.upsert({
      where: {
        profileId: recipientProfileId,
      },
      create: {
        giftCount: giftDelta.quantity,
        lastGiftAt: now,
        profileId: recipientProfileId,
        score: giftDelta.totalCharmDelta,
      },
      update: {
        giftCount: {
          increment: giftDelta.quantity,
        },
        lastGiftAt: now,
        score: {
          increment: giftDelta.totalCharmDelta,
        },
      },
    });

    return {
      balance,
      event,
      progress: getCharmProgress(balance.score),
    };
  });
}

export async function grantWelcomeFriemiCheck(profileId: string) {
  return prisma.friemiCheck.upsert({
    where: {
      profileId_sourceKey: {
        profileId,
        sourceKey: newUserFriemiCheckSourceKey,
      },
    },
    create: {
      note: "New user welcome Friemi check",
      profileId,
      sourceKey: newUserFriemiCheckSourceKey,
      type: "WELCOME",
    },
    update: {},
  });
}

export async function redeemBlindBoxFromFragments(profileId: string) {
  return prisma.$transaction(async (tx) => {
    const updateResult = await tx.userBlindBoxFragmentBalance.updateMany({
      where: {
        profileId,
        fragmentCount: {
          gte: blindBoxFragmentExchangeCount,
        },
      },
      data: {
        fragmentCount: {
          decrement: blindBoxFragmentExchangeCount,
        },
        redeemedBlindBoxCount: {
          increment: 1,
        },
      },
    });

    if (updateResult.count === 0) {
      throw new BlindBoxFragmentBalanceError(profileId);
    }

    const balance = await tx.userBlindBoxFragmentBalance.findUniqueOrThrow({
      where: {
        profileId,
      },
    });
    const check = await tx.friemiCheck.create({
      data: {
        note: "Redeemed from 10 blind-box fragments",
        profileId,
        type: "BLIND_BOX",
      },
    });

    return {
      balance,
      check,
    };
  });
}

export async function grantSuccessfulActivityBlindBoxFragment({
  activityId,
  profileId,
}: {
  activityId: string;
  profileId: string;
}) {
  const sourceKey = `successful-activity:${activityId}`;
  const existing = await prisma.blindBoxFragmentEvent.findUnique({
    where: {
      profileId_sourceKey: {
        profileId,
        sourceKey,
      },
    },
  });

  if (existing) {
    const balance = await prisma.userBlindBoxFragmentBalance.findUnique({
      where: {
        profileId,
      },
    });

    return {
      balance,
      check: null,
      created: false,
      event: existing,
    };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const event = await tx.blindBoxFragmentEvent.create({
        data: {
          activityId,
          delta: successfulActivityFragmentReward,
          note: "Successful hosted activity blind-box fragment",
          profileId,
          sourceKey,
          type: "SUCCESSFUL_ACTIVITY",
        },
      });
      const updatedBalance = await tx.userBlindBoxFragmentBalance.upsert({
        where: {
          profileId,
        },
        create: {
          fragmentCount: successfulActivityFragmentReward,
          lastEarnedAt: new Date(),
          profileId,
        },
        update: {
          fragmentCount: {
            increment: successfulActivityFragmentReward,
          },
          lastEarnedAt: new Date(),
        },
      });

      if (updatedBalance.fragmentCount < blindBoxFragmentExchangeCount) {
        return {
          balance: updatedBalance,
          check: null,
          created: true,
          event,
        };
      }

      const balance = await tx.userBlindBoxFragmentBalance.update({
        where: {
          profileId,
        },
        data: {
          fragmentCount: {
            decrement: blindBoxFragmentExchangeCount,
          },
          redeemedBlindBoxCount: {
            increment: 1,
          },
        },
      });
      const check = await tx.friemiCheck.create({
        data: {
          note: "Auto-created after 10 blind-box fragments",
          profileId,
          type: "BLIND_BOX",
        },
      });

      return {
        balance,
        check,
        created: true,
        event,
      };
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const [event, balance] = await Promise.all([
      prisma.blindBoxFragmentEvent.findUniqueOrThrow({
        where: {
          profileId_sourceKey: {
            profileId,
            sourceKey,
          },
        },
      }),
      prisma.userBlindBoxFragmentBalance.findUnique({
        where: {
          profileId,
        },
      }),
    ]);

    return {
      balance,
      check: null,
      created: false,
      event,
    };
  }
}
