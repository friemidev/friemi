import { randomInt } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

const friendCodeMaxAttempts = 20;

function generateFriendCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function ensureUserProfileFriendCode<
  TProfile extends { id: string; friendCode: string | null },
>(profile: TProfile): Promise<TProfile & { friendCode: string }> {
  if (profile.friendCode) {
    return profile as TProfile & { friendCode: string };
  }

  for (let attempt = 0; attempt < friendCodeMaxAttempts; attempt += 1) {
    const friendCode = generateFriendCode();

    try {
      const updatedProfile = await prisma.userProfile.update({
        where: {
          id: profile.id,
        },
        data: {
          friendCode,
        },
        select: {
          friendCode: true,
        },
      });

      return {
        ...profile,
        friendCode: updatedProfile.friendCode ?? friendCode,
      };
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Unable to generate a unique friend code.");
}
