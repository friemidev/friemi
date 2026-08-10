import { Prisma } from "@prisma/client";
import {
  blindBoxFragmentExchangeCount,
  calculateCharmDeltaFromGift,
  getCharmGiftLabel,
  getCharmProgress,
  getFriemiCheckCoinValue,
  initialFriemiCoinBalanceAmount,
  initialFriemiCoinBalanceSourceKey,
  newUserFriemiCheckSourceKey,
  successfulActivityFragmentReward,
} from "@/features/charm/charm";
import { createNotification } from "@/features/notifications/utils/createNotification";
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

export class InsufficientFriemiCoinBalanceError extends Error {
  balance: number;
  required: number;

  constructor({
    balance,
    profileId,
    required,
  }: {
    balance: number;
    profileId: string;
    required: number;
  }) {
    super(`Not enough Friemi coins for profile: ${profileId}`);
    this.name = "InsufficientFriemiCoinBalanceError";
    this.balance = balance;
    this.required = required;
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

async function grantInitialFriemiCoinBalanceWithClient(
  client: Prisma.TransactionClient,
  profileId: string,
) {
  const existingGrant = await client.friemiCoinTransaction.findFirst({
    where: {
      profileId,
      sourceKey: initialFriemiCoinBalanceSourceKey,
    },
    select: {
      id: true,
    },
  });

  if (existingGrant) {
    return client.userFriemiCoinBalance.findUnique({
      where: {
        profileId,
      },
      select: {
        balance: true,
      },
    });
  }

  const now = new Date();
  const balance = await client.userFriemiCoinBalance.upsert({
    where: {
      profileId,
    },
    create: {
      balance: initialFriemiCoinBalanceAmount,
      earnedTotal: initialFriemiCoinBalanceAmount,
      lastTransactionAt: now,
      profileId,
    },
    update: {
      balance: {
        increment: initialFriemiCoinBalanceAmount,
      },
      earnedTotal: {
        increment: initialFriemiCoinBalanceAmount,
      },
      lastTransactionAt: now,
    },
    select: {
      balance: true,
    },
  });

  await client.friemiCoinTransaction.create({
    data: {
      amount: initialFriemiCoinBalanceAmount,
      balanceAfter: balance.balance,
      id: `initial-fc-${profileId}`,
      note: "Initial Friemi coin balance",
      profileId,
      sourceKey: initialFriemiCoinBalanceSourceKey,
      type: "MANUAL_ADJUSTMENT",
    },
  });

  return balance;
}

export async function grantInitialFriemiCoinBalance(profileId: string) {
  try {
    return await prisma.$transaction((tx) =>
      grantInitialFriemiCoinBalanceWithClient(tx, profileId),
    );
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    return prisma.userFriemiCoinBalance.findUnique({
      where: {
        profileId,
      },
      select: {
        balance: true,
      },
    });
  }
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
    const totalCoinCost = Math.max(
      0,
      (giftDelta.gift.coinCost ?? 0) * giftDelta.quantity,
    );
    let senderCoinBalance: { balance: number } | null = null;

    if (senderProfileId && senderProfileId !== recipientProfileId) {
      const senderBalance =
        await grantInitialFriemiCoinBalanceWithClient(tx, senderProfileId);
      const currentBalance = senderBalance?.balance ?? 0;

      if (totalCoinCost > currentBalance) {
        throw new InsufficientFriemiCoinBalanceError({
          balance: currentBalance,
          profileId: senderProfileId,
          required: totalCoinCost,
        });
      }
    }

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

    if (
      senderProfileId &&
      senderProfileId !== recipientProfileId &&
      totalCoinCost > 0
    ) {
      const debitResult = await tx.userFriemiCoinBalance.updateMany({
        where: {
          balance: {
            gte: totalCoinCost,
          },
          profileId: senderProfileId,
        },
        data: {
          balance: {
            decrement: totalCoinCost,
          },
          lastTransactionAt: now,
          spentTotal: {
            increment: totalCoinCost,
          },
        },
      });

      if (debitResult.count === 0) {
        const currentBalance = await tx.userFriemiCoinBalance.findUnique({
          where: {
            profileId: senderProfileId,
          },
          select: {
            balance: true,
          },
        });

        throw new InsufficientFriemiCoinBalanceError({
          balance: currentBalance?.balance ?? 0,
          profileId: senderProfileId,
          required: totalCoinCost,
        });
      }

      const senderBalance = await tx.userFriemiCoinBalance.findUniqueOrThrow({
        where: {
          profileId: senderProfileId,
        },
        select: {
          balance: true,
        },
      });
      senderCoinBalance = senderBalance;

      await tx.friemiCoinTransaction.create({
        data: {
          amount: -totalCoinCost,
          balanceAfter: senderBalance.balance,
          note: `Sent ${giftDelta.gift.id} gift`,
          profileId: senderProfileId,
          sourceKey: `gift-sent:${event.id}`,
          type: "GIFT_SENT",
        },
      });
    }

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

    if (senderProfileId && senderProfileId !== recipientProfileId) {
      await createNotification(tx, {
        actorId: senderProfileId,
        activityId: sourceSurface === "ACTIVITY" ? sourceContextId : null,
        charmGiftEventId: event.id,
        dedupe: false,
        momentId: sourceSurface === "MOMENT" ? sourceContextId : null,
        recipientId: recipientProfileId,
        type: "CHARM_GIFT_RECEIVED",
      });
    }

    return {
      balance,
      event,
      progress: getCharmProgress(balance.score),
      senderBalance: senderCoinBalance,
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
      coinValue: getFriemiCheckCoinValue("WELCOME"),
      note: "New user welcome Friemi check",
      profileId,
      sourceKey: newUserFriemiCheckSourceKey,
      type: "WELCOME",
    },
    update: {},
  });
}

export async function grantStarterFriemiWallet(profileId: string) {
  await Promise.all([
    grantWelcomeFriemiCheck(profileId),
    grantInitialFriemiCoinBalance(profileId),
  ]);
}

export class FriemiCheckRedeemError extends Error {
  code:
    | "MISSING"
    | "UNAVAILABLE"
    | "EXPIRED"
    | "NOT_REDEEMABLE";

  constructor(
    profileId: string,
    checkId: string,
    code:
      | "MISSING"
      | "UNAVAILABLE"
      | "EXPIRED"
      | "NOT_REDEEMABLE",
  ) {
    super(`Friemi check ${checkId} cannot be redeemed for ${profileId}`);
    this.name = "FriemiCheckRedeemError";
    this.code = code;
  }
}

export async function redeemFriemiCheckToCoins({
  checkId,
  profileId,
}: {
  checkId: string;
  profileId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const check = await tx.friemiCheck.findFirst({
      where: {
        id: checkId,
        profileId,
      },
      select: {
        coinValue: true,
        expiresAt: true,
        id: true,
        sourceKey: true,
        status: true,
        type: true,
      },
    });

    if (!check) {
      throw new FriemiCheckRedeemError(profileId, checkId, "MISSING");
    }

    if (check.status !== "AVAILABLE") {
      throw new FriemiCheckRedeemError(profileId, checkId, "UNAVAILABLE");
    }

    const now = new Date();

    if (check.expiresAt && check.expiresAt.getTime() <= now.getTime()) {
      await tx.friemiCheck.update({
        where: {
          id: check.id,
        },
        data: {
          status: "EXPIRED",
        },
      });

      throw new FriemiCheckRedeemError(profileId, checkId, "EXPIRED");
    }

    const coinValue = getFriemiCheckCoinValue(check.type, check.coinValue);

    if (coinValue <= 0) {
      throw new FriemiCheckRedeemError(profileId, checkId, "NOT_REDEEMABLE");
    }

    await grantInitialFriemiCoinBalanceWithClient(tx, profileId);

    const updateResult = await tx.friemiCheck.updateMany({
      where: {
        id: check.id,
        profileId,
        status: "AVAILABLE",
      },
      data: {
        redeemedAt: now,
        status: "REDEEMED",
      },
    });

    if (updateResult.count === 0) {
      throw new FriemiCheckRedeemError(profileId, checkId, "UNAVAILABLE");
    }

    const balance = await tx.userFriemiCoinBalance.upsert({
      where: {
        profileId,
      },
      create: {
        balance: coinValue,
        earnedTotal: coinValue,
        lastTransactionAt: now,
        profileId,
      },
      update: {
        balance: {
          increment: coinValue,
        },
        earnedTotal: {
          increment: coinValue,
        },
        lastTransactionAt: now,
      },
    });
    const transaction = await tx.friemiCoinTransaction.create({
      data: {
        amount: coinValue,
        balanceAfter: balance.balance,
        checkId: check.id,
        note: "Friemi check redeemed",
        profileId,
        sourceKey: check.sourceKey,
        type: "CHECK_REDEEMED",
      },
    });

    return {
      balance,
      coinValue,
      transaction,
    };
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
