import { Prisma } from "@prisma/client";
import { initialFriemiCoinBalanceAmount } from "@/features/charm/charm";
import { prisma } from "@/lib/prisma";

export type FriemiCoinBalanceViewModel = {
  balance: number;
  earnedTotal: number;
  spentTotal: number;
};

export const emptyFriemiCoinBalance = {
  balance: initialFriemiCoinBalanceAmount,
  earnedTotal: initialFriemiCoinBalanceAmount,
  spentTotal: 0,
} satisfies FriemiCoinBalanceViewModel;

export function isFriemiCoinSchemaUnavailable(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  );
}

export async function getFriemiCoinBalance(
  profileId: string,
): Promise<FriemiCoinBalanceViewModel> {
  try {
    const balance = await prisma.userFriemiCoinBalance.findUnique({
      where: {
        profileId,
      },
      select: {
        balance: true,
        earnedTotal: true,
        spentTotal: true,
      },
    });

    if (!balance) {
      return emptyFriemiCoinBalance;
    }

    return {
      balance: Math.max(0, balance.balance),
      earnedTotal: Math.max(0, balance.earnedTotal),
      spentTotal: Math.max(0, balance.spentTotal),
    };
  } catch (error) {
    if (isFriemiCoinSchemaUnavailable(error)) {
      return {
        balance: 0,
        earnedTotal: 0,
        spentTotal: 0,
      };
    }

    throw error;
  }
}
