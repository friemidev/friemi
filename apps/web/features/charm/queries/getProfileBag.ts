import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  blindBoxFragmentExchangeCount,
  canRedeemBlindBoxFragments,
  getFriemiCheckCoinValue,
} from "../charm";
import {
  getFriemiCoinBalance,
  isFriemiCoinSchemaUnavailable,
} from "./getFriemiCoinBalance";
import { grantStarterFriemiWallet } from "../services/charmRewards";
import { getPlatformCouponImageUrl } from "@/features/coupons/platformCouponTemplates";

export type FriemiCheckDisplayStatus = "AVAILABLE" | "REDEEMED" | "EXPIRED";

export type ProfileBagCheckItem = {
  id: string;
  createdAt: string;
  expiresAt: string | null;
  coinValue: number;
  canRedeemToCoins: boolean;
  redeemedAt: string | null;
  status: FriemiCheckDisplayStatus;
  type: "WELCOME" | "BLIND_BOX";
};

export type ProfileBagCouponItem = {
  claimedAt: string;
  coupon: {
    accentColor: string;
    backgroundColor: string;
    description: string;
    expiresAt: string | null;
    foregroundColor: string;
    imageUrl: string | null;
    merchant: {
      logoUrl: string | null;
      name: string;
    };
    terms: string | null;
    title: string;
  };
  id: string;
  redeemedAt: string | null;
  status: "AVAILABLE" | "EXPIRED" | "REDEEMED" | "VOIDED";
};

export type ProfileBagViewModel = {
  availableCheckCount: number;
  blindBoxCheckCount: number;
  checks: ProfileBagCheckItem[];
  coupons: ProfileBagCouponItem[];
  coinBalance: {
    balance: number;
    earnedTotal: number;
    spentTotal: number;
  };
  fragmentBalance: {
    canRedeem: boolean;
    current: number;
    redeemedBlindBoxCount: number;
    required: number;
  };
};

export function resolveFriemiCheckDisplayStatus({
  expiresAt,
  now = new Date(),
  status,
}: {
  expiresAt?: Date | null;
  now?: Date;
  status: FriemiCheckDisplayStatus;
}): FriemiCheckDisplayStatus {
  if (status !== "AVAILABLE") {
    return status;
  }

  if (expiresAt && expiresAt.getTime() <= now.getTime()) {
    return "EXPIRED";
  }

  return "AVAILABLE";
}

async function getFriemiChecksForBag(profileId: string) {
  const orderBy: Prisma.FriemiCheckOrderByWithRelationInput[] = [
    {
      status: "asc",
    },
    {
      createdAt: "desc",
    },
  ];

  try {
    return await prisma.friemiCheck.findMany({
      where: {
        profileId,
      },
      orderBy,
      select: {
        id: true,
        coinValue: true,
        createdAt: true,
        expiresAt: true,
        redeemedAt: true,
        status: true,
        type: true,
      },
      take: 50,
    });
  } catch (error) {
    if (!isFriemiCoinSchemaUnavailable(error)) {
      throw error;
    }

    const checks = await prisma.friemiCheck.findMany({
      where: {
        profileId,
      },
      orderBy,
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
        redeemedAt: true,
        status: true,
        type: true,
      },
      take: 50,
    });

    return checks.map((check) => ({
      ...check,
      coinValue: null,
    }));
  }
}

export async function getProfileBag(profileId: string) {
  const now = new Date();

  try {
    await grantStarterFriemiWallet(profileId);
  } catch (error) {
    if (!isFriemiCoinSchemaUnavailable(error)) {
      throw error;
    }
  }

  const [checks, coupons, fragmentBalance, coinBalance] = await Promise.all([
    getFriemiChecksForBag(profileId),
    prisma.couponWalletItem.findMany({
      where: { ownerProfileId: profileId },
      orderBy: [{ status: "asc" }, { claimedAt: "desc" }],
      take: 50,
      select: {
        claimedAt: true,
        id: true,
        redeemedAt: true,
        status: true,
        coupon: {
          select: {
            accentColor: true,
            backgroundColor: true,
            description: true,
            expiresAt: true,
            foregroundColor: true,
            slug: true,
            terms: true,
            title: true,
            merchant: {
              select: {
                logoUrl: true,
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.userBlindBoxFragmentBalance.findUnique({
      where: {
        profileId,
      },
      select: {
        fragmentCount: true,
        redeemedBlindBoxCount: true,
      },
    }),
    getFriemiCoinBalance(profileId),
  ]);
  const mappedChecks = checks.map((check) => {
    const status = resolveFriemiCheckDisplayStatus({
      expiresAt: check.expiresAt,
      now,
      status: check.status,
    });
    const coinValue = getFriemiCheckCoinValue(check.type, check.coinValue);

    return {
      canRedeemToCoins: status === "AVAILABLE" && coinValue > 0,
      coinValue,
      createdAt: check.createdAt.toISOString(),
      expiresAt: check.expiresAt?.toISOString() ?? null,
      id: check.id,
      redeemedAt: check.redeemedAt?.toISOString() ?? null,
      status,
      type: check.type,
    };
  });
  const currentFragments = Math.max(0, fragmentBalance?.fragmentCount ?? 0);
  const mappedCoupons = coupons.map((item) => ({
    claimedAt: item.claimedAt.toISOString(),
    coupon: {
      ...item.coupon,
      expiresAt: item.coupon.expiresAt?.toISOString() ?? null,
      imageUrl: getPlatformCouponImageUrl(item.coupon.slug),
    },
    id: item.id,
    redeemedAt: item.redeemedAt?.toISOString() ?? null,
    status:
      item.status === "AVAILABLE" &&
      item.coupon.expiresAt &&
      item.coupon.expiresAt.getTime() <= now.getTime()
        ? ("EXPIRED" as const)
        : item.status,
  }));

  return {
    availableCheckCount: mappedChecks.filter(
      (check) => check.status === "AVAILABLE",
    ).length,
    blindBoxCheckCount: mappedChecks.filter(
      (check) => check.type === "BLIND_BOX",
    ).length,
    checks: mappedChecks,
    coupons: mappedCoupons,
    coinBalance: {
      balance: coinBalance.balance,
      earnedTotal: coinBalance.earnedTotal,
      spentTotal: coinBalance.spentTotal,
    },
    fragmentBalance: {
      canRedeem: canRedeemBlindBoxFragments(currentFragments),
      current: currentFragments,
      redeemedBlindBoxCount: fragmentBalance?.redeemedBlindBoxCount ?? 0,
      required: blindBoxFragmentExchangeCount,
    },
  } satisfies ProfileBagViewModel;
}
