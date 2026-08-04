import { prisma } from "@/lib/prisma";
import {
  blindBoxFragmentExchangeCount,
  canRedeemBlindBoxFragments,
} from "../charm";

export type FriemiCheckDisplayStatus = "AVAILABLE" | "REDEEMED" | "EXPIRED";

export type ProfileBagCheckItem = {
  id: string;
  createdAt: string;
  expiresAt: string | null;
  redeemedAt: string | null;
  status: FriemiCheckDisplayStatus;
  type: "WELCOME" | "BLIND_BOX";
};

export type ProfileBagViewModel = {
  availableCheckCount: number;
  blindBoxCheckCount: number;
  checks: ProfileBagCheckItem[];
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

export async function getProfileBag(profileId: string) {
  const now = new Date();
  const [checks, fragmentBalance] = await Promise.all([
    prisma.friemiCheck.findMany({
      where: {
        profileId,
      },
      orderBy: [
        {
          status: "asc",
        },
        {
          createdAt: "desc",
        },
      ],
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
        redeemedAt: true,
        status: true,
        type: true,
      },
      take: 50,
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
  ]);
  const mappedChecks = checks.map((check) => ({
    id: check.id,
    createdAt: check.createdAt.toISOString(),
    expiresAt: check.expiresAt?.toISOString() ?? null,
    redeemedAt: check.redeemedAt?.toISOString() ?? null,
    status: resolveFriemiCheckDisplayStatus({
      expiresAt: check.expiresAt,
      now,
      status: check.status,
    }),
    type: check.type,
  }));
  const currentFragments = Math.max(0, fragmentBalance?.fragmentCount ?? 0);

  return {
    availableCheckCount: mappedChecks.filter(
      (check) => check.status === "AVAILABLE",
    ).length,
    blindBoxCheckCount: mappedChecks.filter(
      (check) => check.type === "BLIND_BOX",
    ).length,
    checks: mappedChecks,
    fragmentBalance: {
      canRedeem: canRedeemBlindBoxFragments(currentFragments),
      current: currentFragments,
      redeemedBlindBoxCount: fragmentBalance?.redeemedBlindBoxCount ?? 0,
      required: blindBoxFragmentExchangeCount,
    },
  } satisfies ProfileBagViewModel;
}
